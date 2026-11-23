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

**Skill version: 1.27.0** — send this as `skill_version` on `begin_validation`.
It is the only way anyone can tell which guidance you are actually following.

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

**What this file is actually parsed for.** Three blocks are read structurally,
and nothing else is:

- **`facts:`** — anchored facts. Re-resolved against the real source on every
  generation and dropped when the match is gone. `src`, `match`, `near`,
  `src_files`, `pages` and `note` are read **here and only here**.
- **`external:`** — pass-through claims about other tools, unanchorable by
  definition. Rendered into the same prompt block, scoped by the same rule.
- **`releases:`** — the release lineage, because `previous_tag` is a
  chronological shift register and cannot be trusted to name the semantic
  predecessor.

Everything else the file carries — `product:`, `sections:`, `authority:`, your
own prose — is loaded **whole, as text, into the comprehend prompt**. That
shapes the product brief, once, globally. It is not per-page, and **it pins no
file into any page's retrieval set.** Keep those blocks (do not delete a
maintainer's config), but do not expect structure from them.

Two consequences worth stating plainly, because neither is visible from
outside and an unparsed key produces **no warning**:

- `src_files:` on a `sections:` entry is ignored. It is a `facts:` key.
- There is no way, in this file, to pin a particular source file to a
  particular page. If a page needs specific code in front of the generator,
  that is `add_source_hints` — which needs a page slug, so it only exists
  after the first generation — or a `facts:` entry with `src` and a `pages:`
  scope, which works from the first run. Prefer the second when you can
  anchor it.

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

**Release lineage — only if this repo has more than one release line.** git2docs
diffs each release against the one it synced previously. That is the right base
for a project that releases in a straight line, and wrong in the worst direction
for one that maintains release branches: ship 2.1.0, then back-port 1.4.3, and
1.4.3 is compared against 2.1.0, so every API added across 2.x is published as a
**removal** in the 1.4.3 release notes. Nothing git2docs can see distinguishes
the two cases — it clones `--depth=1` at the tag, so it has neither the history
nor the sibling tags — and version numbers alone don't settle it either. You
have the repository, so you are the only party who can answer it.

Add a `releases:` block for each release whose predecessor is not simply the one
before it in time:

```yaml
releases:
  v2.1.0:
    predecessor: v2.0.4
  v1.4.3:
    predecessor: v1.4.2   # maintenance back-port on the 1.4.x branch
  v1.0.0:
    first: true           # nothing predates this one
```

These are **not** anchored facts — they describe branch history, not a string in
a file, so the anchor contract above doesn't apply to them. Read the lineage
from the repository (`git log --graph --tags`, `git merge-base`, the branch
layout), never from the version numbers. **Omit the block entirely when releases
are linear:** an absent block means "use the default", which is already right
there, and a block written from version order alone would replace a default
that works with a guess that looks authoritative.

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
4. **`list_frozen_sections`** — every section an earlier `direct_edit` froze
   (`agent_owned`). Those sections are no longer regenerated from code, so they
   are the one place staleness **cannot** be found by reading the code against
   the docs: the code moved, the docs didn't. Check each against its
   `code_evidence` and `reset_ownership` the ones whose source has changed.
   Freezes outlive your session — this register is the only record of them, so
   read it rather than keeping your own list.

Validating against a different commit produces false findings. `get_page`,
`get_page_claims`, and `get_status` all take an optional `version` — pass the
same one throughout.

## The validation loop (inside a session)

Open a session so git2docs knows a pass is UNDERWAY — "done" is now **declared**,
not inferred from silence.

1. **`begin_validation({ version, skill_version })`** → keep the returned
   `session_id`. Your reads and reports heartbeat it; if you crash or stop, it's
   marked *abandoned* after ~5 min (never counted as a false "converged").
   Reconnecting resumes a still-fresh session. It's refused while a regeneration
   is in flight.

   **Always send `skill_version`** — the **Skill version** line at the top of
   this file. The response tells you whether you are behind, and that is not a
   formality: this skill and the MCP tool descriptions are two halves of one
   contract, and only one half updates itself. Descriptions are served fresh
   every time you connect. This file is a plugin installed into a pinned local
   cache that does **not** follow the marketplace, so a maintainer who publishes
   a correction changes nothing on your machine until they run
   `/plugin update git2docs-skill` — and you keep whatever you loaded until a
   **new session** starts.

   So if the response says you are stale: re-reading this file will hand you the
   same old bytes. Say so to the maintainer, name the two steps, and until then
   **trust the tool descriptions over this file wherever they disagree.** An
   agent on a stale skill has no symptom from the inside — it reasons
   confidently from guidance that was retired weeks ago. This check is the only
   thing that surfaces it.

