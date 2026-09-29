// External links (Help) and whether desktop updates are on. Both come from
// shared/release.json; while it's empty, the GitHub links stay hidden and the
// desktop app doesn't check for updates. See docs/releasing.md.
import release from '../../shared/release.json';

const repo = release.githubRepo.trim();

export const GITHUB_URL = repo ? `https://github.com/${repo}` : '';

/** The README on GitHub, which is the user guide. */
export const docsUrl = () => `${GITHUB_URL}#readme`;

export const githubIssueUrl = (body: string) =>
  `${GITHUB_URL}/issues/new?body=${encodeURIComponent(body)}`;

/** A release source is set up, so the desktop app can check for updates. */
export const UPDATES_CONFIGURED = !!repo && !!release.updaterPubkey.trim();
