# Security

## Reporting a vulnerability

Report suspected vulnerabilities in Forge Agent Lens for Claude Code privately
through GitHub's private vulnerability reporting on this repository
("Security" → "Report a vulnerability"). Please don't open a public issue or
pull request for a security problem.

## Scope

Forge Agent Lens for Claude Code is a local Claude Code plugin. Its hooks run
on your machine and forward hook events to a local daemon, which reads the
session transcript and exports traces through the CoreWeave Forge SDK using
your W&B credentials. Reports about the hooks, the daemon and its Unix socket,
transcript handling, or the stored settings and API key are in scope.

The CoreWeave Forge SDK, Claude Code, and the W&B service are separate
projects with their own reporting channels.

## Known operating constraints

- There is no content gate or redactor. Prompts, responses, and tool
  arguments and results, including anything a tool prints, are exported as-is.
- An API key set with `config set wandb_api_key` is stored in plain text, readable
  only by your user, in `~/.forge-agent-lens-for-claude-code/settings.json`.