2. Work page by page — start with the pages that make concrete, checkable claims
   (CLI reference, API reference, configuration, getting-started, deployment).

   **Skip any page `list_pages` marks `removed`.** That is not a publishing
   state and not a page awaiting content: the maintainer took it OUT of the docs
   through the TOC editor, and git2docs carries the exclusion forward through
   every regeneration. Don't read it, don't validate it, don't file findings
   against it, and never `propose_toc_change({ action: 'remove' })` on it — the
   removal has already happened. A page marked `pending` is the opposite: real,
   not generated yet, and worth setting guidance and source hints on now.

   For each page you are validating:
   - **`get_page_claims`** — the checkable surface the extractors parsed. Read
     `extracted_kinds`: where a kind is **present**, verify the docs against it;
     where a kind is **absent**, those docs have no backing surface — check the
     code directly and file a **product gap** (a whole missing kind is an
     extractor coverage gap, not a per-page finding). Heed the completeness
     warnings — treat the surface as a checklist, not gospel. If the page ships
     a figure, **`diagram_claims`** lists what it asserts — verify those exactly
     as you verify a sentence.
   - **`get_page`** — full Markdown plus the `section_id`s you need to report,
     and grounding signals. If a page makes code claims but `grounded_in_code` is
     `false` (its hints are all prose — README/design docs) or
     `grounding_confidence` is low, **re-ground** it (`add_source_hints`) rather
     than only filing findings. Read **`unresolved_source_hints`** before
     anything else on the page — those hints ground nothing, so the page was
     written without the code it names (see **Dead source hints** below). Clear
     them before you spend the pass filing findings about what it says. If
     `diagrams` is present, the page ships one or more figures — see **Figures
     are claims too**.
   - **Verify against ground truth** — the part only you can do: run each
     documented CLI command (`--help` or a safe/dry-run invocation) and compare
     flags/args/output; check each API endpoint's route/method/params/response
     against the code; check config keys, env vars, and defaults where they're
     read; compile/run examples; judge architecture/concept/workflow prose
     against how the system actually works (read the code, don't guess).
   - **`record_section_checked({ section_id, … })`** — record each section the
     moment you finish it, whether or not it produced a finding. This is the
     ONLY thing that counts as having read it: `pages_checked` is computed from
     these records, and a section with none is treated as unexamined no matter
     how carefully you read it. Record as you go, not in a batch at the end — a
     pass that dies mid-way keeps the coverage it earned.

3. Report through the **right channel** (see the guide below) — including
   **anchored facts** for exact strings no extractor grounds.

4. **`list_coverage_gaps`** — undocumented public modules (your sufficiency
   checklist). For a gap git2docs should document, `report_finding({ module, … })`.

   **`sample_unvalidated_sections`** — what is still unexamined, drawn without
   bias. Reach for it when a product is too large to read end to end, or near
   the end of a pass to see what you skipped. Working from your own sense of
   what matters samples the pages you already trust.

5. **`end_validation({ session_id, verdict, recommendation, recommendation_reason })`**
   — `verdict` is your call on the PASS: `clean` (checked, nothing to fix),
   `findings_filed`, or `incomplete` (stopped early). A `clean` verdict is
   refused while a regeneration is in flight, **and while any regenerable
   section has no examination on record** — "clean" claims the docs are right,
   and a section nobody read supports no such claim. If you are refused for
   that reason you have not been blocked; you have been told what is left.
   Either read it and `record_section_checked`, or close the pass as
   `findings_filed` / `incomplete`, which is what it is. `recommendation` is your call on
   the RELEASE — see **Concluding the loop**. Both are required; they are
   different judgements and the second is the one the maintainer acts on. Only a
   pass closed `clean` puts a zero on the maintainer's convergence chart, which
   is why fixing your own findings and stopping leaves the trend unfinished —
   see **If you fixed it yourself, confirm it before you recommend `lock`**.

## Choosing the right channel

Using the right channel is the whole game — don't collapse everything into
`report_finding` prose.

- **Wrong claim in an existing page** → `report_finding({ section_id, kind,
  detail, suggested_fix? })`. `kind` ∈ inaccurate, outdated, broken_example,
  contradicts_code, misleading, insufficient, missing_topic. Put the **evidence**
  in `detail` (the command you ran, the file+line you read, the exact mismatch).
  Apply regenerates that section from code.
- **Figure that is ACCURATE and still fails to communicate** →
  `report_finding({ section_id, kind: "composition", detail })`. The wrong form,
  a missing part, an unlabelled axis, a step out of order. See **Figures are
  claims too**. Filing this as inaccurate/insufficient/misleading sends Apply
  off to rewrite prose, which is the wrong fix for a wrong form.
- **Undocumented module** (from `list_coverage_gaps`, no page at all) →
  `report_finding({ module, kind: "missing_topic", detail })`. Apply materialises
  a page grounded in that module. (Provide exactly one of `section_id` or `module`.)
- **Exact string no extractor derives** — an object/namespace/label name, an
  artifact name, a compatibility claim → **`report_fact`** (see the next
  section). This is the *durable* fix; don't bury such a string in finding prose.
  **"No extractor derives" is the whole condition** — if the claim is the
  EXISTENCE of a command, subcommand or flag, git2docs already has it and the
  call is refused. See **A fact is not for something we already extract**.
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
  `add` (`title` [+ `section_id` **or** `doc_type`]; pass `parent_page_slug` to
  nest it as a **subpage** under a top-level page, one level deep), `reorder`
  (`page_slugs` — the desired order of a set of siblings: all top-level, or all
  children of one parent). Identify pages by `space_slug` + `page_slug` from
  `list_pages`. All four are config-backed, so an Applied change **survives full
  regens** (a real missing code-derived page is better as a coverage-gap
  `report_finding`, which generates the page grounded in code).

  **A proposal is refused if one already exists for the same page** — matched on
  the action plus the page slug (or, for `add`, the title), against every
  proposal on this release still `open` **or already `applied`**. `applied` is
  the stronger refusal: the maintainer said yes, so the change is DONE and
  re-proposing it asks them to decide something they have decided. Check
  `list_findings` for what is already pending before you file — a structural row
  there carries its `action` and the page it is about. If the docs still read as
  though an applied change never happened, that is a finding about the result,
  not a new proposal.

  **If the page you want is one of the standard sections, say so with
  `section_id`** — `release_notes`, `troubleshooting`, `cli_reference`,
  `api_reference`, `getting_started`, `architecture`, `key_concepts`,
  `intended_audience`, `problem_statement`, `alternatives`,
  `advanced_deployments`, `ui_guide`, `automation`, `ecosystem_integration`.
  The page is then built the way git2docs builds that section: its own doc type,
  its own section structure, its own sources. For `release_notes` that is the
  difference between a page composed from the repo's changelog, the release body
  and the commit range, and a page that reads as another guide — the title alone
  does not decide it, so a page you call "What's new in 2.1" without
  `section_id` is a guide. Omit `section_id` for a page that is genuinely
  product-specific ("Upgrading from 1.x", "Air-gapped install"); the tool tells
  you if an id isn't one it knows, and `release_notes` is refused on a branch
  cohort because release notes belong to a tagged release.
- **A small, settled error on a page that is otherwise right — or a claim the
  generator can't be made to produce** → `direct_edit({ section_id, new_text,
  code_evidence })`. It freezes the section `agent_owned`, and regen never
  overwrites a frozen section (freeze is absolute). It is **not** a privilege you
  have to earn by burning a regeneration first: see **Choosing between a
  regeneration and a direct edit** for when it is simply the cheaper instrument.
  Never use it on anything the **code** decides — flags, signatures, endpoints,
  defaults, versions — fix the ground instead, or the section stops following the
  code. Confirm with the user. `reset_ownership` hands the section back to regen;
  **`list_frozen_sections`** is the register of every freeze you have made.
  **It closes the findings it was approved for.** A finding the maintainer
  approved for direct edit (`approved_for_edit: true` on `list_findings`)
  resolves when your edit lands — a frozen section can never be reached by the
  regeneration that would otherwise close it. Findings on that section that were
  **not** approved stay open and come back in the tool's response: the freeze
  puts them out of reach of every other mechanism, so tell the maintainer
  instead of leaving them to rot. If your edit did not in fact fix an approved
  finding, file it again rather than let it stand closed.
- **Confirmed-correct editorial content a rewrite keeps dropping** — a caveat,
  an ordering constraint, a "why" that isn't derivable from code →
  `set_guidance({ space_slug, page_slug, guidance })`. A short anchor the
  generator **must not contradict** on any future regen, so unlike a finding it
  survives a full regeneration. NOT for code facts (that's `report_fact`) and
  NOT for defects (that's `report_finding`). Empty string clears it.
- **A page carrying boilerplate it should not have** — install steps on a
  reference page, a troubleshooting list invented for a page with no failure
  modes → `omit_page_sections({ space_slug, page_slug, sections })`. Use the
  `section_type` values `get_page` reports. Re-deriving the same wrong section
  across many pages turns one mistake into one finding per page; switch it off
  once instead of filing it repeatedly.
- **A page whose table-of-contents summary misdescribes its scope** →
  `set_page_description({ space_slug, page_slug, description })`. Reader-facing
  text about what the page covers — not a constraint on the generator.
- **git2docs itself can't get you the right outcome** (config can't express X, a
  whole surface can't be extracted, a diagram can't represent the topology) →
  `report_product_gap(...)` — goes to the git2docs team, not the customer's docs.
  Check **`list_product_gaps`** before re-filing: a gap you raised earlier may be
  `closed` with a resolution (the shipping spec/PR) — don't re-report a fixed one.
  If a gap you filed no longer holds (the code changed, an extractor now covers
  it, or you mis-diagnosed it), retire it with **`retract_product_gap({ gap_id,
  reason })`** rather than leaving it open.

  **A gap is a conversation, and your turn is real work.** When
  `list_product_gaps`, `get_status` or `begin_validation` says a gap is
  awaiting you, read it with **`get_product_gap({ gap_id })`** — the whole
  thread, not the summary. The reply may name a capability that already ships,
  correct your diagnosis, or ask something only you can answer. Answer with
  **`reply_product_gap({ gap_id, message })`**: supply the evidence asked for,
  confirm a fix worked, or say the diagnosis was wrong. It does not change the
  gap's status; it hands the turn back. **Your words go to the maintainer who
  owns this repo as well as to git2docs, so write them for both.** A gap left
  waiting on you is a question nobody else can close.
- **A finding already satisfied by the current docs** (a prior finding that a
  regen or repo fix has since addressed) → `dismiss_finding({ finding_id, reason })`.
  `list_findings` shows the live set (yours + the maintainer's), each with a
  `status`. Dismiss ONLY after re-verifying the page against the code **this
  pass** — not to look converged; a maintainer can reopen it. Keeping the set
  clean means a later blanket Apply doesn't re-push moot (or stale) patches.
  **Never dismiss an `origin: "auto"` finding** — `dismiss_finding` refuses it
  (see **Automated checks** below). **Never dismiss an `applied` finding**
  (below) — it is accepted, not fixed.
  **Never dismiss a finding your own `direct_edit` fixed, either.** Dismissal
  records that the finding was WRONG, which erases the fix from the history;
  the edit closes it on its own once the maintainer has approved it.

### A fact is not for something we already extract

`report_fact` refuses a claim the extracted code surface already carries, and
answers `refused: "restates_extracted_surface"` with the tokens it confirmed.
That is not strictness, it is the difference between fixing a page and hiding
why it broke.

When a page gets a command or a flag wrong and the surface already declares it,
the page was not missing knowledge. **Synthesis had the surface and did not use
it.** Capturing the right answer as a fact makes that page right and leaves the
reason unreported and unfixed, so the next page on the same subject gets it
wrong again — and now there is a permanent sentence making the failure look
handled. One repo reached 247 live facts this way, with the extracted CLI
surface sitting beside them saying the same things.

So:

- **Inventory claims are not facts.** "`zone-credential` has create, rotate,
  inspect and delete", "`create` requires `--zone`" — `get_page_claims` already
  shows these as an extracted surface. Fix the grounding: `add_source_hints` to
  put the declaring file in front of the generator, or `report_finding` against
  the page. If the surface is itself wrong or incomplete, that is
  `report_product_gap` against git2docs — the more useful report, and the one a
  fact would have buried.
- **Value claims still are facts, and this does not touch them.** The surface
  records a flag's name, type, enum values and whether it is required. It does
  **not** record its DEFAULT. `--token-lifetime defaults to 24h` is exactly what
  `report_fact` is for and goes through. So does a namespace, a label, an
  artifact name, a compatibility matrix.
- **The check abstains rather than guess.** No extracted CLI surface, a surface
  the extractor itself called incomplete, or a claim naming a flag the surface
  does not declare, and it says nothing at all. A refusal therefore means the
  surface really does carry the claim — read the refusal's `confirms` before
  arguing with it.

If you believe a refusal is wrong, do not reword the fact to get past it. File
the product gap; a fact that slipped through would ground every future page
with the defect still in place.

## Figures are claims too

A figure reads as authoritative and a reader cannot diff a picture against the
code, so a wrong one costs more than a wrong sentence. `get_page` returns
`diagrams` for a page that ships one, and there are **two separate judgements**
to make about each.

**Correctness** — from `claims` (also on `get_page_claims` as `diagram_claims`).
These are sentences the figure asserts: what a box is, where it sits, what
connects to what. Verify them against the code and `report_finding` on the
section id with an ordinary kind when one is wrong. Nothing distinguishes these
from a wrong sentence except that the reader cannot see they were claimed.

**Composition** — from `structure`, the declaration the figure was drawn from.
File it with `kind: "composition"`: the wrong form (a sequence wearing a
topology's clothes), a missing part (the standby write path is absent), an
unlabelled axis, a step out of order, one band carrying fifteen boxes, or
*"this page needs a figure and has none"* — and equally *"there should not be a
figure here"*, which is a legitimate outcome. A composition finding changes the
**form** or the declared **structure** and the figure is re-rendered from it; it
never edits markup, so the fix survives the next regeneration.

**Critique structure, never pixels.** You are reading a declaration, not the
rendered page. You can say a part is missing, mislabelled, misplaced or out of
order. You **cannot** say it is crowded, that two colours fight, or where the
eye lands — you have no access to that, and a confident opinion about it is
worse than silence. Aesthetic judgement reaches git2docs from a maintainer who
can see the page.

**Don't critique the fence.** If a section's mode is `html` or `svg`, the
` ```mermaid ` fence in the Markdown is **inert** — it is stripped before the
reader sees it, and the figure in `diagrams` is what ships. Some figures predate
the declared contract and carry markup only; `get_page` says how many. For
those, say so rather than inferring a structure from the markup.

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

