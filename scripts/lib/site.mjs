import { createHash } from 'node:crypto';
import { escapeXml } from './svg.mjs';
import { computeStats, recentRepos } from './github.mjs';
import { mergeProjects, moreBuilds } from './projects.mjs';
import { typingUrl } from './typing.mjs';
import { fillTemplate } from './readme.mjs';
import { renderHero } from './render/hero.mjs';
import { renderAbout } from './render/about.mjs';
import { renderStack } from './render/stack.mjs';
import { renderButton } from './render/button.mjs';
import { renderProjectCard, renderChip } from './render/card.mjs';
import { renderNow } from './render/now.mjs';
import { renderLanguages, renderNumbers } from './render/stats.mjs';
import { renderSectionTitle, renderFooter } from './render/chrome.mjs';

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const img = (src, alt, extra = '') => `<img src="${escapeXml(src)}" alt="${escapeXml(alt)}"${extra} />`;
const link = (href, inner) => `<a href="${escapeXml(href)}">${inner}</a>`;

export function buildSite({ config, projects, template, data }) {
  const warnings = [];
  const files = {};
  const ref = (path, svg) => {
    files[path] = svg;
    return `${path}?v=${hash(svg)}`;
  };

  const ids = new Set();
  for (const p of projects) {
    if (ids.has(p.id)) throw new Error(`projects.json: duplicate project id "${p.id}"`);
    ids.add(p.id);
  }

  const user = config.user;
  const isProfileRepo = (name) => name.toLowerCase() === user.toLowerCase();
  const repos = data.repos.filter((r) => !isProfileRepo(r.name));
  const languages = Object.fromEntries(Object.entries(data.languages ?? {}).filter(([name]) => !isProfileRepo(name)));
  const stats = computeStats({ repos, languages, profile: data.profile, now: new Date(data.fetchedAt) });

  const merged = mergeProjects({ projects, repos, user, warn: (m) => warnings.push(m) });
  const extras = moreBuilds({ projects, repos, user });
  const descByRepo = new Map(projects.filter((p) => p.repo).map((p) => [p.repo.toLowerCase(), p.description]));
  const recent = recentRepos(repos, config.nowCount ?? 3).map((r) => ({
    name: r.name,
    language: r.language,
    pushedAt: r.pushedAt,
    description: r.description ?? descByRepo.get(r.name.toLowerCase()) ?? null,
  }));

  const profileUrl = `https://github.com/${user}`;
  const reposUrl = `${profileUrl}?tab=repositories`;
  const title = (key, text) => img(ref(`assets/titles/${key}.svg`, renderSectionTitle(text)), text, ' width="830"');

  const values = {
    hero: img(ref('assets/hero.svg', renderHero({ name: config.name, handle: user })), `${config.name} — GitHub profile`, ' width="100%"'),
    typing: img(typingUrl(config.typingLines ?? [config.tagline]), config.tagline),
    about: img(ref('assets/about.svg', renderAbout({ bio: config.bio, facts: config.facts })), 'About', ' width="830"'),
    stack: img(ref('assets/stack.svg', renderStack(config.stack)), 'Tech stack', ' width="830"'),
    projectsTitle: merged.length ? title('projects', 'Featured Projects') : '',
    projects: merged
      .map((p) => link(p.url, img(ref(`assets/projects/${p.id}.svg`, renderProjectCard(p)), `${p.title} project`, ' width="405"')))
      .join('\n'),
    moreTitle: extras.length ? title('more', 'More Builds') : '',
    more: extras
      .map((r) => link(r.url, img(ref(`assets/chips/${slug(r.name)}-${hash(r.name).slice(0, 4)}.svg`, renderChip(r)), r.name)))
      .join('\n'),
    nowTitle: title('now', 'Currently Working On'),
    now: link(reposUrl, img(ref('assets/now.svg', renderNow(recent)), 'Recently pushed repositories', ' width="830"')),
    statsTitle: title('stats', 'GitHub Stats'),
    stats: [
      link(profileUrl, img(ref('assets/languages.svg', renderLanguages(stats)), 'Top languages', ' width="405"')),
      link(profileUrl, img(ref('assets/numbers.svg', renderNumbers(stats)), 'GitHub at a glance', ' width="405"')),
    ].join('\n'),
    snakeTitle: title('snake', 'Contributions'),
    snake: img('assets/snake.svg', 'Contribution snake', ' width="100%"'),
    connectTitle: title('connect', "Let's Connect"),
    connect: [
      link(config.links.linkedin, img(ref('assets/buttons/linkedin.svg', renderButton({ label: 'LinkedIn', kind: 'linkedin' })), 'LinkedIn')),
      link(`mailto:${config.links.email}`, img(ref('assets/buttons/email.svg', renderButton({ label: 'Email', kind: 'email' })), 'Email')),
      link(config.links.portfolio, img(ref('assets/buttons/portfolio.svg', renderButton({ label: 'Portfolio', kind: 'portfolio' })), 'Portfolio')),
    ].join('\n'),
    footer: img(ref('assets/footer.svg', renderFooter()), 'Thanks for visiting', ' width="100%"'),
  };

  files['README.md'] = fillTemplate(template, values);
  return { files, warnings };
}
