import {
  contiguousStartTimes,
  looksLikePersonalIdentifier,
} from './dateUtils.js';

test('only returns starts with enough contiguous 15-minute slots', () => {
  const slots = [
    { startTime: '2026-11-02T09:00:00.000Z' },
    { startTime: '2026-11-02T09:15:00.000Z' },
    { startTime: '2026-11-02T09:30:00.000Z' },
    { startTime: '2026-11-02T10:00:00.000Z' },
  ];
  expect(contiguousStartTimes(slots, 30)).toEqual([
    '2026-11-02T09:00:00.000Z',
    '2026-11-02T09:15:00.000Z',
  ]);
});

test('recognizes personal identifiers for the privacy guard', () => {
  expect(looksLikePersonalIdentifier('Jane Doe')).toBe(true);
  expect(looksLikePersonalIdentifier('jane@example.com')).toBe(true);
  expect(looksLikePersonalIdentifier('+1 (555) 123-4567')).toBe(true);
  expect(looksLikePersonalIdentifier('CL-AB12')).toBe(false);
});
