---
name: git2docs
description: >-
  Validate your git2docs-generated documentation against your actual code and
  runtime, report findings, and keep the repo's anchored facts current. Use when
  a maintainer wants their published docs proven accurate and sufficient — verify
  documented CLI/API/config/behavior against the real repo, file findings and
  coverage gaps, capture anchored facts (docs/docsync-context.yaml) for exact
  strings no extractor can derive, and flag git2docs product gaps. Also use it to
  author docs/docsync-context.yaml for the FIRST time, before a repo has ever been
  generated — that bootstrap reads only the repo and needs no git2docs account,
  token or MCP connection. Before a release is locked, also review the published
  pages for anything that was never meant to be public. Everything else runs
  through the git2docs MCP.
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

## Bootstrap the anchored facts — no account, no token, no MCP

**This is the one job that needs nothing but the repo.** A maintainer connecting
a repo to git2docs is told to author `docs/docsync-context.yaml` *before* the
first generation — when they have no token, no product slug, and nothing
generated to validate against. Do it from the checkout alone: do not set up MCP
first, and do not call `get_facts`.

Run this when you're asked to create, bootstrap or set up the facts file, or
when `docs/docsync-context.yaml` is absent and the maintainer is about to
generate docs for the first time. If the file already has a `facts:` section,
this is not the job — see *Keep the anchored facts current* below.

Write a `facts:` section (and `external:` if needed) into
`docs/docsync-context.yaml`: an anchored, machine-checkable record of the exact
strings the documentation must get right that a generator cannot extract from
code. Create the file if it doesn't exist; **keep any existing product/sections
config in it.**

**What belongs here — and what doesn't.** git2docs already extracts the
declarative surfaces: CRD schemas (field names, enum values, defaults, printer
columns), Helm values, CLI entry points, API routes, type definitions. It does
*not* reliably reach the exact strings that live in build config, templates,
exported constants, or prose support docs. Capture only that second category.
Skip anything already extracted — point at where those live under `authority:`
as **pointers, never copies**; a copy becomes a second source of truth that
drifts on the next build.

**Derive the categories from THIS repo — there is no fixed taxonomy.** Ask: if
someone wrote this repo's documentation from memory, which exact strings would
they get wrong, and where would a reader notice? Look for:

- names a user types or greps — object/resource names, namespaces, label and
  annotation keys and selectors, env vars, config file names
- values that must match exactly — artifact/image names, registry prefixes,
  ports, paths
- ownership and layout — which chart/package/artifact ships which thing
- compatibility — supported platforms and versions, what is *tested* versus
  merely expected to work

Name the sections in the repo's own vocabulary; omit categories that don't apply.

**Verify every entry before you write it.** Run a command that proves each fact,
and record the file and line. Write nothing from memory or from the existing
documentation — the docs are what we're correcting. Where the repo's own prose
is authoritative (a support matrix, a compatibility statement), anchor to it and
say so.

**Anchor contract — enforced, non-negotiable.** Every fact anchors:

- `src: <path>:<line>` or `<path>:<start>-<end>`
- `match:` — the exact string that appears at that line (defaults to the value)
- `src_files: [<path>, …]` when the fact is established by a file *existing*
  rather than by its contents
- `near:` — a string on the owning line, when `match` can't be unique in its file

**No anchor, no entry.** If you can't prove it, leave it out: git2docs
re-resolves every anchor at generation time and drops any that no longer verify,
so an unanchored fact never grounds.

**Discipline.** Facts, not prose — exact strings and values only, no
architecture and no explanations. Add a short `note:` only where getting the
fact wrong has a specific consequence worth naming. Prefer stable facts;
something that changes every release is a bad entry. Small is correct — each
section is a standing signal that an extractor is missing, so this file should
*shrink* as extraction improves.

**Finish.** The only file you create is `docs/docsync-context.yaml`. Do **not**
add a checker script or a Makefile target: drift-guarding and re-anchoring are
git2docs' job, not per-repo scripts — the server re-resolves every anchor at
generation time, and `verify_facts` is the CI drift-guard once MCP is connected.
Report how many facts you anchored, and which categories you left out because
git2docs already extracts them.

