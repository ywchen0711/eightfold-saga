// The content registry. Every piece of content (weapon, technique, spell, item, enemy, boss, place, event...) is a plain
// object with an `id`, added to one table here by the files in this folder. To add content, add entries to a data
// file (or a new file imported from index.js); tools/validate.mjs checks that every reference points at something real.
export const DB = {
  weaponTypes: {}, // the 15 weapon types
  weapons: {},     // weapon items
  armor: {},       // body armour, helms, shields, accessories
  items: {},       // consumables and key items
  techs: {},       // weapon techniques (glimmered in battle)
  schools: {},     // the 8 magic schools
  spells: {},      // spells (bought, or glimmered in battle)
  statuses: {},    // poison, stun, sleep...
  families: {},    // enemy families: art, weaknesses, skills
  enemies: {},     // enemies: one per family and rank
  eskills: {},     // enemy skills
  bosses: {},      // bosses
  chars: {},       // the eight heroes and the recruits
  locations: {},   // towns, dungeons and special places on the world map
  dungeons: {},    // dungeon layouts: floors, monsters, treasure, boss
  events: {},      // story and quest scripts
  rumors: {},      // pub rumours that reveal places and quests
  stones: {},      // the ten Fate Stones
};
export function add(kind, list) {
  if (!DB[kind]) throw new Error('unknown table ' + kind);
  for (const o of list) {
    if (!o || !o.id) throw new Error(`${kind}: entry without id`);
    if (DB[kind][o.id]) throw new Error(`${kind}: duplicate id ${o.id}`);
    DB[kind][o.id] = o;
  }
  return list;
}
// "中文|English" -> { zh, en }
export const N = (s) => { const [zh, en] = s.split('|'); return { zh, en: en ?? zh }; };
