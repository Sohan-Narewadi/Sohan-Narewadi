export const palette = {
  bg0: '#0b1020',
  bg1: '#121a3a',
  violet: '#8b5cf6',
  cyan: '#22d3ee',
  pink: '#f472b6',
  text: '#e8ebff',
  muted: '#9aa4cf',
};

export const FONT = "'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif";

const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  HTML: '#ff7a59',
  CSS: '#a78bfa',
  Java: '#f59e0b',
  Python: '#60a5fa',
  C: '#94a3b8',
  'C++': '#f472b6',
  Dart: '#22d3ee',
  'Jupyter Notebook': '#fb923c',
  Swift: '#fb7185',
  Kotlin: '#c084fc',
  CMake: '#64748b',
  'Objective-C': '#38bdf8',
  Other: '#64748b',
};

export function languageColor(name) {
  return LANGUAGE_COLORS[name] ?? '#a78bfa';
}
