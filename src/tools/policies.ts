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
    'Create a policy. A policy grants or denies a set of actions on a resource type (type-level) or a specific resource (instance-level). After creating, assign it to a subject or role with assign_policy.\n\nFor type-level: set resource_type_id and actions — the policy applies to ALL resources of that type.\nFor instance-level: set resource_id and actions — the policy applies to ONE specific resource.\n\nNote: resource_type_id may fail with a server error in some environments — if so, use resource_id (instance-level) or update the policy after creation with update_policy.',
    {
      name: z.string().describe('Policy name, e.g. "editors-can-read-write-documents"'),
      effect: z.enum(['ALLOW', 'DENY']).describe('ALLOW grants the actions. DENY blocks them even if another policy would allow. Use ALLOW unless you specifically need an override.'),
      actions: z.array(z.string()).describe('Actions this policy covers, e.g. ["read", "write"]'),
      resource_type_id: z.string().optional().describe('Resource type UUID — makes this a type-level policy (applies to ALL resources of this type). Mutually exclusive with resource_id.'),
      resource_id: z.string().optional().describe('Resource UUID — makes this an instance-level policy (applies to ONE specific resource). Mutually exclusive with resource_type_id.'),
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
    'update_policy',
    'Update an existing policy — change its name, description, effect, priority, action/resource assignments, or ABAC conditions. Use this instead of delete + recreate when you need to fix a policy.',
    {
      id: z.string().describe('Policy UUID'),
      name: z.string().optional().describe('New policy name'),
      effect: z.enum(['ALLOW', 'DENY']).optional().describe('New effect'),
      actions: z.array(z.string()).optional().describe('Replace actions list, e.g. ["read", "write"]'),
      resource_type_id: z.string().optional().describe('Resource type UUID — switch to type-level targeting'),
      resource_id: z.string().optional().describe('Resource UUID — switch to instance-level targeting'),
      priority: z.number().min(0).max(100).optional().describe('New priority 0–100'),
      description: z.string().optional().describe('New description'),
      conditions: z.record(z.unknown()).optional().describe(
        'Flat ABAC conditions object. Each key is an active guardrail or attribute check; all present keys must pass (AND). ' +
        'Keys: subject_attrs ([{attr, op, value}]), resource_attrs ([{attr, op, value}]), context_attrs ([{key, op, value}]), ' +
        'time_window ({start, end, days, tz}), ip_allowlist ({cidrs: [...]}), geo_restriction ({mode, countries}), ' +
        'mfa_required ({claim_path}). Omit a key to leave that check inactive. Pass {} to clear all conditions.'
      ),
    },
    async ({ id, name, effect, actions, resource_type_id, resource_id, priority, description, conditions }) => {
      const body: Record<string, unknown> = {}
      if (name !== undefined) body.name = name
      if (effect !== undefined) body.effect = effect
      if (priority !== undefined) body.priority = priority
      if (description !== undefined) body.description = description
      if (conditions !== undefined) body.conditions = conditions
      if (resource_type_id && actions) {
        body.resource_types = [{ resource_type_id, actions }]
      } else if (resource_id && actions) {
        body.resources = [{ resource_id, actions }]
      } else if (actions) {
        body.actions = actions
      }
      const data = await client.put<Policy>(`/v1/policies/${id}`, body)
      return { content: [{ type: 'text' as const, text: `Policy ${id} updated.\n\n${JSON.stringify(data, null, 2)}` }] }
    }
  )

  server.tool(
    'assign_policy',
    'Assign a policy to an entity (subject), role, or group. This is what actually grants access — creating a policy alone does nothing until it is assigned.\n\nRecommended RBAC flow: assign policy → role, then assign role → subject (via assign_role_to_subject). Direct entity assignment also works for one-off grants.\n\nFor time-boxed (JIT) access: set expires_at. For future-dated access: also set starts_at.',
    {
      policy_id: z.string().describe('Policy UUID'),
      entity_type: z.enum(['entity', 'role', 'group']).describe('What type to assign the policy to: "entity" (a subject/user/service/agent), "role", or "group"'),
      entity_id: z.string().describe('UUID of the entity, role, or group'),
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
    'Remove a policy assignment from an entity, role, or group. Access granted by this policy is revoked immediately.',
    {
      policy_id: z.string().describe('Policy UUID'),
      entity_type: z.enum(['entity', 'role', 'group']).describe('Entity type: "entity" (subject), "role", or "group"'),
      entity_id: z.string().describe('UUID of the entity, role, or group'),
    },
    async ({ policy_id, entity_type, entity_id }) => {
      await client.delete(`/v1/policies/unassign/${entity_type}/${entity_id}/${policy_id}`)
      return { content: [{ type: 'text' as const, text: `Policy ${policy_id} unassigned from ${entity_type} ${entity_id}.` }] }
    }
  )
}
