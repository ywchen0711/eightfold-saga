// The 15 weapon types and their weapons. A type sets which stats drive damage and its damage kind
// (slash / pierce / blunt). Each type has 8 tiers of ordinary weapons and one legendary weapon.
import { add, N } from './db.js';

// id, name, main stat, second stat, damage kind, power factor, icon
const TYPES = [
  ['sword', '劍|Sword', 'str', 'dex', 'slash', 1.0, '⚔'],
  ['greatsword', '大劍|Greatsword', 'str', 'con', 'slash', 1.25, '🗡'],
  ['katana', '刀|Katana', 'dex', 'str', 'slash', 1.05, '刀'],
  ['rapier', '細劍|Rapier', 'dex', 'agi', 'pierce', 0.9, '🤺'],
  ['dagger', '短劍|Dagger', 'agi', 'dex', 'pierce', 0.75, '🔪'],
  ['axe', '斧|Axe', 'str', 'str', 'slash', 1.15, '🪓'],
  ['mace', '棍棒|Mace', 'str', 'wil', 'blunt', 1.1, '🔨'],
  ['spear', '槍|Spear', 'str', 'dex', 'pierce', 1.05, '🔱'],
  ['bow', '弓|Bow', 'dex', 'agi', 'pierce', 0.95, '🏹'],
  ['fist', '體術|Martial Arts', 'str', 'agi', 'blunt', 0.85, '👊'],
  ['staff', '杖|Staff', 'int', 'wil', 'blunt', 0.7, '🪄'],
  ['whip', '鞭|Whip', 'dex', 'agi', 'slash', 0.85, '〰'],
  ['scythe', '鐮刀|Scythe', 'str', 'int', 'slash', 1.1, '☽'],
  ['thrown', '投擲|Thrown', 'dex', 'agi', 'pierce', 0.8, '✦'],
  ['gun', '銃|Gun', 'dex', 'dex', 'pierce', 1.0, '🔫'],
];
add('weaponTypes', TYPES.map(([id, name, a, b, dmg, k, icon], i) => ({ id, ...N(name), a, b, dmg, k, icon, order: i })));

// ordinary weapons: 8 tiers per type (tier 8 is only found, never sold)
const TIER_ATK = [8, 14, 22, 32, 44, 58, 74, 92], TIER_PRICE = [80, 220, 520, 1200, 2600, 5200, 9800, 0];
const NAMES = {
  sword: '青銅劍|Bronze Sword,鐵劍|Iron Sword,鋼劍|Steel Sword,騎士劍|Knight Sword,秘銀劍|Mithril Sword,符文劍|Rune Sword,龍牙劍|Dragonfang,星光劍|Starlight Blade',
  greatsword: '雙手劍|Two-hander,闊刃大劍|Broadblade,鋼鐵大劍|Steel Greatsword,斬馬刀|Zanbato,巨人之劍|Giant\'s Blade,符文大劍|Rune Greatsword,屠龍大劍|Dragonslayer,天裂之劍|Skyrender',
  katana: '脇差|Wakizashi,打刀|Uchigatana,太刀|Tachi,野太刀|Nodachi,菊一文字|Kiku-ichimonji,虎徹|Kotetsu,村雨|Murasame,天叢雲|Murakumo',
  rapier: '細劍|Rapier,刺劍|Estoc,決鬥細劍|Duelist,銀之刺劍|Silver Estoc,薔薇細劍|Rose Rapier,疾風細劍|Gale Rapier,月光細劍|Moonlight Rapier,星辰刺劍|Astral Estoc',
  dagger: '小刀|Knife,匕首|Dagger,波刃匕首|Kris,盜賊匕首|Thief\'s Dagger,秘銀匕首|Mithril Dagger,毒蛇之牙|Viper Fang,暗殺者之刃|Assassin\'s Edge,影縫|Shadowstitch',
  axe: '手斧|Hand Axe,戰斧|Battle Axe,鋼鐵斧|Steel Axe,巨斧|Great Axe,雙刃斧|Labrys,狂戰士之斧|Berserker Axe,雷神之斧|Thunder Axe,世界樹之斧|Worldtree Axe',
  mace: '木棍|Cudgel,鐵鎚|Iron Hammer,釘頭錘|Morning Star,戰鎚|War Hammer,聖鎚|Holy Mace,巨人之鎚|Giant Maul,雷霆之鎚|Thunder Maul,星隕之鎚|Starfall Hammer',
  spear: '長槍|Spear,鐵槍|Iron Spear,騎士長槍|Lance,三叉戟|Trident,戟|Halberd,龍騎士之槍|Dragoon Lance,貫星槍|Starpiercer,天之槍|Heaven\'s Spear',
  bow: '短弓|Short Bow,長弓|Long Bow,複合弓|Composite Bow,獵人之弓|Hunter\'s Bow,精靈之弓|Elven Bow,疾風之弓|Gale Bow,月之弓|Moon Bow,星辰弓|Star Bow',
  fist: '皮拳套|Leather Wraps,鐵拳套|Iron Knuckles,虎爪|Tiger Claws,鋼鐵拳套|Steel Gauntlets,龍爪|Dragon Claws,修羅拳套|Asura Fists,聖拳|Holy Fists,星之拳|Star Fists',
  staff: '木杖|Wooden Staff,橡木杖|Oak Staff,法師之杖|Mage Staff,水晶杖|Crystal Staff,賢者之杖|Sage\'s Staff,古樹之杖|Elder Staff,大魔導杖|Archmage Staff,星辰之杖|Astral Staff',
  whip: '皮鞭|Leather Whip,鎖鏈鞭|Chain Whip,荊棘鞭|Thorn Whip,蛇骨鞭|Snakebone Whip,女王之鞭|Queen\'s Whip,雷光鞭|Lightning Whip,龍鱗鞭|Dragonscale Whip,星河鞭|Milky Way',
  scythe: '草鐮|Sickle,鐮刀|Scythe,鐵鐮|Iron Scythe,收割者|Reaper,月牙鐮|Crescent Scythe,死神之鐮|Death\'s Scythe,冥府之鐮|Hades Scythe,靈魂收割者|Soul Harvester',
  thrown: '飛刀|Throwing Knives,手裏劍|Shuriken,迴力鏢|Boomerang,戰輪|Chakram,風魔手裏劍|Fuma Shuriken,流星錘|Meteor Hammer,月輪|Moon Disc,星屑|Stardust',
  gun: '火繩槍|Matchlock,燧發槍|Flintlock,短銃|Pistol,來福槍|Rifle,連發銃|Repeater,魔導銃|Arcane Gun,龍息銃|Dragon\'s Breath,星辰砲|Star Cannon',
};
const list = [];
for (const [type, s] of Object.entries(NAMES)) {
  const k = TYPES.find((x) => x[0] === type)[5];
  s.split(',').forEach((nm, i) => list.push({ id: `${type}${i + 1}`, type, ...N(nm), tier: i + 1, atk: Math.round(TIER_ATK[i] * (0.8 + 0.2 * k) * (type === 'gun' ? 1.15 : 1)), price: TIER_PRICE[i] }));
}
add('weapons', list);

