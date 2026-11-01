// Everyday Ghanaian meals from across the country, as plates built from the food table. Grams are a
// usual serving; suggestions scale them to fit the person's day. Nutrient values always come from
// the table (CLAUDE.md rule 2), never from here.

export type Slot = 'Breakfast' | 'Lunch' | 'Dinner';
export type MealPlate = { id: string; name: string; slots: Slot[]; parts: [string, number][]; people: string[] };

const B: Slot[] = ['Breakfast'];
const LD: Slot[] = ['Lunch', 'Dinner'];
const ALL_DAY: Slot[] = ['Breakfast', 'Lunch', 'Dinner'];

export const PLATES: MealPlate[] = [
  // Breakfast
  { id: 'koko_koose', name: 'Hausa koko with koose', slots: B, parts: [['hausa_koko', 300], ['koose', 60]], people: ['Hausa / Zongo', 'All'] },
  { id: 'koko_groundnuts', name: 'Koko with groundnuts', slots: B, parts: [['oblayo', 300], ['groundnuts', 20]], people: ['Ga-Adangbe', 'All'] },
  { id: 'oats_egg', name: 'Oats with a boiled egg', slots: B, parts: [['oats', 250], ['egg', 50]], people: ['All'] },
  { id: 'tom_brown_milk', name: 'Tom brown with milk', slots: B, parts: [['tom_brown', 300], ['evaporated_milk', 30]], people: ['All'] },
  { id: 'bread_omelette', name: 'Bread and omelette', slots: B, parts: [['brown_bread', 70], ['omelette', 100]], people: ['All'] },
  { id: 'tea_bread_egg', name: 'Tea, bread and egg', slots: B, parts: [['tea', 290], ['bread', 60], ['egg', 50]], people: ['All'] },
  { id: 'fura_nono', name: 'Fura da nono', slots: B, parts: [['fura_nono', 350]], people: ['Hausa / Zongo', 'Fulani', 'Mole-Dagbani'] },
  { id: 'ampesi_egg_breakfast', name: 'Boiled yam with egg stew', slots: ALL_DAY, parts: [['yam', 200], ['egg', 50], ['pepper_stew', 60]], people: ['Akan', 'All'] },
  { id: 'tubaani_breakfast', name: 'Tubaani with shito', slots: ALL_DAY, parts: [['tubaani', 200], ['shito', 10]], people: ['Mole-Dagbani', 'Hausa / Zongo'] },
  { id: 'soya_porridge', name: 'Soya milk with sweet potato', slots: B, parts: [['soya_milk', 250], ['sweet_potato', 150]], people: ['All'] },
  { id: 'avocado_bread', name: 'Avocado on wheat bread', slots: B, parts: [['brown_bread', 70], ['avocado', 80]], people: ['All'] },
  // Lunch and supper: south
  { id: 'banku_okro_tilapia', name: 'Banku, okro soup and tilapia', slots: LD, parts: [['banku', 250], ['okro', 250], ['tilapia', 150]], people: ['Ga-Adangbe', 'Ewe'] },
  { id: 'banku_tilapia_pepper', name: 'Banku with grilled tilapia and pepper', slots: LD, parts: [['banku', 250], ['tilapia', 200], ['fresh_pepper', 40]], people: ['Ga-Adangbe', 'Ewe', 'All'] },
  { id: 'kenkey_fish', name: 'Kenkey, fried fish and pepper', slots: LD, parts: [['kenkey', 300], ['kpanla', 120], ['fresh_pepper', 40]], people: ['Ga-Adangbe', 'Akan'] },
  { id: 'fufu_light_soup_goat', name: 'Fufu and light soup with goat', slots: LD, parts: [['fufu', 300], ['light_soup', 300], ['goat', 100]], people: ['Akan'] },
  { id: 'fufu_groundnut_chicken', name: 'Fufu and groundnut soup with chicken', slots: LD, parts: [['fufu', 300], ['groundnut_soup_chicken', 300]], people: ['Akan', 'All'] },
  { id: 'fufu_palmnut_fish', name: 'Fufu and palm nut soup with fish', slots: LD, parts: [['fufu', 300], ['palmnut_soup_fish', 300]], people: ['Akan'] },
  { id: 'ampesi_kontomire', name: 'Ampesi with kontomire stew', slots: LD, parts: [['ampesi', 250], ['kontomire', 200], ['egg', 50]], people: ['Akan'] },
  { id: 'ampesi_garden_egg', name: 'Ampesi with garden egg stew', slots: LD, parts: [['ampesi', 250], ['garden_egg_sauce', 200]], people: ['Akan', 'Ewe'] },
  { id: 'yam_palava', name: 'Boiled yam with palava sauce', slots: LD, parts: [['yam', 250], ['palava_sauce', 200]], people: ['Akan', 'All'] },
  { id: 'oto_eggs', name: 'Oto with eggs', slots: LD, parts: [['oto', 250], ['egg', 100]], people: ['Akan'] },
  { id: 'eto_avocado', name: 'Plantain eto with groundnuts and avocado', slots: LD, parts: [['plantain_eto', 250], ['groundnuts', 20], ['avocado', 60]], people: ['Akan'] },
  { id: 'kokonte_groundnut', name: 'Kokonte with groundnut soup', slots: LD, parts: [['kokonte', 250], ['groundnut_soup', 300], ['smoked_herring', 30]], people: ['Akan', 'Mole-Dagbani'] },
  { id: 'akple_fetri', name: 'Akple with fetri detsi', slots: LD, parts: [['akple', 250], ['fresh_okro_soup_fish', 300]], people: ['Ewe'] },
  { id: 'akple_ademe', name: 'Akple with ademe soup', slots: LD, parts: [['akple', 250], ['ayoyo', 300]], people: ['Ewe'] },
  { id: 'gari_foto_fish', name: 'Gari foto with fish', slots: LD, parts: [['gari_foto', 250], ['mackerel', 80]], people: ['Ewe', 'Ga-Adangbe'] },
  { id: 'red_red', name: 'Red-red with plantain', slots: LD, parts: [['red_red', 300], ['fried_plantain', 80]], people: ['Akan', 'All'] },
  { id: 'beans_gari', name: 'Beans stew with gari and avocado', slots: LD, parts: [['beans_stew', 250], ['gari', 30], ['avocado', 60]], people: ['All'] },
  { id: 'mpotompoto', name: 'Mpotompoto with fish', slots: LD, parts: [['mpotompoto', 300], ['smoked_herring', 40]], people: ['Akan', 'Ga-Adangbe'] },
  { id: 'cassava_leaf_ampesi', name: 'Cassava leaf stew with boiled plantain', slots: LD, parts: [['ampesi', 250], ['cassava_leaf_stew', 200]], people: ['Nzema / Ahanta', 'Akan'] },
  // Rice dishes
  { id: 'waakye_egg', name: 'Waakye with egg and salad', slots: ALL_DAY, parts: [['waakye', 300], ['egg', 50], ['salad', 60], ['shito', 10]], people: ['Hausa / Zongo', 'All'] },
  { id: 'jollof_chicken', name: 'Jollof with chicken and salad', slots: LD, parts: [['jollof', 300], ['chicken', 120], ['salad', 60]], people: ['All'] },
  { id: 'rice_kontomire', name: 'Rice with kontomire stew', slots: LD, parts: [['rice', 250], ['kontomire', 200]], people: ['Akan', 'All'] },
  { id: 'local_rice_fish', name: 'Local rice with fish stew', slots: LD, parts: [['local_rice', 250], ['fante_fante', 150]], people: ['Ewe', 'Mole-Dagbani'] },
  { id: 'brown_rice_beans', name: 'Brown rice with beans stew', slots: LD, parts: [['brown_rice', 250], ['beans_stew', 150]], people: ['All'] },
  { id: 'omo_tuo_groundnut', name: 'Omo tuo with groundnut soup', slots: LD, parts: [['omo_tuo', 300], ['groundnut_soup', 300]], people: ['Akan', 'Mole-Dagbani', 'Hausa / Zongo'] },
  { id: 'rice_chicken_veg', name: 'Rice, grilled chicken and vegetables', slots: LD, parts: [['rice', 200], ['chicken_breast', 120], ['vegetables', 150]], people: ['All'] },
  // North
  { id: 'tz_ayoyo', name: 'TZ with ayoyo soup', slots: LD, parts: [['tuo_zaafi', 350], ['ayoyo', 300]], people: ['Mole-Dagbani'] },
  { id: 'tz_kuka', name: 'TZ with kuka soup', slots: LD, parts: [['tuo_zaafi', 350], ['kuka_soup', 300]], people: ['Mole-Dagbani', 'Hausa / Zongo'] },
  { id: 'millet_tz_bra', name: 'Millet TZ with bra soup', slots: LD, parts: [['tz_millet', 350], ['bra_soup', 300]], people: ['Mole-Dagbani'] },
  { id: 'tz_groundnut_dawadawa', name: 'TZ with northern groundnut soup', slots: LD, parts: [['tuo_zaafi', 350], ['groundnut_dawadawa_soup', 300]], people: ['Mole-Dagbani'] },
  { id: 'guinea_fowl_rice', name: 'Guinea fowl with jollof', slots: LD, parts: [['jollof', 250], ['guinea_fowl', 120]], people: ['Mole-Dagbani', 'All'] },
  { id: 'bambara_plate', name: 'Bambara beans with gari and shito', slots: LD, parts: [['bambara_beans', 200], ['gari', 30], ['shito', 10]], people: ['Mole-Dagbani', 'Akan'] },
  { id: 'maasa_soup', name: 'Maasa with spinach stew', slots: ALL_DAY, parts: [['maasa', 120], ['spinach_stew', 150]], people: ['Hausa / Zongo', 'Mole-Dagbani'] },
  { id: 'chicken_soup_yam', name: 'Northern chicken soup with yam', slots: LD, parts: [['chicken_soup_dawadawa', 350], ['yam', 200]], people: ['Mole-Dagbani', 'Akan'] },
];
