// Resolve once per build, not once per visitor. GitHub defaults to main.
export async function fetchLastDataUpdate(fetcher = fetch) {
  try {
    const response = await fetcher('https://api.github.com/repos/PratyushBalaji/trainset-tracker/commits?path=trainsets.json&per_page=1', {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return null;
    const commits = await response.json();
    const timestamp = commits[0]?.commit?.committer?.date;
    return typeof timestamp === 'string' && !Number.isNaN(Date.parse(timestamp)) ? timestamp : null;
  } catch {
    return null;
  }
}
