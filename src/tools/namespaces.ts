import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { VengtooClient } from '../client.js'

interface Namespace { id: string; name: string; description?: string }

export function registerNamespaceTools(server: McpServer, client: VengtooClient) {
  server.tool(
    'list_namespaces',
    'List all namespaces in the tenant. Namespaces are optional containers that scope resources — useful when the same resource type name is used across multiple isolated environments (e.g., prod vs staging).',
    {},
    async () => {
      const data = await client.get<Namespace[]>('/v1/namespaces')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'create_namespace',
    'Create a new namespace. Resources created inside this namespace are isolated from resources in other namespaces. Use "default" namespace unless you specifically need isolation.',
    {
      name: z.string().describe('Namespace name, e.g. "production" or "acme-corp"'),
      description: z.string().optional().describe('Optional description'),
    },
    async ({ name, description }) => {
      const data = await client.post<Namespace>('/v1/namespaces', { name, description })
      return { content: [{ type: 'text' as const, text: `Namespace created.\n\n${JSON.stringify(data, null, 2)}` }] }
    }
  )

  server.tool(
    'get_namespace',
    'Get a namespace by ID.',
    { id: z.string().describe('Namespace UUID') },
    async ({ id }) => {
      const data = await client.get<Namespace>(`/v1/namespaces/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    }
  )

  server.tool(
    'delete_namespace',
    'Delete a namespace by ID. This does not delete the resources inside it.',
    { id: z.string().describe('Namespace UUID') },
    async ({ id }) => {
      await client.delete(`/v1/namespaces/${id}`)
      return { content: [{ type: 'text' as const, text: `Namespace ${id} deleted.` }] }
    }
  )
}
