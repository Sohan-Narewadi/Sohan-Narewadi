export const palette = {
  bg0: '#0f1419',
  bg1: '#161c26',
  accent: '#5eead4',
  accentText: '#c9fbef',
  sky: '#7dd3fc',
  deep: '#2f6f8f',
  slate: '#94a3b8',
  heading: '#f1f5f9',
  text: '#f1f5f9',
  body: '#b6c2d1',
  soft: '#a9bccd',
  muted: '#7d8a9c',
};

export const FONT = "'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif";

const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  HTML: '#ff7a59',
  CSS: '#7c9cf5',
  Java: '#f59e0b',
  Python: '#60a5fa',
  C: '#94a3b8',
  'C++': '#e879a9',
  Dart: '#2dd4bf',
  'Jupyter Notebook': '#fb923c',
  Swift: '#fb7185',
  Kotlin: '#c084fc',
  CMake: '#64748b',
  'Objective-C': '#38bdf8',
  Other: '#64748b',
};

export function languageColor(name) {
  return LANGUAGE_COLORS[name] ?? '#94a3b8';
}
