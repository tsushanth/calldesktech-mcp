# Changelog

## 1.0.4
- Add missing read/update tools for parity: `get_subflow`, `get_knowledge_base`, `update_knowledge_base`, `get_webhook`, `update_webhook`
- Fix `McpServer` version to match package
- README: document all tools including `get_batch_call`, `list_agent_environments`, `promote_agent_environment`

## 1.0.3
- Bump version to resolve npm staged publish conflict

## 1.0.2
- Bump version to resolve npm publish conflict with staged 1.0.1

## 1.0.1
- Add `list_agent_templates` and `create_agent_from_template` tools
- Support `variables` in `create_agent_from_template`
- Document `agent_name`, language settings, environments, batch call dynamic variables, and `agent_transfer` in flow authoring guide
- README: lead with hosted MCP server instructions

## 1.0.0
- Initial release: agents, subflows, knowledge bases, phone numbers, calls, batch calls, webhooks, and analytics tools
- Flow authoring guide with all node types and edge rules
