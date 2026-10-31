# Ground PlateWise calories in sourced Ghanaian data

The best open basis for a Ghanaian calorie reference is a three-part stack. The FAO/INFOODS West African Food Composition Table 2019 (WAFCT) supplies per-100 g values. Appiah et al. 2020 is the only lab analysis of Ghanaian soups. The 2022 IFPRI/Noguchi Accra photographic atlas supplies weighed portions. Together they cover plain staples, proteins, fruits and drinks well. They leave most of Ghana's signature mixed dishes empty. **Banku, Ghanaian fufu, omo tuo, kokonte, eba, waakye, jollof rice, red-red, shito, kontomire stew and red stew have no published per-100 g as-eaten value** in any source the research retrieved. For these, the honest choices are a labelled West African (mostly Burkina Faso) proxy, a recipe calculated from sourced ingredients, or a null value flagged `needs_review`. Ghana-specific data is real but narrow: kenkey (139 kcal/100 g), hausa koko, gari, fermented maize porridge, tiger nuts, soya and bambara beans, pito, four soup types from Appiah, smoked and salted market fish (proximates only), brukina and nkatie cake. Energy density in this food culture depends mostly on two things: water content (TZ ranges from about 70 to 130 kcal/100 g depending on stiffness) and oil (palm nut soup is about 204 kcal/100 g, light soup 12–27). So the database must carry explicit oil tiers and per-dish portion weights, not one number per dish name. **Licensing is a launch blocker.** FAO allows WAFCT reuse only for research, teaching or "non-commercial products or services", so a paid PlateWise needs written permission from FAO. The atlas is CC-BY-4.0. For explaining calories, activity equivalents ("about 1½ hours of brisk walking") cut calories chosen by about 65 kcal per meal in a meta-analysis. They also draw strong eating-disorder objections, so they should be optional, worded as energy supplied rather than a debt, and shown next to a neutral "share of your day" display.

## Only a handful of Ghanaian foods have Ghana-sourced values

