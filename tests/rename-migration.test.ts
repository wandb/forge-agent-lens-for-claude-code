// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: forge-claude-code

// Upgrading from weave-claude-code: `install` carries the old settings into the
// new config dir and removes the old marketplace, so its plugin stops firing
// hooks alongside the new one.

import { test, suite, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LEGACY_MARKETPLACE_NAME,
  MARKETPLACE_NAME,
  RemovalStatus,
  migrateLegacyConfig,
  registerPlugin,
} from '../src/setup.ts';
import { readFakeCalls, runCli } from './helpers.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FAKE_CLAUDE_BIN_DIR = path.join(HERE, 'fixtures', 'fake-claude-bin');

let tmpHome: string;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  fs.chmodSync(path.join(FAKE_CLAUDE_BIN_DIR, 'claude'), 0o755);
  tmpHome = fs.mkdtempSync('/tmp/wcp-rename-test-');
  saved = {
    HOME: process.env.HOME,
    PATH: process.env.PATH,
    FAKE_CLAUDE_MARKETPLACE_NAME: process.env.FAKE_CLAUDE_MARKETPLACE_NAME,
  };
  process.env.HOME = tmpHome;
  process.env.PATH = `${FAKE_CLAUDE_BIN_DIR}:${process.env.PATH}`;
  process.env.FAKE_CLAUDE_MARKETPLACE_NAME = MARKETPLACE_NAME;
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function writeLegacySettings(legacyDir: string): void {
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(legacyDir, 'settings.json'), JSON.stringify({
    log_file: path.join(legacyDir, 'logs', 'daemon.log'),
    daemon_socket: path.join(legacyDir, 'daemon.sock'),
    weave_project: 'old-entity/old-project',
    wandb_api_key: 'legacy-key',
    agent_name: 'legacy-agent',
    debug: true,
    installed_at: '2026-01-01T00:00:00Z',
    version: '0.2.15',
  }));
}

function readSettings(configDir: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8'));
}

suite('migrateLegacyConfig', () => {
  test('carries user values over and points paths at the new dir', () => {
    const legacyDir = path.join(tmpHome, '.weave-claude-code');
    const configDir = path.join(tmpHome, '.forge-claude-code');
    writeLegacySettings(legacyDir);

    assert.equal(migrateLegacyConfig(configDir, legacyDir), true);

    const settings = readSettings(configDir);
    assert.equal(settings['project'], 'old-entity/old-project');
    assert.equal(settings['wandb_api_key'], 'legacy-key');
    assert.equal(settings['agent_name'], 'legacy-agent');
    assert.equal(settings['debug'], true);
    assert.equal(settings['weave_project'], undefined);
    assert.equal(settings['log_file'], path.join(configDir, 'logs', 'daemon.log'));
    assert.equal(settings['daemon_socket'], path.join(configDir, 'daemon.sock'));
    assert.equal(fs.statSync(path.join(configDir, 'settings.json')).mode & 0o777, 0o600);
  });

  test('never overwrites settings that already exist in the new dir', () => {
    const legacyDir = path.join(tmpHome, '.weave-claude-code');
    const configDir = path.join(tmpHome, '.forge-claude-code');
    writeLegacySettings(legacyDir);
    migrateLegacyConfig(configDir, legacyDir);
    const settingsFile = path.join(configDir, 'settings.json');
    fs.writeFileSync(settingsFile, JSON.stringify({ ...readSettings(configDir), project: 'new-entity/new-project' }));

    assert.equal(migrateLegacyConfig(configDir, legacyDir), false);
    assert.equal(readSettings(configDir)['project'], 'new-entity/new-project');
  });

  test('does nothing without a legacy config', () => {
    const configDir = path.join(tmpHome, '.forge-claude-code');
    assert.equal(migrateLegacyConfig(configDir, path.join(tmpHome, '.weave-claude-code')), false);
    assert.equal(fs.existsSync(configDir), false);
  });
});

suite('registerPlugin and the legacy marketplace', () => {
  test('removes the weave-claude-code marketplace after installing the new plugin', () => {
    const knownPath = path.join(tmpHome, '.claude', 'plugins', 'known_marketplaces.json');
    fs.mkdirSync(path.dirname(knownPath), { recursive: true });
    fs.writeFileSync(knownPath, JSON.stringify({
      [LEGACY_MARKETPLACE_NAME]: { source: { source: 'github', repo: 'wandb/weave-claude-code', ref: 'v0.2.15' } },
    }));

    const result = registerPlugin(path.join(tmpHome, 'log.txt'));

    assert.equal(result.legacyMarketplace, RemovalStatus.Removed);
    const calls = readFakeCalls(tmpHome);
    const removeAt = calls.indexOf(`plugin marketplace remove ${LEGACY_MARKETPLACE_NAME}`);
    assert.ok(removeAt > calls.findIndex(c => c.startsWith('plugin install')), calls.join('\n'));
    const known = JSON.parse(fs.readFileSync(knownPath, 'utf8'));
    assert.equal(known[LEGACY_MARKETPLACE_NAME], undefined);
    assert.ok(known[MARKETPLACE_NAME]);
  });

  test('leaves the marketplaces alone when no legacy one is registered', () => {
    const result = registerPlugin(path.join(tmpHome, 'log.txt'));

    assert.equal(result.legacyMarketplace, RemovalStatus.AlreadyAbsent);
    assert.ok(!readFakeCalls(tmpHome).some(c => c.startsWith('plugin marketplace remove')));
  });
});

test('install on a pre-rename home migrates the config and drops the old plugin', async () => {
  const legacyDir = path.join(tmpHome, '.weave-claude-code');
  writeLegacySettings(legacyDir);
  const knownPath = path.join(tmpHome, '.claude', 'plugins', 'known_marketplaces.json');
  fs.mkdirSync(path.dirname(knownPath), { recursive: true });
  fs.writeFileSync(knownPath, JSON.stringify({
    [LEGACY_MARKETPLACE_NAME]: { source: { source: 'github', repo: 'wandb/weave-claude-code', ref: 'v0.2.15' } },
  }));

  const r = await runCli(tmpHome, ['install', '--non-interactive'], {
    PATH: `${FAKE_CLAUDE_BIN_DIR}:${process.env.PATH}`,
    FAKE_CLAUDE_MARKETPLACE_NAME: MARKETPLACE_NAME,
  });

  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /Configuration migrated from .+\.weave-claude-code/);
  assert.match(r.stdout, /Removed the weave-claude-code marketplace and its plugin/);
  assert.match(r.stdout, /npm uninstall -g weave-claude-code/);
  assert.equal(readSettings(path.join(tmpHome, '.forge-claude-code'))['project'], 'old-entity/old-project');
});
