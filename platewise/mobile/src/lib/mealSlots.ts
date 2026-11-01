import type { MealType } from '../state/types';
import { clock, mealForHour } from './format';

/** The parts of the day people log by. Stored as MealType; shown as morning/afternoon/evening. */
export type MealSlot = { type: MealType; label: string; /** Typical time, minutes after midnight. */ minute: number | null };

export const SLOTS: MealSlot[] = [
  { type: 'Breakfast', label: 'Morning', minute: 8 * 60 },
  { type: 'Lunch', label: 'Afternoon', minute: 13 * 60 },
  { type: 'Dinner', label: 'Evening', minute: 19 * 60 },
  { type: 'Snack', label: 'Other times', minute: null },
];

export const slotOf = (type: MealType): MealSlot => SLOTS.find((s) => s.type === type) ?? SLOTS[3];

/**
 * When a meal chosen for an earlier part of the day is logged now, file it at that part's usual
 * time (breakfast logged at 2 pm sits in the morning). The current slot and "Other times" use now.
 */
export function minuteFor(type: MealType, now = new Date()): number {
  const slot = slotOf(type);
  const current = now.getHours() * 60 + now.getMinutes();
  if (slot.minute == null || type === mealForHour(now.getHours())) return current;
  return slot.minute;
}

/** "8:00 am", in the same style as meal times elsewhere. */
export function clockOf(minute: number): string {
  const d = new Date();
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return clock(d);
}

// The part of the day picked on Today ("+ Log morning"), used as the default on the next review.
let chosen: MealType | null = null;
export const chooseSlot = (type: MealType) => {
  chosen = type;
};
export const takeChosenSlot = (): MealType | null => {
  const t = chosen;
  chosen = null;
  return t;
};
