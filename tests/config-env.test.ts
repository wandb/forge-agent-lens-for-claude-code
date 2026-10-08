// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: Apache-2.0
// SPDX-PackageName: forge-agent-lens-for-claude-code

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectSource, resolveDaemonConfig, resolveProject } from '../src/config.ts';
import type { Settings } from '../src/setup.ts';

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    log_file: '', daemon_socket: '', project: 'settings-entity/settings-project',
    wandb_api_key: null, agent_name: null, debug: false,
    installed_at: '', version: '0.0.0-test', ...overrides,
  };
}

test('FORGE_TRACE_PROJECT beats settings.project', () => {
  assert.deepEqual(resolveProject(settings(), {}),
    { value: 'settings-entity/settings-project', source: ProjectSource.Settings });
  assert.deepEqual(resolveProject(settings(), { FORGE_TRACE_PROJECT: 'forge/p' }),
    { value: 'forge/p', source: ProjectSource.EnvVar });
  assert.equal(ProjectSource.EnvVar, 'FORGE_TRACE_PROJECT env var');
});

test('FORGE_CLAUDE_CODE_DEBUG enables daemon debug logging', () => {
  assert.equal(resolveDaemonConfig(settings(), {}).debug, false);
  assert.equal(resolveDaemonConfig(settings(), { FORGE_CLAUDE_CODE_DEBUG: '1' }).debug, true);
});