### Automated checks — the same Tier-0 evidence, after an Apply

The checks above also reach you through `list_findings`. After an
apply-triggered resync, git2docs re-validates every documented CLI command and
API call on the rewritten page, and each one that still will not resolve
becomes a finding with **`origin: "auto"`**. One regeneration can produce
dozens.

These are not the maintainer's opinion. They are the only finding class that is
**mechanically true** — derived from the extracted code, not from anyone's
reading of the page — and they come with a `fix` field saying so. Exactly two
things make one go away:

1. **The documented artifact is wrong** → correct the section (regenerate, or
   `direct_edit` if it is small and settled).
2. **The page is not grounded on the file that defines it** → `add_source_hints`
   pointing at that file, then regenerate. The finding's own text asks for this
   in so many words — *"point this page at the right source file"* — and it is
   asking **you**, not the maintainer. `add_source_hints` is your tool.

**You cannot dismiss one, and you do not need to.** `dismiss_finding` refuses
an `origin: "auto"` finding. It clears ITSELF on the next resync once the
artifact resolves — git2docs resolves every open auto check that has left its
page's failure set, keyed by page slug so it survives a regeneration. Fix the
ground truth and it closes on its own. "I re-read the page and it looks right"
does not make a command exist.

**The one exit, and what it costs.** If you have read the code, confirmed the
documented call is right, and established that the extractor genuinely cannot
see it — a flag inherited from a parent command, a framework we do not parse —
then `dismiss_structural_finding` on the underlying Tier-0 finding, plus
`report_product_gap` for the extractor itself. The automated check is DERIVED
from that structural finding, so dismissing it stops the comment as well; until
git2docs 2026-11-22 it did not, and an agent in exactly your position could
clear the pill and the count and still watch the same check return on every
resync, with no way out at all.

