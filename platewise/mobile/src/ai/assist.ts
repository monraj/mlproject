import { generateText } from './gemma';
import { getGemmaState, isGemmaReady } from './modelStore';
import { stripUnverifiedNumbers } from './facts';
import { REPORT_SYSTEM } from '../state/report';
import { api } from '../api/client';
import { getPrivacy } from '../api/privacy';

// Gemini on the server answers in a few seconds; Gemma on the phone takes much longer, so it's only
// used when online AI isn't allowed or the phone is set to Offline.
const online = () => getPrivacy().aiConsent && getGemmaState().mode !== 'offline';

/** Who can re-word a report right now, if anyone. */
export function rewriterName(): string | null {
  if (online()) return 'Gemini';
  return isGemmaReady() ? 'Gemma on this phone' : null;
}

/** Re-words the report's facts in friendly sentences. Any number the AI adds that isn't in the facts is removed. */
export async function rewriteReport(facts: string, onText?: (soFar: string) => void): Promise<string> {
  if (online()) {
    const ask = `${REPORT_SYSTEM}\n\nWrite my summary from these facts only:\n${facts}`;
    const r = await api.coachStream([{ role: 'user', content: ask }], `Today's summary facts:\n${facts}`, 'female', false, onText ?? (() => undefined));
    return stripUnverifiedNumbers(r.reply.trim(), facts);
  }
  if (!isGemmaReady()) throw new Error('Allow online AI in Me → Privacy to write summaries in friendly words.');
  const reply = await generateText({ system: `${REPORT_SYSTEM}\n\nFacts:\n${facts}`, turns: [{ role: 'user', content: 'Write my summary.' }], maxTokens: 180, onText });
  return stripUnverifiedNumbers(reply.trim(), facts);
}
