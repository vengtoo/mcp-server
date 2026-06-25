import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { VengtooClient } from '../client.js'

interface EvalResponse {
  decision: boolean
  context: { reason: string; access_path?: string; policy_id?: string; expires_in?: number }
}

export function registerEvaluateTools(server: McpServer, client: VengtooClient) {
  server.tool(
    'check_authorization',
    'Ask Vengtoo whether a subject can perform an action on a resource. Returns decision: true (allowed) or false (denied), plus the reason and which policy/access path was responsible.\n\nIdentify the subject and resource using either their Vengtoo UUID (id) or your system\'s own identifier (external_id). external_id is preferred in production — it avoids the need to store Vengtoo UUIDs.\n\nFor type-level checks (does this user have ANY access to this type of resource?): set resource_type and omit resource_id and resource_external_id.\nFor instance-level checks (does this user have access to THIS specific resource?): set resource_id or resource_external_id.',
    {
      subject_external_id: z.string().optional().describe('Your system\'s own subject ID (recommended). Mutually exclusive with subject_id.'),
      subject_id: z.string().optional().describe('Vengtoo subject UUID. Use subject_external_id instead when possible.'),
      subject_type: z.string().describe('Subject type, e.g. "user" or "service"'),
      action: z.string().describe('Action to check, e.g. "read" or "delete"'),
      resource_type: z.string().describe('Resource type name or UUID, e.g. "document"'),
      resource_external_id: z.string().optional().describe('Your system\'s own resource ID. Mutually exclusive with resource_id.'),
      resource_id: z.string().optional().describe('Vengtoo resource UUID. Use resource_external_id instead when possible.'),
    },
    async ({ subject_external_id, subject_id, subject_type, action, resource_type, resource_external_id, resource_id }) => {
      const subject: Record<string, string> = { type: subject_type }
      if (subject_external_id) subject.external_id = subject_external_id
      else if (subject_id) subject.id = subject_id

      const resource: Record<string, string> = { type: resource_type }
      if (resource_external_id) resource.external_id = resource_external_id
      else if (resource_id) resource.id = resource_id

      const data = await client.post<EvalResponse>('/access/v1/evaluation', {
        subject,
        resource,
        action: { name: action },
      })

      const lines = [
        `decision: ${data.decision ? 'ALLOWED ✓' : 'DENIED ✗'}`,
        `reason:   ${data.context.reason}`,
      ]
      if (data.context.access_path) lines.push(`path:     ${data.context.access_path}`)
      if (data.context.policy_id) lines.push(`policy:   ${data.context.policy_id}`)
      if (data.context.expires_in != null) lines.push(`expires_in: ${data.context.expires_in}s`)

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
    }
  )
}