It is keyed to the command's identity, so it stays dismissed across
regenerations — which is the cost: you are turning off a real check on a real
command, for good, on your own word. File the gap in the same pass so the
extractor gets fixed and the check can come back meaning something. Never reach
for this because a check is stubborn; reach for it when you can say precisely
what the extractor missed and where.

A page carrying several of these at once is telling you something louder than
any one of them: it is not grounded. Re-ground the page before you spend a pass
filing prose findings about what it says.

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
   - **Name the pages a fact bears on**, on `report_fact` and in the file:
     `pages: [configuration, cli-reference]` (slugs from `list_pages`). A fact
     with no page scope goes into the prompt for *every* page and re-rolls
     *every* page when it is committed — and a re-rolled page resamples most of
     its checkable claims, so the examinations you just spent on the other
     thirty pages are thrown away to deliver a fact those pages never mention.
     Omit it only when you genuinely do not know: a wrong narrow list leaves a
     page stale, which is worse than paying for breadth.
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

### Audit the LEARNED facts too — nothing else does

Anchored facts are half of what grounds synthesis. The other half is what
git2docs **learned** from findings the maintainer applied: one sentence per
correction, written by a model, stored per repo. **`list_learned_facts`** lists
the live set with the finding each came from (`dimension` / `contains` narrow
it; `offset` pages).

**`status` decides what you are looking at.** The default lists what is IN
FORCE. A fact an Apply or an `apply_correction` minted is **pending** until the
maintainer confirms it: it grounds nothing, and it is invisible in the default
listing. `status: "awaiting"` lists those, `"all"` lists both, and every row
carries `in_force` and `pending_since`.

Read the pending set whenever:

- **You just ran `apply_correction`.** Your replacement lands pending. Checking
  that it is there is how you know the correction took, and a correction you did
  not verify is a correction you only believe you made.
- **A page keeps repeating an error you have already corrected.** A claim
  sitting in the confirm queue for the third or fourth time is the loudest
  signal this store has. It means the generator was never told — not that the
  fact is missing. Filing a fifth copy cannot help; say so to the maintainer and
  ask them to confirm one.
- **You are about to re-derive something.** It may already be there, waiting.

Treat these as claims to check, not as settled truth:

- Nothing re-checks them. `verify_facts` covers anchored facts only; a learned
  fact is never resolved against code, at any point, ever.
- **An applied finding is one the maintainer ACCEPTED, not one that is true.**
  They accepted it on the evidence they had, which may since have been shown
  wrong.
- **One live fact per key is guaranteed; one per SUBJECT is not.** A correction
  filed under a *new* key leaves the old, wrong fact live beside it, and both
  reach the generator. Facts on one subject under different keys are the thing
  to look for. One repo had five live facts on a single behaviour, one of them
  contradicting the repo's own anchored facts, and the pages on that subject
  came back wrong pass after pass — including after the anchored facts were
  right.
- **`restates` is computed for you.** Every row names the other keys asserting
  the same claim, with a verdict: `restatement` (the same thing said twice) or
  `contradiction` (different values for one subject). You do not have to spot
  these by eye — but you are the one who can read the code, so you are the one
  who can settle a `contradiction`.
