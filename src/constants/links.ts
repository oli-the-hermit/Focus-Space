// External links used by the Help modal.
// TODO: set this to the repository URL (e.g. 'https://github.com/<owner>/<repo>').
// While it's empty, "Report a problem" and "Star on GitHub" stay hidden.
export const GITHUB_URL = '';

export const githubIssueUrl = (body: string) =>
  `${GITHUB_URL}/issues/new?body=${encodeURIComponent(body)}`;
