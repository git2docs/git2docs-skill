// Fails when the packaged version and the version the skill tells an agent to
// report disagree. See .github/workflows/version-agrees.yml for the incident.
import { readFileSync } from 'node:fs';

const PLUGIN = '.claude-plugin/plugin.json';
const SKILL  = 'skills/git2docs/SKILL.md';

const packaged = JSON.parse(readFileSync(PLUGIN, 'utf8')).version;
if (typeof packaged !== 'string' || !/^\d+\.\d+\.\d+$/.test(packaged)) {
  console.error(`${PLUGIN}: "version" is missing or not x.y.z (got ${JSON.stringify(packaged)}).`);
  process.exit(1);
}

// The line an agent is instructed to read. Matched loosely enough to survive
// rewording around it, and strictly enough that a second copy appearing
// elsewhere in the file is caught rather than silently ignored.
const body  = readFileSync(SKILL, 'utf8');
const lines = [...body.matchAll(/^\*\*Skill version:\s*([0-9]+\.[0-9]+\.[0-9]+)\*\*/gm)];

if (lines.length === 0) {
  console.error(
    `${SKILL}: no "**Skill version: x.y.z**" line. That line is the ONLY thing git2docs can see — `
    + `without it every agent reports an unknown version.`);
  process.exit(1);
}
if (lines.length > 1) {
  console.error(`${SKILL}: ${lines.length} "Skill version" lines (${lines.map(m => m[1]).join(', ')}). One, or an agent picks.`);
  process.exit(1);
}

const declared = lines[0][1];
if (declared !== packaged) {
  console.error(
    `Version mismatch: ${PLUGIN} says ${packaged}, ${SKILL} tells the agent to report ${declared}.\n`
    + `Bump BOTH. The header is what reaches git2docs; the json is what the marketplace installs.`);
  process.exit(1);
}

console.log(`ok — both say ${packaged}`);
