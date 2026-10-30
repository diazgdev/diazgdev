import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCalendar, renderGalaga } from '../scripts/calendar.mjs';

const cell = (date, level, count, id = 'day-1') =>
  `<td data-date="${date}" id="${id}" data-level="${level}"></td>` +
  `<tool-tip for="${id}">${count} on October 30th.</tool-tip>`;

test('preserves GitHub dates, counts, and intensity levels', () => {
  const days = parseCalendar(
    cell('2026-10-30', 4, '1,234 contributions', 'a') +
    cell('2026-10-29', 1, '1 contribution', 'b') +
    cell('2026-10-28', 0, 'No contributions', 'c'),
  );
  assert.deepEqual(days, [
    { date: '2026-10-28', contributionCount: 0, contributionLevel: 'NONE', color: '' },
    { date: '2026-10-29', contributionCount: 1, contributionLevel: 'FIRST_QUARTILE', color: '' },
    { date: '2026-10-30', contributionCount: 1234, contributionLevel: 'FOURTH_QUARTILE', color: '' },
  ]);
});

test('rejects missing calendars, missing tooltips, and inconsistent levels', () => {
  assert.throws(() => parseCalendar('<html>Rate limited</html>'), /calendar/i);
  assert.throws(() => parseCalendar('<td data-date="2026-10-30" id="a" data-level="1"></td>'), /tooltip/i);
  assert.throws(() => parseCalendar(cell('2026-10-30', 1, 'No contributions')), /count/i);
  assert.throws(() => parseCalendar(cell('2026-10-30', 5, '2 contributions')), /level/i);
  assert.throws(() => parseCalendar(cell('2026-10-30', 1, 'Unknown contributions')), /count/i);
});

test('rejects duplicate dates and malformed dates', () => {
  assert.throws(() => parseCalendar(cell('2026-10-30', 1, '1 contribution', 'a') + cell('2026-10-30', 1, '1 contribution', 'b')), /duplicate/i);
  assert.throws(() => parseCalendar(cell('2026-02-30', 1, '1 contribution')), /date/i);
});

test('renders actual contribution cells in Tokyo Night without network calls', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const days = parseCalendar(cell(today, 1, '1 contribution'));
  const originalFetch = globalThis.fetch;
  const forbiddenFetch = () => { throw new Error('Unexpected external request'); };
  globalThis.fetch = forbiddenFetch;
  try {
    const svg = await renderGalaga(days);
    assert.match(svg, /<svg/);
    assert.match(svg, /viewBox="0 0 1166 259"/);
    assert.match(svg, /#3d59a1/);
    assert.match(svg, /#1a1b26/);
    assert.match(svg, /animateTransform/);
    assert.equal(globalThis.fetch, forbiddenFetch);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ignores upcoming empty cells in the public calendar', () => {
  const days = parseCalendar(cell('2026-10-30', 1, '1 contribution', 'a') + cell('2026-10-31', 0, 'No contributions', 'b'), '2026-10-30');
  assert.equal(days.length, 1);
  assert.equal(days[0].date, '2026-10-30');
});
