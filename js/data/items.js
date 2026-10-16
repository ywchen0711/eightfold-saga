// Armour, accessories, consumables and key items.
// armour slots: body | head | shield | acc.  def = defence, mdef = magic defence, ev = evasion % (shields),
// bonus = stats, res = { element: multiplier }, immune = [statuses], special = flags used by the battle code
import { add, N } from './db.js';

const tiers = (slot, names, def, mdef, price, extra = () => ({})) => names.split(',').map((nm, i) => ({ id: `${slot}${extra.prefix || ''}${i + 1}`, slot, ...N(nm), tier: i + 1, def: def[i], mdef: mdef[i], price: price[i], ...extra(i) }));

add('armor', [
  ...tiers('body', '布衣|Cloth Tunic,皮甲|Leather Armor,鎖子甲|Chain Mail,鱗甲|Scale Mail,板甲|Plate Armor,秘銀鎧|Mithril Mail,龍鱗鎧|Dragon Mail,聖騎士鎧|Paladin Armor,星辰之鎧|Astral Armor',
    [4, 8, 13, 19, 26, 34, 43, 53, 64], [1, 2, 3, 5, 7, 9, 12, 15, 20], [60, 180, 450, 1000, 2200, 4600, 9000, 0, 0], (i) => ({ heavy: i >= 3, ...(i >= 3 ? { bonus: { agi: -1 } } : {}) })),
  ...['法袍|Robe,絲綢法衣|Silk Robe,賢者之袍|Sage\'s Robe,大魔導袍|Archmage Robe,星辰法衣|Astral Vestment'].flatMap((s) => s.split(',').map((nm, i) => ({
    id: `robe${i + 1}`, slot: 'body', ...N(nm), tier: i * 2 + 1, def: [3, 7, 12, 18, 26][i], mdef: [5, 10, 16, 23, 32][i], price: [120, 700, 2400, 6800, 0][i], bonus: { int: i + 1, wil: i + 1 } }))),
  ...tiers('head', '皮帽|Leather Cap,鐵盔|Iron Helm,鋼盔|Steel Helm,秘銀盔|Mithril Helm,龍盔|Dragon Helm,星冠|Star Crown',
    [2, 4, 7, 10, 14, 19], [1, 2, 3, 5, 7, 10], [50, 200, 600, 1600, 4000, 0]),
  ...tiers('shield', '木盾|Wooden Shield,鐵盾|Iron Shield,騎士盾|Knight Shield,秘銀盾|Mithril Shield,龍盾|Dragon Shield,鏡之盾|Mirror Shield',
    [2, 4, 6, 9, 12, 15], [1, 2, 4, 6, 8, 14], [70, 260, 700, 1800, 4400, 0], (i) => ({ ev: [6, 9, 12, 15, 18, 22][i] })),
  // accessories
  { id: 'ring_power', slot: 'acc', ...N('力量之戒|Power Ring'), def: 0, mdef: 0, price: 800, bonus: { str: 4 } },
  { id: 'ring_skill', slot: 'acc', ...N('技巧之戒|Skill Ring'), def: 0, mdef: 0, price: 800, bonus: { dex: 4 } },
  { id: 'ring_speed', slot: 'acc', ...N('疾風之戒|Swift Ring'), def: 0, mdef: 0, price: 900, bonus: { agi: 4 } },
  { id: 'ring_mind', slot: 'acc', ...N('智慧之戒|Sage Ring'), def: 0, mdef: 2, price: 900, bonus: { int: 4 } },
  { id: 'ring_will', slot: 'acc', ...N('意志之戒|Will Ring'), def: 0, mdef: 3, price: 900, bonus: { wil: 4 } },
  { id: 'amulet_life', slot: 'acc', ...N('生命護符|Life Amulet'), def: 1, mdef: 1, price: 2400, bonus: { con: 5 }, special: { hp: 60 } },
  { id: 'amulet_poison', slot: 'acc', ...N('解毒護符|Antivenom Charm'), def: 0, mdef: 1, price: 600, immune: ['poison'] },
  { id: 'amulet_mind', slot: 'acc', ...N('清醒護符|Clarity Charm'), def: 0, mdef: 2, price: 1400, immune: ['sleep', 'confuse'] },
  { id: 'amulet_body', slot: 'acc', ...N('不動護符|Steadfast Charm'), def: 1, mdef: 1, price: 1600, immune: ['stun', 'paralyze'] },
  { id: 'goggles', slot: 'acc', ...N('護目鏡|Goggles'), def: 1, mdef: 0, price: 500, immune: ['blind'] },
  { id: 'charm_fire', slot: 'acc', ...N('火鼠之皮|Salamander Hide'), def: 2, mdef: 2, price: 1800, res: { fire: 0.5 } },
  { id: 'charm_water', slot: 'acc', ...N('人魚之鱗|Mermaid Scale'), def: 2, mdef: 2, price: 1800, res: { water: 0.5 } },
  { id: 'charm_wind', slot: 'acc', ...N('風之羽|Wind Feather'), def: 1, mdef: 2, price: 1800, res: { wind: 0.5 } },
  { id: 'charm_earth', slot: 'acc', ...N('大地之石|Earthstone'), def: 3, mdef: 1, price: 1800, res: { earth: 0.5 } },
  { id: 'charm_dark', slot: 'acc', ...N('聖印|Holy Sigil'), def: 1, mdef: 4, price: 3200, res: { dark: 0.5 } },
  { id: 'charm_light', slot: 'acc', ...N('影之紗|Veil of Shadow'), def: 1, mdef: 4, price: 3200, res: { light: 0.5 } },
  { id: 'glimmer_band', slot: 'acc', ...N('靈光頭帶|Glimmer Band'), def: 0, mdef: 1, price: 0, special: { glim: 1.4 } },
  { id: 'sage_stone', slot: 'acc', ...N('賢者之石|Philosopher\'s Stone'), def: 2, mdef: 6, price: 0, special: { glimMag: 1.4 }, bonus: { int: 3, wil: 3 } },
  { id: 'hero_medal', slot: 'acc', ...N('勇者勳章|Hero\'s Medal'), def: 3, mdef: 3, price: 0, bonus: { str: 3, dex: 3, agi: 3, int: 3, wil: 3, con: 3 } },
  { id: 'regen_ring', slot: 'acc', ...N('再生之戒|Regen Ring'), def: 1, mdef: 1, price: 0, special: { regen: 4 } },
]);

