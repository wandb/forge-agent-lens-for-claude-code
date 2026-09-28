// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: forge-claude-code

// `install` registers the marketplace by the name in marketplace.json and then
// installs `${PLUGIN_NAME}@${MARKETPLACE_NAME}`, so a manifest that drifts from
// these constants breaks every install.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKETPLACE_NAME, MARKETPLACE_REPO, NPM_PACKAGE_NAME, PLUGIN_NAME } from '../src/setup.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));

test('package and plugin manifests agree with the install constants', () => {
  const pkg = readJson('package.json');
  const marketplace = readJson('.claude-plugin/marketplace.json');
  const plugin = readJson('.claude-plugin/plugin.json');

  assert.equal(pkg.name, NPM_PACKAGE_NAME);
  assert.deepEqual(Object.keys(pkg.bin), [NPM_PACKAGE_NAME]);
  assert.equal(marketplace.name, MARKETPLACE_NAME);
  assert.deepEqual(marketplace.plugins.map((p: { name: string }) => p.name), [PLUGIN_NAME]);
  assert.equal(marketplace.plugins[0].source.repo, MARKETPLACE_REPO);
  assert.equal(plugin.name, PLUGIN_NAME);
});