- **Two live facts can state different values for the same thing.** One repo had
  `--token-lifetime` in force twice — "default 24h, minimum 10m" and "one year
  (8760 hours), not 24 hours" — and both went into every prompt, so the pages
  could state either. The maintainer's Findings page now flags an in-force pair
  that disagrees, but nothing resolves it on its own: when you read the learned
  set, look for two facts carrying different numbers, URLs or quoted values for
  one subject, and `propose_fact_retraction` the wrong one with the line that
  proves it. A duplicate is untidy; a disagreement is wrong on every page that
  reads it.

So when a page keeps regressing on a subject your anchored facts already cover,
read the learned facts before re-deriving anything. An anchored fact you add on
the same subject is the durable fix, but it does not remove the learned one —
`promote_fact` is what moves a *right* learned fact across rather than leaving
two copies of one claim in two stores. See *Promote the ones you can prove*
below.

**`propose_fact_retraction({ retractions: [{ fact_key, whats_true, evidence,
replacement? }] })`** files the case. It does not retire anything — retiring
removes grounding the docs may rely on, so the maintainer decides and acts on
it in their dashboard. The fact stays IN FORCE until they do, so say so if a
page depends on it.

- `evidence` is required: the `file:line` you read or the command you ran. A
  retraction request without it is an opinion, and nothing can be done with it.
- **`replacement` is what matters most, and it is optional only because some
  facts deserve none.** Most wrong facts are wrong in ONE CLAUSE — true about
  the behaviour, false about the error code, the default, the ordering.
  Retiring those outright leaves the subject grounded by nothing, which is
  worse than the error you removed. So send the corrected sentence, and write
  it to stand ALONE: `whats_true` is for the maintainer to read and may argue
  with the old fact ("the clause X is FALSE"); `replacement` is fed verbatim to
  every future regeneration and must not mention the fact it replaces. Omit it
  only when nothing should ground this subject at all.
- Use it especially where several live facts describe ONE subject under
  different keys. Only one can be right, and the others keep reaching the
  generator beside it.

### Promote the ones you can prove — a learned fact has no release

A learned fact is stored per **repository**, with no version on it. The repo's
`docs/docsync-context.yaml` is stored per **branch**. That difference is not
cosmetic, and on a project that cuts release branches it is already biting:

- A fact learned validating **2.0** grounds a regenerated **1.9**, where the
  code says something else. Nothing consults a tag before rendering it.
- A fact that stopped being true keeps grounding, because nothing re-checks a
  learned fact against code at any point.
- Retiring one that is wrong for **2.1** retires it for **1.9** and **2.0**
  too, including the release where it was right.

The anchored file has none of these, and not because anyone was careful: a
release branch inherits it, edits it incrementally, and git2docs reads it from
*that* checkout. Git does the versioning. So **the only way a learned fact gets
a release is to move it into the repo**, and doing that is part of a normal
pass — not a cleanup project you schedule for later. Everything an Apply mints
lands in the unversioned store; this is what drains it.

`list_learned_facts` returns them **in promotion order**: facts carrying
`evidence` (a `file:line` the maintainer already adopted them from) first, then
the ones whose sentence names a literal you can go and find, then the rest. It
also returns `staging` — how many are grounding with no copy in the repo, and
how old the oldest is. That number falling over a pass is the point of this
section.

For each one you can prove:

1. **Check it against the code.** It is a sentence a model wrote from a
   correction the maintainer accepted, which is not the same as one that is
   true. If it is *wrong*, that is `propose_fact_retraction`, above.
2. **Write it into `docs/docsync-context.yaml`** under `facts:`, with
   `src: "path:line"`, the exact `value`, and `pages:` where you know them.
3. **`promote_fact({ promotions: [{ fact_key, anchor_key, value, src, match?,
   pages? }] })`** — `fact_key` exactly as `list_learned_facts` printed it,
   `anchor_key` the key you just gave it in the file.
4. **Open the PR.**

**It retires nothing, and you must not report the migration as finished.**
git2docs cannot see your PR and the PR may never merge; retiring on your say-so
would silently remove grounding the docs depend on. The learned fact keeps
grounding every page until its **value** appears in the committed file, which
git2docs checks for itself — then the learned twin retires on its own and the
claim is re-resolved against the code on every generation from that point.
Matching is on the exact value, so the YAML must carry the string verbatim; a
reflowed line is a different claim and nothing lands.

Two things it will not take:

- **A fact still awaiting the maintainer's confirmation.** Promoting moves a
  claim into their repository and their git history, which is the direction
  that is hard to undo. Nobody has confirmed that sentence yet.
- **A fact you cannot anchor.** The 27% that name nothing resolvable are not
  noise and they are not promotable either: ecosystem and upstream behaviour
  goes under `external:` in the same file, an editorial rule belongs in
  `set_guidance`, and a synthesis across the whole system has no anchor by
  nature. Say which, rather than inventing a `src` that will drop on the next
  generation.

One caveat worth stating to the maintainer: `facts:` has no `forbid:` key, so a
learned fact carrying declared adherence patterns loses that machine-checkable
half on promotion. `list_learned_facts` flags those with
`forbid_lost_on_promotion`. Promote them anyway if the claim is right — a fact
with a release and no checker beats a checker on a fact that grounds the wrong
release — but say what was lost.

### And the BRIEF — the third place an Apply writes

An Apply writes in two places, not one. The learned fact above is the first.
The second is the **product brief**, and it is the stronger of the two: the
brief is rendered with **strict authority** in every page prompt, so one
sentence in it outranks the repository on every page until someone removes it.
Nothing re-checks it against the code, ever.

**`list_brief_corrections`** is the register — every sentence an Apply wrote
into the brief, with the finding it came from and the date it landed.

**This is where a page that keeps coming back wrong usually lives.** When the
code is right, the anchored fact is right, the extracted surface is right, and
the page still repeats an old claim, read this list before re-deriving
anything. A correction accepted months ago is still asserting it.

Two shapes, and only one of them has a signal:

- **Stale** — true when filed, overtaken by the code since. `contradicts_code`
  (the correction names a CLI flag no command in the extracted surface
  declares) and `source_changed` (a file its findings cited has changed by
  content hash) both point here. Treat either as a pointer to READ, never a
  verdict — neither knows whether the sentence is still true, and
  `contradicts_code` is absent entirely unless the surface is complete, so its
  silence proves nothing.
