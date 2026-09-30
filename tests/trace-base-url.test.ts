// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: Apache-2.0
// SPDX-PackageName: forge-claude-code

// The daemon exports OTLP spans to the Weave trace server, not the wandb API
// host. SaaS `api.wandb.ai` has no OTLP route, so setting `WANDB_BASE_URL` to
// it (the wandb SDK default) must not silently misroute traces.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDaemonConfig } from '../src/config.ts';

const SETTINGS = { project: 'e/p', wandb_api_key: 'k' };
const baseUrlFor = (env: Record<string, string>): string =>
  resolveDaemonConfig(SETTINGS as never, env).baseUrl;

test('trace base URL resolution across env combinations', () => {
  // Unset → SaaS trace server default.
  assert.equal(baseUrlFor({}), 'https://trace.wandb.ai');

  // SaaS API host (and trailing-slash / scheme-case variants) remap to the
  // trace server rather than the routeless api host.
  assert.equal(baseUrlFor({ WANDB_BASE_URL: 'https://api.wandb.ai' }), 'https://trace.wandb.ai');
  assert.equal(baseUrlFor({ WANDB_BASE_URL: 'https://api.wandb.ai/' }), 'https://trace.wandb.ai');
  assert.equal(baseUrlFor({ WANDB_BASE_URL: 'HTTPS://API.WANDB.AI' }), 'https://trace.wandb.ai');

  // Dedicated and self-hosted instances serve the trace server under /traces.
  assert.equal(baseUrlFor({ WANDB_BASE_URL: 'https://my.wandb.io' }), 'https://my.wandb.io/traces');
  assert.equal(baseUrlFor({ WANDB_BASE_URL: 'https://my.wandb.io/' }), 'https://my.wandb.io/traces');
  // A blank value falls back to SaaS instead of producing a bare `/traces` endpoint.
  assert.equal(baseUrlFor({ WANDB_BASE_URL: ' ' }), 'https://trace.wandb.ai');

  // Explicit trace server URL wins over WANDB_BASE_URL and is not remapped.
  assert.equal(
    baseUrlFor({ WF_TRACE_SERVER_URL: 'https://trace.example.io/', WANDB_BASE_URL: 'https://api.wandb.ai' }),
    'https://trace.example.io',
  );
});

test('FORGE_TRACE_BASE_URL wins over WF_TRACE_SERVER_URL and WANDB_BASE_URL', () => {
  assert.equal(
    baseUrlFor({
      FORGE_TRACE_BASE_URL: 'https://forge.example.io/',
      WF_TRACE_SERVER_URL: 'https://trace.example.io',
      WANDB_BASE_URL: 'https://my.wandb.io',
    }),
    'https://forge.example.io',
  );
  // A blank value falls through instead of producing an empty endpoint.
  assert.equal(
    baseUrlFor({ FORGE_TRACE_BASE_URL: ' ', WF_TRACE_SERVER_URL: 'https://trace.example.io' }),
    'https://trace.example.io',
  );
});
