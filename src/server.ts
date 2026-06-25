import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { VengtooClient } from './client.js'
import { registerNamespaceTools } from './tools/namespaces.js'
import { registerResourceTypeTools } from './tools/resource-types.js'
import { registerResourceTools } from './tools/resources.js'
import { registerSubjectTools } from './tools/subjects.js'
import { registerRoleTools } from './tools/roles.js'
import { registerPolicyTools } from './tools/policies.js'
import { registerEvaluateTools } from './tools/evaluate.js'

export function createServer(client: VengtooClient): McpServer {
  const server = new McpServer({
    name: 'vengtoo',
    version: '1.0.0',
  })

  registerNamespaceTools(server, client)
  registerResourceTypeTools(server, client)
  registerResourceTools(server, client)
  registerSubjectTools(server, client)
  registerRoleTools(server, client)
  registerPolicyTools(server, client)
  registerEvaluateTools(server, client)

  return server
}
