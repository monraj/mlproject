import { FOODS } from '../data/foods';

// JSON Schemas for structured output; ports of backend/app/vision/schema.py. llama.rn turns them into
// a grammar, so the model can only produce this shape.

type Schema = Record<string, unknown>;

const nullable = (t: string): Schema => ({ anyOf: [{ type: t }, { type: 'null' }] });
const obj = (props: Record<string, Schema>): Schema => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });

export const MEAL_SCHEMA = obj({
  is_food: { type: 'boolean' },
  items: {
    type: 'array',
    items: obj({
      food_name: { type: 'string' },
      // Only ids from the food table, so the model can't invent one.
      catalog_id: { anyOf: [{ type: 'string', enum: FOODS.map((f) => f.id).sort() }, { type: 'null' }] },
      local_aliases: { type: 'array', items: { type: 'string' } },
      grams_estimate: { type: 'number' },
      grams_low: { type: 'number' },
      grams_high: { type: 'number' },
      count: nullable('integer'),
      cooking_method: { type: 'string', enum: ['raw', 'boiled', 'steamed', 'fried', 'grilled', 'stewed', 'baked', 'fermented', 'other'] },
      visible_oil_level: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'unknown'] },
      confidence: { type: 'number' },
      bbox: { anyOf: [{ type: 'array', items: { type: 'number' } }, { type: 'null' }] },
      ingredients: { type: 'array', items: obj({ name: { type: 'string' }, share: { type: 'number' } }) },
    }),
  },
  plate_or_reference: nullable('string'),
  notes: nullable('string'),
});

export const COACH_SCHEMA = obj({
  reply: { type: 'string' },
  flex_plan: {
    anyOf: [
      obj({ reason: { type: 'string' }, days: { type: 'array', items: obj({ date: { type: 'string' }, kcal: { type: 'number' } }) } }),
      { type: 'null' },
    ],
  },
});

export const IDEAS_SCHEMA = obj({
  ideas: {
    type: 'array',
    items: obj({
      name: { type: 'string' },
      detail: { type: 'string' },
      badge: { type: 'string' },
      category: { type: 'string', enum: ['home', 'chop', 'quick'] },
      items: { type: 'array', items: obj({ catalog_id: { type: 'string' }, grams: { type: 'number' } }) },
    }),
  },
  tip: { type: 'string' },
});

export const LABEL_SCHEMA = obj({
  found: { type: 'boolean' },
  barcode: nullable('string'),
  name: nullable('string'),
  kcal_per_100g: nullable('number'),
  protein_g: nullable('number'),
  carbs_g: nullable('number'),
  fat_g: nullable('number'),
  serving_g: nullable('number'),
  serving_label: nullable('string'),
  from_label: { type: 'boolean' },
});