// legendary weapons: from bosses and quests. bonus: stats, `glim` (better glimmer odds), `elem` (adds an element)
add('weapons', [
  { id: 'lumina', type: 'sword', ...N('光之聖劍|Lumina'), tier: 9, atk: 118, price: 0, bonus: { wil: 5 }, elem: 'light', glim: 1.3 },
  { id: 'titanedge', type: 'greatsword', ...N('巨神之劍|Titan\'s Edge'), tier: 9, atk: 140, price: 0, bonus: { str: 6 } },
  { id: 'onikiri', type: 'katana', ...N('鬼切|Onikiri'), tier: 9, atk: 124, price: 0, bonus: { dex: 6 }, glim: 1.2 },
  { id: 'titania', type: 'rapier', ...N('精靈女王之刺|Titania\'s Thorn'), tier: 9, atk: 108, price: 0, bonus: { agi: 6 }, elem: 'wind' },
  { id: 'nightedge', type: 'dagger', ...N('暗夜之刃|Night Edge'), tier: 9, atk: 96, price: 0, bonus: { agi: 8 }, elem: 'dark' },
  { id: 'earthrage', type: 'axe', ...N('大地之怒|Earthrage'), tier: 9, atk: 134, price: 0, bonus: { str: 5, con: 3 }, elem: 'earth' },
  { id: 'judgment', type: 'mace', ...N('審判之鎚|Judgment'), tier: 9, atk: 126, price: 0, bonus: { wil: 6 }, elem: 'light' },
  { id: 'dragongod', type: 'spear', ...N('龍神之槍|Dragon God Spear'), tier: 9, atk: 128, price: 0, bonus: { str: 4, dex: 4 } },
  { id: 'heavenbow', type: 'bow', ...N('天弓|Heavenbow'), tier: 9, atk: 116, price: 0, bonus: { dex: 7 }, glim: 1.2 },
  { id: 'dragonfists', type: 'fist', ...N('神龍拳|Divine Dragon Fists'), tier: 9, atk: 104, price: 0, bonus: { str: 4, agi: 4 }, glim: 1.3 },
  { id: 'fatestaff', type: 'staff', ...N('命運之杖|Staff of Fate'), tier: 9, atk: 84, price: 0, bonus: { int: 10, wil: 5 } },
  { id: 'hydralash', type: 'whip', ...N('九頭蛇之鞭|Hydra Lash'), tier: 9, atk: 104, price: 0, bonus: { dex: 5 }, elem: 'water' },
  { id: 'endbringer', type: 'scythe', ...N('終焉之鐮|Endbringer'), tier: 9, atk: 130, price: 0, bonus: { int: 5 }, elem: 'dark' },
  { id: 'shootingstar', type: 'thrown', ...N('流星|Shooting Star'), tier: 9, atk: 102, price: 0, bonus: { dex: 6 }, elem: 'star' },
  { id: 'genesis', type: 'gun', ...N('創世之砲|Genesis'), tier: 9, atk: 136, price: 0, bonus: { dex: 6 }, elem: 'fire' },
]);
