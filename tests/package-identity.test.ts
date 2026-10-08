// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: Apache-2.0
// SPDX-PackageName: forge-agent-lens-for-claude-code

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import { MARKETPLACE_NAME, NPM_PACKAGE_NAME, PLUGIN_NAME } from '../src/setup.ts';
import { VERSION } from '../src/version.mjs';

const readJson = (file: string) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));

test('the Forge package ships a self-contained marketplace and matching CLI and skills', () => {
  const pkg = readJson('../package.json');
  const marketplace = readJson('../.claude-plugin/marketplace.json');
  const plugin = readJson('../.claude-plugin/plugin.json');
  assert.equal(pkg.name, '@coreweave/forge-agent-lens-for-claude-code');
  assert.equal(NPM_PACKAGE_NAME, pkg.name);
  // npm publishes scoped packages as restricted unless told otherwise.
  assert.equal(pkg.publishConfig?.access, 'public');
  assert.deepEqual(pkg.bin, { 'forge-agent-lens-for-claude-code': 'dist/cli.js' });
  assert.equal(marketplace.name, MARKETPLACE_NAME);
  assert.equal(MARKETPLACE_NAME, 'forge-agent-lens-for-claude-code');
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

test('every version declaration matches package.json', () => {
  const { version } = readJson('../package.json');
  const lock = readJson('../package-lock.json');
  const marketplace = readJson('../.claude-plugin/marketplace.json');
  assert.deepEqual(
    [lock.version, lock.packages[''].version, readJson('../.claude-plugin/plugin.json').version,
      marketplace.version, marketplace.plugins[0].version, VERSION],
    Array(6).fill(version),
  );
});
