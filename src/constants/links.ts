// External links used by the Help modal (the ? button).
// TODO: set this to the repository URL (e.g. 'https://github.com/<owner>/<repo>').
// While it's empty, "Documentation", "Report a problem" and "Star on GitHub" stay hidden.
export const GITHUB_URL = '';

/** The README on GitHub, which is the user guide. */
export const docsUrl = () => `${GITHUB_URL}#readme`;

export const githubIssueUrl = (body: string) =>
  `${GITHUB_URL}/issues/new?body=${encodeURIComponent(body)}`;
