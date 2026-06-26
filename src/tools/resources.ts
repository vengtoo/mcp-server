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
      type: z.string().describe('Resource type UUID — get this from list_resource_types or create_resource_type. Must be a UUID, not a name.'),
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
    'update_resource',
    'Update a resource\'s name, description, external_id, or attributes. Use this to set or replace resource attributes that ABAC conditions will evaluate (e.g. status, classification, department). Pass only the fields you want to change.',
    {
      id: z.string().describe('Resource UUID'),
      name: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      external_id: z.string().optional().describe('New external identifier'),
      attributes: z.record(z.unknown()).optional().describe(
        'Attribute key-value pairs to set on this resource. These are read by resource_attrs ABAC conditions. ' +
        'Example: {"status": "published", "classification": "internal", "department": "engineering"}. ' +
        'Replaces the entire attributes object — include all existing attributes you want to keep.'
      ),
    },
    async ({ id, name, description, external_id, attributes }) => {
      const body: Record<string, unknown> = {}
      if (name !== undefined) body.name = name
      if (description !== undefined) body.description = description
      if (external_id !== undefined) body.external_id = external_id
      if (attributes !== undefined) body.attributes = attributes
      const data = await client.put<Resource>(`/v1/resources/${id}`, body)
      return { content: [{ type: 'text' as const, text: `Resource ${id} updated.\n\n${JSON.stringify(data, null, 2)}` }] }
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
