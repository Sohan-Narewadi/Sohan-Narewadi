export const sampleRepos = [
  { name: 'MediBridge', description: 'Smart Healthcare Access & Management Platform', language: 'HTML', stars: 1, fork: false, archived: false, pushedAt: '2026-09-21T10:00:00Z', url: 'https://github.com/Sohan-Narewadi/MediBridge' },
  { name: 'QUIZ_BATTLE', description: null, language: 'Java', stars: 1, fork: false, archived: false, pushedAt: '2025-10-26T08:00:00Z', url: 'https://github.com/Sohan-Narewadi/QUIZ_BATTLE' },
  { name: 'Travel-and-Tourism-Webpage-1', description: null, language: 'HTML', stars: 0, fork: false, archived: false, pushedAt: '2026-08-23T08:00:00Z', url: 'https://github.com/Sohan-Narewadi/Travel-and-Tourism-Webpage-1' },
  { name: 'some-fork', description: null, language: 'Python', stars: 5, fork: true, archived: false, pushedAt: '2026-09-25T08:00:00Z', url: 'https://github.com/Sohan-Narewadi/some-fork' },
  { name: 'Sohan-Narewadi', description: null, language: 'JavaScript', stars: 0, fork: false, archived: false, pushedAt: '2026-09-26T08:00:00Z', url: 'https://github.com/Sohan-Narewadi/Sohan-Narewadi' },
];

export const sampleData = {
  profile: { login: 'Sohan-Narewadi', createdAt: '2025-05-24T07:21:53Z' },
  repos: sampleRepos,
  languages: {
    MediBridge: { HTML: 158382, JavaScript: 125412, CSS: 19093 },
    QUIZ_BATTLE: { Java: 32119 },
    'Travel-and-Tourism-Webpage-1': { HTML: 9000 },
    'some-fork': { Python: 999999 },
    'Sohan-Narewadi': { JavaScript: 500000 },
  },
  fetchedAt: '2026-09-26T10:00:00Z',
};

export const sampleConfig = {
  user: 'Sohan-Narewadi',
  name: 'Sohan Narewadi',
  tagline: 'Software Dev · Data Explorer · Builder',
  typingLines: ['Software Dev · Data Explorer · Builder'],
  bio: 'Student software developer who builds things end to end.',
  facts: [{ label: 'Focus', value: 'Full-stack · Data & ML' }],
  links: { linkedin: 'https://www.linkedin.com/in/x/', email: 'a@b.co', portfolio: 'https://example.dev' },
  stack: [{ title: 'Languages', items: ['Java', 'C'] }],
  nowCount: 3,
};

export const sampleProjects = [
  { id: 'static-one', title: 'Static One', url: 'https://github.com/other/static-one', badge: 'SIH 2026', team: true, description: 'A static card.', tags: ['Python'] },
  { id: 'medibridge', repo: 'MediBridge', title: 'MediBridge', description: 'Healthcare platform.', tags: ['Node.js'] },
];

export const ok = (body) => ({ ok: true, status: 200, json: async () => body });
export const fail = (status) => ({ ok: false, status, json: async () => ({}) });

// Routes are matched by substring, in insertion order (put more specific keys first).
export function fakeFetch(routes) {
  const calls = [];
  const f = async (url, opts) => {
    calls.push({ url, opts });
    for (const [frag, res] of Object.entries(routes)) {
      if (url.includes(frag)) return typeof res === 'function' ? res() : res;
    }
    return fail(404);
  };
  f.calls = calls;
  return f;
}
