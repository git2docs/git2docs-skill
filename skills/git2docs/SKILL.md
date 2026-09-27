---
name: git2docs
description: >-
  Validate your git2docs-generated documentation against your actual code and
  runtime, report findings, and keep the repo's anchored facts current. Use when
  a maintainer wants their published docs proven accurate and sufficient — verify
  documented CLI/API/config/behavior against the real repo, file findings and
  coverage gaps, capture anchored facts (docs/docsync-context.yaml) for exact
  strings no extractor can derive, and flag git2docs product gaps — all through
  the git2docs MCP.
---

# git2docs — validate your docs and keep them true to the code

You are the maintainer's **own** agent. You have their codebase and can run
their runtime, so you can do what git2docs (running remotely) cannot: check that
the documentation matches reality, fix the inputs it's generated from, and
capture the exact facts the code implies. git2docs never runs anything — it
serves the docs/claims and receives your findings and facts, which flow into its
review → apply loop and the next regeneration.

Two jobs, both measurable:

- **Accuracy** — every documented CLI/API/config claim matches the code (findings → 0).
- **Sufficiency** — the whole public surface has a page (coverage → 100%).

## One-time setup

1. In git2docs, **Settings → Access tokens** → create a token (`g2d_…`, shown
   once). Put it in an env var: `export GIT2DOCS_TOKEN=g2d_…`.
2. Get the org and product slug from the docs URL:
   `git2docs.com/<org>/docs/<product>`.
3. Connect the **authenticated** MCP server (`.mcp.json`, or `claude mcp add`):

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

## Align to the release first — or every finding is suspect

The docs describe a specific release, not whatever branch you're on. Before
comparing anything to code:

1. **`list_versions`** — pick the version to validate (published or a draft you
   can check before it goes live). Note its `generated_at_commit`.
2. **`get_status`** — confirm it isn't mid-regeneration (`generating: false`) and
   read the commit its docs were generated/validated against.
3. **`git checkout <generated_at_commit or tag>`** in your local repo.

Validating against a different commit produces false findings. `get_page`,
`get_page_claims`, and `get_status` all take an optional `version` — pass the
same one throughout.

## The validation loop (inside a session)

Open a session so git2docs knows a pass is UNDERWAY — "done" is now **declared**,
not inferred from silence.

1. **`begin_validation({ version })`** → keep the returned `session_id`. Your
   reads and reports heartbeat it; if you crash or stop, it's marked *abandoned*
   after ~5 min (never counted as a false "converged"). Reconnecting resumes a
   still-fresh session. It's refused while a regeneration is in flight.

