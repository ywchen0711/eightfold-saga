// Enemy families, their 8 ranks, and enemy skills. An enemy is "family + rank": its stats come from the rank
// tables times the family's factors, its art from the family drawer in art.js tinted per rank.
// Which rank you meet is set by the battle rank (戰鬥等級), which rises with every battle, plus the dungeon's level.
import { add, N, DB } from './db.js';

// enemy skills: kind phys | mag | heal | buff | debuff | status | drain; pow is x the enemy's attack
const SK = [
  ['tackle', '撞擊|Tackle', 'phys', 1.0, 'one'], ['bite', '撕咬|Bite', 'phys', 1.1, 'one'], ['claw', '利爪|Claw', 'phys', 1.2, 'one'],
  ['slash', '斬擊|Slash', 'phys', 1.2, 'one'], ['bash', '重擊|Heavy Blow', 'phys', 1.5, 'one', { st: 'stun', p: 0.2 }],
  ['acid', '酸液|Acid', 'phys', 0.9, 'one', { defDown: 1 }], ['poisonspit', '毒液|Venom Spit', 'phys', 0.9, 'one', { st: 'poison', p: 0.6 }],
  ['sting', '毒針|Sting', 'phys', 1.1, 'one', { st: 'poison', p: 0.5 }], ['web', '蛛網|Web', 'status', 0, 'all', { st: 'paralyze', p: 0.35 }],
  ['spores', '孢子|Spores', 'status', 0, 'all', { st: 'sleep', p: 0.35 }], ['vine', '藤鞭|Vine Lash', 'phys', 1.0, 'all'],
  ['drainroot', '吸根|Root Drain', 'drain', 1.3, 'one'], ['howl', '咆哮|Howl', 'buff', 0, 'self', { buff: { atk: 1 } }],
  ['firebreath', '火焰吐息|Fire Breath', 'mag', 1.2, 'all', { elem: 'fire' }], ['icebreath', '冰之吐息|Frost Breath', 'mag', 1.2, 'all', { elem: 'water' }],
  ['thunder', '雷擊|Thunderbolt', 'mag', 1.5, 'one', { elem: 'wind' }], ['quake', '地震|Quake', 'mag', 1.1, 'all', { elem: 'earth' }],
  ['curse', '詛咒|Curse', 'debuff', 0, 'one', { debuff: { atk: 1, def: 1 } }], ['lifedrain', '吸取生命|Life Drain', 'drain', 1.2, 'one', { elem: 'dark' }],
  ['touch', '冰冷之觸|Chill Touch', 'mag', 1.1, 'one', { elem: 'dark', st: 'paralyze', p: 0.2 }], ['scream', '尖嘯|Wail', 'status', 0, 'all', { st: 'confuse', p: 0.3 }],
  ['darkbolt', '暗黑彈|Dark Bolt', 'mag', 1.4, 'one', { elem: 'dark' }], ['nightmare', '惡夢|Nightmare', 'status', 0, 'all', { st: 'sleep', p: 0.45 }],
  ['steal', '偷竊|Pilfer', 'phys', 0.8, 'one', { steal: 1 }], ['doublecut', '二段斬|Double Cut', 'phys', 1.6, 'one'],
  ['fireball', '火球|Fireball', 'mag', 1.4, 'one', { elem: 'fire' }], ['heal', '治療|Heal', 'heal', 1.5, 'ally'],
  ['charge', '突擊|Charge', 'phys', 1.8, 'one'], ['whirl', '迴旋斬|Whirlwind', 'phys', 1.1, 'all'], ['petrify', '石化凝視|Stone Gaze', 'status', 0, 'one', { st: 'paralyze', p: 0.6 }],
  ['constrict', '纏繞|Constrict', 'phys', 1.3, 'one', { st: 'paralyze', p: 0.3 }], ['tailwhip', '尾擊|Tail Sweep', 'phys', 1.1, 'all'],
  ['bubble', '泡沫|Bubbles', 'mag', 1.0, 'all', { elem: 'water' }], ['tidal', '海嘯|Tidal Surge', 'mag', 1.6, 'all', { elem: 'water' }],
  ['shock', '電擊|Shock', 'mag', 1.3, 'one', { elem: 'wind', st: 'stun', p: 0.25 }], ['song', '魅惑之歌|Siren Song', 'status', 0, 'all', { st: 'confuse', p: 0.35 }],
  ['dive', '俯衝|Dive', 'phys', 1.4, 'one'], ['gale', '暴風|Gale', 'mag', 1.2, 'all', { elem: 'wind' }],
  ['hellfire', '地獄火|Hellfire', 'mag', 1.7, 'all', { elem: 'fire' }], ['charm', '魅惑|Charm', 'status', 0, 'one', { st: 'confuse', p: 0.6 }],
  ['darkwave', '暗之波動|Dark Wave', 'mag', 1.5, 'all', { elem: 'dark' }], ['meteor', '隕石|Meteor', 'mag', 2.0, 'all', { elem: 'earth' }],
  ['dragonclaw', '龍爪|Dragon Claw', 'phys', 1.6, 'one'], ['roar', '龍吼|Dragon Roar', 'status', 0, 'all', { st: 'stun', p: 0.3 }],
  ['laser', '雷射|Laser', 'mag', 1.8, 'one', { elem: 'light' }], ['missile', '飛彈|Missiles', 'phys', 1.2, 'all'],
  ['repair', '修復|Self-repair', 'heal', 1.2, 'self'], ['flare', '烈焰|Flare', 'mag', 1.6, 'one', { elem: 'fire' }],
  ['frost', '冰雪|Frost', 'mag', 1.6, 'one', { elem: 'water' }], ['zephyr', '風刃|Zephyr', 'mag', 1.6, 'one', { elem: 'wind' }],
  ['stone', '岩石|Rockfall', 'mag', 1.6, 'one', { elem: 'earth' }], ['radiance', '光輝|Radiance', 'mag', 1.4, 'all', { elem: 'light' }],
  ['shadow', '暗影|Shadow', 'mag', 1.4, 'all', { elem: 'dark' }], ['trick', '惡作劇|Prank', 'status', 0, 'one', { st: 'blind', p: 0.6 }],
  ['foxfire', '狐火|Foxfire', 'mag', 1.3, 'all', { elem: 'fire' }], ['illusion', '幻術|Illusion', 'status', 0, 'all', { st: 'confuse', p: 0.35 }],
  ['starfall', '星落|Starfall', 'mag', 1.8, 'all', { elem: 'star' }], ['mindblast', '精神衝擊|Psychic Blast', 'mag', 1.6, 'one', { elem: 'spirit' }],
  ['split', '分裂|Split', 'special', 0, 'self'], ['guard', '防禦|Guard', 'buff', 0, 'self', { buff: { def: 2 } }],
];
add('eskills', SK.map(([id, name, kind, pow, target, extra]) => ({ id, ...N(name), kind, pow, target, ...(extra || {}) })));

