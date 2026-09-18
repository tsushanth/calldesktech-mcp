# calldesktech-mcp

An [MCP](https://modelcontextprotocol.io) server for the [CallDeskTech](https://calldesk-tech.fly.dev) API. Let Claude (or any MCP client) build, publish and operate voice agents: conversation flows, subflows, knowledge bases, phone-number routing, calls, batch calls and webhooks.

## Setup

1. In CallDeskTech, open **Settings → API Keys** and create a key (`cdk_live_…`). It is shown once and is pinned to one workspace.
2. Add the server to your MCP client.

**Claude Code**

```bash
claude mcp add calldesktech --env CALLDESK_API_KEY=cdk_live_... -- npx -y github:tsushanth/calldesktech-mcp
```

**Claude Desktop / any client** — `mcpServers` entry:

```json
{
  "mcpServers": {
    "calldesktech": {
      "command": "npx",
      "args": ["-y", "github:tsushanth/calldesktech-mcp"],
      "env": { "CALLDESK_API_KEY": "cdk_live_..." }
    }
  }
}
```

| Variable | Required | Default |
|---|---|---|
| `CALLDESK_API_KEY` | yes | — |
| `CALLDESK_BASE_URL` | no | `https://calldesk-tech.fly.dev/api/v1` |

## Tools

Start with **`flow_authoring_guide`** — it documents every node type, its params, edge rules and the gotchas (e.g. conversational nodes wait for the caller; knowledge bases must be attached to an agent).

| Area | Tools |
|---|---|
| Account | `whoami` |
| Agents | `list_agents` `create_agent` `get_agent` `rename_agent` `delete_agent` `list_agent_versions` `publish_agent_version` |
| Subflows | `list_subflows` `create_subflow` `update_subflow` `delete_subflow` |
| Knowledge | `list_knowledge_bases` `create_knowledge_base` `add_knowledge_items` `delete_knowledge_base` |
| Numbers & calls | `list_phone_numbers` `set_number_routing` `place_call` `list_calls` `get_call` |
| Batch calls | `list_batch_calls` `create_batch_call` `run_batch_call` |
| Webhooks | `list_webhooks` `create_webhook` `delete_webhook` |
| Analytics | `get_analytics` `get_qa_overview` |

Tools that cost money (`place_call`, `run_batch_call`) or delete data are annotated so clients can ask before running them.

## Typical workflow

1. `create_agent` → 2. `publish_agent_version` with a flow → 3. `set_number_routing` to point a number at the returned version id → 4. `place_call` to try it → 5. `get_call` for the transcript.

## Security

The key can only reach its own workspace and cannot create or revoke other keys. Revoke it any time in Settings → API Keys. Full API reference: <https://calldesk-tech.fly.dev/docs>.

## License

MIT
