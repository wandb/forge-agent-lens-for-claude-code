// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: forge-claude-code

// FORGE_* variables win; the pre-rename WEAVE_* names keep working for
// existing shells, and still beat settings.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AgentNameSource,
  ProjectSource,
  resolveAgentName,
  resolveDaemonConfig,
  resolveProject,
} from '../src/config.ts';
import type { Settings } from '../src/setup.ts';

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    log_file: '', daemon_socket: '', project: 'settings-entity/settings-project',
    wandb_api_key: null, agent_name: 'settings-agent', debug: false,
    installed_at: '', version: '0.0.0-test', ...overrides,
  };
}

test('FORGE_TRACE_PROJECT beats the legacy WEAVE_PROJECT, which beats settings', () => {
  assert.deepEqual(resolveProject(settings(), {}),
    { value: 'settings-entity/settings-project', source: ProjectSource.Settings });
  assert.deepEqual(resolveProject(settings(), { WEAVE_PROJECT: 'legacy/p' }),
    { value: 'legacy/p', source: ProjectSource.LegacyEnvVar });
  assert.deepEqual(resolveProject(settings(), { WEAVE_PROJECT: 'legacy/p', FORGE_TRACE_PROJECT: 'forge/p' }),
    { value: 'forge/p', source: ProjectSource.EnvVar });
  assert.deepEqual(resolveProject(settings({ project: null }), {}),
    { value: null, source: ProjectSource.NotSet });
  assert.equal(ProjectSource.EnvVar, 'FORGE_TRACE_PROJECT env var');
  assert.equal(ProjectSource.LegacyEnvVar, 'WEAVE_PROJECT env var');
});

test('FORGE_CLAUDE_CODE_AGENT_NAME beats the legacy WEAVE_AGENT_NAME', () => {
  assert.deepEqual(resolveAgentName(settings(), { WEAVE_AGENT_NAME: 'legacy' }),
    { value: 'legacy', source: AgentNameSource.LegacyEnvVar });
  assert.deepEqual(resolveAgentName(settings(), { WEAVE_AGENT_NAME: 'legacy', FORGE_CLAUDE_CODE_AGENT_NAME: ' forge ' }),
    { value: 'forge', source: AgentNameSource.EnvVar });
  assert.equal(AgentNameSource.EnvVar, 'FORGE_CLAUDE_CODE_AGENT_NAME env var');
});

test('either debug variable enables daemon debug logging', () => {
  assert.equal(resolveDaemonConfig(settings(), {}).debug, false);
  assert.equal(resolveDaemonConfig(settings(), { FORGE_CLAUDE_CODE_DEBUG: '1' }).debug, true);
  assert.equal(resolveDaemonConfig(settings(), { WEAVE_CLAUDE_DEBUG: '1' }).debug, true);
  assert.equal(resolveDaemonConfig(settings(), { FORGE_TRACE_PROJECT: 'forge/p' }).project, 'forge/p');
});
