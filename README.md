# 八星傳說：邪神復甦 · Eightfold Saga: Rise of the Evil God

A free-scenario RPG in the spirit of *Romancing SaGa* (復活邪神). Choose one of eight heroes and go anywhere: pub rumours open up the world, every battle can teach you something new, and how many Fate Stones you gather decides how strong the evil god will be. Play it in the browser, in Chinese or English, with keyboard, mouse or touch.

A thousand years ago, eight heroes sealed the evil god **Sorrax** using ten **Fate Stones**. Now his four apostles have woken, and the stones are scattered across the land.

## The eight heroes

Each hero has their own home town, prologue and starting weapons. The other seven can be met and recruited in their home towns.

| | | Home | Weapons / magic |
|---|---|---|---|
| 傑夫 Jeff | artificer | Ironhaven | gun, mace, fire |
| 艾琳 Erin | healer | Greenleaf | staff, bow, water |
| 喬許 Josh | squire | Sage Hollow | sword, spear |
| 賈斯柏 Jasper | little hunter | Sage Hollow | bow, thrown, wind |
| 莉亞 Lyra | dancer / exiled princess | Qasira | whip, dagger, spirit |
| 葛雷斯 Gareth | knight | Royal Aldoria | greatsword, spear |
| 千鶴 Chizuru | swordswoman | Kirisato | katana, bow |
| 莫羅 Morrow | scholar of forbidden lore | Frosthold | scythe, staff, dark, star |

There are also ten companions you can hire at guilds: a smith, a sister, a huntress, a monk, a mage, a corsair, a bard, a mercenary, a witch and a ninja.

## SaGa-style systems

- **15 weapon types**, 10 techniques each (150 in all): sword, greatsword, katana, rapier, dagger, axe, mace, spear, bow, martial arts, staff, whip, scythe, thrown and gun.
  - **Weapon proficiency (0–50)** rises as you use a weapon type, and it makes your attacks stronger.
- **Glimmering (閃現 💡).** A technique is never bought.
  - When you attack, or use a technique, you may suddenly glimmer a new one and use it right there.
  - Each technique grows from particular moves.
  - Harder techniques only glimmer against strong enemies and with enough proficiency.
- **8 magic schools** in four opposed pairs (fire↔water, wind↔earth, light↔dark, star↔spirit), 8 spells each (64 in all).
  - Learning one school locks out its opposite.
  - Tier 1–2 spells are bought at magic shops.
  - Higher spells are glimmered while casting.
- **HP, LP, WP and JP.**
  - HP comes back after every battle.
  - Being knocked out costs **LP**, and only inns restore it. A companion at 0 LP leaves to recover; the hero at 0 LP ends the journey.
  - **WP** pays for techniques and **JP** for spells; both refill only at inns.
- **No experience levels.** After a battle, max HP, stats, weapon and magic levels and max WP/JP may grow. They grow faster when the fight was hard.
- **Battle rank (戰鬥等級)** rises with every battle and brings stronger ranks of monsters. There are 15 families with 8 ranks each, 120 monsters in all. Monster symbols wander the dungeons and chase you.
- **The world:**
  - 15 towns (inn, shop, magic shop, pub, guild, quest givers).
  - 29 dungeons with 137 procedurally generated floors, plus chests and fixed treasure.
  - 30 bosses, including the four apostles and an optional superboss.
  - Sea routes that need a ship pass.
- **The ten Fate Stones** each raise the party's stats and take 7% off the evil god's life. The final battle is optional to prepare for; how hard it is depends on you.
- After the ending you can keep exploring.
- **Pixel Hoops-style chibi pixel art in lit HD-2D scenes, with a Romancing SaGa battle layout.** Monsters stand on the left and the party on the right in formation. Heroes are big-headed chibi sprites: flat colours with one shadow tone, round eyes with a glint, rosy cheeks, the weapon they hold, and poses for idle, attack, casting, hurt, defending, knocked out and victory. Monsters are painted pixel art (`js/ui/paintmon.js`): each of the 15 families (a slime, a wolf, a fluffy bumblebee, a man-eating flower, a skeleton, a ghost, a bandit, a lizardman, a fish-man, a round bird, an imp, a baby dragon, a mossy stone golem with a glowing rune heart, a flame spirit and a goblin) is built from round 3D-shaded shapes lit from the upper left, with violet shadows, warm highlights, shiny cartoon eyes and coloured outlines, recoloured per rank. Everything stands in soft dioramas with depth of field, light shafts, particles and bloom.

**How long it takes.** The balance simulation (`tools/sim.mjs`) plays the main path with auto-battling bots. That takes about 800 battles. With walking dungeons, towns, story, glimmer hunting and the optional Tower of Stars, a full playthrough is designed to take about **35–40 hours**.

## Controls

| | Keyboard | Touch |
|---|---|---|
| Move in dungeons | arrows / WASD | d-pad |
| Next line of dialogue | Enter / Space / Z, or click | tap |
| Menu | M / Esc | ☰ |
| Back | X / Esc | ✕ |

In battle, choose each member's command: attack (with either weapon), technique, spell, item, defend, flee or **auto**. **Auto ▶▶** lets the party fight on its own until the battle ends.

## Adding content (the game is data-driven)

All content lives in `js/data/` as plain objects with an `id`, registered through `add(table, list)` in `db.js`. To add more, either append entries to a file, or write a new file and import it in `js/data/index.js`. Then run `npm test`: `tools/validate.mjs` checks every reference.

| To add… | Edit | Notes |
|---|---|---|
| a weapon | `weapons.js` | `{ id, type, zh, en, tier, atk, price, bonus?, elem?, glim? }` |
| a technique | `techs.js` | `[id, '中文\|English', WP, power, difficulty, from[], target, hits, extra]`; `from` lists the moves it glimmers from (`'atk'` = a normal attack) |
| a spell | `magic.js` | `[id, name, tier, JP, kind, power, target, difficulty, from[], extra]`; tier 1–2 are sold, higher ones are glimmered |
| armour / accessory / item | `items.js` | slots: body, head, shield, acc; items: heal, wp, jp, lp, cure, revive, dmg… |
| a monster family | `enemies.js` | 8 rank names, stat factors, weaknesses, skills (with the rank they appear at); its art is a drawer in `js/ui/art.js` |
| a boss | `bosses.js` | tier, art, skills, minions, HP-triggered phases |
| a hero or companion | `chars.js` | stats, weapon/magic levels, gear, look (hair, clothes, extras) |
| a town / dungeon | `world.js` | map position, shops, guild, NPCs and rumours / floors, families, level, boss, treasure, Fate Stone |
| story and quests | `events.js` | scripts of steps: `say`, `choice`, `if`, `flag`, `give`, `gold`, `join`, `recruit`, `reveal`, `battle`, `fight`, `run`, `ending`… New step types go in `OPS` in `js/engine/events.js` |
| a pub rumour | `world.js` | text, places it reveals, an optional flag it needs |

## Development

Plain ES modules with no build step. Serve the folder and open `index.html`.

```
npm test    # validate.mjs (content references) + test.mjs (story, dungeons, battles, saves) + sim.mjs (balance)
```

- `js/engine/` holds the game logic with no DOM: state, battle (glimmers and growth), dungeon generation, and the event runner.
- `js/ui/` holds the screens: towns, world map, dungeon, battle, menu, dialogue, and the procedural art.
- Saves go to localStorage and sync to the Pixel Playground cloud saves.
