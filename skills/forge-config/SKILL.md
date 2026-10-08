---
name: forge-config
description: This skill should be used when the user wants to "configure Forge", "set Forge project", "change Forge project", "set wandb api key", "update Forge settings", "show Forge config", "change Forge configuration", "restart the Forge daemon", "apply Forge config changes", "restart Forge to pick up changes", or needs to read or update any Forge Agent Lens for Claude Code plugin settings.
---

# Forge Agent Lens for Claude Code Plugin — Config

Read and update configuration for the Forge Agent Lens for Claude Code plugin.

## Determine Intent

If the user invoked this skill with arguments (e.g., `/forge:forge-config set project entity/project`), execute the corresponding command directly. Otherwise, show the current configuration first and then ask what they want to change.

## Show Current Config

Run:
```bash
forge-agent-lens-for-claude-code config show
```

This displays all settings and their sources (settings file vs environment variable).

## Set a Value

To update a setting:
```bash
forge-agent-lens-for-claude-code config set KEY VALUE
```

Writable keys:

| Key | Format | Example |
|-----|--------|---------|
| `project` | `entity/project` | `my-org/my-project` |
| `wandb_api_key` | string | `abc123...` |
| `agent_name` | string | `my-team-bot` |
| `debug` | `true` / `false` | `true` |
| `daemon_socket` | file path | `~/.forge-agent-lens-for-claude-code/daemon.sock` |

**Validation notes:**
- `project` must contain a `/` (entity/project format). Find your entity name at https://wandb.ai.
- `wandb_api_key` is available at https://wandb.ai/authorize.
- `agent_name` is the name shown for the top-level agent in CoreWeave Forge AgentLens. It must not be empty; surrounding whitespace is trimmed. Defaults to `claude-code` when unset.
- Environment variables `FORGE_TRACE_PROJECT`, `WANDB_API_KEY`, and `FORGE_CLAUDE_CODE_AGENT_NAME` take precedence over settings file values when set.

## Get a Single Value

To read one setting:
```bash
forge-agent-lens-for-claude-code config get KEY
```

## After Changes

After setting `project`, `wandb_api_key`, or `agent_name`, run `forge-agent-lens-for-claude-code config show` to confirm the new value.

The daemon reads these once at startup and persists across Claude Code sessions, so a change is **not** picked up by a daemon that is already running. Apply it with:

```bash
forge-agent-lens-for-claude-code restart
```

This stops the running daemon and starts a fresh one. (If none is running, the next Claude Code session starts one with the updated config.)