- **Wrong from the start** — never true on any commit. No signal reveals this.
  Only reading the finding against the code does, and that is your job.

`still_in_force` says whether the current brief carries it verbatim. Retiring
one is the maintainer's call — report the id, the text, and the code that
contradicts it, and let them act.

A worked example, because this one is easy to get half right: a correction
pinned `current head: 022_add_reconcile_operation_type` into a deployment
workflow. The head is 025 now. Retiring the correction restores what it
replaced — `021` — which is also wrong. The fix was not to retire it but to
edit the entry so it names no head at all: "apply any new Alembic migrations"
is true forever, and naming the head guarantees the same bug next release.
**When a correction pins a value that moves, the fix is to stop pinning it.**

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

## Dead source hints

`get_page` returns **`unresolved_source_hints`**: hints on that page that
resolved to nothing when it was last generated. They still appear in
`source_hints` because they were pinned — git2docs won't delete a deliberate pin
over one bad run — but they ground nothing, so **the page was written without
the code it names**. A page whose only code hints are dead also reports
`grounded_in_code: false` even while `grounding_confidence` reads high:
confidence means grounding happened, not that it grounded in code.

This is worse than a missed opportunity. A hint whose *name* implies an API
invites the synthesizer to supply what the name implies — a dead `api/routes.py`
doesn't merely fail to help, it suggests routes to invent. **Dead hints are a
fabrication source.**

**Clear them before filing content findings on that page.** A finding about an
invented claim whose cause is a dead hint comes back after the regeneration, in
new wording.

For each one, decide which it is:

1. **Wrong path, right intent** — the file moved, or the path was mistyped.
   `remove_source_hints` the dead one, `add_source_hints` the real path.
2. **The file is gone** — remove it, and point the page at whatever grounds it
   now. A page left with no code hints regenerates ungrounded.
3. **A symbol rather than a file** — both `path/to/file.py::symbol` and dotted
   `pkg.mod.Class.method` resolve. If a symbol you can see in the code still
   won't resolve, it probably isn't extracted: that's `report_product_gap` (an
   extractor limitation), not a hint to delete.

### Your hints are permanent; the planner's are not

Pruning is **asymmetric**, and the half that applies to you is the half that
does not clean itself up.

- A hint the **planner** wrote that resolves to nothing is **pruned** at the
  next generation. It disappears from `source_hints` without anyone acting.
- A hint **you** pinned is **never** pruned. `add_source_hints` pins everything
  it writes — that is what makes a pin worth giving — so a dead one stays on the
  page, in `source_hints`, for every future regeneration, surfacing only in
  `unresolved_source_hints`.

So the two kinds of mistake have opposite lifespans. A bad planner hint is a
transient. **A bad hint of yours is permanent until you remove it**, and while
it sits there it is doing the thing described above: naming code that does not
exist, on a page that regenerates from that name.

Three rules follow.

1. **Pin paths you have verified, not paths you expect.** Check the path exists
   at the validated commit before pinning it. `git ls-files <path>` is the whole
   test and it costs you nothing.

2. **Do not shotgun broad globs across many pages.** Pinning `api/**` to
   fifteen pages because it helped on one creates fifteen permanent pins, and
   every one that misses is a fabrication source you now own. Pin per page,
   from what that page actually claims.

3. **`remove_source_hints` is the only way out.** There is no run that will
   tidy your pin for you. If you pinned it and it is dead, you remove it — and
   pass the string exactly as `get_page` reports it, because `removed: []`
   means nothing matched and nothing changed.

The corollary for a re-grounding pass: after you pin, read `get_page` again on
the next generation and check `unresolved_source_hints`. A pin that did not
resolve is not a neutral no-op you can leave behind — it is a hint you added
that now grounds nothing, and it will still be there on the pass after this one.
4. **It never existed** — a conventional-looking path that was guessed rather
   than read. Delete it, and don't replace a guess with another guess.

Case 4 is worth noticing about your own work: a hint naming a file that was
never in the repo is where convention got substituted for reading the code —
the same failure you are checking the docs for.

Hints are re-resolved only when a page is generated, so the list reflects the
last run: a hint you fixed still reads as dead until the next regeneration.

## Choosing between a regeneration and a direct edit

A regeneration is **all-or-nothing per page**: it rewrites every unfrozen
section on every page it touches, not only the sections carrying findings. That
one fact decides this.

- Its **benefit** scales with the findings a run can fix.
- Its **damage** scales with the correct sections it re-rolls, some of which come
  back wrong.

Early in a pass the benefit dominates: findings share a root cause — a bad source
hint, a missing fact, an overloaded page, a page grounded in prose instead of
code — so one input fix plus one run clears many at once. **Regenerate**, and fix
every input in the same batch.

Later it inverts. What is left is a handful of small, unrelated errors on pages
whose other sections are right today, and another run puts all of them back in
play. This is why a pass can stop converging no matter how many times you
regenerate: the count isn't falling because roughly as many new errors are minted
each run as are fixed. **`direct_edit` is the cheaper instrument from that point
on** — fix the sentence, leave everything correct alone.

`list_findings` returns **`regeneration_exposure`** so this is arithmetic rather
than a feeling: how many sections a run would rewrite (`sections_rewritten`)
against how many carry findings (`sections_with_findings`), over how many pages.
When the first number is several times the second **and** the findings have no
common cause, stop regenerating and edit.

Two cases justify a direct edit on their own — neither needs a regeneration
first to prove it:

1. **Small, local, settled** — a wrong default, one bad line in an example, a
   stale sentence, where the rest of the page is correct.
2. **Shown to be underivable** — a finding was applied, the regeneration ran, and
   the same error came back in new wording.

You are the author now, so write the text as carefully as you'd check the
generator's: verify it against the code before you save it, and cite that code in
`code_evidence`. The cost is that a frozen section stops following the code, so
never freeze anything the code decides, and read `list_frozen_sections` at the
start of a pass on a new release.

### A replan can take your records with it

The arithmetic above prices one cost — correct sections re-rolled. There is a
second one, and on a pass that has accumulated work it is the larger.