WAFCT 2019 is the de facto national table. A current, open Ghana food composition table with prepared-dish values does not exist. The older Ghanaian sources survive mainly as inputs inside WAFCT: Eyeson & Ankrah's 1975 CSIR *Composition of foods commonly used in Ghana* (BiblioID 2P), a University of Ghana table (1P), and Ghana samples analysed for FAO in 2017 (GH2000) ([WAFCT 2019 Excel](https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx)). A KNUST professor said in October 2026 that existing Ghanaian tables capture few nutrients and that many values are "derived from foods elsewhere". KNUST is now convening work on a national database ([GNA](https://gna.org.gh/2026/10/knust-leads-push-for-ghanas-own-food-composition-database/)). Ghana's commitment to update its tables by December 2024 shows no evidence of completion ([Global Nutrition Report](https://globalnutritionreport.org/resources/naf/commitment-tracker/national-development-planning-commission-e48v-2/2024-government-ghana-will-compile-consolidate/)).

This corrects the earlier PlateWise priorities research, which could not confirm a kenkey entry. **WAFCT 01_099 "Maize dough, fermented (kenkey) … with salt added, cooked" gives 139 kcal, 3.7 g protein, 25.2 g available carbohydrate and 2.1 g fat per 100 g.** It draws on five Eyeson & Ankrah entries plus GH2000, which makes it the most Ghana-grounded staple in the table ([WAFCT 2019](https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx)). An independent check supports it. A Ghanaian glycaemic-index study needed 189 g of kenkey to supply 50 g of carbohydrate ([Eli-Cophie et al. 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5217928/)). That works out to about 26.5 g/100 g, close to WAFCT's 25.2. The same study implies carbohydrate densities of about 17.4 g/100 g for banku and 32.7 g/100 g for pounded fufu. Those are back-calculated figures, not published values, so they belong in validation, not in the table. The study also describes the Ghanaian recipes: fufu is plantain and cassava at 80:20, banku is corn and cassava dough at 80:20, and TZ is unfermented maize flour stirred into hot water.

Other Ghana-sourced WAFCT rows are hausa koko 01_102 (69 kcal, unsweetened), fermented maize porridge 01_100 (52 kcal), white gari 02_039 (351 kcal dry), tiger nut 02_024, Ghana soya bean 03_040, bambara beans 03_019, Ghana groundnut 06_025, sorghum and millet pito 12_004/12_003, stout 12_020 and soy milk 12_025 ([WAFCT 2019](https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx)). Most other cooked staples are **WAFCT calculations**, not analyses. Their cooked values were derived from raw foods using yield factors: boiled rice 01_069 at 118 kcal, boiled yam 02_020 at 132, boiled green plantain 02_064 at 151, boiled cocoyam 02_006 at 143 and boiled cassava 02_003 at 121. They are defensible, but the app should label them "calculated". Two items need a recipe add-on. Hausa koko and koko exclude sugar, which street vendors add (sugar 13_002 is 400 kcal/100 g). The Indomie row 01_103 (200 kcal) excludes the seasoning sachet and the frying oil Ghanaian vendors use.

Where Ghanaian dishes are missing, WAFCT's nearest entries are Burkina Faso recipes. Waakye can borrow "cowpeas and rice, boiled" 03_143 (125 kcal), and fufu can borrow the Burkinabè cassava-plantain foutou 02_093 (116 kcal). For jollof, the only rows are jollof spaghetti 01_157 (210 kcal) and jollof macaroni 01_156 (201 kcal). **There is no jollof rice row** ([WAFCT 2019](https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx)). Blog figures exist, such as afrocalorie's 648 kcal for a 350 g jollof plate ([afrocalorie](https://afrocalorie.com/africa/foods/west-african/jollof-rice-af)), but they are not traceable to an analysis and should not enter a database that bans invented values. The original Eyeson & Ankrah 1975 book likely holds per-100 g values for banku, fufu and kokonte. It is restricted in the CSIR repository and was not retrieved ([CSIR-FRI](https://researchspace.foodresearchgh.org/handle/1/142?mode=full)). Obtaining it, or commissioning analyses through KNUST or the University of Ghana, is the highest-value data task.

## Oil, not the dish name, decides a soup's calories

**Appiah et al. 2020 is the only recipe-defined, lab-analysed set of Ghanaian soups.** Market women in Kumasi supplied the recipes. The soups were cooked by the researchers and analysed by AOAC methods, with energy calculated at 4/4/9 kcal per gram ([Appiah et al. 2020](https://ajfand.net/Volume20/No3/Appiah18055.pdf)). Per 100 g, light soup ranges from **11.9 kcal (no garden egg, no meat) to 27.1 kcal (garden egg with chicken thigh)**. Groundnut soup is 53.1 kcal without meat and 100.3 with chicken. Kontomire soup is 10.5–27.4 kcal. **Palm nut soup is 203.6–204.6 kcal, with 17–20 g fat**, all of it from the palm fruit, since no oil was added. WAFCT's Burkinabè palm-fruit sauce 14_023 independently lands at 199 kcal, which gives the palm-soup value two-source support. Two caveats apply when importing the data. The table footnote says "dry weight", but moisture, protein, fat, ash and carbohydrate sum to about 100%, so the values are effectively as-eaten. And the abstract's fat range omits the palm soups, so the table is the authoritative source. Only one batch of each soup was analysed. The two palm soups differ sevenfold in carbohydrate, so batch variation is large.

Appiah's light soups contain no oil and its kontomire is a thin soup, not the oily stew. Ghanaian stews have no Ghanaian per-100 g value at all. The older literature says only that "all the stew samples" were high in fat ([Ankrah & Dovlo 1973 abstract](https://csirspace.foodresearchgh.org/handle/1/142)). A 1972 snippet gives garden egg stew at 16.4% fat and palava sauce at 25%, on an unverified basis ([Ata 1972 record](https://csirspace.foodresearchgh.org/handle/1/165)). WAFCT's Burkinabè stew proxies cluster at **134–195 kcal/100 g with 11–16 g fat**: eggplant sauce 14_007 at 161, sweet-potato-leaf palm-oil sauce 14_009 at 156 and lamb tomato sauce 14_002 at 188. That range is consistent with "high in fat" ([WAFCT 2019](https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx)). WAFCT's recipes put oil at about 2.7–5.7% of raw ingredient weight in tomato sauces. Each gram of retained oil adds about 9 kcal, since palm oil 11_004 is 898 kcal/100 g.

My inference from these sources is a three-tier oil setting. **Soups:** light soup 0–1.5 g fat/100 g (Appiah); groundnut soup at about 4 g (light), 8 g (normal) and 12.5 g (oily, WAFCT 14_008); palm nut soup at about 8 g when decanted or thin (14_024) and 17–20 g as normal. **Stews:** about 5 g (light), 11–16 g (normal) and 20–24 g (oily). Each extra 5 g of retained oil adds about 45 kcal per 100 g. Groundnut soup illustrates why a single value misleads. Appiah's 53–100 kcal sits well below WAFCT's 135–166 kcal, and Appiah notes that Tayie & Lartey reported about twice its fat. It also notes that Ghanaians increasingly decant surface oil from palm and groundnut soups ([Appiah et al. 2020](https://ajfand.net/Volume20/No3/Appiah18055.pdf)). **No study measures grams of oil per chop-bar serving**, and no lab analysis of shito exists. Blog figures for shito range from 113 to 294 kcal per unstated serving ([Meals by Mavis](https://mealsbymavis.com/shito-ghanaian-hot-pepper-sauce/), [Travel Food Atlas](https://travelfoodatlas.com/?p=69842)). Shito should therefore be built as a recipe from oil, dried shrimp (09_057, 322 kcal) and dried chilli (13_006, 347 kcal), or left null.

## Proteins, street snacks and drinks lean on calculated and USDA values

WAFCT covers the plain proteins Ghanaians eat. Grilled tilapia fillet 09_043 is 111.5 kcal, grilled chicken dark meat with skin 07_032 is 264, stewed goat 07_112 is 281, boiled egg 08_002 is 150.2 and cooked snail 07_084 is 138 ([WAFCT 2019](https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx)). Its "grilled\*" and "stewed\*" values are calculated with no added fat, so they are **lower bounds for street chichinga or oil-basted tilapia**. WAFCT has no smoked, salted or fried fish. A 2020 analysis of Ghanaian market fish fills part of that gap with proximates only. Smoked anchovy has 71.8 g protein and 6.44 g fat per 100 g, and smoked round sardinella has 64.8 g protein and 13.84 g fat. Applying Atwater factors gives about **345 and 384 kcal/100 g** for the dry fish as weighed, and about 190 kcal for salted tilapia ([PLOS ONE 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7660496)). The same paper found PAH4 up to 1,300 µg/kg in smoked samples, a food-safety signal the app should not treat as calorie data. Fried chicken has only a battered USDA proxy (FDC 171448, 289 kcal) ([USDA](https://fdc.nal.usda.gov/food-details/171448/nutrients)). **Wele, suya/chichinga, soya kebab and fried fish have no usable values.** The research also found no source confirming local fish names such as "koobi" and "Keta school boys", so aliases must be checked before they are mapped.

For street foods, WAFCT's deep-fried plantain 02_084 (375 kcal, 16.9 g fat) is the defensible kelewele default, but it is a recipe calculation, not a measurement of street kelewele. Fried yam 02_082 is 262 kcal. Boiled maize 04_108 is 189 and fresh tiger nuts 02_024 are 344. Koose borrows a Burkina fried cowpea pancake (03_154, 253 kcal). Bofrot, meat pie and chin chin fall back to USDA or generic bakery proxies (426, 220 and 479 kcal). The meat-pie proxy is a US pot pie and almost certainly too low for a Ghanaian shortcrust hand pie. **The only Ghana-measured snack energy retrieved is nkatie cake at 486 kcal/100 g**, from a 2026 University of Ghana study of six indigenous snacks whose energy ranged 275.6–486.0 kcal. Only that study's abstract was available, so its other per-snack values are unknown ([UG Pure](https://pure.ug.edu.gh/en/publications/proximate-composition-and-energy-density-of-six-popular-indigenou/)). Sausage roll, kulikuli, coconut toffee and Ghanaian roasted plantain or corn are not found.

WAFCT lists all the target fruits except sugar cane. One choice needs care: WAFCT's white-flesh ripe banana 05_003 is 121 kcal against 89 kcal for the yellow-flesh 05_028 ([WAFCT 2019](https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx)). Drinks are uneven. Palm wine (34 kcal/100 g), pito (27–43) and Ovaltine with whole milk as a Milo proxy (108) are tabulated. Brukina has Ghana-measured proximates (81.67% moisture, 3.79 g protein, 2.46 g fat, 11.55 g carbohydrate), which give about 84 kcal by Atwater ([KNUST](https://dspace.knust.edu.gh/items/c829931b-9809-4ed0-830f-e60e910c67f1/full)). Malta Guinness is about 58 kcal/100 ml (243 kJ), but that comes from UK retailer labels for the Nigerian-made product, not a Ghana label ([Tesco](https://www.tesco.com/shop/en-GB/products/276878120)). **Sobolo, asaana, ice kenkey, Tom Brown, Beta Malt, Alvaro, FanYogo and Fanmaxx are not found.** Fan Ice label PDFs exist, but their nutrition panels are images that nobody has verified ([Danone](https://fanmilk.danone.com/content/dam/corp/local/zaf/2025/ssa/again-update/FANICE%20POUCH.pdf)). Ghana-style tea, Milo and sobolo are best modelled as recipes: base plus evaporated milk 10_016 (157 kcal) plus sugar at 4 kcal/g. Their calories come mostly from what is added.

## Atlas portions are a floor, because they were set for adolescent girls

The Accra atlas photographs 68 meals at small, medium, large and extra-large weighed portions. It is CC-BY-4.0. **Its medium portion is based on mean intakes of Accra girls aged 10–17**, so adult and chop-bar portions are probably larger ([Folson et al. 2022](https://cgspace.cgiar.org/items/858e8110-cefd-445b-bdac-ab8ddc6f5c14)). Medium starch portions are: banku 754 g ("2 balls"), cassava fufu 478 g, kokonte 476 g, eba 532 g, Ga kenkey 302 g, TZ 338 g ("2 balls"), rice balls 350 g ("2 balls"), plain rice 242 g, and waakye 236 g alone or 324 g with shito. Medium soup portions are about **274–298 g (two ladles)**. Stews run 166–226 g, and shito is 40 g for "1 tbsp" (a heaped serving spoon in practice). The atlas's own "ladle" varies from about 100 to 240 g by dish. Appiah's 150 ml ladle holds about 150 g ([Appiah et al. 2020](https://ajfand.net/Volume20/No3/Appiah18055.pdf)). So the app should store a gram default per dish rather than a universal ladle. Implied single units are about 377 g for one banku ball, 175 g for a rice ball and 169 g for a TZ ball. These are much larger than the "200 g banku ball" on blogs. Several atlas pages extract ambiguously. Jollof weights are interleaved with wheat jollof, and gari soakings and mashed kenkey share identical numbers. These need checking by eye before use.

Pairing atlas weights with composition gives illustrative plate values, calculated here rather than published. A medium Ga kenkey is about **420 kcal**, a medium plain rice about 286 kcal and a medium groundnut soup with chicken about 281 kcal. A medium palm nut soup is about **560 kcal**, while a medium chicken light soup is only about 74 kcal, excluding the meat. A medium portion of fried ripe plantain (184 g) is about 690 kcal. The atlas has no standalone portion for tomato stew, garden egg stew, fante fante, red-red, fruit, street snacks, a piece of chicken or fish, or an egg. **No source gives adult chop-bar bowl weights.** That gap is best closed by PlateWise's own weighed-plate data.

## Calories land best as a share of the day, with walking as an opt-in

The evidence favours plain-language framings, though weakly. **A meta-analysis of 15 studies found that physical-activity calorie-equivalent (PACE) labels cut calories selected by 64.9 kcal per meal** (95% CI −103.2 to −26.6) and calories eaten by 80.4 kcal. The authors called the evidence limited, because few studies were run in real-world settings ([Daley et al. 2020, JECH](https://jech.bmj.com/content/74/3/269)). Plain kcal menu labels cut energy bought by 7.8% per meal, on low-quality evidence ([Cochrane](https://www.cochrane.org/fr/evidence/CD009315_nutritional-labelling-promote-healthier-consumption-and-purchasing-food-or-drinks)). The case for these framings in Ghana is comprehension. In Accra, 62% of label users claimed adequate understanding, but **only 9% demonstrated it** ([UGSpace](https://ugspace.ug.edu.gh/items/8f702ea0-3386-445a-9fd5-b5393fa4619e)). Education was the only significant predictor of label use in Tamale ([AJFAND](https://ajol.info/index.php/ajfand/article/view/185614)). Evaluative labels beat numeric ones in a South African study ([SAJCN](https://ajol.info/index.php/sajcn/article/view/248016/234576)). WHO urges testing label formats in the national context ([WHO](https://www.who.int/news/item/27-09-2021-state-of-play-of-who-guidance-on-front-of-the-pack-labelling)). No study has tested share-of-day or reference-food framings in West Africa, so these are design choices that need user testing.

Activity minutes come from **minutes = food kcal ÷ (MET × kg) × 60**. A net MET (MET − 1) is more honest, because resting energy would be burned anyway. All values below are from the 2024 Adult Compendium, which covers ages 19–59 only ([Herrmann et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10818145/); [pacompendium.com](https://pacompendium.com/walking/)). The Compendium has no entries for azonto, fufu pounding or kayayei head-porterage. Hand-pounding with a mortar was measured at **3.7 MET (SD 1.2)** in Mozambique ([Russel et al. 2020](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/E5A97C84C195DFFB59828B6AC1A779AF/S1368980020001019a.pdf/estimating-energy-expenditure-of-head-hauling-water-and-grain-grinding-from-heart-rate-monitor-measurements-in-northern-mozambique.pdf)).

| Relatable activity | Compendium code | MET | Minutes for a 420 kcal Ga kenkey, 70 kg, net MET |
|---|---|---|---|
| Brisk walk | 17200 | 4.8 | about 95 (75 using gross MET) |
| Walking to work or the trotro stop | 17270 | 4.0 | about 120 |
| Climbing stairs | 17131 | 6.8 | about 62 |
| Dancing at a party (proxy: ethnic/cultural dance) | 03025 | 4.5 | about 103 |
| Gala football, casual | 15610 | 7.0 | about 60 |
| Sweeping the compound | 05140 | 3.0 | about 180 |
| Pounding fufu (not a Compendium code) | Russel 2020 | 3.7 | about 133 |
| Hoeing or weeding (forestry, moderate) | 11264 | 5.0 | about 90 |
| Carrying a head load or water | 17076 | 4.5 | about 103 |

The minutes are my arithmetic. Individual error of ±20–30% is plausible, so the UI should say "about" and round to friendly units. **"Share of your day"** needs only the user's target. For example, with a 2,000 kcal target, a kenkey ball is about a fifth of the day and a medium palm nut soup more than a quarter. **Reference foods** should be computed from the same database. A 330 ml Malta Guinness (about 191 kcal) is a little under half a kenkey ball, and a 500 ml sachet of pure water is a 0 kcal anchor. **Household units** (balls, ladles, stew spoons, fingers, sachets) should be what users log and see. Kcal stays as the internal and secondary display.

The safeguards matter as much as the framing. Beat and a British Dietetic Association spokesperson warned that exercise labels imply food must be "earnt or burnt off" and can worsen over-exercise ([Independent Nurse](https://www.independentnurse.co.uk/news/exercise-indicators-on-food-packaging-could-reduce-calorie-consumption/222428)). The PACE researchers reply that no evidence shows harm ([Loughborough](https://lboro.ac.uk/schools/sport-exercise-health-sciences/news/2024/pace-labelling/)). **No trial has measured eating-disorder outcomes**, and the research found no published safeguard standard, so the following rules are PlateWise's own design. Make activity equivalents opt-in, or easy to switch off, and default to share-of-day. Word them as "gives you energy for about X minutes of walking", never "you must walk X minutes". Never total them into an exercise "debt". Hide them automatically, and soften language, when a user sets a very low target or repeatedly logs very low intake. Always show them alongside the number, which is RSPH's own recommendation ([FoodNavigator](https://foodnavigator.com/Article/2016/01/15/Exercise-labels-could-help-stamp-out-obesity)). Offer a route to support. These rules sit naturally beside PlateWise's existing floor rules (1,200/1,500 kcal, 1% a week, BMI 18.5, 18+ only). The 18+ rule also keeps users inside the Compendium's adult range.

## FAO's licence blocks commercial use without permission

The WAFCT workbook says its material may be copied "for private study, research and teaching purposes, or for use in non-commercial products or services", with acknowledgement and no implied endorsement. Requests for "resale and other commercial use rights" must go to FAO's licence-request page or copyright@fao.org (© FAO 2020) ([WAFCT 2019 Excel](https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx)). **A subscription PlateWise is commercial and needs written FAO permission before WAFCT values ship.** The required citation is Vincent, Grande, Compaoré, Amponsah Annor, Addy et al. 2020, *FAO/INFOODS Food Composition Table for Western Africa (2019)* ([user guide](https://www.fao.org/3/ca7779b/CA7779B.PDF)). Some WAFCT rows borrow values from USDA, UK or Australian tables (BiblioIDs US28, UK7, AU14), which may carry their own terms. The Accra atlas is CC-BY-4.0, so it can be used commercially with attribution ([CGSpace](https://cgspace.cgiar.org/items/858e8110-cefd-445b-bdac-ab8ddc6f5c14)). USDA FoodData Central is generally treated as public domain, but the research did not verify this. Reuse terms for Appiah 2020, the PLOS ONE fish data, the KNUST brukina study and retailer labels were not checked. Citing their numbers with attribution is the minimum. Whether WAFCT now also carries a Creative Commons IGO licence was not confirmed.

## Conclusion

The research turns "build a Ghanaian food database" into a narrower and more honest job. Fewer than twenty Ghanaian foods have Ghana-sourced values. Everything else is calculated, proxied or blank. That shapes how the AI should consult the table. It should match a user's dish to a row and report the row's confidence. It should never treat a Burkina sauce or a US pot pie as the Ghanaian dish. And it should ask about oil and portion, because those two variables move calories by a factor of two to seven, far more than the dish label. The most valuable next data does not have to be bought. It can be obtained by requesting Eyeson & Ankrah 1975 from CSIR-FRI, by asking KNUST or the University of Ghana to analyse banku, fufu, waakye, jollof, red stew and shito, and by weighing adult chop-bar plates for PlateWise's own test set. Each of these closes a NOT FOUND row that a competitor's "100+ dishes" claim quietly papers over.

---

## Appendix: machine-readable reference table

Conventions. All values are per 100 g edible portion as eaten (per 100 ml where marked). Columns are energy (kcal), protein, available carbohydrate and fat (g). "n/r" means not reported in the source. A bracketed WAFCT fat value (an alternative method) is shown without brackets. Confidence levels:

- **primary**: a direct match with an analysed value. "GH" in notes means Ghana samples or Ghanaian studies are among the sources.
- **calculated**: a WAFCT recipe or yield-factor calculation for the matching food, or an Atwater calculation from published proximates.
- **proxy**: a different or non-Ghanaian food standing in.
- **not found**: no value. Store null and set `needs_review`.

Portions are the atlas medium (M) unless stated. "Folson2022" pages are the atlas's printed page numbers, and soups and stews are on pp.169–174. Medium is an adolescent-girl portion, so treat it as a floor for adults. Source keys:

- WAFCT2019: [FAO Excel](https://www.fao.org/fileadmin/user_upload/faoweb/2020/WAFCT_2019.xlsx)
- Appiah2020: [AJFAND](https://ajfand.net/Volume20/No3/Appiah18055.pdf)
- PLOSONE2020: [PMC7660496](https://pmc.ncbi.nlm.nih.gov/articles/PMC7660496)
- KNUST-brukina: [KNUST](https://dspace.knust.edu.gh/items/c829931b-9809-4ed0-830f-e60e910c67f1/full)
- AmoakoMensah2026: [UG Pure](https://pure.ug.edu.gh/en/publications/proximate-composition-and-energy-density-of-six-popular-indigenou/)
- USDA: `https://fdc.nal.usda.gov/food-details/<id>/nutrients`
- Folson2022: [CGSpace](https://cgspace.cgiar.org/items/858e8110-cefd-445b-bdac-ab8ddc6f5c14)

| id | name | kcal_per_100g | protein_g | carbs_g | fat_g | source | confidence | portion_label | portion_g | portion_source | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| kenkey_ga | Kenkey (Ga), cooked, salted | 139 | 3.7 | 25.2 | 2.1 | WAFCT2019:01_099 | primary | 1 whole Ga kenkey (M) | 302 | Folson2022:p125 | GH; Ga/Fante not distinguished |
| kenkey_fante | Kenkey (Fante) | 139 | 3.7 | 25.2 | 2.1 | WAFCT2019:01_099 | proxy | NOT FOUND | NOT FOUND | — | No Fante-specific data |
| hausa_koko_unsweetened | Hausa koko, millet porridge, no sugar | 69 | 0.9 | 8.9 | 0.8 | WAFCT2019:01_102 | primary | 2 ladles (M) | 352 | Folson2022:p3 | GH; add sugar separately |
| koko_maize_unsweetened | Koko, fermented maize porridge, no sugar | 52 | 1.1 | 8.8 | 1.0 | WAFCT2019:01_100 | primary | NOT FOUND | NOT FOUND | — | GH + Nigeria data |
| oblayo | Oblayo (maize porridge) | 52 | 1.1 | 8.8 | 1.0 | WAFCT2019:01_100 | proxy | M bowl | 414 | Folson2022:p9 | Not named in WAFCT |
| tom_brown | Tom Brown | NOT FOUND | | | | NOT FOUND | not found | 2 ladles (M) | 204 | Folson2022:p11 | Weak proxy 01_100 noted, not used |
| rice_water | Rice water (rice porridge, milk, sugar) | 75 | 1.2 | 16.9 | 0.3 | WAFCT2019:01_161 | proxy | M bowl | 340 | Folson2022:p10 | Burkina recipe |
| oats_porridge_water | Oats porridge, water only | 65 | 2.1 | 10.3 | 1.4 | WAFCT2019:01_133 | calculated | M bowl | 330 | Folson2022:p9 | Atlas M/L duplicated |
| tuo_zaafi | TZ, unfermented maize flour | 70 | 1.2 | 14.4 | 0.6 | WAFCT2019:01_146 | calculated | 2 balls (M) | 338 | Folson2022:p161 | Water drives energy |
| tuo_zaafi_fermented | TZ, fermented maize dough (tô) | 76 | 2.1 | 13.4 | 1.0 | WAFCT2019:01_098 | primary | 2 balls (M) | 338 | Folson2022:p161 | GH + Burkina data |
| tuo_zaafi_millet | Millet TZ (tô) | 93 | 1.8 | 16.7 | 1.5 | WAFCT2019:01_153 | primary | NOT FOUND | NOT FOUND | — | GH + Burkina data |
| stiff_maize_porridge | Stiff maize porridge (firm TZ) | 130 | 2.3 | 26.8 | 1.1 | WAFCT2019:01_111 | calculated | NOT FOUND | NOT FOUND | — | Generic |
| akple | Akple | 130 | 2.3 | 26.8 | 1.1 | WAFCT2019:01_111 | proxy | M | 362 | Folson2022:p82 | Weak proxy; akple not in WAFCT |
| banku | Banku | NOT FOUND | | | | NOT FOUND | not found | 2 balls (M) | 754 | Folson2022:p83 | ~377 g/ball derived |
| fufu_cassava_plantain_gh | Fufu, Ghanaian pounded | NOT FOUND | | | | NOT FOUND | not found | Cassava fufu (M) | 478 | Folson2022:p114 | See proxy rows |
| fufu_cassava_unripe_plantain | Foutou, cassava + unripe plantain | 116 | 1.2 | 25 | 0.5 | WAFCT2019:02_093 | proxy | Cassava fufu (M) | 478 | Folson2022:p114 | Burkina ratio |
| fufu_cassava_ripe_plantain | Foutou, cassava + ripe plantain | 115 | 1.1 | 25.9 | 0.2 | WAFCT2019:02_091 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| fufu_yam | Yam foutou | 97 | 1.8 | 19.6 | 0.3 | WAFCT2019:02_097 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| kokonte | Kokonte, cooked | NOT FOUND | | | | NOT FOUND | not found | M | 476 | Folson2022:p156 | Flour only: 02_004 |
| omo_tuo | Omo tuo / rice balls | NOT FOUND | | | | NOT FOUND | not found | 2 balls (M) | 350 | Folson2022:p159 | |
| eba | Eba | 134 | 0.7 | 31.3 | 0.2 | WAFCT2019:02_095 | proxy | M | 532 | Folson2022:p88 | Very weak: tô of gari + tomato paste |
| gari_dry | Gari, white, dry | 351 | 1.2 | 82.9 | 0.5 | WAFCT2019:02_039 | primary | NOT FOUND | NOT FOUND | — | GH |
| gari_soakings | Gari soakings | NOT FOUND | | | | NOT FOUND | not found | M | 362 | Folson2022:p1 | Atlas S/M duplicated |
| mashed_kenkey | Mashed kenkey | NOT FOUND | | | | NOT FOUND | not found | M | 362 | Folson2022:p6 | Same numbers as gari soakings; check |
| rice_white_boiled | Rice, white, boiled | 118 | 2.3 | 26.4 | 0.2 | WAFCT2019:01_069 | calculated | M | 242 | Folson2022:p23 | 1 ladle (S) = 148 g |
| jollof_rice | Jollof rice | NOT FOUND | | | | NOT FOUND | not found | M | 390 | Folson2022:p60 | Atlas ordering uncertain |
| jollof_spaghetti | Jollof spaghetti | 210 | 4.3 | 23.8 | 10.4 | WAFCT2019:01_157 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| jollof_macaroni | Jollof macaroni with mutton | 201 | 5.1 | 20.5 | 10.6 | WAFCT2019:01_156 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| rice_fish_vegetables | Rice with fish and vegetables (one-pot) | 157 | 3.9 | 22.0 | 5.6 | WAFCT2019:01_158 | proxy | NOT FOUND | NOT FOUND | — | Weak jollof-like proxy |
| fried_rice | Fried rice | 259 | 5.5 | 31.7 | 11.9 | WAFCT2019:01_160 | proxy | Fried rice + beef sauce plate (M, combined) | 348 | Folson2022:p54 | Weak proxy; portion includes sauce |
| oil_rice | Oil rice | NOT FOUND | | | | NOT FOUND | not found | M | 224 | Folson2022:p20 | |
| waakye | Waakye | 125 | 6.2 | 22.5 | 0.4 | WAFCT2019:03_143 | proxy | M, alone | 236 | Folson2022:p66 | Burkina cowpeas + rice; 324 g with shito |
| yam_boiled | Yam, boiled | 132 | 2.4 | 26.8 | 0.4 | WAFCT2019:02_020 | calculated | M | 264 | Folson2022:p73 | |
| water_yam_boiled | Water yam, boiled | 123 | 2.5 | 22.7 | 0.1 | WAFCT2019:02_018 | calculated | NOT FOUND | NOT FOUND | — | |
| yam_fried | Yam, deep fried | 262 | 3.6 | 39.6 | 8.0 | WAFCT2019:02_082 | calculated | M, with fresh pepper | 202 | Folson2022:p76 | |
| plantain_unripe_boiled | Ampesi, unripe plantain, boiled | 151 | 1.8 | 30.3 | 1.1 | WAFCT2019:02_064 | calculated | M | 308 | Folson2022:p39 | Raw 02_045 has GH source |
| plantain_ripe_boiled | Ripe plantain, boiled | 151 | 1.4 | 34.6 | 0.2 | WAFCT2019:02_057 | calculated | M | 302 | Folson2022:p46 | |
| plantain_ripe_fried | Ripe plantain, fried | 375 | 2.1 | 51.7 | 16.9 | WAFCT2019:02_084 | calculated | M | 184 | Folson2022:p50 | |
| kelewele | Kelewele | 375 | 2.1 | 51.7 | 16.9 | WAFCT2019:02_084 | proxy | NOT FOUND | NOT FOUND | — | Unspiced fried plantain |
| plantain_chips | Plantain chips | 375 | 2.1 | 51.7 | 16.9 | WAFCT2019:02_084 | proxy | NOT FOUND | NOT FOUND | — | Likely a floor |
| plantain_roasted | Roasted plantain (kofi brokeman) | 155 | 1.52 | 41.4 | 0.16 | USDA:169131 | proxy | NOT FOUND | NOT FOUND | — | Baked yellow plantain |
| cocoyam_boiled | Cocoyam, white, boiled | 143 | 3.4 | 30.4 | 0.3 | WAFCT2019:02_006 | calculated | NOT FOUND | NOT FOUND | — | Raw has GH source |
| cocoyam_yellow_boiled | Cocoyam, yellow, boiled | 118 | 3.4 | 24.4 | 0.2 | WAFCT2019:02_055 | calculated | NOT FOUND | NOT FOUND | — | |
| taro_boiled | Taro, boiled | 125 | 2.6 | 24.9 | 0.8 | WAFCT2019:02_016 | calculated | NOT FOUND | NOT FOUND | — | Raw has GH source |
| cassava_boiled | Cassava, boiled | 121 | 1.1 | 27.0 | 0.3 | WAFCT2019:02_003 | calculated | NOT FOUND | NOT FOUND | — | |
| spaghetti_boiled | Spaghetti, boiled | 124 | 4.3 | 24.9 | 0.5 | WAFCT2019:01_053 | calculated | M | 192 | Folson2022:p55 | Macaroni row values |
| macaroni_boiled | Macaroni, boiled | 124 | 4.3 | 24.9 | 0.5 | WAFCT2019:01_053 | calculated | M | 132 | Folson2022:p15 | |
| indomie_prepared | Indomie, boiled, no sachet or oil | 200 | 5.6 | 25.3 | 8.3 | WAFCT2019:01_103 | calculated | M, alone | 258 | Folson2022:p14 | Excludes seasoning and oil |
| bread_white | Bread, white wheat | 249 | 7.5 | 50.5 | 1.3 | WAFCT2019:01_046 | primary | NOT FOUND | NOT FOUND | — | Sources incl. Eyeson & Ankrah (GH) |
| tea_bread | Tea bread | 249 | 7.5 | 50.5 | 1.3 | WAFCT2019:01_046 | proxy | M, with spread | 58 | Folson2022:p3 | |
| bread_rolls | Bread rolls, white | 271 | 9.5 | 51.0 | 2.7 | WAFCT2019:01_045 | proxy | NOT FOUND | NOT FOUND | — | Non-African sources |
| sugar_bread | Sugar bread | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| aprapransa | Aprapransa | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| light_soup_gardenegg_plain | Light soup, garden egg, no meat | 13.8 | 0.34 | 2.38 | 0.32 | Appiah2020:Table2:LS1 | primary | 2 ladles (M) | 274 | Folson2022:pp169-174 | GH lab; kcal from paper's factors |
| light_soup_gardenegg_chicken | Light soup, garden egg + chicken | 27.1 | 1.28 | 2.09 | 1.51 | Appiah2020:Table2:LS2 | primary | 2 ladles (M) | 274 | Folson2022:pp169-174 | Liquid only |
| light_soup_plain | Light soup, no garden egg, no meat | 11.9 | 0.41 | 2.24 | 0.14 | Appiah2020:Table2:LS3 | primary | 2 ladles (M) | 274 | Folson2022:pp169-174 | |
| light_soup_chicken | Light soup, no garden egg + chicken | 20.6 | 0.81 | 2.24 | 0.93 | Appiah2020:Table2:LS4 | primary | 2 ladles (M) | 274 | Folson2022:pp169-174 | |
| light_soup_fish | Light soup with fish | 64 | 6.5 | 5.8 | 1.4 | WAFCT2019:14_001 | proxy | 2 ladles (M) | 274 | Folson2022:pp169-174 | Burkina fish soup |
| clear_fish_sauce_palmoil | Clear fish sauce with palm oil | 81 | 5.4 | 2.1 | 5.4 | WAFCT2019:14_012 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| chicken_soup_rich | Chicken vegetable soup | 81 | 5.4 | 2.1 | 5.4 | WAFCT2019:14_033 | proxy | NOT FOUND | NOT FOUND | — | Burkina; richer than LS2 |
| vegetable_broth | Cabbage and vegetable soup | 21 | 1.1 | 3.2 | 0.1 | WAFCT2019:14_034 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| groundnut_soup_plain | Groundnut soup, no meat | 53.1 | 2.19 | 2.39 | 3.86 | Appiah2020:Table2:GS1 | primary | 2 ladles (M) | 280 | Folson2022:pp169-174 | GH lab; "light" oil tier |
| groundnut_soup_chicken | Groundnut soup + chicken | 100.3 | 4.29 | 3.29 | 7.78 | Appiah2020:Table2:GS2 | primary | 2 ladles (M) | 280 | Folson2022:pp169-174 | "normal" tier |
| groundnut_sauce_oily | Groundnut sauce with fish (thick, oil added) | 166 | 6.6 | 5.3 | 12.5 | WAFCT2019:14_008 | proxy | 2 ladles (M) | 280 | Folson2022:pp169-174 | "oily" tier |
| groundnut_sauce_soumbala | Groundnut sauce, vegetables, fish | 135 | 5.7 | 3.3 | 10.4 | WAFCT2019:14_006 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| palmnut_soup_plain | Palm nut soup, no fish | 204.6 | 4.08 | 1.18 | 20.39 | Appiah2020:Table2:PS1 | primary | M | 274 | Folson2022:pp169-174 | GH lab; batch SD high |
| palmnut_soup_fish | Palm nut soup + smoked fish/herring | 203.6 | 4.23 | 8.43 | 17.00 | Appiah2020:Table2:PS2 | primary | M | 274 | Folson2022:pp169-174 | GH lab |
| palm_sauce_thick | Palm fruit sauce with fish | 199 | 1.7 | 5.1 | 18.8 | WAFCT2019:14_023 | proxy | NOT FOUND | NOT FOUND | — | Burkina; corroborates PS1/PS2 |
| palm_sauce_thin_okra | Palm fruit sauce with okra (thin) | 96 | 2.7 | 2.8 | 8.0 | WAFCT2019:14_024 | proxy | NOT FOUND | NOT FOUND | — | "Decanted" tier |
| kontomire_soup_plain | Kontomire soup, no fish, no oil | 10.5 | 0.45 | 1.69 | 0.22 | Appiah2020:Table2:KS1 | primary | NOT FOUND | NOT FOUND | — | Soup, not stew |
| kontomire_soup_fish | Kontomire soup + smoked catfish | 27.4 | 2.07 | 2.86 | 0.85 | Appiah2020:Table2:KS2 | primary | NOT FOUND | NOT FOUND | — | |
| abunabunu | Abunabunu | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | KS2 or PS1/PS2 suggested by notes |
| okro_soup_fresh | Okro soup, fresh, palm oil | 74 | 3.4 | 2.6 | 5.2 | WAFCT2019:14_019 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| okro_soup_dry_beef | Dry okro soup with beef, palm oil | 144 | 6.0 | 2.4 | 11.7 | WAFCT2019:14_018 | proxy | Dry okro soup, 2 ladles (M) | 298 | Folson2022:pp169-174 | Burkina |
| okro_soup_dry_lamb | Dry okro soup with lamb | 145 | 4.7 | 2.2 | 12.4 | WAFCT2019:14_017 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| ayoyo_soup_fish | Ayoyo (jute leaf) soup, fish, palm oil | 75 | 3.1 | 2.5 | 5.5 | WAFCT2019:14_016 | proxy | Soup + gravy, 2+1 ladles (M) | 344 | Folson2022:pp169-174 | Burkina |
| ayoyo_soup_meat | Ayoyo soup with lamb | 85 | 3.4 | 1.6 | 7.0 | WAFCT2019:14_015 | proxy | NOT FOUND | NOT FOUND | — | Burkina |
| dry_kuka_soup | Dry kuka soup | NOT FOUND | | | | NOT FOUND | not found | 2 ladles (M) | 250 | Folson2022:pp169-174 | |
| kontomire_stew | Kontomire stew (palm oil) | 156 | 5.0 | 4.3 | 12.6 | WAFCT2019:14_009 | proxy | 2 ladles (M) | 226 | Folson2022:pp169-174 | Sweet potato leaf sauce |
| palava_sauce | Palava sauce | 168 | 6.7 | 3.5 | 13.6 | WAFCT2019:14_004 | proxy | 2 stew spoons (M) | 196 | Folson2022:pp169-174 | Spinach sauce |
| leaf_stew_very_oily | Leaf stew, very oily (upper bound) | 264 | 6.4 | 4.6 | 23.7 | WAFCT2019:14_025 | proxy | NOT FOUND | NOT FOUND | — | Cassava leaf sauce |
| agushie_stew | Egusi (agushie) stew | 203 | 6.3 | 3.1 | 17.7 | WAFCT2019:14_028 | proxy | 2 ladles (M) | 214 | Folson2022:pp169-174 | Weak: sesame sauce |
| garden_egg_stew | Garden egg stew | 161 | 4.1 | 4.8 | 13.3 | WAFCT2019:14_007 | proxy | NOT FOUND | NOT FOUND | — | Eggplant sauce with fish |
| garden_egg_stew_meat | Garden egg stew with meat | 134 | 4.0 | 3.7 | 11.0 | WAFCT2019:14_013 | proxy | NOT FOUND | NOT FOUND | — | |
| fante_fante | Fante fante (fish in palm oil) | 127 | 5.7 | 3.8 | 9.5 | WAFCT2019:14_005 | proxy | NOT FOUND | NOT FOUND | — | |
| tomato_stew_meat | Red/tomato stew, meat (also jollof gravy) | 188 | 5.9 | 4.4 | 15.9 | WAFCT2019:14_002 | proxy | NOT FOUND | NOT FOUND | — | Only in composite plates in atlas |
| tomato_stew_fish | Red/tomato stew, fish | 195 | 7.2 | 4.2 | 16.2 | WAFCT2019:14_003 | proxy | NOT FOUND | NOT FOUND | — | |
| beef_sauce | Beef sauce | NOT FOUND | | | | NOT FOUND | not found | 2 stew spoons (M) | 120 | Folson2022:pp169-174 | |
| egg_stew | Egg stew | NOT FOUND | | | | NOT FOUND | not found | 2 stew spoons (M) | 166 | Folson2022:pp169-174 | Build from 08_002 + stew |
| beans_stew | Beans stew | 177 | 7.2 | 16.7 | 8.2 | WAFCT2019:03_144 | proxy | 2 ladles (M) | 210 | Folson2022:pp169-174 | Cowpeas and vegetables |
| red_red | Red-red | 177 | 7.2 | 16.7 | 8.2 | WAFCT2019:03_144 | proxy | NOT FOUND | NOT FOUND | — | Excludes fried plantain |
| konto_beans_stew | Konto-beans stew | NOT FOUND | | | | NOT FOUND | not found | 2 ladles (M) | 272 | Folson2022:pp169-174 | |
| mixed_vegetable_stew | Mixed vegetable stew | NOT FOUND | | | | NOT FOUND | not found | 2 stew spoons (M) | 330 | Folson2022:pp169-174 | |
| soya_bean_stew | Soya bean stew | NOT FOUND | | | | NOT FOUND | not found | 2 stew spoons (M) | 200 | Folson2022:pp169-174 | |
| mushroom_soup | Mushroom soup | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | No mushroom rows in WAFCT |
| shito | Shito | NOT FOUND | | | | NOT FOUND | not found | 1 serving spoon ("1 tbsp", S) | 40 | Folson2022:pp169-174 | Build as recipe |
| fresh_pepper | Fresh pepper / kpakpo shito | NOT FOUND | | | | NOT FOUND | not found | 1 serving spoon (S) | 38 | Folson2022:pp169-174 | |
| green_pepper_sauce | Green pepper sauce | NOT FOUND | | | | NOT FOUND | not found | 1 serving spoon (S) | 28 | Folson2022:pp169-174 | |
| tilapia_grilled | Tilapia fillet, grilled | 111.5 | 23.6 | 0 | 1.9 | WAFCT2019:09_043 | calculated | NOT FOUND | NOT FOUND | — | No added fat |
| tilapia_boiled | Tilapia fillet, boiled | 100.9 | 21.4 | 0 | 1.7 | WAFCT2019:09_089 | calculated | NOT FOUND | NOT FOUND | — | |
| tilapia_salted | Tilapia, salted | 190 | 31.80 | n/r | 7.02 | PLOSONE2020:Table2 | calculated | NOT FOUND | NOT FOUND | — | GH market; Atwater kcal |
| mackerel_grilled | Mackerel fillet, grilled | 150.2 | 24.5 | 0 | 5.8 | WAFCT2019:09_025 | calculated | NOT FOUND | NOT FOUND | — | |
| mackerel_in_stew | Mackerel fillet, boiled in recipe | 171.4 | 28.0 | 0 | 6.6 | WAFCT2019:09_069 | calculated | NOT FOUND | NOT FOUND | — | |
| horse_mackerel_grilled | Horse mackerel (kpanla), grilled | 138.2 | 23.3 | 0 | 5.0 | WAFCT2019:09_071 | calculated | NOT FOUND | NOT FOUND | — | |
| redfish_grilled | Redfish | 139 | 28.0 | 0 | 3.0 | WAFCT2019:09_047 | proxy | NOT FOUND | NOT FOUND | — | White grouper |
| anchovy_grilled | Anchovy, fresh, grilled | 167.2 | 27.4 | 0 | 6.4 | WAFCT2019:09_011 | calculated | NOT FOUND | NOT FOUND | — | |
| anchovy_smoked | Anchovy, smoked | 345 | 71.80 | n/r | 6.44 | PLOSONE2020:Table2 | calculated | NOT FOUND | NOT FOUND | — | GH market; dry as weighed |
| sardinella_smoked | Round sardinella, smoked | 384 | 64.80 | n/r | 13.84 | PLOSONE2020:Table2 | calculated | NOT FOUND | NOT FOUND | — | GH market |
| pygmy_herring_smoked | West African pygmy herring, dried/smoked | 381 | 67.67 | n/r | 12.23 | PLOSONE2020:Table2 | calculated | NOT FOUND | NOT FOUND | — | GH market |
| herring_kippered | Herring, kippered | 217 | 24.6 | 0 | 12.4 | USDA:173668 | proxy | NOT FOUND | NOT FOUND | — | Moister smoked herring |
| fish_dried | Fish, whole, dried | 316 | 60.4 | 0 | 8.2 | WAFCT2019:09_053 | primary | NOT FOUND | NOT FOUND | — | |
| shrimp_dried | Dried shrimp/crayfish | 322 | 63.1 | 7.9 | 4.2 | WAFCT2019:09_057 | primary | NOT FOUND | NOT FOUND | — | GH2000 |
| crab_boiled | Crab, boiled | 106.7 | 18.3 | 5.0 | 1.5 | WAFCT2019:09_098 | calculated | NOT FOUND | NOT FOUND | — | |
| sardine_grilled | Sardine fillet, grilled | 154.4 | 28.7 | 0 | 4.4 | WAFCT2019:09_036 | calculated | NOT FOUND | NOT FOUND | — | |
| fish_fried | Fried fish (redfish, "salmon") | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| chicken_dark_grilled | Chicken thigh/leg with skin, grilled | 264 | 21.4 | 0 | 19.8 | WAFCT2019:07_032 | calculated | NOT FOUND | NOT FOUND | — | |
| chicken_breast_grilled | Chicken breast with skin, grilled | 194 | 25.8 | 0 | 10.1 | WAFCT2019:07_038 | calculated | NOT FOUND | NOT FOUND | — | |
| chicken_dark_stewed | Chicken dark with skin, stewed | 331 | 23.8 | 0 | 26.2 | WAFCT2019:07_103 | calculated | NOT FOUND | NOT FOUND | — | |
| chicken_dark_skinless_grilled | Chicken dark, skinless, grilled | 169 | 24.8 | 0 | 7.8 | WAFCT2019:07_029 | calculated | NOT FOUND | NOT FOUND | — | |
| chicken_fried | Fried chicken | 289 | 22.5 | 9.42 | 17.4 | USDA:171448 | proxy | NOT FOUND | NOT FOUND | — | Battered; Ghana usually not |
| guinea_fowl_grilled | Guinea fowl, grilled | 136 | 27.6 | 0 | 2.9 | WAFCT2019:07_117 | calculated | NOT FOUND | NOT FOUND | — | |
| guinea_fowl_stewed | Guinea fowl, stewed | 152 | 30.7 | 0 | 3.2 | WAFCT2019:07_118 | calculated | NOT FOUND | NOT FOUND | — | |
| goat_grilled | Goat meat (~10% fat), grilled | 204 | 25.6 | 0 | 11.3 | WAFCT2019:07_048 | calculated | NOT FOUND | NOT FOUND | — | |
| goat_stewed | Goat meat (~10% fat), stewed | 281 | 31.0 | 0 | 17.5 | WAFCT2019:07_112 | calculated | NOT FOUND | NOT FOUND | — | |
| goat_lean_grilled | Goat meat, lean, grilled | 167 | 27.8 | 0 | 6.2 | WAFCT2019:07_114 | calculated | NOT FOUND | NOT FOUND | — | |
| beef_grilled | Beef (~20% fat), grilled | 286 | 25.9 | 0 | 20.3 | WAFCT2019:07_013 | calculated | NOT FOUND | NOT FOUND | — | |
| beef_stewed | Beef (~20% fat), stewed | 336 | 26.2 | 0 | 25.7 | WAFCT2019:07_086 | calculated | NOT FOUND | NOT FOUND | — | |
| beef_lean_grilled | Beef, lean, grilled | 182 | 31.3 | 0 | 6.3 | WAFCT2019:07_011 | calculated | NOT FOUND | NOT FOUND | — | |
| beef_lean_stewed | Beef, lean, stewed | 185 | 31.7 | 0 | 6.4 | WAFCT2019:07_085 | calculated | NOT FOUND | NOT FOUND | — | |
| beef_tripe_boiled | Beef tripe ("towel"), boiled | 118 | 16.8 | 0 | 5.6 | WAFCT2019:07_022 | calculated | NOT FOUND | NOT FOUND | — | |
| corned_beef | Corned beef, canned | 208 | 17.2 | 3.6 | 13.8 | WAFCT2019:07_025 | primary | NOT FOUND | NOT FOUND | — | GH1034 |
| wele | Wele (cow skin), cooked | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | Only conflicting Nigerian ponmo data |
| chichinga_suya | Chichinga / suya kebab | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | Notes suggest 07_013 + oil + yaji |
| soya_kebab | Soya kebab | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | Boiled soya is a floor |
| egg_boiled | Egg, chicken, boiled | 150.2 | 13.5 | 0.2 | 10.6 | WAFCT2019:08_002 | calculated | NOT FOUND | NOT FOUND | — | |
| egg_local_boiled | Egg, local breed, boiled | 147.6 | 12.7 | 0.8 | 10.4 | WAFCT2019:08_010 | primary | NOT FOUND | NOT FOUND | — | |
| egg_fried | Egg, fried in oil | 197 | 13.6 | 2 | 14.9 | WAFCT2019:08_003 | primary | NOT FOUND | NOT FOUND | — | |
| omelette | Omelette | 150 | 10.6 | 0.6 | 11.7 | WAFCT2019:08_004 | primary | NOT FOUND | NOT FOUND | — | |
| guinea_fowl_egg_boiled | Guinea fowl egg, boiled | 184.6 | 12.9 | 2.2 | 13.8 | WAFCT2019:08_013 | primary | NOT FOUND | NOT FOUND | — | |
| snail_cooked | Snail (nwaw), cooked | 138 | 25.2 | 8.3 | 0.5 | WAFCT2019:07_084 | primary | NOT FOUND | NOT FOUND | — | Nigerian/F09 sources |
| cowpea_boiled | Beans (cowpea), boiled, drained | 122 | 8.5 | 18.3 | 0.5 | WAFCT2019:03_007 | calculated | NOT FOUND | NOT FOUND | — | |
| cowpea_with_liquid | Cowpea with cooking liquid | 73 | 5.1 | 11.1 | 0.3 | WAFCT2019:03_089 | calculated | NOT FOUND | NOT FOUND | — | |
| cowpea_brown_boiled | Brown cowpea, boiled | 122 | 8.9 | 17.6 | 0.7 | WAFCT2019:03_028 | calculated | NOT FOUND | NOT FOUND | — | GH source |
| soya_bean_boiled | Soya bean (Ghana), boiled | 158 | 14.3 | 5.7 | 6.5 | WAFCT2019:03_040 | calculated | NOT FOUND | NOT FOUND | — | GH |
| bambara_boiled | Bambara beans (aboboi), boiled | 159 | 10.4 | 16.0 | 2.7 | WAFCT2019:03_019 | calculated | NOT FOUND | NOT FOUND | — | GH |
| koose | Koose | 253 | 12.6 | 27.7 | 8.9 | WAFCT2019:03_154 | proxy | NOT FOUND | NOT FOUND | — | Burkina fried cowpea pancake |
| bofrot | Bofrot / puff-puff | 426 | 5.2 | 50.8 | 22.9 | USDA:174992 | proxy | NOT FOUND | NOT FOUND | — | Cake doughnut; bofrot is yeast-raised |
| chin_chin | Chin chin | 479 | 6.2 | 64.9 | 21.2 | WAFCT2019:01_188 | proxy | NOT FOUND | NOT FOUND | — | Sweet biscuit; likely a floor |
| meat_pie | Meat pie | 220 | 7.25 | 22.0 | 11.4 | USDA:172093 | proxy | NOT FOUND | NOT FOUND | — | US pot pie; likely far too low |
| sausage_roll | Sausage roll | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| kulikuli | Kulikuli | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| coconut_toffee | Coconut toffee | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| nkatie_cake | Nkatie cake | 486.0 | n/r | n/r | n/r | AmoakoMensah2026:abstract | primary | NOT FOUND | NOT FOUND | — | GH lab; energy only |
| groundnuts_roasted | Groundnuts, dry-roasted | 587 | 24.4 | 21.3 | 49.7 | USDA:173806 | proxy | NOT FOUND | NOT FOUND | — | |
| groundnuts_raw_gh | Groundnuts (Ghana), dried, raw | 566 | 22.4 | 14.7 | 44.5 | WAFCT2019:06_025 | primary | NOT FOUND | NOT FOUND | — | GH |
| maize_boiled | Boiled corn (field maize) | 189 | 6.0 | 24.8 | 3.6 | WAFCT2019:04_108 | calculated | NOT FOUND | NOT FOUND | — | |
| maize_roasted | Roasted corn | 178 | 5.8 | 23.8 | 3.4 | WAFCT2019:04_076 | proxy | NOT FOUND | NOT FOUND | — | Raw fresh maize; likely a floor |
| tiger_nut_fresh | Tiger nuts (atadwe), fresh | 344 | 4.4 | 32.1 | 20.2 | WAFCT2019:02_024 | primary | NOT FOUND | NOT FOUND | — | GH2000 |
| tiger_nut_dried | Tiger nuts, dried | 467 | 4.8 | 48.5 | 25.6 | WAFCT2019:02_026 | primary | NOT FOUND | NOT FOUND | — | |
| coconut_mature | Coconut, mature, fresh | 383 | 3.3 | 5.0 | 36.8 | WAFCT2019:06_002 | primary | NOT FOUND | NOT FOUND | — | |
| coconut_immature | Coconut, immature | 147 | 1.5 | 6.1 | 12.2 | WAFCT2019:06_004 | primary | NOT FOUND | NOT FOUND | — | |
| pawpaw | Pawpaw, ripe | 59 | 0.4 | 13 | 0.1 | WAFCT2019:05_017 | primary | NOT FOUND | NOT FOUND | — | |
| pineapple | Pineapple | 53 | 0.4 | 11.4 | 0.2 | WAFCT2019:05_018 | primary | NOT FOUND | NOT FOUND | — | |
| mango_orange | Mango, orange flesh | 70 | 0.6 | 15.3 | 0.2 | WAFCT2019:05_015 | primary | NOT FOUND | NOT FOUND | — | |
| mango_deep_orange | Mango, deep orange flesh | 77 | 0.4 | 17.7 | 0.2 | WAFCT2019:05_036 | primary | NOT FOUND | NOT FOUND | — | |
| mango_pale | Mango, pale flesh | 52 | 0.9 | 10.7 | 0.2 | WAFCT2019:05_037 | primary | NOT FOUND | NOT FOUND | — | |
| orange | Orange | 44 | 0.7 | 8.7 | 0.4 | WAFCT2019:05_016 | primary | NOT FOUND | NOT FOUND | — | |
| banana_white | Banana, white flesh, ripe | 121 | 1.3 | 27.7 | 0.2 | WAFCT2019:05_003 | primary | NOT FOUND | NOT FOUND | — | Check vs 05_028 |
| banana_yellow | Banana, yellow flesh, ripe | 89 | 1.3 | 19.2 | 0.2 | WAFCT2019:05_028 | primary | NOT FOUND | NOT FOUND | — | |
| watermelon | Watermelon | 25 | 0.5 | 5 | 0.1 | WAFCT2019:05_022 | primary | NOT FOUND | NOT FOUND | — | |
| avocado | Avocado (pear) | 156 | 1.6 | 2.1 | 14.8 | WAFCT2019:05_002 | primary | NOT FOUND | NOT FOUND | — | |
| sugar_cane | Sugar cane | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| palm_wine | Palm wine (~3.8% abv) | 34 | 0.4 | 2.5 | 0.1 | WAFCT2019:12_006 | primary | NOT FOUND | NOT FOUND | — | |
| pito_sorghum | Pito, sorghum beer | 27 | 0.4 | 1.9 | 0 | WAFCT2019:12_004 | primary | NOT FOUND | NOT FOUND | — | GH1046 |
| pito_millet | Pito, millet beer | 43 | 0.7 | 5.7 | 0 | WAFCT2019:12_003 | primary | NOT FOUND | NOT FOUND | — | GH1046 |
| brukina | Brukina | 84 | 3.79 | 11.55 | 2.46 | KNUST-brukina | calculated | NOT FOUND | NOT FOUND | — | GH lab proximates; Atwater kcal |
| fula_zoomkom | Fula / zoomkom | 108 | 2.6 | 19.4 | 2.0 | WAFCT2019:01_176 | proxy | NOT FOUND | NOT FOUND | — | Burkina, with milk + sugar |
| sobolo | Sobolo | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | Model as recipe (sugar) |
| asaana | Asaana | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| ice_kenkey | Ice kenkey | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | Component 01_099 only |
| milo_with_milk | Milo with whole milk, no sugar | 108 | 3.6 | 13.4 | 4.4 | WAFCT2019:12_015 | proxy | NOT FOUND | NOT FOUND | — | Ovaltine beverage |
| milo_powder | Milo powder (Ghana pack) | 398 | n/r | n/r | n/r | Retailer label (Milo Ghana 400 g) | proxy | NOT FOUND | NOT FOUND | — | Third-party listing, LOW |
| evaporated_milk | Evaporated milk | 157 | 7.4 | 12.6 | 8.6 | WAFCT2019:10_016 | primary | NOT FOUND | NOT FOUND | — | |
| condensed_milk | Sweetened condensed milk | 329 | 7.5 | 55.6 | 8.5 | WAFCT2019:10_015 | primary | NOT FOUND | NOT FOUND | — | |
| milk_powder_whole | Whole milk powder | 493 | 25.8 | 37.3 | 26.8 | WAFCT2019:10_002 | primary | NOT FOUND | NOT FOUND | — | |
| tea_infusion | Tea, infusion | 0 | 0.1 | 0 | 0 | WAFCT2019:12_008 | primary | NOT FOUND | NOT FOUND | — | |
| yoghurt_sweetened | Yoghurt, sweetened (FanYogo proxy) | 83 | 3.5 | 14.0 | 1.4 | WAFCT2019:10_026 | proxy | NOT FOUND | NOT FOUND | — | |
| yoghurt_plain | Yoghurt, plain whole | 82 | 2.9 | 7.1 | 4.7 | WAFCT2019:10_005 | primary | NOT FOUND | NOT FOUND | — | |
| soy_milk | Soy milk, unfortified | 45 | 3.0 | 3.9 | 1.8 | WAFCT2019:12_025 | primary | NOT FOUND | NOT FOUND | — | GH sources |
| fanice_pouch | FanIce pouch, vanilla (per 100 ml) | 65 | 0.6 | 10.18 | 2.37 | Danone label PDF (search extraction) | proxy | 1 pouch | 145 ml | Danone "FANICE POUCH" label | Unverified, LOW |
| fanice_gh | FanIce (per 100 g) | 184 | n/r | 21.3 | 9.0 | Danone label PDF (search extraction) | proxy | NOT FOUND | NOT FOUND | — | Unverified, LOW |
| fanyogo_fanmaxx | FanYogo / Fanmaxx | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| malta_guinness | Malta Guinness (per 100 ml) | 58 | 0.3 | 14.0 | 0 | Retailer label (Tesco/Morrisons, Nigeria-made) | proxy | 1 can | 330 ml | Tesco listing | No Ghana label |
| beta_malt | Beta Malt | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| alvaro | Alvaro | NOT FOUND | | | | NOT FOUND | not found | NOT FOUND | NOT FOUND | — | |
| cola | Coca-Cola / carbonated soft drink | 40 | 0 | 9.9 | 0.1 | WAFCT2019:12_024 | primary | NOT FOUND | NOT FOUND | — | Protein "tr"; also Fanta proxy |
| cola_usda | Cola, regular | 42 | 0 | 10.4 | 0.25 | USDA:174852 | proxy | NOT FOUND | NOT FOUND | — | |
| lager | Club / Star lager (4.6% abv) | 41 | 0.3 | 3.7 | 0 | WAFCT2019:12_001 | proxy | NOT FOUND | NOT FOUND | — | European beer row |
| lager_usda | Beer, regular | 43 | 0.46 | 3.55 | 0 | USDA:168746 | proxy | NOT FOUND | NOT FOUND | — | |
| stout_strong | Strong beer / stout (>6%) | 61 | 0.2 | 4.9 | 0 | WAFCT2019:12_020 | primary | NOT FOUND | NOT FOUND | — | GH1063 |
| coconut_water | Coconut water | 22 | 0.2 | 4.2 | 0.5 | WAFCT2019:12_023 | primary | NOT FOUND | NOT FOUND | — | |
| orange_juice_fresh | Orange juice, fresh | 42 | 0.7 | 9.3 | 0.2 | WAFCT2019:12_011 | primary | NOT FOUND | NOT FOUND | — | |
| sugar_white | White sugar (add-on) | 400 | 0 | 100 | 0 | WAFCT2019:13_002 | primary | NOT FOUND | NOT FOUND | — | |
| palm_oil_red | Red palm oil (ingredient) | 898 | n/r | n/r | 99.8 | WAFCT2019:11_004 | primary | NOT FOUND | NOT FOUND | — | Oil-tier calculations |
| vegetable_oil | Vegetable oil (ingredient) | 900 | n/r | n/r | 100 | WAFCT2019:11_010 | primary | NOT FOUND | NOT FOUND | — | 11_031 fortified (Ghana) also 900 |
| groundnut_oil | Groundnut oil (ingredient) | 900 | n/r | n/r | n/r | WAFCT2019:11_003 | primary | NOT FOUND | NOT FOUND | — | |
| palm_fruit_raw | Oil palm fruit, raw (ingredient) | 540 | 1.9 | 12.9 | 52.6 | WAFCT2019:05_040 | primary | NOT FOUND | NOT FOUND | — | |
| groundnut_paste | Groundnut paste (ingredient) | 605 | 23.9 | 11.0 | 49.9 | WAFCT2019:06_026 | primary | NOT FOUND | NOT FOUND | — | |
| melon_seed_egusi | Melon seed (egusi), dried (ingredient) | 574 | 27.6 | 11.6 | 45.0 | WAFCT2019:06_013 | primary | NOT FOUND | NOT FOUND | — | |
| cocoyam_leaves_raw | Cocoyam leaves, raw (ingredient) | 39 | 3.5 | 2.4 | 0.7 | WAFCT2019:04_009 | primary | NOT FOUND | NOT FOUND | — | Boiled 04_097: 41 kcal |
| jute_mallow_boiled | Ayoyo leaves, boiled (ingredient) | 53 | 4.6 | 3.4 | 0.4 | WAFCT2019:04_107 | calculated | NOT FOUND | NOT FOUND | — | |
| okra_raw | Okra, raw (ingredient) | 34 | 1.7 | 4.2 | 0.2 | WAFCT2019:04_017 | primary | NOT FOUND | NOT FOUND | — | |
| garden_egg_boiled | Garden egg, boiled (ingredient) | 40 | n/r | n/r | n/r | WAFCT2019:04_104 | calculated | NOT FOUND | NOT FOUND | — | Raw 04_074: 32 kcal |
| tomato_raw | Tomato, raw (ingredient) | 22 | n/r | n/r | n/r | WAFCT2019:04_021 | primary | NOT FOUND | NOT FOUND | — | |
| tomato_paste | Tomato paste (ingredient) | 80 | n/r | n/r | n/r | WAFCT2019:04_066 | primary | NOT FOUND | NOT FOUND | — | |
| onion_boiled | Onion, boiled (ingredient) | 46 | n/r | n/r | n/r | WAFCT2019:04_112 | calculated | NOT FOUND | NOT FOUND | — | |
| chilli_fresh | Chilli pepper, fresh (ingredient) | 47 | n/r | n/r | n/r | WAFCT2019:04_046 | primary | NOT FOUND | NOT FOUND | — | |
| chilli_dried | Chilli pepper, dried (ingredient) | 347 | n/r | n/r | n/r | WAFCT2019:13_006 | primary | NOT FOUND | NOT FOUND | — | |
| cassava_flour | Cassava flour, white (kokonte flour) | 341 | 1.6 | 79.9 | 0.7 | WAFCT2019:02_004 | primary | NOT FOUND | NOT FOUND | — | GH sources |
| cassava_flour_fermented | Fermented cassava (fufu) flour | 346 | 2.1 | 80.9 | 0.7 | WAFCT2019:02_040 | primary | NOT FOUND | NOT FOUND | — | GH1064 |
| cassava_paste_fermented | Fermented cassava paste (Nigerian wet fufu) | 165 | 1.0 | 38.7 | 0.4 | WAFCT2019:02_041 | proxy | NOT FOUND | NOT FOUND | — | Not Ghanaian pounded fufu |
| maize_white_raw | Maize, white, whole, dry | 346 | 9.7 | 62.6 | 3.8 | WAFCT2019:01_004 | primary | NOT FOUND | NOT FOUND | — | GH |
| maize_decorticated_raw | Maize, white, decorticated, raw | 340 | 8.1 | 72.9 | 0.7 | WAFCT2019:01_094 | primary | NOT FOUND | NOT FOUND | — | GH2000 |
| millet_raw | Pearl millet, raw | 365 | 9.3 | 64.2 | 5.9 | WAFCT2019:01_017 | primary | NOT FOUND | NOT FOUND | — | GH2000 |
| rice_white_raw | Rice, white, raw | 351 | 6.8 | 78.6 | 0.6 | WAFCT2019:01_036 | primary | NOT FOUND | NOT FOUND | — | GH2000 |
| wheat_flour_fortified_gh | Wheat flour, fortified (Ghana) | 352 | 10.4 | 72.2 | 1.8 | WAFCT2019:01_087 | primary | NOT FOUND | NOT FOUND | — | |
| plantain_unripe_raw | Plantain, unripe, raw | 158 | 1.9 | 31.9 | 1.1 | WAFCT2019:02_045 | primary | NOT FOUND | NOT FOUND | — | GH1037 |
| cocoyam_raw | Cocoyam, white, raw | 136 | 3.3 | 28.9 | 0.3 | WAFCT2019:02_005 | primary | NOT FOUND | NOT FOUND | — | |