// rank tables (index = rank - 1)
export const RANK = {
  hp: [55, 120, 230, 400, 650, 1000, 1500, 2200], atk: [12, 20, 30, 42, 56, 72, 90, 110], def: [2, 5, 9, 14, 20, 27, 35, 44],
  agi: [6, 9, 12, 15, 18, 21, 24, 28], gold: [10, 22, 40, 70, 110, 170, 250, 360],
};
// families: art drawer, factors, weaknesses (res: <1 resists, >1 weak, 0 immune), skills [id, from rank]
const F = [
  { id: 'ooze', name: '軟體|Oozes', art: 'ooze', hue: 110, f: { hp: 1.1, atk: 0.8, def: 0.7, agi: 0.7, int: 0.6 }, res: { fire: 1.5, blunt: 0.5 },
    names: '史萊姆|Slime,果凍怪|Jelly,毒泥|Toxic Ooze,酸液怪|Acid Blob,黑泥|Black Pudding,寶石史萊姆|Gem Slime,魔性之泥|Bewitched Ooze,混沌之泥|Chaos Ooze',
    skills: [['tackle', 1], ['acid', 2], ['poisonspit', 3], ['split', 5], ['darkwave', 8]] },
  { id: 'beast', name: '野獸|Beasts', art: 'beast', hue: 30, f: { hp: 1.0, atk: 1.1, def: 0.9, agi: 1.2, int: 0.5 }, res: { fire: 1.3 },
    names: '野狼|Wolf,劍齒虎|Sabertooth,地獄犬|Hellhound,雙頭犬|Orthros,冰狼|Frost Wolf,奇美拉|Chimera,魔狼|Dire Wolf,芬里爾|Fenrir',
    skills: [['bite', 1], ['claw', 2], ['howl', 3], ['firebreath', 3], ['icebreath', 5], ['charge', 6]] },
  { id: 'insect', name: '昆蟲|Insects', art: 'insect', hue: 60, f: { hp: 0.8, atk: 1.0, def: 1.1, agi: 1.2, int: 0.5 }, res: { fire: 1.5, wind: 1.3, earth: 0.6 },
    names: '巨蟻|Giant Ant,殺人蜂|Killer Bee,大蜘蛛|Giant Spider,毒蛾|Venom Moth,毒蠍|Scorpion,甲蟲武士|Beetle Knight,螳螂劍士|Mantis Blade,蟲后|Hive Queen',
    skills: [['bite', 1], ['sting', 2], ['web', 3], ['spores', 4], ['doublecut', 6], ['heal', 8]] },
  { id: 'plant', name: '植物|Plants', art: 'plant', hue: 140, f: { hp: 1.3, atk: 0.9, def: 0.9, agi: 0.6, int: 0.9 }, res: { fire: 1.6, water: 0.5, earth: 0.6 },
    names: '食人花|Man-eater,毒蘑菇|Toadstool,藤蔓怪|Vine Lurker,樹精|Treant,曼陀羅|Mandragora,腐化之樹|Blighted Elm,花之魔女|Flower Witch,世界樹之影|Worldtree Shade',
    skills: [['vine', 1], ['spores', 2], ['drainroot', 3], ['poisonspit', 4], ['heal', 5], ['quake', 7]] },
  { id: 'undead', name: '不死|Undead', art: 'undead', hue: 50, undead: 1, f: { hp: 1.1, atk: 1.0, def: 1.0, agi: 0.8, int: 0.8 }, res: { light: 2, fire: 1.4, dark: 0, pierce: 0.6 },
    names: '骷髏|Skeleton,殭屍|Zombie,食屍鬼|Ghoul,骷髏騎士|Bone Knight,木乃伊|Mummy,死靈法師|Necromancer,死亡騎士|Death Knight,骨龍|Bone Dragon',
    skills: [['slash', 1], ['bite', 2], ['touch', 3], ['curse', 4], ['darkbolt', 5], ['lifedrain', 6], ['darkwave', 8]] },
  { id: 'ghost', name: '靈體|Spirits', art: 'ghost', hue: 220, undead: 1, f: { hp: 0.8, atk: 0.8, def: 0.6, agi: 1.1, int: 1.3 }, res: { light: 2, slash: 0.5, pierce: 0.5, blunt: 0.6, dark: 0 },
    names: '鬼火|Will-o\'-wisp,幽靈|Ghost,怨靈|Wraith,女妖|Banshee,幻影|Phantom,夢魘|Nightmare,冥界使者|Grim Envoy,魂之王|Soul King',
    skills: [['touch', 1], ['scream', 2], ['darkbolt', 3], ['lifedrain', 4], ['nightmare', 5], ['darkwave', 7]] },
  { id: 'human', name: '人類|Humans', art: 'human', hue: 0, f: { hp: 1.0, atk: 1.1, def: 1.1, agi: 1.0, int: 1.0 }, res: {},
    names: '盜賊|Bandit,山賊頭目|Brigand,傭兵|Sellsword,暗殺者|Assassin,黑騎士|Black Knight,魔導士|Warlock,狂戰士|Berserker,劍聖|Sword Saint',
    skills: [['slash', 1], ['steal', 1], ['doublecut', 3], ['fireball', 4], ['heal', 5], ['whirl', 6], ['charge', 7]] },
  { id: 'reptile', name: '爬蟲|Reptiles', art: 'reptile', hue: 90, f: { hp: 1.2, atk: 1.1, def: 1.2, agi: 0.9, int: 0.7 }, res: { water: 1.3, earth: 0.7 },
    names: '蜥蜴人|Lizardman,大蛇|Great Serpent,鱷魚戰士|Crocodilian,蛇髮女妖|Gorgon,石化蜥蜴|Basilisk,九頭蛇|Hydra,蛇王|Naga King,世界之蛇|World Serpent',
    skills: [['bite', 1], ['constrict', 2], ['tailwhip', 3], ['petrify', 4], ['poisonspit', 5], ['firebreath', 6]] },
  { id: 'aquatic', name: '水棲|Sea Folk', art: 'aquatic', hue: 190, f: { hp: 1.1, atk: 1.0, def: 1.1, agi: 0.9, int: 1.0 }, res: { wind: 1.6, water: 0, fire: 0.6 },
    names: '巨蟹|Giant Crab,半魚人|Merman,電鰻|Shock Eel,大烏賊|Giant Squid,海妖|Siren,鯊魚人|Sharkman,海蛇|Sea Serpent,利維坦|Leviathan',
    skills: [['claw', 1], ['bubble', 2], ['shock', 3], ['constrict', 4], ['song', 5], ['tidal', 6]] },
  { id: 'bird', name: '飛行|Flyers', art: 'bird', hue: 280, fly: 1, f: { hp: 0.8, atk: 1.0, def: 0.8, agi: 1.5, int: 0.8 }, res: { earth: 0, pierce: 1.4, wind: 0.6 },
    names: '大蝙蝠|Giant Bat,鷹身女妖|Harpy,巨鷹|Great Eagle,雷鳥|Thunderbird,獅鷲|Griffin,火鳥|Firebird,大鵬|Roc,迦樓羅|Garuda',
    skills: [['bite', 1], ['dive', 2], ['gale', 3], ['thunder', 4], ['firebreath', 6], ['gale', 7]] },
  { id: 'demon', name: '惡魔|Demons', art: 'demon', hue: 330, f: { hp: 1.1, atk: 1.1, def: 1.0, agi: 1.1, int: 1.3 }, res: { light: 1.6, dark: 0.3, fire: 0.7 },
    names: '小惡魔|Imp,石像鬼|Gargoyle,夢魔|Succubus,惡魔|Fiend,炎魔|Balrog,魔將|Archfiend,深淵魔|Abyss Lord,魔王|Demon King',
    skills: [['claw', 1], ['fireball', 2], ['charm', 3], ['darkbolt', 4], ['hellfire', 5], ['darkwave', 6], ['meteor', 8]] },
  { id: 'dragon', name: '龍族|Dragons', art: 'dragon', hue: 0, f: { hp: 1.5, atk: 1.3, def: 1.3, agi: 1.0, int: 1.1 }, res: { star: 1.4 },
    names: '飛龍|Wyvern,幼龍|Drake,火龍|Fire Dragon,冰龍|Ice Dragon,雷龍|Storm Dragon,黑龍|Black Dragon,古龍|Elder Dragon,龍王|Dragon King',
    skills: [['bite', 1], ['dragonclaw', 2], ['firebreath', 3], ['icebreath', 4], ['thunder', 5], ['roar', 5], ['meteor', 7]] },
  { id: 'construct', name: '機械|Constructs', art: 'construct', hue: 200, immune: ['poison', 'sleep', 'confuse'], f: { hp: 1.3, atk: 1.1, def: 1.6, agi: 0.6, int: 0.7 }, res: { wind: 1.5, blunt: 1.3, slash: 0.7, pierce: 0.7, dark: 0.5 },
    names: '木偶|Puppet,石像|Stone Golem,鐵像|Iron Golem,機械兵|Automaton,符文魔像|Rune Golem,水晶魔像|Crystal Golem,古代兵器|Ancient Weapon,機神|Machine God',
    skills: [['bash', 1], ['guard', 2], ['laser', 4], ['missile', 5], ['repair', 6], ['quake', 7]] },
  { id: 'elemental', name: '精靈|Elementals', art: 'elemental', hue: 15, perRankHue: [15, 210, 140, 35, 55, 190, 50, 270], f: { hp: 0.9, atk: 0.8, def: 0.8, agi: 1.1, int: 1.5 }, res: { slash: 0.7, pierce: 0.7 },
    elemByRank: ['fire', 'water', 'wind', 'earth', 'wind', 'water', 'light', 'dark'],
    names: '火精|Fire Sprite,水精|Undine,風精|Sylph,土精|Gnome,雷精|Spark,冰精|Frost Spirit,光精|Lumen,暗精|Shade',
    skills: [['tackle', 1], ['elem', 1], ['elem', 4], ['heal', 5]] },
  { id: 'fae', name: '妖精|Fae', art: 'fae', hue: 300, f: { hp: 0.9, atk: 0.9, def: 0.8, agi: 1.4, int: 1.2 }, res: { dark: 1.3 },
    names: '小妖精|Pixie,哥布林|Goblin,狐妖|Kitsune,哥布林王|Goblin King,樹妖|Dryad,天狗|Tengu,九尾|Nine-Tails,妖精王|Oberon',
    skills: [['tackle', 1], ['trick', 1], ['steal', 2], ['foxfire', 3], ['illusion', 4], ['gale', 6], ['starfall', 8]] },
];
const ELEM_SKILL = { fire: 'flare', water: 'frost', wind: 'zephyr', earth: 'stone', light: 'radiance', dark: 'shadow' };
add('families', F.map((f) => ({ ...f, ...N(f.name) })));
const enemies = [];
for (const f of F) f.names.split(',').forEach((nm, i) => {
  const r = i + 1, k = f.f, el = f.elemByRank ? f.elemByRank[i] : null;
  const skills = f.skills.filter(([, from]) => from <= r).map(([s]) => (s === 'elem' ? ELEM_SKILL[el] : s));
  const res = { ...f.res }; if (el) { res[el] = 0; const opp = { fire: 'water', water: 'fire', wind: 'earth', earth: 'wind', light: 'dark', dark: 'light' }[el]; res[opp] = 1.6; }
  enemies.push({ id: `${f.id}${r}`, family: f.id, rank: r, ...N(nm), hp: Math.round(RANK.hp[i] * k.hp), atk: Math.round(RANK.atk[i] * k.atk), def: Math.round(RANK.def[i] * k.def),
    agi: Math.round(RANK.agi[i] * k.agi), int: Math.round(RANK.atk[i] * k.int), gold: RANK.gold[i], skills, res, undead: !!f.undead, fly: !!f.fly, immune: f.immune || [],
    hue: f.perRankHue ? f.perRankHue[i] : (f.hue + i * 37) % 360, elem: el, size: 0.8 + i * 0.06 });
});
add('enemies', enemies);
export const familyOf = (id) => DB.families[DB.enemies[id].family];