2. Work page by page — start with the pages that make concrete, checkable claims
   (CLI reference, API reference, configuration, getting-started, deployment).
   For each:
   - **`get_page_claims`** — the checkable surface the extractors parsed. Read
     `extracted_kinds`: where a kind is **present**, verify the docs against it;
     where a kind is **absent**, those docs have no backing surface — check the
     code directly and file a **product gap** (a whole missing kind is an
     extractor coverage gap, not a per-page finding). Heed the completeness
     warnings — treat the surface as a checklist, not gospel.
   - **`get_page`** — full Markdown plus the `section_id`s you need to report,
     and grounding signals. If a page makes code claims but `grounded_in_code` is
     `false` (its hints are all prose — README/design docs) or
     `grounding_confidence` is low, **re-ground** it (`add_source_hints`) rather
     than only filing findings.
   - **Verify against ground truth** — the part only you can do: run each
     documented CLI command (`--help` or a safe/dry-run invocation) and compare
     flags/args/output; check each API endpoint's route/method/params/response
     against the code; check config keys, env vars, and defaults where they're
     read; compile/run examples; judge architecture/concept/workflow prose
     against how the system actually works (read the code, don't guess).

3. Report through the **right channel** (see the guide below) — including
   **anchored facts** for exact strings no extractor grounds.

4. **`list_coverage_gaps`** — undocumented public modules (your sufficiency
   checklist). For a gap git2docs should document, `report_finding({ module, … })`.

5. **`end_validation({ session_id, verdict })`** — `clean` (checked, nothing to
   fix), `findings_filed`, or `incomplete` (stopped early). This is what tells
   git2docs the pass is complete. A `clean` verdict is refused while a
   regeneration is in flight.

## Choosing the right channel

Using the right channel is the whole game — don't collapse everything into
`report_finding` prose.

- **Wrong claim in an existing page** → `report_finding({ section_id, kind,
  detail, suggested_fix? })`. `kind` ∈ inaccurate, outdated, broken_example,
  contradicts_code, misleading, insufficient, missing_topic. Put the **evidence**
  in `detail` (the command you ran, the file+line you read, the exact mismatch).
  Apply regenerates that section from code.
- **Undocumented module** (from `list_coverage_gaps`, no page at all) →
  `report_finding({ module, kind: "missing_topic", detail })`. Apply materialises
  a page grounded in that module. (Provide exactly one of `section_id` or `module`.)
- **Exact string no extractor derives** — an object/namespace/label name, an
  artifact name, a compatibility claim → **`report_fact`** (see the next
  section). This is the *durable* fix; don't bury such a string in finding prose.
- **Page fabricating because it wasn't pointed at its code** →
  `add_source_hints({ space_slug, page_slug, hints })` → the page re-synthesizes
  grounded in that code; the hints persist across future regens.
- **Missing topic that IS derivable from code** → `add_section({ space_slug,
  page_slug, title, instruction, source_hints? })` → generated from code, lands
  `ai_owned` (keeps regenerating). Confirm with the user first.
- **Structure is wrong** → `propose_toc_change({ action, … })` — a human-gated
  proposal that lands on the Findings page; it never changes published docs
  directly. Actions: `rename` (`page_slug` + `new_title`), `remove` (`page_slug`),
  `add` (`title` [+ `doc_type`]; pass `parent_page_slug` to nest it as a
  **subpage** under a top-level page, one level deep), `reorder` (`page_slugs` —
  the desired order of a set of siblings: all top-level, or all children of one
  parent). Identify pages by `space_slug` + `page_slug` from `list_pages`. All
  four are config-backed, so an Applied change **survives full regens** (a real
  missing code-derived page is better as a coverage-gap `report_finding`, which
  generates the page grounded in code).
- **A correct claim the generator simply can't be made to produce** →
  `direct_edit({ section_id, new_text, code_evidence })` — **last resort**. It
  freezes the section `agent_owned`; regen never overwrites a frozen section
  (freeze is absolute), so use it only after a finding has survived the
  regenerate/apply loop, and confirm with the user. To let regen own it again,
  call `reset_ownership` first.
- **git2docs itself can't get you the right outcome** (config can't express X, a
  whole surface can't be extracted, a diagram can't represent the topology) →
  `report_product_gap(...)` — goes to the git2docs team, not the customer's docs.
