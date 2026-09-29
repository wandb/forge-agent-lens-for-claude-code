---
name: forge-install
description: This skill should be used when the user wants to "install the forge plugin", "set up forge", "install forge-claude-code", "configure forge for the first time", "get started with forge tracing", or needs to complete the initial setup of the Forge Claude Code plugin including dependency installation and project configuration.
---

# Forge Claude Code Plugin — Install

Complete the full installation and initial configuration of the Forge Claude Code plugin.

## Step 0 — Detect prior install state

```bash
which forge-claude-code
```

- **Not found** → **Fresh install**. Continue with Step 1.
- **Found** → **Already installed or being upgraded**. Skip Step 1 and continue with Step 2: re-running `install` both refreshes after an npm upgrade (drift detection fires automatically) and re-validates an existing install.

## Step 1 — Install the CLI

```bash
npm install -g @coreweave/forge-claude-code
```

If it fails with a permission error (EACCES on a system Node install), confirm with the user before retrying with `sudo npm install -g @coreweave/forge-claude-code`.

Verify:
```bash
which forge-claude-code
```

Do not proceed until this prints a path.

## Step 2 — Run install

```bash
forge-claude-code install
```

This creates `~/.forge-claude-code/settings.json`, registers the marketplace in Claude Code, and installs the `forge` plugin at user scope.

The output will include one of:
- `✓ Marketplace registered (vX.Y.Z)` — first time on this machine.
- `✓ Marketplace already registered (vX.Y.Z)` — fully idempotent re-run.
- `✓ Marketplace refreshed (vOLD → vNEW)` followed by `✓ Plugin updated — restart Claude Code to apply` — the binary was upgraded since last run; drift detection refreshed the pin and upgraded the loaded plugin.

If `--force` is needed (e.g., rebuilding a corrupted settings.json), run `forge-claude-code install --force`.

## Step 3 — Configure the project

Check if `project` is already set:
```bash
forge-claude-code config get project
```

If it returns `(not set)`, ask the user for `entity/project` and set it:
```bash
forge-claude-code config set project ENTITY/PROJECT
```

## Step 4 — Configure API Key

Check current state:
```bash
forge-claude-code config show
```

If `wandb_api_key` shows `(not set)` and no `WANDB_API_KEY` env var is active, ask the user for their key (https://wandb.ai/authorize) and set it:
```bash
forge-claude-code config set wandb_api_key API_KEY
```

## Step 5 - (Optional) Custom Agent Name

Traces appear under the agent name `claude-code` in CoreWeave Forge AgentLens by default. If the user wants a custom name (e.g. to distinguish teams or projects), set it:
```bash
forge-claude-code config set agent_name CUSTOM_NAME
```
Skip this step unless the user asks; the default is fine for most users.

## Step 6 - Verify

```bash
forge-claude-code status
```

All items should show `✓`. If anything shows `✗`, diagnose and fix before reporting success.

On success, tell the user Claude Code sessions will now be traced to their project starting from the next session. If a `Plugin updated` or `Marketplace refreshed` line appeared in Step 2, remind them to run `/reload-plugins` (or restart Claude Code) so the running session picks up the new code.
