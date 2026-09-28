// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: forge-claude-code

// Config resolution shared by the CLI and the daemon (env over
// settings.json). Lives here so both use one implementation without an
// import cycle (cli.ts imports the daemon entry point).

import { DEFAULT_AGENT_NAME } from './genaiSpans.js';
import { sha256Hex } from './utils.js';
import type { Settings } from './setup.js';

/** Where a resolved value came from, for user-facing "source" reporting. */
export enum ProjectSource {
  EnvVar = 'FORGE_TRACE_PROJECT env var',
  LegacyEnvVar = 'WEAVE_PROJECT env var',
  Settings = 'settings.json',
  NotSet = 'not set',
}
export enum ApiKeySource {
  EnvVar = 'WANDB_API_KEY env var',
  Settings = 'settings.json',
  NotSet = 'not set',
}
/** No `NotSet`: agent_name always resolves to the built-in default. */
export enum AgentNameSource {
  EnvVar = 'FORGE_CLAUDE_CODE_AGENT_NAME env var',
  LegacyEnvVar = 'WEAVE_AGENT_NAME env var',
  Settings = 'settings.json',
  Default = 'default',
}

/** Pre-rename variable names, still honored so existing shells keep working. */
const LEGACY_ENV = {
  FORGE_TRACE_PROJECT: 'WEAVE_PROJECT',
  FORGE_CLAUDE_CODE_AGENT_NAME: 'WEAVE_AGENT_NAME',
  FORGE_CLAUDE_CODE_DEBUG: 'WEAVE_CLAUDE_DEBUG',
} as const;

/** The first non-empty value of a variable or its legacy name, and which one it came from. */
function readEnv(
  env: NodeJS.ProcessEnv,
  name: keyof typeof LEGACY_ENV,
): { value: string; name: string; legacy: boolean } | undefined {
  const value = env[name]?.trim();
  if (value) return { value, name, legacy: false };
  const legacyName = LEGACY_ENV[name];
  const legacy = env[legacyName]?.trim();
  return legacy ? { value: legacy, name: legacyName, legacy: true } : undefined;
}

/** Resolve the effective project (FORGE_TRACE_PROJECT, then the legacy
 *  WEAVE_PROJECT, then settings.project) and where it came from. */
export function resolveProject(
  settings: Settings,
  env: NodeJS.ProcessEnv = process.env,
): { value: string | null; source: ProjectSource } {
  const fromEnv = readEnv(env, 'FORGE_TRACE_PROJECT');
  if (fromEnv) {
    return { value: fromEnv.value, source: fromEnv.legacy ? ProjectSource.LegacyEnvVar : ProjectSource.EnvVar };
  }
  if (settings.project) return { value: settings.project, source: ProjectSource.Settings };
  return { value: null, source: ProjectSource.NotSet };
}

/** Resolve the effective W&B API key (WANDB_API_KEY env beats
 *  settings.wandb_api_key) and where it came from. */
export function resolveApiKey(
  settings: Settings,
  env: NodeJS.ProcessEnv = process.env,
): { value: string | null; source: ApiKeySource } {
  if (env['WANDB_API_KEY']) return { value: env['WANDB_API_KEY'], source: ApiKeySource.EnvVar };
  if (settings.wandb_api_key) return { value: settings.wandb_api_key, source: ApiKeySource.Settings };
  return { value: null, source: ApiKeySource.NotSet };
}

/** Resolve the effective top-level agent name (FORGE_CLAUDE_CODE_AGENT_NAME,
 *  then the legacy WEAVE_AGENT_NAME, then settings.agent_name), falling back
 *  to `DEFAULT_AGENT_NAME`. */
export function resolveAgentName(
  settings: Settings,
  env: NodeJS.ProcessEnv = process.env,
): { value: string; source: AgentNameSource } {
  const fromEnv = readEnv(env, 'FORGE_CLAUDE_CODE_AGENT_NAME');
  if (fromEnv) {
    return { value: fromEnv.value, source: fromEnv.legacy ? AgentNameSource.LegacyEnvVar : AgentNameSource.EnvVar };
  }
  const fromSettings = settings.agent_name?.trim();
  if (fromSettings) return { value: fromSettings, source: AgentNameSource.Settings };
  return { value: DEFAULT_AGENT_NAME, source: AgentNameSource.Default };
}

/** Debug logging is on when either debug variable is set; `envVar` names it. */
export function resolveDebug(
  settings: Settings,
  env: NodeJS.ProcessEnv = process.env,
): { value: boolean; envVar: string | null } {
  const fromEnv = readEnv(env, 'FORGE_CLAUDE_CODE_DEBUG');
  if (fromEnv) return { value: true, envVar: fromEnv.name };
  return { value: settings.debug === true, envVar: null };
}

/** The config the daemon loads at startup and holds for its lifetime. */
export type DaemonConfig = {
  project: string | null;
  apiKey: string | null;
  baseUrl: string;
  agentName: string;
  debug: boolean;
};

/** Resolve the daemon config from settings + env, reusing the per-field
 *  resolvers so the env-over-settings precedence is defined once. */
export function resolveDaemonConfig(settings: Settings, env: NodeJS.ProcessEnv): DaemonConfig {
  return {
    project: resolveProject(settings, env).value,
    apiKey: resolveApiKey(settings, env).value,
    baseUrl: resolveTraceBaseUrl(env),
    agentName: resolveAgentName(settings, env).value,
    debug: resolveDebug(settings, env).value,
  };
}

/** SaaS trace-ingest host: the default OTLP target, and what the routeless
 *  SaaS API host remaps to. */
const DEFAULT_TRACE_BASE_URL = 'https://trace.wandb.ai';

/** Resolve the Weave trace server base URL for OTLP export. `WF_TRACE_SERVER_URL`
 *  wins when set. Otherwise `WANDB_BASE_URL` is used, but SaaS `api.wandb.ai` is
 *  the wandb API host with no OTLP route, so it maps to `trace.wandb.ai`; a
 *  self-hosted `WANDB_BASE_URL` passes through unchanged. */
function resolveTraceBaseUrl(env: NodeJS.ProcessEnv): string {
  const explicit = env['WF_TRACE_SERVER_URL']?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const base = (env['WANDB_BASE_URL'] ?? DEFAULT_TRACE_BASE_URL).replace(/\/+$/, '');
  return /^https?:\/\/api\.wandb\.ai$/i.test(base) ? DEFAULT_TRACE_BASE_URL : base;
}

/** Comma-joined list of missing required config, for the "incomplete"
 *  status/startup messages. `apiKeyLabel` differs by call site
 *  (`wandb_api_key` for config-oriented messages, `WANDB_API_KEY` for
 *  env-oriented ones). */
export function missingConfig(hasProject: boolean, hasApiKey: boolean, apiKeyLabel: string): string {
  return [!hasProject && 'project', !hasApiKey && apiKeyLabel].filter(Boolean).join(', ');
}

/** Hex chars kept from the config hash. 16 (64 bits) is ample to detect a
 *  config change while staying compact for logs and the socket reply. */
const CONFIG_FINGERPRINT_LENGTH = 16;

/** Short, stable hash of a daemon config. The API key is hashed, not exposed,
 *  so the fingerprint is safe to send over the socket. */
export function daemonConfigFingerprint(c: DaemonConfig): string {
  return sha256Hex(JSON.stringify([c.project, c.apiKey, c.baseUrl, c.agentName, c.debug]))
    .slice(0, CONFIG_FINGERPRINT_LENGTH);
}
