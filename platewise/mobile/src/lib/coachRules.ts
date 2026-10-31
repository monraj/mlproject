/** Questions about planning around an event get a structured answer with a flex plan; everything
 * else is answered as plain text, which is faster and can be shown as it's written. */
export const EVENT = /\b(wedding|funeral|party|festival|outdooring|naming|birthday|christmas|easter|ramadan|eid|event|plan (for|around))\b/i;

export const isEventQuestion = (q: string) => EVENT.test(q);