> Same canonical text git2docs serves from `get_facts`. Keep it in sync with
> `DOCSYNC_CONTEXT_FACTS_PROMPT` (`packages/db/src/onboarding.ts` in the git2docs
> repo).

## One-time setup

Everything from here on talks to git2docs over MCP. If bootstrapping the facts
file is all you were asked for, you're already done — skip this.

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
- **Page grounded in the WRONG code** → `remove_source_hints({ space_slug,
  page_slug, hints })` → drops those hints and resyncs the page. Use when a
  pinned hint keeps reproducing a bad claim: a stale README, a file the repo
  itself documents as inaccurate, a path that no longer exists. Pass the hints
  exactly as `get_page` reports them; the response names what was removed and
  what didn't match, so `removed: []` means nothing changed — check the strings
  rather than assuming it worked. Remaining hints stay pinned.
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
  Check **`list_product_gaps`** before re-filing: a gap you raised earlier may be
  `closed` with a resolution (the shipping spec/PR) — don't re-report a fixed one.
  If a gap you filed no longer holds (the code changed, an extractor now covers
  it, or you mis-diagnosed it), retire it with **`retract_product_gap({ gap_id,
  reason })`** rather than leaving it open.
- **A finding already satisfied by the current docs** (a prior finding that a
  regen or repo fix has since addressed) → `dismiss_finding({ finding_id, reason })`.
  `list_findings` shows the live set (yours + the maintainer's), each with a
  `status`. Dismiss ONLY after re-verifying the page against the code **this
  pass** — not to look converged; a maintainer can reopen it. Keeping the set
  clean means a later blanket Apply doesn't re-push moot (or stale) patches.
  **Never dismiss an `applied` finding** (below) — it is accepted, not fixed.

## Resolve git2docs' own structural checks (Tier-0)

`list_structural_findings` returns git2docs' **structural** failures — a
documented CLI/API/config artifact that doesn't match the extracted code
surface, each with the exact artifact, `got` vs `expected`, and the defining
`source_file:line`. These are separate from `list_findings` (they're recomputed
every generation and clear when the regenerated content matches). **You are the
fastest path to resolving them** — a human would edit prose; you fix the root so
the fix is durable. In order of preference:

1. **Fix the repo** — if the flag/route/command exists but the extractor missed
   it, make it legible in the maintainer's checkout (a PR); if it's an extractor
   limitation, `report_product_gap`.
2. **Anchor a fact** — `report_fact` for the exact command/value in
   `docs/docsync-context.yaml` so it grounds (use `near:` when the match isn't
   file-unique).
3. **Fix the doc claim** — `add_source_hints` + regenerate, or `direct_edit` as a
   last resort, if the claim itself is wrong.

Then **regenerate** — the check re-runs and matching findings clear.
`dismiss_structural_finding({ finding_id, reason })` is the **last resort**: only
for a claim you've confirmed correct that git2docs genuinely can't extract (file
a `report_product_gap` for the extractor gap too). It's keyed to the command's
identity, so it stays dismissed across regens.

## Keep the anchored facts current with the code

Anchored facts (`docs/docsync-context.yaml`) are how the docs stay true for the
exact strings no extractor reaches. Each is **anchored** to the source that
proves it — `match` is the **identity**, `src: "path:line"` is only a **hint**.
git2docs re-resolves every anchor at generation time by finding the `match`
anywhere in the file: a fact drops **only when its match is genuinely gone**
(fail-safe — a stale fact can never ship), and a match that merely moved to a new
line is **re-anchored**, not dropped. Your job, on every pass, is to keep them
current:

1. **`get_facts`** — the facts currently in `docs/docsync-context.yaml`, plus any
   `report_fact` captures not yet applied to the file. Read this *before*
   re-deriving anything.
2. **`verify_facts`** — re-resolves every anchor against the checked-out code and
   returns: `verified` (still resolve), `dropped` (match gone — the code changed;
   fix the code or retract/rewrite the fact), `reanchored` (the match moved — the
   `:line` hint is stale), and `ambiguous` (the `match` occurs more than once in
   its file — advisory: tighten it to a file-unique string, or confirm every
   occurrence attests the same fact). When any hint drifted it returns a
   **patched** `docs/docsync-context.yaml` with the hints rewritten — **write it
   back and commit**. This is your CI drift-guard; run it after edits and after a
   regen.
3. Then reconcile what `verify_facts` couldn't auto-fix:
   - **Retract** any `dropped` fact that's no longer true.
   - **Add** a fact (`report_fact`) whenever the code grew a new exact string a
     page must reproduce that no extractor derives. Always include `src` — an
     unanchored fact is never grounded. Prefer a `match` that's **unique in the
     file** (or whose duplicates all attest the same thing) so the line stays
     advisory. When the match **can't** be unique — a shared YAML value like
     `default: protector` that many options carry — add a **`near:`**
     disambiguator (a string on the owning line, e.g. the option name a line or
     two up). Resolution then pins the fact to the occurrence nearest `near`, so
     it identifies one option and a rename drops it loudly instead of
     re-anchoring to the wrong one.
4. Apply the set to `docs/docsync-context.yaml` (`facts:`) and open a PR the
   maintainer reviews. The next regeneration grounds every fact whose match
   still resolves.

You do **not** need to build a per-repo drift checker — `verify_facts` is that
guard, and the server re-resolves match-first at gen time regardless. Re-running
this each release keeps facts current; a moved line is auto-re-anchored, and only
a genuinely-deleted match needs your attention.

If `get_facts` returns nothing, the repo has no facts yet: bootstrap the file as
described in *Bootstrap the anchored facts* above (`get_facts` hands back the
same canonical text, so either source works once you're connected).

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

## Structure is a fidelity lever — split an overloaded page

Fidelity is decided *upstream* of validation, in the TOC. A page that tries to
cover several distinct things at once — three install options, N deployment
modes, a whole subsystem, each running long — forces the synthesizer to compress
many sources into one page, and **compression is where it fabricates.** No
amount of findings and Apply saves a structurally-overloaded page; you just burn
retries and regens on a page that can't ground.

Spot it from `get_page`: the page spans multiple distinct subjects, it's very
long, `grounded_in_code` is false or `grounding_confidence` is low, and/or its
`source_hints` are broad, empty, or all prose. The durable fix is **split +
re-hint**:

1. **Split** — `propose_toc_change({ action: 'add', title, parent_page_slug, … })`,
   one focused subpage per distinct subject (one per option / mode / component).
   An added page is created **ungenerated**, with no source hints — which is why
   step 2 is not optional. Generating it before hinting it would ground the page
   on a keyword guess.
2. **Re-hint** — `add_source_hints({ space_slug, page_slug, hints })` on each
   subpage, pointing at *that subject's* code/config, not the whole area.
3. **Then** regenerate. Each focused page grounds cleanly — one regen replaces a
   dozen finding→Apply rounds fighting a monolith that never had a chance.

Do this **structure-and-hints pre-flight — the TOC, each page's scope, its
hints — BEFORE** you recommend a regen or start filing content findings. Work in
pages and hints; `docsync-context` config is just the durable backing that makes
the split survive regens.

## `applied` means accepted, NOT fixed

Applying is two acts now, and the gap between them is where an agent goes wrong.

`report_finding` → the maintainer reviews and **applies** → the finding becomes
**`applied`**: the correction is written into the brief, and **nothing has been
regenerated**. The page still reads exactly as it did when you filed the
finding. Only when the maintainer runs a regeneration does the fix get written
and the finding resolve.

`list_findings` returns these alongside open ones, with `status` on each and
`open_count` / `applied_not_regenerated` split out. `get_status` reports the
same count.

So, on an `applied` finding:

- **Do not re-report it.** `report_finding` does not deduplicate — you will
  create a second copy of a finding that is already accepted.
- **Do not dismiss it.** Dismissing is for a finding the docs already satisfy.
  This one they do not; it is waiting on work.
- **Do not read the open count as convergence.** Zero open with findings still
  applied means nothing has been fixed yet.
- **Do not end the pass `clean`.** `end_validation` refuses it, for the same
  reason it refuses while a regeneration is in flight.

If a pass finds everything already applied, end with `incomplete` and say the
release is waiting on a regeneration. Re-validate after it runs.

The same applies to **anchored facts**: `get_status` reports
`facts_awaiting_commit` — facts you captured that are not yet in
`docs/docsync-context.yaml`, so they are grounding nothing yet. A page that
depends on one will still be wrong until the maintainer commits it AND
regenerates.

## Before lock: does anything here not belong in public?

Run this once, on the pass before the maintainer locks or publishes a release.
It is the last cheap moment — a published page is much harder to unpublish than
to never publish.

**The question is about the PAGES, not the repo.** You are not scanning the
repository for secrets; that is a different job, it is unbounded, and tools like
`gitleaks` already do it. You are asking a bounded question you are uniquely
placed to answer, because you hold both halves: **is everything on this
published page grounded in something that was meant to be published?**

Work from `list_pages` / `get_page`, and for anything that looks wrong, check
what it was grounded in (`source_hints`, `get_page_claims`). Things that are
fine in a repo and wrong on a public docs site:

- internal hostnames, lab or management IPs, cluster endpoints
- credentials of any kind, including ones that are "only" for a test rig
- a customer's name, tenant/project IDs, UUIDs, or support-case numbers
- internal URLs — a wiki, a ticket, a build server, an S3 bucket
- employee names and email addresses in examples
- licence keys, tokens, registry credentials

The grounding question usually settles it faster than reading the prose. A page
grounded in `docs/customer/`, an internal runbook, or a deployment scratch file
is suspect by construction, whatever it happens to say today. (git2docs no
longer reads agent instruction files — `CLAUDE.md`, `AGENTS.md`, `.cursorrules`
— at all, so that particular source is already closed.)

### Report it WITHOUT repeating it

**Never put the suspect string in a `report_finding`, a `report_fact`, a
`direct_edit`, or any other call.** Those are stored by git2docs. Sending the
secret to a server is the outcome this check exists to prevent, and doing it
through the tool meant to prevent it is worse than not checking at all.

Report to the maintainer, in your summary, in their terminal:

- which page and section
- **what kind** of thing it looks like ("a management IP", "what appears to be a
  test credential") — never the value
- what it was grounded in, so they can fix the source

If you file anything with git2docs at all, it carries the location and the
reason only.

### Fix the source, not the page

Same rule as everywhere else: a doc edit is overwritten by the next
regeneration. The durable fixes, in order — remove the content from the repo,
re-ground the page with `add_source_hints` / `remove_source_hints` so it stops
reading that file, or have the maintainer exclude the directory in git2docs.

### What you must not claim

**This is not a security review and does not replace one.** You are reading
rendered prose with judgement, not auditing a system.

So never report that a release is clean, free of private data, or safe to
publish. Report only what you found. "I did not find anything" is a statement
about your attention, not about the release, and a maintainer who reads it as
the latter will stop looking — which leaves them worse off than if you had never
checked.

## Rules

- **`applied` is not fixed.** A finding the maintainer applied is accepted and
  waiting on a regeneration; the page still reads as it did. Never re-report it,
  never dismiss it, never count the remaining open set as convergence, and never
  end the pass `clean` over one.

- **Never send suspect content to git2docs.** If a page exposes something
  private, name the page, the section and the KIND of thing in your summary —
  never the value, and never in a `report_finding`, `report_fact` or
  `direct_edit`. Those are stored server-side; repeating the secret there is the
  very thing the check exists to prevent.

- **Bootstrap needs no connection.** If you were asked only to create
  `docs/docsync-context.yaml`, author it from the checkout and stop. Don't set
  up MCP, don't check out a release commit, don't open a validation session —
  none of the rules below apply to that job.

- **Structure before findings.** Before recommending a regen or filing content
  findings, sanity-check the TOC: an overloaded page (many subjects / very long /
  weak grounding / broad hints) fabricates no matter what — split it into focused
  subpages with per-page hints first. Cheapest, most durable fidelity lever.

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
