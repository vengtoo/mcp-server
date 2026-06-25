import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { VengtooClient } from '../client.js'

interface Resource { id: string; name: string; type: string; external_id?: string; description?: string }

export function registerResourceTools(server: McpServer, client: VengtooClient) {
  server.tool(
    'list_resources',
    'List resources in the tenant.',
    {},
    async () => {
      const data = await client.get<Resource[]>('/v1/resources')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'create_resource',
    'Create a resource — a specific instance of a resource type (e.g. a specific document, a specific project). Set external_id to your system\'s own identifier (database UUID, slug) so you can reference it at evaluation time without storing Vengtoo\'s internal ID.',
    {
      name: z.string().describe('Human-readable resource name, e.g. "Engineering Wiki"'),
      type: z.string().describe('Resource type UUID (from create_resource_type) or resource type name'),
      external_id: z.string().optional().describe('Your system\'s own ID for this resource (recommended). Used in evaluation calls as resource.external_id.'),
      description: z.string().optional().describe('Optional description'),
    },
    async ({ name, type, external_id, description }) => {
      const data = await client.post<Resource>('/v1/resources', { name, type, external_id, description })
      return { content: [{ type: 'text' as const, text: `Resource "${name}" created.\n\n${JSON.stringify(data, null, 2)}` }] }
    }
  )

  server.tool(
    'get_resource',
    'Get a resource by ID.',
    { id: z.string().describe('Resource UUID') },
    async ({ id }) => {
      const data = await client.get<Resource>(`/v1/resources/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'delete_resource',
    'Delete a resource by ID.',
    { id: z.string().describe('Resource UUID') },
    async ({ id }) => {
      await client.delete(`/v1/resources/${id}`)
      return { content: [{ type: 'text' as const, text: `Resource ${id} deleted.` }] }
    }
  )
}