- **A finding already satisfied by the current docs** (a prior finding that a
  regen or repo fix has since addressed) → `dismiss_finding({ finding_id, reason })`.
  `list_findings` shows the open set (yours + the maintainer's). Dismiss ONLY
  after re-verifying the page against the code **this pass** — not to look
  converged; a maintainer can reopen it. Keeping the set clean means a later
  blanket Apply doesn't re-push moot (or stale) patches.

## Keep the anchored facts current with the code

Anchored facts (`docs/docsync-context.yaml`) are how the docs stay true for the
exact strings no extractor reaches. Each is **anchored** to the source line that
proves it (`src: "path:line"` + `match`), and git2docs re-resolves every anchor
at generation time, **dropping** any that no longer hold. So a fact can never
silently become a lie — when the code moves, a stale anchor just drops
(fail-safe). Your job, on every pass, is to keep them current:

1. **`get_facts`** — the facts currently in `docs/docsync-context.yaml`, plus any
   `report_fact` captures not yet applied to the file. Read this *before*
   re-deriving anything.
2. Reconcile against the checked-out code:
   - **Re-anchor** any fact whose line moved (a refactor shifted it) — call
     `report_fact` again with the corrected `src`/`match`.
   - **Retract** any fact that's no longer true.
   - **Add** a fact (`report_fact`) whenever the code grew a new exact string a
     page must reproduce that no extractor derives. Always include `src` — an
     unanchored fact is never grounded.
3. Apply the accumulated set to `docs/docsync-context.yaml` (`facts:`) and open a
   PR the maintainer reviews. The next regeneration grounds every fact whose
   anchor still resolves.

You do **not** need to build a per-repo drift checker: the server's
re-verification is the guard between runs (stale anchors drop; nothing wrong
ships). Re-running this reconciliation each release is what keeps facts current —
dropped anchors get re-anchored on the next pass.

If `get_facts` returns nothing, it hands back the canonical authoring prompt —
use it to bootstrap `docs/docsync-context.yaml`.

## Raise the input, not just the output (repo health)

Code-derived docs can only be as good as the code is legible.

- **`get_repo_health`** — the doc-readiness grade (score/100 + A–F + per-category
  pass/warn/fail): the input-side twin of accuracy.
- **`list_health_gaps`** — the ranked, actionable checklist: missing docstrings,
  untyped signatures, no examples, an API/schema the extractor can't parse. Fix
  the **source** these point at in your checkout (a PR the maintainer reviews),
  then regenerate — accuracy and coverage both rise. An `api_schema` /
  `code_quality` gap is often *why* a whole surface (routes, CLI, serializers,
  error codes, enums) couldn't be extracted — the single highest-leverage fix. If
  a "gap" is really our extractor missing correct code, `report_product_gap`
  instead of changing correct code.

## Rules

- **Align first.** Check out the release's commit before comparing docs to code,
  or you'll file false findings.
- **Evidence, not vibes.** Every finding and every fact must be grounded in
  something you actually ran or read — quote the command / file / line. Anchor
  every fact (`src`) or it won't ground.
- **Right channel.** Wrong claim → finding; un-derivable exact string → fact;
  missing derivable topic → section / coverage gap; structure → toc proposal;
  platform limitation → product gap.
- **Root cause before Apply.** A finding becomes an Apply patch the next full
  regen overwrites — and a facts-triggered regen is costly — so route to the
  durable fix first: wrong/stale code or a misleading comment → fix the **repo**
  (cheap regen — only pages reading that file re-synth); un-derivable exact string
  → **`report_fact`**. Reserve `report_finding` → Apply for a genuine synthesis
  error over correct code. When you summarize, **recommend Apply LAST** — repo
  fixes + facts + one regen first, so you don't Apply patches a regen throws away.
- **Prefer the sustaining fix.** Re-ground (`add_source_hints`) or capture a fact
  over a frozen `direct_edit`; a `direct_edit` stops that section regenerating.
- **Don't spam.** One finding per real problem; dedupe. No stylistic nitpicks —
  only genuine inaccuracy or insufficiency.
- **Clear what's fixed.** After a regen or a repo fix, re-check and
  `dismiss_finding` any open finding the change already satisfied (`list_findings`
  shows the set). Applying a moot finding wastes a regen, and a stale correction
  written to the brief/facts persists — so dismiss, don't blanket-Apply.
- **Close the session.** Always `end_validation` with a verdict; use `clean` only
  when no regeneration is in flight.
- **Summarize at the end**, ordering the recommendation by durability: repo fixes
  and facts first, **then** Apply. Include: version validated, pages checked,
  findings filed (by kind), facts added/re-anchored, coverage and repo-health gaps
  raised, product gaps flagged, and anything you couldn't verify.
