---
name: deploy-all
description: Release every package in this repo — bump the shared version, add the changelog entry, build and test, commit, publish the npm packages and deploy the website to Cloudflare. Use when Fabio says /deploy-all, "ship a new version", "release", or "publish and deploy".
---

# Deploy all

Every package shares one version. The README's Release section is the source of
truth; this skill runs it end to end.

## 1. Decide the version

- Minor bump by default (`0.2.2` → `0.3.0`). Use a patch or major bump only when
  Fabio says so.
- List what changed since the last release:
  `git log --oneline <last "chore: release" commit>..HEAD`.

## 2. Changelog and versions

- Add the release to the top of `CHANGELOG.md`, in the style of the entries
  below it: `## <version> – <YYYY-MM-DD>`, one line on what the release brings,
  then a `###` section per package that changed, with short bullets written for
  someone using the package, not a commit log. The MCP packages bundle
  `@fabiocv/component-code`, so its changes show there as "The same …, in the
  chat."
- Set `version` in every `package.json` under `packages/` and `tools/`,
  including the private `tools/core`.

## 3. Build, test, commit

- `pnpm build && pnpm test` from the repo root. Stop and fix anything that
  fails, including the size limit in `packages/component-code/scripts/build.js`.
- Commit on the current branch as `chore: release <version>, <what it brings>`.
  No Co-Authored-By line.
- Push: `git push`.

## 4. Publish the packages (needs Fabio)

npm asks for a one-time code, so run the publish where Fabio can type it:

- Open a Terminal panel tab with `run_in_terminal`, in the repo root, running:
  `pnpm --filter @fabiocv/component-code publish && pnpm --filter "./tools/*" publish`
  (the second filter skips the private core).
- Link the tab to Fabio, say what it will ask for, and wait for him to say it
  is done. Read the tab's output to confirm each package published.

## 5. Deploy the website

- `pnpm --filter site run deploy`. It builds, deploys the site, the hosted MCP
  Apps and the gallery's API to Cloudflare Workers, and applies the gallery's
  database migrations. If Wrangler needs a login, run it in a Terminal panel tab
  and hand it to Fabio the same way.

## 6. Verify

- `npm view <name> version` for each published package shows the new version.
- Load https://mcp-ui-tools.fabio.cv/ and /component-code/ and confirm they
  render and the changelog page shows the new release.

## 7. Report

Done / Left / Your to-do, as Fabio likes it. Mention any site outside this repo
that pins the old version, such as fabiocv's `apps/www`, as a to-do instead of
changing it.
