# git2docs skill

A [Claude Code](https://claude.com/claude-code) skill that validates your
[git2docs](https://git2docs.com)-generated documentation against your **actual
code and runtime**, reports findings, and keeps the repo's anchored facts
current — so your docs stay accurate and complete.

git2docs generates your docs from source and re-syncs them on every push. This
skill closes the loop from the other side: **your own** coding agent — which
has your repo and can run your product — verifies that what the docs claim is
true, files findings, and keeps the repo's anchored facts current, through
git2docs' authenticated MCP server. git2docs never runs your code; the agent
validates locally and only reads the docs + writes findings, facts, and
enrichment back.

## What it checks — and fixes

- **Accuracy** — documented CLI commands, API endpoints, config keys, and code
  examples actually match the running code; architecture/workflow prose
  reflects how the system really works.
- **Sufficiency** — undocumented public surface that should be covered.
- **Anchored facts** — exact strings no extractor can derive (object /
  namespace / label / artifact names, compatibility claims) are captured into
  `docs/docsync-context.yaml`, each anchored to the source line that proves it,
  and kept current as the code moves.
- **Input fidelity** — repo doc-readiness gaps (missing docstrings, untyped
  signatures, unextractable schemas) that make the docs thin or fabricate.

Findings you file become comments on the relevant doc section and flow into
git2docs' review → apply loop. Facts flow into `docs/docsync-context.yaml` and
ground the next regeneration. Limitations in git2docs *itself* (that block the
correct docs) go to the git2docs team as product feedback — a separate channel.

## Install

In Claude Code, add this repo as a plugin marketplace and install the skill:

```
/plugin marketplace add git2docs/git2docs-skill
/plugin install git2docs-skill
```

Or, to use it without the plugin system, copy the skill into your skills
directory:

```bash
git clone https://github.com/git2docs/git2docs-skill /tmp/g2d-skill
cp -r /tmp/g2d-skill/skills/git2docs ~/.claude/skills/git2docs
```

## Setup

1. In git2docs, open **Settings → Access tokens** and create a token
   (`g2d_…`, shown once). Export it:

   ```bash
   export GIT2DOCS_TOKEN=g2d_…
   ```

2. Find your **org** and **product** slugs from your docs URL:
   `https://git2docs.com/<org>/docs/<product>`.

3. Connect the authenticated MCP server — add to your project's `.mcp.json`
   (see [`.mcp.json.example`](./.mcp.json.example)):

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

4. In Claude Code, run the skill (e.g. "validate my git2docs docs"). It will
   walk your documentation, verify each claim against your code/runtime, and
   file findings.

## MCP tools

- **Orient / align:** `list_pages`, `list_versions`, `get_status`
- **Session:** `begin_validation`, `end_validation`
- **Read / verify:** `get_page`, `get_page_claims`, `list_coverage_gaps`
- **Report:** `report_finding` (section or coverage-gap module),
  `report_fact` / `get_facts` (anchored facts → `docs/docsync-context.yaml`),
  `propose_toc_change`, `report_product_gap`
- **Enrich:** `add_source_hints`, `add_section`, `set_guidance`,
  `direct_edit` (last resort), `reset_ownership`
- **Input fidelity:** `get_repo_health`, `list_health_gaps`

## License

MIT — see [LICENSE](./LICENSE).
