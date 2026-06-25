#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { clientFromEnv } from './client.js'
import { createServer } from './server.js'

const client = clientFromEnv()
const server = createServer(client)

const transport = new StdioServerTransport()
await server.connect(transport)
