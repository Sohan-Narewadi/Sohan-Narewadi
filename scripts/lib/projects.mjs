export function mergeProjects({ projects, repos, user, warn = () => {} }) {
  const byName = new Map(repos.map((r) => [r.name.toLowerCase(), r]));
  return projects.map((p) => {
    const repo = p.repo ? byName.get(p.repo.toLowerCase()) : null;
    if (p.repo && !repo) warn(`projects.json: repo "${p.repo}" not found on GitHub; rendering without live stats`);
    return {
      id: p.id,
      title: p.title,
      description: p.description ?? repo?.description ?? '',
      tags: p.tags ?? (repo?.language ? [repo.language] : []),
      url: repo?.url ?? p.url ?? `https://github.com/${user}/${p.repo}`,
      badge: p.badge ?? null,
      team: Boolean(p.team),
      live: Boolean(repo),
      stars: repo ? repo.stars : null,
      pushedAt: repo?.pushedAt ?? null,
    };
  });
}

export function moreBuilds({ projects, repos, user }) {
  const featured = new Set(projects.filter((p) => p.repo).map((p) => p.repo.toLowerCase()));
  return repos
    .filter((r) => !r.fork && !featured.has(r.name.toLowerCase()) && r.name.toLowerCase() !== user.toLowerCase())
    .slice()
    .sort((a, b) => (Date.parse(b.pushedAt) || 0) - (Date.parse(a.pushedAt) || 0));
}
