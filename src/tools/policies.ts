import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { VengtooClient } from '../client.js'

interface Policy { id: string; name: string; effect: string; priority: number }

export function registerPolicyTools(server: McpServer, client: VengtooClient) {
  server.tool(
    'list_policies',
    'List all policies in the tenant.',
    {},
    async () => {
      const data = await client.get<Policy[]>('/v1/policies')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'create_policy',
    'Create a policy. A policy grants or denies a set of actions on a resource type (type-level) or a specific resource (instance-level). After creating, assign it to a subject or role with assign_policy.\n\nFor type-level: set resource_type_id and actions — the policy applies to ALL resources of that type.\nFor instance-level: set resource_id and actions — the policy applies to ONE specific resource.',
    {
      name: z.string().describe('Policy name, e.g. "editors-can-read-write-documents"'),
      effect: z.enum(['ALLOW', 'DENY']).describe('ALLOW grants the actions. DENY blocks them even if another policy would allow. Use ALLOW unless you specifically need an override.'),
      actions: z.array(z.string()).describe('Actions this policy covers, e.g. ["read", "write"]'),
      resource_type_id: z.string().optional().describe('Resource type UUID — makes this a type-level policy. Mutually exclusive with resource_id.'),
      resource_id: z.string().optional().describe('Resource UUID — makes this an instance-level policy. Mutually exclusive with resource_type_id.'),
      priority: z.number().min(0).max(100).optional().describe('Priority 0–100. Higher priority wins when multiple policies apply. Default 50.'),
      description: z.string().optional().describe('Optional description'),
    },
    async ({ name, effect, actions, resource_type_id, resource_id, priority, description }) => {
      const body: Record<string, unknown> = { name, effect, priority: priority ?? 50, description }

      if (resource_type_id) {
        body.resource_types = [{ resource_type_id, actions }]
      } else if (resource_id) {
        body.resources = [{ resource_id, actions }]
      } else {
        body.actions = actions
      }

      const data = await client.post<Policy>('/v1/policies', body)
      return { content: [{ type: 'text' as const, text: `Policy "${name}" created.\n\n${JSON.stringify(data, null, 2)}` }] }
    }
  )

  server.tool(
    'get_policy',
    'Get a policy by ID, including its resource and action assignments.',
    { id: z.string().describe('Policy UUID') },
    async ({ id }) => {
      const data = await client.get<Policy>(`/v1/policies/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'delete_policy',
    'Delete a policy by ID. Subjects or roles that had this policy assigned immediately lose the access it granted.',
    { id: z.string().describe('Policy UUID') },
    async ({ id }) => {
      await client.delete(`/v1/policies/${id}`)
      return { content: [{ type: 'text' as const, text: `Policy ${id} deleted.` }] }
    }
  )

  server.tool(
    'assign_policy',
    'Assign a policy to a subject, role, or group. This is what actually grants access — creating a policy alone does nothing until it is assigned.\n\nentity_type must be "subject", "role", or "group".\n\nFor time-boxed (JIT) access: set expires_at. For future-dated access: also set starts_at.',
    {
      policy_id: z.string().describe('Policy UUID'),
      entity_type: z.enum(['subject', 'role', 'group']).describe('What type of entity to assign the policy to'),
      entity_id: z.string().describe('UUID of the subject, role, or group'),
      starts_at: z.string().optional().describe('RFC3339 timestamp when the assignment becomes active. If omitted, active immediately.'),
      expires_at: z.string().optional().describe('RFC3339 timestamp when the assignment expires. If omitted, does not expire.'),
    },
    async ({ policy_id, entity_type, entity_id, starts_at, expires_at }) => {
      await client.put('/v1/policies/assign', {
        policy_ids: [policy_id],
        entity_type,
        entity_id,
        ...(starts_at && { starts_at }),
        ...(expires_at && { expires_at }),
      })
      return {
        content: [{
          type: 'text' as const,
          text: `Policy ${policy_id} assigned to ${entity_type} ${entity_id}.${expires_at ? ` Expires: ${expires_at}` : ''}`,
        }],
      }
    }
  )

  server.tool(
    'unassign_policy',
    'Remove a policy assignment from a subject, role, or group. Access granted by this policy is revoked immediately.',
    {
      policy_id: z.string().describe('Policy UUID'),
      entity_type: z.enum(['subject', 'role', 'group']).describe('Entity type'),
      entity_id: z.string().describe('UUID of the subject, role, or group'),
    },
    async ({ policy_id, entity_type, entity_id }) => {
      await client.delete(`/v1/policies/unassign/${entity_type}/${entity_id}/${policy_id}`)
      return { content: [{ type: 'text' as const, text: `Policy ${policy_id} unassigned from ${entity_type} ${entity_id}.` }] }
    }
  )
}
