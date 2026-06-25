import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { VengtooClient } from '../client.js'

interface Role { id: string; name: string; description?: string }

export function registerRoleTools(server: McpServer, client: VengtooClient) {
  server.tool(
    'list_roles',
    'List all roles. Roles are named collections of policies — assign a role to many subjects instead of assigning the same policies repeatedly.',
    {},
    async () => {
      const data = await client.get<Role[]>('/v1/roles')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'create_role',
    'Create a role. After creating it, assign policies to the role with assign_policy (entity_type: "role"), then assign subjects to the role with assign_role_to_subject.',
    {
      name: z.string().describe('Role name, e.g. "editor" or "billing-admin"'),
      description: z.string().optional().describe('Optional description'),
    },
    async ({ name, description }) => {
      const data = await client.post<Role>('/v1/roles', { name, description })
      return { content: [{ type: 'text' as const, text: `Role "${name}" created.\n\n${JSON.stringify(data, null, 2)}` }] }
    }
  )

  server.tool(
    'get_role',
    'Get a role by ID.',
    { id: z.string().describe('Role UUID') },
    async ({ id }) => {
      const data = await client.get<Role>(`/v1/roles/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'delete_role',
    'Delete a role by ID. Subjects who had this role lose any access that came exclusively from it.',
    { id: z.string().describe('Role UUID') },
    async ({ id }) => {
      await client.delete(`/v1/roles/${id}`)
      return { content: [{ type: 'text' as const, text: `Role ${id} deleted.` }] }
    }
  )
}
