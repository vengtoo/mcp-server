import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { VengtooClient } from '../client.js'

interface Action { name: string; description?: string }
interface ResourceType { id: string; name: string; description?: string; default_actions: Action[] }

export function registerResourceTypeTools(server: McpServer, client: VengtooClient) {
  server.tool(
    'list_resource_types',
    'List all resource types. A resource type defines a category of thing you protect (e.g. "document", "project", "invoice") and the actions available on it.',
    {},
    async () => {
      const data = await client.get<ResourceType[]>('/v1/resource-types')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'create_resource_type',
    'Create a resource type. Do this before creating resources or policies. The actions list defines what verbs are valid for this type (e.g. ["read", "write", "delete"]). Policies targeting this type use these action names.',
    {
      name: z.string().describe('Resource type name, e.g. "document" or "invoice". Use singular lowercase.'),
      actions: z.array(z.string()).describe('Actions available on this type, e.g. ["read", "write", "delete", "share"]'),
      description: z.string().optional().describe('Optional description'),
    },
    async ({ name, actions, description }) => {
      const data = await client.post<ResourceType>('/v1/resource-types', {
        name,
        description,
        default_actions: actions.map(a => ({ name: a })),
      })
      return { content: [{ type: 'text' as const, text: `Resource type "${name}" created.\n\n${JSON.stringify(data, null, 2)}` }] }
    }
  )

  server.tool(
    'get_resource_type',
    'Get a resource type by ID.',
    { id: z.string().describe('Resource type UUID') },
    async ({ id }) => {
      const data = await client.get<ResourceType>(`/v1/resource-types/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'delete_resource_type',
    'Delete a resource type by ID.',
    { id: z.string().describe('Resource type UUID') },
    async ({ id }) => {
      await client.delete(`/v1/resource-types/${id}`)
      return { content: [{ type: 'text' as const, text: `Resource type ${id} deleted.` }] }
    }
  )
}
