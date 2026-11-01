import { MEMORY_MAX, addNotes, memoryContext, toNotes } from '../src/state/memory';
import type { ChatMsg } from '../src/state/types';

const me = (text: string): ChatMsg => ({ id: `u${text}`, from: 'me', text });
const coach = (text: string): ChatMsg => ({ id: `c${text}`, from: 'coach', text });

test('answered questions become notes with the gist of the answer', () => {
  const notes = toNotes([me('I am allergic to groundnuts'), coach('Thanks for telling me. I will leave groundnut soup out. Try light soup instead. It is lighter too.'), me('hello?'), coach("I couldn't answer just now.")], '2026-11-01T10:00:00Z');
  expect(notes).toEqual([{ at: '2026-11-01T10:00:00Z', q: 'I am allergic to groundnuts', a: 'Thanks for telling me. I will leave groundnut soup out.' }]);
});

test('memory keeps the newest notes and goes into the coach context', () => {
  const many = Array.from({ length: MEMORY_MAX + 5 }, (_, i) => ({ at: '2026-11-01', q: `q${i}`, a: 'a' }));
  const kept = addNotes([], many);
  expect(kept).toHaveLength(MEMORY_MAX);
  expect(kept[0].q).toBe('q5');
  expect(memoryContext([])).toBe('');
  expect(memoryContext(kept.slice(-1))).toContain('they asked "q34"');
});
