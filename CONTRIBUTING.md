# Contributing to forge-agent-lens-for-claude-code

## Local checks

This repository uses npm and Node.js 18.19+ or 20.6+.

```shell
npm ci
npm run setup-hooks
npm run check
```

`setup-hooks` installs a pre-commit hook that runs the build. Before opening a
pull request, also run:

```shell
uvx --from 'reuse[charset-normalizer]==6.2.0' reuse lint
```

## Test a change in Claude Code

Link your checkout so the global CLI, and the daemon that the hooks start from
`PATH`, both run this build:

```shell
npm run build
npm link
forge-agent-lens-for-claude-code install --source=local
forge-agent-lens-for-claude-code restart
```

`forge-agent-lens-for-claude-code status` shows which build the daemon runs from.
Rebuild and restart after each change. To go back to the released build, run
`npm install -g @coreweave/forge-agent-lens-for-claude-code`.

## Pull requests

Use a Conventional Commit title. Call out privacy or compatibility changes in
the pull request description, and update the README when user-visible behavior
changes. Do not commit generated build artifacts or local configuration.

## Releases

release-please keeps a release PR open that bumps the version and changelog
from the Conventional Commits on `main`. Merging it tags `vX.Y.Z`, creates the
GitHub release, and publishes to npm. To choose the version, add a
`Release-As: X.Y.Z` footer to a commit.

GitHub-source installs clone the marketplace at the `vX.Y.Z` tag for the
installed version, so never reuse or move a release tag.
## Contributor License Agreement

Contributors must agree to the [CoreWeave CLA](./CLA.md) when pushing code to this project.

Agreement with the CoreWeave CLA must be signified by including a `Signed-off-by`
trailer in every submitted Git commit to this repository. By signing off, you certify that you have the right to submit the contribution and that you agree to and are bound by the CoreWeave Contributor License Agreement in effect at the date of your submission, found in [`CLA.md`](./CLA.md) in the root of this repository, which governs your submission. If you are contributing on behalf of an entity, you further certify that you are authorized to bind that entity to the CLA.

Sign each commit with the `--signoff` (`-s`) option to [`git commit`](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---signoff). Git has no configuration option that adds the trailer automatically; if you want it on every commit, use an alias such as `git config alias.ci "commit -s"` or a `prepare-commit-msg` hook.

## Licensing

This project is licensed under Apache-2.0 (see [`LICENSE`](./LICENSE)) and follows the [REUSE](https://reuse.software/) specification. REUSE requires the license text in [`LICENSES/Apache-2.0.txt`](./LICENSES/Apache-2.0.txt). Licensing metadata lives in [`REUSE.toml`](./REUSE.toml): its aggregate annotation covers every file by default, so new files need no SPDX header. If you add material under a different license or copyright, declare it with an inline SPDX header or a `REUSE.toml` annotation and include any additional license text in `LICENSES/<SPDX-License-Identifier>.txt`. Run `reuse lint` from the repository root before opening a PR.
