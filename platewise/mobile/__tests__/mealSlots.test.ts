import { chooseSlot, clockOf, minuteFor, slotOf, takeChosenSlot } from '../src/lib/mealSlots';

describe('meals by part of the day', () => {
  const at = (h: number, m = 0) => {
    const d = new Date(2026, 9, 31, h, m);
    return d;
  };

  it('files an earlier meal at its usual time', () => {
    expect(minuteFor('Breakfast', at(14, 5))).toBe(8 * 60); // breakfast logged at 2 pm sits in the morning
    expect(minuteFor('Lunch', at(20))).toBe(13 * 60);
  });

  it('uses the current time for the current part of the day and for other times', () => {
    expect(minuteFor('Lunch', at(13, 40))).toBe(13 * 60 + 40);
    expect(minuteFor('Snack', at(16, 10))).toBe(16 * 60 + 10);
  });

  it('labels and formats', () => {
    expect(slotOf('Dinner').label).toBe('Evening');
    expect(slotOf('Snack').label).toBe('Other times');
    expect(clockOf(8 * 60)).toBe('8:00 am');
    expect(clockOf(19 * 60 + 5)).toBe('7:05 pm');
  });

  it('remembers the part of the day picked on Today once', () => {
    chooseSlot('Breakfast');
    expect(takeChosenSlot()).toBe('Breakfast');
    expect(takeChosenSlot()).toBeNull();
  });
});
