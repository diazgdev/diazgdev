import { GalagaRenderer } from 'pacman-contribution-graph';

const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1];

export function parseCalendar(html, today = new Date().toISOString().slice(0, 10)) {
  const tooltips = new Map();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/gi)) {
    tooltips.set(attribute(match[1], 'for'), match[2].replace(/<[^>]*>/g, '').trim());
  }
  const days = new Map();
  for (const match of html.matchAll(/<td\b[^>]*>/gi)) {
    const date = attribute(match[0], 'data-date');
    if (!date) continue;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Invalid calendar date');
    if (date > today) continue;
    if (days.has(date)) throw new Error('Duplicate calendar date');
    const rawLevel = attribute(match[0], 'data-level');
    if (!/^[0-4]$/.test(rawLevel ?? '')) throw new Error('Invalid calendar level');
    const tooltip = tooltips.get(attribute(match[0], 'id'));
    if (!tooltip) throw new Error('Missing calendar tooltip');
    const countMatch = tooltip.match(/^(No|[\d,]+) contributions?\b/i);
    if (!countMatch) throw new Error('Invalid contribution count');
    const count = countMatch[1].toLowerCase() === 'no' ? 0 : Number(countMatch[1].replaceAll(',', ''));
    const level = Number(rawLevel);
    if (!Number.isSafeInteger(count) || count < 0 || (count === 0) !== (level === 0)) throw new Error('Inconsistent contribution count');
    days.set(date, { date, contributionCount: count, contributionLevel: levels[level], color: '' });
  }
  if (!days.size) throw new Error('Public calendar was not found');
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function renderGalaga(days) {
  const originalFetch = globalThis.fetch;
  let rendered = '';
  globalThis.fetch = async (url) => {
    if (String(url) !== 'https://api.github.com/graphql') throw new Error('Unexpected renderer request');
    return Response.json({ data: { user: { contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: days }] } } } } });
  };
  try {
    const renderer = new GalagaRenderer({
      platform: 'github',
      username: 'diazgdev',
      gameTheme: 'github-dark',
      githubSettings: { accessToken: 'public-calendar-adapter' },
      svgCallback: svg => { rendered = svg; },
      showMonthLabels: true,
    });
    const store = await renderer.start();
    if (!rendered.includes('<svg') || !store.gameHistory.length || !store.cellEvents.length) throw new Error('Empty Galaga animation');
  } finally {
    globalThis.fetch = originalFetch;
  }
  const colors = { '#000000': '#1a1b26', '#0e4429': '#3d59a1', '#006d32': '#7aa2f7', '#26a641': '#bb9af7', '#39d353': '#7dcfff', '#aaaaaa': '#9aa5ce' };
  return rendered.replace(/#[0-9a-f]{6}/gi, c => colors[c.toLowerCase()] ?? c)
    .replaceAll('fill="white"', 'fill="#c0caf5"')
    .replace('<svg width="1166" height="259"', '<svg width="1166" height="259" viewBox="0 0 1166 259" role="img" aria-labelledby="galaga-title"')
    .replace(/(<svg[^>]*>)/, '$1<title id="galaga-title">My contributions, played as Galaga</title>');
}
