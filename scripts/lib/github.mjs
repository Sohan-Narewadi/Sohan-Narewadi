import { readFile } from 'node:fs/promises';

const API = 'https://api.github.com';
const DAY = 86_400_000;

export function normalizeRepo(r) {
  return {
    name: r.name,
    description: r.description ?? null,
    language: r.language ?? null,
    stars: r.stargazers_count ?? 0,
    fork: Boolean(r.fork),
    archived: Boolean(r.archived),
    pushedAt: r.pushed_at ?? null,
    url: r.html_url ?? `https://github.com/${r.full_name}`,
  };
}

export function aggregateLanguages(perRepo, { top = 5 } = {}) {
  const totals = new Map();
  for (const langs of perRepo) {
    for (const [name, bytes] of Object.entries(langs ?? {})) totals.set(name, (totals.get(name) ?? 0) + bytes);
  }
  const sorted = [...totals.entries()].map(([name, bytes]) => ({ name, bytes })).sort((a, b) => b.bytes - a.bytes);
  const sum = sorted.reduce((s, l) => s + l.bytes, 0);
  if (sum === 0) return [];
  const head = sorted.slice(0, top);
  const restBytes = sorted.slice(top).reduce((s, l) => s + l.bytes, 0);
  if (restBytes > 0) head.push({ name: 'Other', bytes: restBytes });
  return head.map((l) => ({ ...l, pct: Math.round((l.bytes / sum) * 1000) / 10 }));
}

export function computeStats({ repos, languages, profile, now }) {
  const own = repos.filter((r) => !r.fork);
  const ownNames = new Set(own.map((r) => r.name));
  const perRepo = Object.entries(languages ?? {}).filter(([name]) => ownNames.has(name)).map(([, v]) => v);
  return {
    repoCount: own.length,
    stars: own.reduce((s, r) => s + r.stars, 0),
    activeLast30: own.filter((r) => r.pushedAt && now - Date.parse(r.pushedAt) <= 30 * DAY).length,
    languages: aggregateLanguages(perRepo),
    memberSince: profile?.createdAt ? new Date(profile.createdAt).getUTCFullYear() : null,
  };
}

export function recentRepos(repos, n) {
  return repos
    .filter((r) => !r.fork)
    .slice()
    .sort((a, b) => (Date.parse(b.pushedAt) || 0) - (Date.parse(a.pushedAt) || 0))
    .slice(0, n);
}

async function getJson(url, { token, fetchImpl }) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'profile-readme-builder' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return res.json();
}

export async function fetchGithub({ user, token, fetchImpl = fetch, warn = console.warn }) {
  const opts = { token, fetchImpl };
  const raw = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await getJson(`${API}/users/${user}/repos?per_page=100&page=${page}&type=owner&sort=pushed`, opts);
    raw.push(...batch);
    if (batch.length < 100) break;
  }
  const profileRaw = await getJson(`${API}/users/${user}`, opts);
  const repos = raw.map(normalizeRepo);
  const languages = {};
  for (const r of repos.filter((x) => !x.fork)) {
    try {
      languages[r.name] = await getJson(`${API}/repos/${user}/${r.name}/languages`, opts);
    } catch (err) {
      warn(`languages for ${r.name} skipped: ${err.message}`);
    }
  }
  return {
    profile: { login: profileRaw.login ?? user, createdAt: profileRaw.created_at ?? null },
    repos,
    languages,
    fetchedAt: new Date().toISOString(),
  };
}

export async function loadData({ user, offline, fixturePath, token }) {
  if (offline) return JSON.parse(await readFile(fixturePath, 'utf8'));
  return fetchGithub({ user, token });
}
