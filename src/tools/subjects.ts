import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { VengtooClient } from '../client.js'

interface Subject { id: string; name: string; type: string; external_id?: string }

export function registerSubjectTools(server: McpServer, client: VengtooClient) {
  server.tool(
    'list_subjects',
    'List subjects (users, services, AI agents, or any other principal) in the tenant.',
    {
      type: z.string().optional().describe('Filter by subject type, e.g. "user" or "service"'),
    },
    async ({ type }) => {
      const path = type ? `/v1/entities?type=${encodeURIComponent(type)}` : '/v1/entities'
      const data = await client.get<Subject[]>(path)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'create_subject',
    'Create a subject — any principal that can be authorized (user, service, AI agent, device). Set external_id to your system\'s own user/service identifier so evaluation calls can reference it without a Vengtoo UUID lookup.',
    {
      name: z.string().describe('Display name, e.g. "Alice" or "payment-service"'),
      type: z.string().describe('Subject type, e.g. "user", "service", "agent". Use consistent values across your tenant.'),
      external_id: z.string().optional().describe('Your system\'s own identifier for this subject (recommended). Used in evaluation calls as subject.external_id.'),
    },
    async ({ name, type, external_id }) => {
      const data = await client.post<Subject>('/v1/entities', { name, type, external_id })
      return { content: [{ type: 'text' as const, text: `Subject "${name}" created.\n\n${JSON.stringify(data, null, 2)}` }] }
    }
  )

  server.tool(
    'get_subject',
    'Get a subject by ID.',
    { id: z.string().describe('Subject UUID') },
    async ({ id }) => {
      const data = await client.get<Subject>(`/v1/entities/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'delete_subject',
    'Delete a subject by ID.',
    { id: z.string().describe('Subject UUID') },
    async ({ id }) => {
      await client.delete(`/v1/entities/${id}`)
      return { content: [{ type: 'text' as const, text: `Subject ${id} deleted.` }] }
    }
  )

  server.tool(
    'assign_role_to_subject',
    'Give a subject a role. The subject inherits all policies assigned to the role. Use this to build RBAC: create a role, assign policies to it, then assign the role to subjects.',
    {
      subject_id: z.string().describe('Subject UUID'),
      role_id: z.string().describe('Role UUID'),
    },
    async ({ subject_id, role_id }) => {
      await client.post(`/v1/entities/${subject_id}/roles`, { role_id })
      return { content: [{ type: 'text' as const, text: `Role ${role_id} assigned to subject ${subject_id}.` }] }
    }
  )

  server.tool(
    'unassign_role_from_subject',
    'Remove a role from a subject. The subject immediately loses any access that came exclusively from this role.',
    {
      subject_id: z.string().describe('Subject UUID'),
      role_id: z.string().describe('Role UUID'),
    },
    async ({ subject_id, role_id }) => {
      await client.delete(`/v1/entities/${subject_id}/roles/${role_id}`)
      return { content: [{ type: 'text' as const, text: `Role ${role_id} removed from subject ${subject_id}.` }] }
    }
  )
}
