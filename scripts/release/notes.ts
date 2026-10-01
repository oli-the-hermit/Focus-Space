/**
 * Prints the GitHub release text: the download line, and for a test version
 * (shared/release.json stage) the alpha/beta note and where to send feedback.
 * The release workflow passes it to the draft release.
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

const stage = release.stage === 'alpha' || release.stage === 'beta' ? release.stage : null;
const issues = `https://github.com/${release.githubRepo.trim()}/issues`;
const parts = stage
  ? [`**${strings.help.stageBadge[stage]}.** ${strings.help.stageNote[stage]}`, strings.updates.releaseBody, format(strings.updates.releaseFeedback, { url: issues })]
  : [strings.updates.releaseBody];

console.log(parts.join('\n\n'));
