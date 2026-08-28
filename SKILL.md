---
name: git2docs
description: >-
  Validate your git2docs-generated documentation against your actual code and
  runtime, and report findings back. Use when a maintainer wants to check that
  their published docs are accurate and sufficient — verify documented CLI
  commands, API endpoints, config, and behavior against the real repo, then
  file findings (and flag git2docs product gaps) through the git2docs MCP.
---

# git2docs — validate your docs against your code

You are the maintainer's **own** agent. You have their codebase and can run
their runtime, so you can do what git2docs (running remotely) cannot: check
that the documentation matches reality, and report what's wrong. git2docs
never runs anything — it just serves the docs/claims and receives your
findings, which flow into its Tell-AI → review → apply loop.

## One-time setup

1. In git2docs, go to **Settings → Access tokens** and create a token
   (`g2d_…`, shown once). Put it in an env var: `export GIT2DOCS_TOKEN=g2d_…`.
2. Identify the org slug and product slug (from the docs URL:
   `git2docs.com/<org>/docs/<product>`).
3. Connect the authenticated MCP server. In Claude Code, add to `.mcp.json`
   (or `claude mcp add`):

   ```json
   {
     "mcpServers": {
       "git2docs": {
         "type": "http",
         "url": "https://git2docs.com/api/mcp/<org>/<product>/agent",
         "headers": { "Authorization": "Bearer ${GIT2DOCS_TOKEN}" }
       }
     }
   }
   ```

Confirm the connection by calling `list_pages`.

## The validation loop

Work the docs page by page. For each page:

1. **`list_pages`** — get the table of contents. Decide which pages to check
   (start with the ones that make concrete, checkable claims: CLI reference,
   API reference, configuration, getting-started, deployment).
2. **`get_page_claims`** — the documented CLI/API surface extracted from the
   code. This is your checklist for *accuracy*.
3. **`get_page`** — the full page Markdown **and its section ids** (you need a
   `section_id` to report a finding). Read it critically against the code.
4. **Verify against ground truth** — this is the part only you can do:
   - Run each documented **CLI command** (`--help`, or the real invocation in
     a safe/dry-run mode) and compare flags, args, output.
   - Check each **API endpoint**: does the route/method/params/response match
     the code (handlers, router, OpenAPI, types)?
   - Check **config keys**, env vars, defaults against where they're read.
   - Check **code examples** compile / run.
   - Judge **architecture / concept / workflow** prose against how the system
     actually works (read the code, don't guess).
5. **`list_coverage_gaps`** — undocumented public modules. This is your
   *sufficiency* signal: is anything important missing?

## Reporting

Use the **right channel** — this matters:

- **`report_finding({ section_id, kind, detail, suggested_fix? })`** — for a
  problem in *their docs*. Pick `kind`: `inaccurate`, `outdated`,
  `broken_example`, `contradicts_code`, `misleading`, `insufficient`,
  `missing_topic`. Put the **evidence** in `detail` (the command you ran, the
  code you read, the exact mismatch). Add a `suggested_fix` when you can. It
  becomes a comment on that section and is applied on the next regen.

- **`report_product_gap({ desired_outcome, limitation, blocked_doc_change?, severity?, page_id? })`**
  — for a limitation in **git2docs itself** that blocks the correct docs
  (e.g. "the config can't express X", "a section can't be pinned the way this
  page needs", "the generated diagram can't represent this topology", "no way
  to mark this page as manually authored"). This goes to the git2docs team,
  **not** the customer's doc comments. Report it whenever you *know* the right
  documentation outcome but the platform can't get you there.

## Rules

- **Evidence, not vibes.** Every finding must be grounded in something you
  actually ran or read. Quote the command / file / line.
- **Don't spam.** One finding per real problem; dedupe. Don't file a finding
  for a stylistic preference — only genuine inaccuracy or insufficiency.
- **Accuracy and sufficiency both.** Wrong claims *and* missing coverage are
  in scope — the whole documented surface, not just CLI/API.
- **Summarize at the end**: pages checked, findings filed (by kind), product
  gaps flagged, and anything you couldn't verify.
