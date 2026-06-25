# @vengtoo/mcp-server

> **Early access** — `0.x` releases may have breaking changes. Pin your version if stability matters.

Manage your Vengtoo authorization model and check access through any MCP-compatible AI tool.

Exposes your Vengtoo tenant as MCP tools — create resource types, subjects, roles, and policies; assign them; and check authorization decisions — all from a conversation.

## Install

Add to your MCP client config (Claude Code, Cursor, Windsurf, Cline, or any MCP-compatible tool):

```json
{
  "mcpServers": {
    "vengtoo": {
      "command": "npx",
      "args": ["@vengtoo/mcp-server"],
      "env": {
        "VENGTOO_API_KEY": "azx_..."
      }
    }
  }
}
```

Or with OAuth2 client credentials:

```json
{
  "mcpServers": {
    "vengtoo": {
      "command": "npx",
      "args": ["@vengtoo/mcp-server"],
      "env": {
        "VENGTOO_CLIENT_ID": "client_...",
        "VENGTOO_CLIENT_SECRET": "azx_cs_..."
      }
    }
  }
}
```

**Claude Code shortcut:**

```bash
claude mcp add vengtoo -e VENGTOO_API_KEY=azx_... -- npx @vengtoo/mcp-server
```

## Local build (development)

```bash
npm install
npm run build
node dist/index.js
```

Point at a local agent instead of cloud:

```json
"env": {
  "VENGTOO_API_KEY": "azx_...",
  "VENGTOO_BASE_URL": "http://localhost:8181"
}
```

## Tools

| Tool | What it does |
|---|---|
| `list_namespaces` / `create_namespace` / `get_namespace` / `delete_namespace` | Namespace management |
| `list_resource_types` / `create_resource_type` / `get_resource_type` / `delete_resource_type` | Resource type management |
| `list_resources` / `create_resource` / `get_resource` / `delete_resource` | Resource management |
| `list_subjects` / `create_subject` / `get_subject` / `delete_subject` | Subject management |
| `assign_role_to_subject` / `unassign_role_from_subject` | Role membership |
| `list_roles` / `create_role` / `get_role` / `delete_role` | Role management |
| `list_policies` / `create_policy` / `get_policy` / `delete_policy` | Policy management |
| `assign_policy` / `unassign_policy` | Policy assignment (with optional `starts_at`/`expires_at` for JIT access) |
| `check_authorization` | Evaluate whether a subject can perform an action on a resource |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VENGTOO_API_KEY` | One of these two | API key starting with `azx_` |
| `VENGTOO_CLIENT_ID` + `VENGTOO_CLIENT_SECRET` | One of these two | OAuth2 client credentials |
| `VENGTOO_BASE_URL` | No | Override API base URL. Default: `https://api.vengtoo.com` |

## Docs

[vengtoo.com/docs](https://vengtoo.com/docs)

## License

MIT