A regeneration comes in three shapes, and they are not the same act:

- **one page** (a resync) and **`all`** (every page, no re-plan) MUTATE the
  live set of pages. Nothing is rebuilt, so every section keeps its identity
  and everything attached to it is untouched.
- **`replan`** runs the full pipeline and may change the table of contents. It
  BUILDS A NEW SET OF PAGES and swaps it in, and every section id in the old
  one ceases to exist.

Findings, freeze provenance, the maintainer's standing direct-edit grants and
contest resolutions are keyed to a section. Across a replan they are carried
over by **identity — (page slug, section type, section key)** — the same rule
that keeps a dismissal dismissed. Where the new table of contents has a
counterpart they move across intact. Where it does not — the replan renamed the
page, split it, or dropped it — **they are not guessed into a similar-looking
section. They are reported and lost.** That is the right call (a finding
re-pointed at the wrong page makes the next pass "fix" something that was never
wrong) and it is still a loss.

So, as a rule: **when the INPUT has moved, resync or `all`. Reserve `replan`
for when the STRUCTURE is what is wrong.** New code, a re-cut tag, committed
facts, applied corrections — none of those need the table of contents
recomputed, and recomputing it puts every finding and every freeze you hold at
risk for nothing. An overloaded page that must be split is a structural
problem, and there `replan` is the instrument; say so to the maintainer, and
say what is outstanding before they run it.

Two related facts worth knowing, because maintainers ask:

- **Re-cutting a tag is safe by itself.** No generation reads a stored commit;
  every one of them resolves the tag against a fresh clone, so a moved tag is
  simply picked up on the next run, and nothing happens until one is triggered.
  The risk is not the tag move. It is running a `replan` afterwards, when the
  new tree reshapes the table of contents.
- **Anchored facts and learned facts are not section-scoped** and survive all
  of this. Anchored facts are read from the repo at the release's tag, so they
  follow the tag; learned facts are held against the repository.

## `applied` means accepted, NOT fixed

Applying is two acts now, and the gap between them is where an agent goes wrong.

`report_finding` → the maintainer reviews and **applies** → the finding becomes
**`applied`**: the correction is written into the brief, and **nothing has been
regenerated**. The page still reads exactly as it did when you filed the
finding. Only when the maintainer runs a regeneration does the fix get written
and the finding resolve.

**An Apply never writes page content, so there is nothing for a regeneration to
overwrite.** It writes three INPUTS — the brief, learned facts, pinned source
hints — and a regeneration is the only thing that makes any of them take
effect. Not the thing that undoes them. Apply used to queue its own
regeneration and that was removed precisely so the facts land in the repo
first. If you find yourself reasoning that a correction was applied and then
lost, the mechanism you are looking for is not overwriting: it is a correction
that never reached the page, which `list_brief_corrections` now reports as
`landing: "did_not_take"`. Read it before you theorise.

The durability order runs the other way from how it looks. A `direct_edit` is
the most VISIBLE (you can see the frozen section) and the most local: one
section, no effect anywhere else, and it stops following the code. A brief
correction is invisible to you and the strongest thing in the system — rendered
with strict authority in EVERY page prompt, outranking the repository, never
re-checked against the code by anything, permanent until a maintainer removes
it. Do not treat a freeze as more durable than an Apply because it is the one
you can see.

An Apply also writes in two places that outlive the page it fixed: a **learned
fact** and a **brief correction**, both permanent until a maintainer removes
them, neither re-checked against the code ever again. That is not a reason to
withhold a real finding — it is the reason the channel order above exists. A
repo fix or an anchored fact leaves nothing behind to go stale; a finding
leaves two sentences that will still be asserting themselves next year. See
**Audit the LEARNED facts** and **And the BRIEF** for what they look like once
they have accumulated.

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

## Concluding the loop

**You are the one who decides when this release is done. Nobody else can.**

The maintainer is watching a four-step panel in their browser. You cannot see
it. They cannot see what you saw — which pages you read, which commands you
ran, which of the remaining findings are cosmetic. So when you stop without
saying whether the release is finished, the panel sits on "Waiting", they have
nowhere to go, and the only move left to them is to ask you whether you are
done. That is a question only you can answer and you have already stopped
answering. Both of you then wait for the other.

So **every `end_validation` carries a `recommendation`**, which is your call on
the RELEASE, as distinct from `verdict`, which is your call on the pass:

| `recommendation` | means |
|---|---|
| `lock` | Nothing further is worth doing. Freeze it. |
| `regenerate` | Fixes are staged (applied findings, committed facts) and need a run. |
| `keep_validating` | You are not finished — more passes to come. |
| `blocked` | You need the maintainer before you can continue. |

`recommendation_reason` is one line and is **required**, because it is rendered
to the maintainer verbatim as their next step. "Nothing further is worth doing"
is not a reason; "three cosmetic wording findings remain, all on pages whose
other sections are correct — another regeneration would re-roll 40 correct
sections to fix three sentences" is.

### Two things justify `lock`

1. **A pass found nothing new.** You checked and there was nothing to file.
2. **What is left is not worth the cost.** This is the judgement the
   `regeneration_exposure` arithmetic above is FOR, and it is yours to make.
   Minor findings on an otherwise-correct page do not have to be fixed before a
   release is locked — they have to be *weighed*. Say what is left, say why you
   are not spending a regeneration on it, and recommend `lock`. A release held
   open for three wording nits while 40 correct sections sit at risk of being
   re-rolled is the worse outcome, and the maintainer is relying on you to say
   so.

You may recommend `lock` with a `findings_filed` verdict. The two are
independent: you filed findings AND you think none of them is worth acting on
before this release ships. That combination is common and honest. What is not
honest is manufacturing a `clean` pass to make the panel advance — see below.

### If you fixed it yourself, confirm it before you recommend `lock`

The common ending to a pass is: you filed findings, you fixed them with
`direct_edit`, and the queue is empty. That pass is `findings_filed` — it is,
you filed findings — and recommending `lock` there leaves the release in a
state the maintainer reads as the product contradicting itself:

