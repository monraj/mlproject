import { generateText } from './gemma';
import { isGemmaReady } from './modelStore';
import { stripUnverifiedNumbers } from './facts';
import { REPORT_SYSTEM } from '../state/report';

/** Who can re-word a report right now, if anyone. */
export function rewriterName(): string | null {
  return isGemmaReady() ? 'Gemma on this phone' : null;
}

/** Re-words the report's facts in friendly sentences. Any number the AI adds that isn't in the facts is removed. */
export async function rewriteReport(facts: string, onText?: (soFar: string) => void): Promise<string> {
  if (!isGemmaReady()) throw new Error('No AI is set up to write summaries yet.');
  const reply = await generateText({ system: `${REPORT_SYSTEM}\n\nFacts:\n${facts}`, turns: [{ role: 'user', content: 'Write my summary.' }], maxTokens: 180, onText });
  return stripUnverifiedNumbers(reply.trim(), facts);
}
