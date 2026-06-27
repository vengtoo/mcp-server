import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { VengtooClient } from '../client.js'

interface Subject { id: string; name: string; type: string; external_id?: string }
interface SubjectAttributeDefinition { id: string; name: string; type: string; description?: string; required: boolean }

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
      type: z.enum(['user', 'service', 'agent', 'device']).describe('Subject type. Must be one of: "user" (human), "service" (backend service), "agent" (AI agent), "device". Always confirm with the user before choosing.'),
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
    'define_subject_attribute',
    'Declare a subject attribute definition — the first-class vocabulary that ABAC subject_attrs conditions can reference (e.g. "department", "clearance", "team"). ' +
    'Definitions are loose mode: the backend does not reject undefined keys, but defining an attribute here makes it appear in the dashboard\'s subject form as a typed dropdown so operators can fill it in without knowing key names. ' +
    'Do this before writing the ABAC condition so the dashboard autocomplete works. Then set actual values on subjects with update_subject.',
    {
      name: z.string().describe('Attribute key name used in ABAC conditions, e.g. "department" or "clearance". Must match exactly what the policy\'s subject_attrs[].attr references.'),
      type: z.enum(['string', 'int', 'bool', 'enum', 'object', 'json']).describe('Value type. Use "bool" (not "boolean"), "int" (not "number"). Use "enum" with enum_options for a fixed set of choices. "json" accepts any JSON value.'),
      description: z.string().optional().describe('Human-readable description shown in the dashboard, e.g. "Employee department for policy scoping"'),
      required: z.boolean().optional().describe('Mark as required in the dashboard form (advisory only — backend does not enforce). Default false.'),
      enum_options: z.array(z.string()).optional().describe('Allowed values when type is "enum", e.g. ["engineering", "finance", "hr"]. Ignored for other types.'),
    },
    async ({ name, type, description, required, enum_options }) => {
      const body: Record<string, unknown> = { name, type, required: required ?? false }
      if (description) body.description = description
      if (enum_options?.length) body.enum_options = enum_options
      const data = await client.post<SubjectAttributeDefinition>('/v1/subject-attributes', body)
      return { content: [{ type: 'text' as const, text: `Subject attribute definition "${name}" created.\n\n${JSON.stringify(data, null, 2)}` }] }
    }
  )

  server.tool(
    'update_subject',
    'Update a subject\'s name, type, external_id, or attributes. Use this to set or replace subject attribute values that ABAC conditions evaluate (e.g. department, clearance level, team). ' +
    'Tip: define the attribute schema first with define_subject_attribute so the dashboard shows typed dropdowns for operators — but update_subject works without definitions (ad hoc mode). ' +
    'Pass only the fields you want to change.',
    {
      id: z.string().describe('Subject UUID'),
      name: z.string().optional().describe('New display name'),
      type: z.enum(['user', 'service', 'agent', 'device']).optional().describe('New subject type'),
      external_id: z.string().optional().describe('New external identifier'),
      attributes: z.record(z.unknown()).optional().describe(
        'Attribute key-value pairs to set on this subject. These are read by subject_attrs ABAC conditions. ' +
        'Example: {"department": "engineering", "clearance": 3, "team": "platform"}. ' +
        'Replaces the entire attributes object — include all existing attributes you want to keep.'
      ),
    },
    async ({ id, name, type, external_id, attributes }) => {
      const body: Record<string, unknown> = {}
      if (name !== undefined) body.name = name
      if (type !== undefined) body.type = type
      if (external_id !== undefined) body.external_id = external_id
      if (attributes !== undefined) body.attributes = attributes
      const data = await client.put<Subject>(`/v1/entities/${id}`, body)
      return { content: [{ type: 'text' as const, text: `Subject ${id} updated.\n\n${JSON.stringify(data, null, 2)}` }] }
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