// consumables: heal = HP, wp / jp / lp restore, cure = statuses removed, revive = HP share, dmg = item attacks
add('items', [
  { id: 'potion', ...N('傷藥|Salve'), kind: 'use', price: 30, heal: 120, target: 'ally' },
  { id: 'hipotion', ...N('高級傷藥|Greater Salve'), kind: 'use', price: 140, heal: 420, target: 'ally' },
  { id: 'elixir', ...N('仙丹|Elixir'), kind: 'use', price: 1200, heal: 9999, wp: 99, jp: 99, target: 'ally' },
  { id: 'herb_all', ...N('萬能藥草|Healing Herbs'), kind: 'use', price: 260, heal: 200, target: 'allies' },
  { id: 'ether', ...N('精力藥|Vigor Tonic'), kind: 'use', price: 260, wp: 12, target: 'ally' },
  { id: 'manawater', ...N('魔力之水|Mana Water'), kind: 'use', price: 300, jp: 12, target: 'ally' },
  { id: 'lifewater', ...N('生命之水|Water of Life'), kind: 'use', price: 1500, lp: 2, target: 'ally', field: 1 },
  { id: 'feather', ...N('復活之羽|Phoenix Feather'), kind: 'use', price: 600, revive: 0.3, target: 'ally' },
  { id: 'antidote', ...N('解毒草|Antidote'), kind: 'use', price: 20, cure: ['poison'], target: 'ally' },
  { id: 'smelling', ...N('醒神香|Smelling Salts'), kind: 'use', price: 40, cure: ['sleep', 'stun', 'confuse', 'paralyze'], target: 'ally' },
  { id: 'eyedrop', ...N('明目水|Eye Drops'), kind: 'use', price: 25, cure: ['blind'], target: 'ally' },
  { id: 'panacea', ...N('萬靈藥|Panacea'), kind: 'use', price: 180, cure: ['poison', 'sleep', 'stun', 'confuse', 'paralyze', 'blind'], target: 'ally' },
  { id: 'bomb', ...N('炸彈|Bomb'), kind: 'use', price: 120, dmg: 90, elem: 'fire', target: 'all', battle: 1 },
  { id: 'holywater', ...N('聖水|Holy Water'), kind: 'use', price: 90, dmg: 140, elem: 'light', target: 'one', battle: 1, undead: 3 },
  { id: 'smoke', ...N('煙霧彈|Smoke Bomb'), kind: 'use', price: 80, flee: 1, battle: 1 },
  { id: 'tent', ...N('帳篷|Tent'), kind: 'use', price: 400, camp: 1, field: 1 },
  // key items (quests)
  { id: 'k_letter', ...N('國王的密函|King\'s Letter'), kind: 'key' },
  { id: 'k_gear', ...N('古代齒輪|Ancient Gear'), kind: 'key' },
  { id: 'k_dew', ...N('妖精之露|Faerie Dew'), kind: 'key' },
  { id: 'k_fang', ...N('白狼之牙|White Wolf Fang'), kind: 'key' },
  { id: 'k_map', ...N('古代地圖|Ancient Map'), kind: 'key' },
  { id: 'k_ticket', ...N('船票|Ship Pass'), kind: 'key' },
  { id: 'k_seal', ...N('沙之印|Sand Seal'), kind: 'key' },
  { id: 'k_bell', ...N('鎮魂之鈴|Requiem Bell'), kind: 'key' },
  { id: 'k_ice', ...N('永凍之心|Frozen Heart'), kind: 'key' },
  { id: 'k_pearl', ...N('海龍之珠|Sea Dragon Pearl'), kind: 'key' },
  { id: 'k_wing', ...N('天馬之羽|Pegasus Plume'), kind: 'key' },
  { id: 'k_key', ...N('虛空之鑰|Key of the Void'), kind: 'key' },
  { id: 'k_herb', ...N('月光草|Moonpetal'), kind: 'key' },
  { id: 'k_badge', ...N('傭兵徽章|Mercenary Badge'), kind: 'key' },
  { id: 'k_tome', ...N('禁忌之書|Forbidden Tome'), kind: 'key' },
  { id: 'k_crown', ...N('沙漠王冠|Desert Crown'), kind: 'key' },
]);
