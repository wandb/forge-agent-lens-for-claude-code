// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: forge-claude-code

import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { MARKETPLACE_NAME, PLUGIN_NAME } from '../src/setup.ts';

const readJson = (file: string) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));

test('the Forge package ships a self-contained marketplace and matching CLI and skills', () => {
  const pkg = readJson('../package.json');
  const marketplace = readJson('../.claude-plugin/marketplace.json');
  const plugin = readJson('../.claude-plugin/plugin.json');
  assert.equal(pkg.name, 'forge-claude-code');
  assert.equal(pkg.bin['forge-claude-code'], 'dist/cli.js');
  assert.equal(marketplace.name, MARKETPLACE_NAME);
  assert.equal(MARKETPLACE_NAME, pkg.name);
  assert.equal(plugin.name, 'forge');
  assert.equal(plugin.name, PLUGIN_NAME);
  assert.equal(marketplace.plugins[0].name, plugin.name);
  // A local install must use the shipped hooks, not fetch the old release.
  assert.equal(marketplace.plugins[0].source, './');
  for (const name of ['config', 'install', 'status']) {
    assert.ok(existsSync(new URL(`../skills/forge-${name}/SKILL.md`, import.meta.url)));
  }
  assert.doesNotMatch(pkg.dependencies['@coreweave/forge-sdk'], /^(file:|link:)/);
});

test('release version bumps preserve the bundled plugin source', () => {
  const scratch = new URL('../.context/', import.meta.url);
  mkdirSync(scratch, { recursive: true });
  const dir = mkdtempSync(new URL('release-test-', scratch));
  try {
    for (const file of ['package.json', 'package-lock.json', 'src/version.mjs',
      '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json',
      'scripts/release/bump-version.mjs', 'scripts/release/version-module-utils.mjs']) {
      cpSync(new URL(`../${file}`, import.meta.url), join(dir, file), { recursive: true });
    }
    const result = spawnSync(process.execPath, [join(dir, 'scripts/release/bump-version.mjs'), '0.2.15'], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    for (const file of ['package.json', 'package-lock.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
      assert.equal(JSON.parse(readFileSync(join(dir, file), 'utf8')).version, '0.2.15');
    }
    const marketplace = JSON.parse(readFileSync(join(dir, '.claude-plugin/marketplace.json'), 'utf8'));
    assert.equal(marketplace.plugins[0].source, './');
    assert.equal(marketplace.plugins[0].version, '0.2.15');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
