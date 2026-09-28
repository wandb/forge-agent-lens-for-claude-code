#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 CoreWeave, Inc.
// SPDX-License-Identifier: MIT
// SPDX-PackageName: forge-claude-code

// Invoked from hook-handler.sh as a thin replacement for `nc -U -w1`, so the
// hook does not depend on netcat (often missing in minimal Linux containers).
// Two subcommands:
//   * probe <sock> : exit 0 if a listener accepts, 1 otherwise (250ms timeout).
//   * send  <sock> : read stdin and write it to <sock>.

import * as net from 'node:net';
import * as fs from 'node:fs';

const [, , sub, sockPath] = process.argv;
if (!sub || !sockPath) {
  console.error('usage: hook-socket.mjs <probe|send> <sock-path>');
  process.exit(2);
}

if (sub === 'probe') {
  if (!fs.existsSync(sockPath)) process.exit(1);
  const client = net.createConnection(sockPath);
  const timer = setTimeout(() => { client.destroy(); process.exit(1); }, 250);
  client.once('connect', () => { clearTimeout(timer); client.destroy(); process.exit(0); });
  client.once('error', () => { clearTimeout(timer); process.exit(1); });
} else if (sub === 'send') {
  let payload = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { payload += c; });
  process.stdin.on('end', () => {
    const client = net.createConnection(sockPath, () => {
      client.write(payload);
      client.end();
    });
    const timer = setTimeout(() => { client.destroy(); process.exit(0); }, 2000);
    client.on('close', () => { clearTimeout(timer); process.exit(0); });
    client.on('error', (err) => {
      clearTimeout(timer);
      console.error(`hook-socket send: ${err.message}`);
      process.exit(1);
    });
  });
} else {
  console.error(`hook-socket: unknown subcommand '${sub}'`);
  process.exit(2);
}
