/**
 * Prints the GitHub release text: for a test version (shared/release.json stage) the
 * alpha/beta note, then What's new (the same list as Help → What's new), the download
 * line and, for a test version, where to send feedback. The release workflow passes it
 * to the draft release; CHANGELOG.md keeps the longer record.
 *
 *   node scripts/release/notes.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strings } from '../../src/constants/strings.ts';
import { format } from '../../src/lib/i18n.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const release = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/release.json'), 'utf8')) as {
  githubRepo: string;
  stage?: string;
};

const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { version: string };

const stage = release.stage === 'alpha' || release.stage === 'beta' ? release.stage : null;
const issues = `https://github.com/${release.githubRepo.trim()}/issues`;
const whatsNew = [
  `### ${format(strings.updates.releaseWhatsNew, { version })}`,
  strings.help.whatsNew.map(item => `- ${item}`).join('\n')
].join('\n\n');
const parts = stage
  ? [`**${strings.help.stageBadge[stage]}.** ${strings.help.stageNote[stage]}`, whatsNew, strings.updates.releaseBody, format(strings.updates.releaseFeedback, { url: issues })]
  : [whatsNew, strings.updates.releaseBody];

console.log(parts.join('\n\n'));
