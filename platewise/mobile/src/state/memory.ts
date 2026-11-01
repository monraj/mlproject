import type { ChatMsg } from './types';

// The coach's memory, kept on the phone with the person's log. When old messages scroll out of the
// chat (or the chat is cleared), each question and the gist of its answer is kept here and sent with
// later questions, so the coach stays on the person's story. "Forget" in Me wipes it.

export type MemoryNote = { at: string; q: string; a: string };

export const MEMORY_MAX = 30;
const Q_CHARS = 220;
const A_CHARS = 260;

const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** The first two sentences: enough to recall what was said. */
const gist = (s: string) => clip(s.split(/(?<=[.!?])\s+/).slice(0, 2).join(' '), A_CHARS);

/** Question/answer pairs that got a real answer, as notes to keep. */
export function toNotes(chat: ChatMsg[], at = new Date().toISOString()): MemoryNote[] {
  const out: MemoryNote[] = [];
  for (let i = 0; i < chat.length - 1; i++) {
    const q = chat[i];
    const a = chat[i + 1];
    if (q.from === 'me' && a.from === 'coach' && !a.text.startsWith("I couldn't answer")) {
      out.push({ at, q: clip(q.text, Q_CHARS), a: gist(a.text) });
      i++;
    }
  }
  return out;
}

export function addNotes(memory: MemoryNote[], notes: MemoryNote[]): MemoryNote[] {
  return [...memory, ...notes].slice(-MEMORY_MAX);
}

/** Lines for the coach's context, oldest first. Empty when there's nothing to remember. */
export function memoryContext(memory: MemoryNote[]): string {
  if (!memory.length) return '';
  const lines = memory.map((n) => `- ${n.at.slice(0, 10)}: they asked "${n.q}"; you said "${n.a}"`);
  return ['Earlier conversations with this person (their memory, kept on their phone; use it to stay on their story, and don’t repeat advice they already have):', ...lines].join('\n');
}