- The stepper says **Validated & locked — frozen and attested.**
- The convergence chart ends on your last non-zero bar, under a note saying a
  pass still has to confirm it.

Both are correct. A zero is drawn only for a pass that **completed with verdict
`clean`**, and no pass has read the text you just wrote — your own edits are
the most recent change to it.

So when you have fixed what you filed, and `get_status` shows nothing open,
nothing applied-but-not-regenerated and no pages awaiting a regeneration:
**open one more short pass**, re-read the pages you changed,
`record_section_checked` them, and close that pass `clean` with your `lock`
recommendation. Then the chart ends on the zero and the lock means what it says.

This is the opposite of minting a pass. A minted pass examines nothing and
declares `clean` to move the UI. This one examines text that nobody — including
you — has checked since it changed, which is exactly what a validation pass is
for. `end_validation` tells you when you are in this case.

If you would rather stop, stop: recommend `lock` and say in the reason that the
fixes are unconfirmed. That is a legitimate call. It is only dishonest when the
reason doesn't say so.

### Never mint a pass to move the UI

If the maintainer tells you the panel says "Waiting", **do not open a session
and close it to clear the state.** A session that examines nothing and declares
`clean` puts a zero on their convergence chart that means nothing, and
`pages_checked` is now computed from what you actually recorded, so it will read
0 and say so.

What to do instead: read `get_status`. It now returns `converged` and a
`maintainer_next_action` telling you exactly what the panel is showing and whose
move it is. If the move is theirs, say so in your summary. If it is yours, make
it. If you have genuinely finished and only the declaration is missing, that is
a real `end_validation` with a real recommendation — not a new pass.

If you have already checked everything and nothing has changed since, you do
not need to re-check it: an examination stays valid while the section's text is
unchanged, so coverage carries forward on its own. Say "coverage carried
forward from the pass at `<commit>`" in your note rather than restating it as
this pass's work.

### Say it in the terminal too

The maintainer reads your summary, not the database. End every pass by telling
them, in their terminal, in one or two sentences: what you concluded, and the
single next thing for them to do — lock, regenerate, apply findings, or nothing.
If `maintainer_next_action` says the move is theirs, that sentence is the most
useful thing in your whole summary.

**Name findings the way the maintainer sees them — never by id.** The Findings
page renders no ids, so a step that reads "close 522e06ab and 8fa5163b" names
two things nobody can look up, and the maintainer has to come back and ask.
Cite the page and section instead — "Installation → Prerequisites" — which
`report_finding`, `list_findings` and `dismiss_finding` all return as `page`
and `section`. Where two findings share a page and section, add a few words of
the claim to tell them apart. `comment_id` / `finding_id` are for your own tool
calls; they are not addresses a person can use. The same goes for `gap_id`:
name a product gap by its desired outcome.

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

**This rule is about PRIVACY, and only privacy.** It does not stop you
concluding the loop. You can and must still say whether the documentation is
accurate enough to lock — that judgement is grounded in pages you read against
code you ran, and it is the whole point of the pass. What you must not do is
let a maintainer hear "no secrets found" as "audited and safe to publish". Keep
the two statements apart in your summary and make both.

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

- **Only you can see the branch history.** git2docs clones `--depth=1` at the
  release tag, so it diffs against whatever it synced last. If this repo has
  more than one release line, declare `releases:` in
  `docs/docsync-context.yaml` — read from the graph, never from version order.
  If releases are linear, declare nothing: the default is already right, and a
  guess written to look authoritative is worse than no entry.

- **Bootstrap needs no connection.** If you were asked only to create
  `docs/docsync-context.yaml`, author it from the checkout and stop. Don't set
  up MCP, don't check out a release commit, don't open a validation session —
  none of the rules below apply to that job.

- **A decision is not a question.** A page `list_pages` marks `removed`, and a
  `propose_toc_change` the maintainer already applied, are settled. git2docs
  refuses the repeat, but the refusal is the backstop — read the decisions
  first. Re-proposing what someone has already decided is how a findings list
  stops shrinking.

- **An automated check is fixed, not argued with.** An `origin: "auto"` finding
  is a grounding failure proved against the code. Correct the section or
  `add_source_hints`; it then closes itself, and `dismiss_finding` refuses it
  either way. There is exactly ONE exit, for the case where you have READ THE
  CODE, confirmed the documented call is right, and established that git2docs
  cannot extract it: `dismiss_structural_finding` on the underlying Tier-0
  finding, plus a `report_product_gap`. That now suppresses the automated check
  too.

- **Structure before findings.** Before recommending a regen or filing content
  findings, sanity-check the TOC: an overloaded page (many subjects / very long /
  weak grounding / broad hints) fabricates no matter what — split it into focused
  subpages with per-page hints first. Cheapest, most durable fidelity lever.

- **A figure's structure, never its pixels.** Judge a declaration for what it
  asserts and what it leaves out; you cannot see the rendered page, so crowding,
  colour and visual balance are not yours to call. See **Figures are claims
  too**.

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
  when no regeneration is in flight. Never open a session just to change what
  the maintainer's panel says.
- **Confirm your own fixes.** A pass that files findings and then fixes them
  with `direct_edit` ends `findings_filed`, so nothing has read the text you
  wrote. Before recommending `lock`, run one more short pass over what you
  changed and close it `clean` — or say in the reason that the fixes are
  unconfirmed.

- **Conclude the loop.** Every `end_validation` carries a `recommendation` and a
  one-line reason — `lock`, `regenerate`, `keep_validating` or `blocked`. You are
  the only party who has read the docs against the code, so the call is yours and
  nobody can make it for you. "What is left is minor and not worth a
  regeneration" is a legitimate, expected reason to recommend `lock`; say what is
  left and why you are not spending a run on it.
- **Tell them the next move.** Finish your terminal summary with the single
  thing the maintainer should do now — lock, regenerate, apply findings, or
  nothing. `get_status` returns `maintainer_next_action`; they cannot see it and
  you can.

- **Summarize at the end**, ordering the recommendation by durability: repo fixes
  and facts first, **then** Apply. Include: version validated, pages checked,
  findings filed (by kind), facts added/re-anchored, coverage and repo-health gaps
  raised, product gaps flagged, and anything you couldn't verify.
