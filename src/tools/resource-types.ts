import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { VengtooClient } from '../client.js'

interface Action { name: string; description?: string }
interface AttributeDefinition { name: string; type: string; required?: boolean; description?: string; default?: unknown }
interface ResourceType { id: string; name: string; description?: string; default_actions: Action[]; attribute_schema?: AttributeDefinition[] }

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
    'Create a resource type. Do this before creating resources or policies. The actions list defines what verbs are valid for this type (e.g. ["read", "write", "delete"]). Policies targeting this type use these action names. ' +
    'Use attribute_schema to declare typed attributes (e.g. "status", "classification", "department") — these power the dashboard\'s resource form dropdowns and the resource_attrs ABAC condition picker. ' +
    'Loose mode: the backend does not reject resources with undeclared attributes, but defining the schema gives operators typed fields in the UI.',
    {
      name: z.string().describe('Resource type name, e.g. "document" or "invoice". Use singular lowercase.'),
      actions: z.array(z.string()).describe('Actions available on this type, e.g. ["read", "write", "delete", "share"]'),
      description: z.string().optional().describe('Optional description'),
      attribute_schema: z.array(z.object({
        name: z.string().describe('Attribute key, e.g. "status" or "classification". Must match resource_attrs[].attr in ABAC conditions.'),
        type: z.enum(['string', 'number', 'boolean', 'array', 'object']).describe('Value type'),
        required: z.boolean().optional().describe('Mark as required in dashboard form (advisory). Default false.'),
        description: z.string().optional().describe('Human-readable label shown in the dashboard'),
        default: z.unknown().optional().describe('Default value shown in the dashboard form'),
      })).optional().describe('Attribute schema for this resource type. Defines what attributes resources of this type can carry, powers dashboard form autocomplete and resource_attrs ABAC condition picker.'),
    },
    async ({ name, actions, description, attribute_schema }) => {
      const data = await client.post<ResourceType>('/v1/resource-types', {
        name,
        description,
        default_actions: actions.map(a => ({ name: a })),
        ...(attribute_schema?.length && { attribute_schema }),
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
