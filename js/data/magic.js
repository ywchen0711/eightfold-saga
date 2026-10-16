// The eight schools of magic, in four opposed pairs: a hero who learns fire can never learn water, and so on.
// Tier 1-2 spells are sold in magic shops. Higher spells are glimmered while casting spells of the same school
// (`from`), like weapon techniques. Also the status effects.
//
// [id, '中文|English', tier, JP, kind, power, target, diff, from, extra]
// kind: dmg | heal | revive | cure | buff | debuff | status | drain | special
// target: one | all (enemies), ally | allies, self
// extra: st/p (status), buff/debuff: { atk, def, mag, agi } stages, regen, barrier, lp (restores LP), wp (restores WP)
import { add, N } from './db.js';

add('schools', [
  { id: 'fire', ...N('火術|Fire'), opp: 'water', col: '#ff6a3a', icon: '🔥' },
  { id: 'water', ...N('水術|Water'), opp: 'fire', col: '#4a9aff', icon: '💧' },
  { id: 'wind', ...N('風術|Wind'), opp: 'earth', col: '#7adf9a', icon: '🌪' },
  { id: 'earth', ...N('地術|Earth'), opp: 'wind', col: '#c89a5a', icon: '⛰' },
  { id: 'light', ...N('光術|Light'), opp: 'dark', col: '#fff0a0', icon: '✨' },
  { id: 'dark', ...N('闇術|Dark'), opp: 'light', col: '#a06ae8', icon: '🌑' },
  { id: 'star', ...N('星術|Star'), opp: 'spirit', col: '#9ad8ff', icon: '⭐' },
  { id: 'spirit', ...N('靈術|Spirit'), opp: 'star', col: '#ff9ad8', icon: '👁' },
]);

const S = {
  fire: [
    ['fi_bolt', '火球|Fireball', 1, 3, 'dmg', 1.6, 'one', 0, []],
    ['fi_wall', '火焰壁|Flame Wall', 2, 5, 'buff', 0, 'allies', 0, [], { buff: { def: 1 }, counterFire: 1 }],
    ['fi_burst', '爆炎|Fire Burst', 3, 6, 'dmg', 1.4, 'all', 10, ['fi_bolt']],
    ['fi_rage', '戰意|Battle Fury', 4, 6, 'buff', 0, 'allies', 15, ['fi_wall'], { buff: { atk: 1 } }],
    ['fi_lance', '火焰槍|Flame Lance', 5, 9, 'dmg', 3.2, 'one', 21, ['fi_bolt', 'fi_burst']],
    ['fi_phoenix', '不死鳥|Phoenix', 6, 14, 'revive', 0.5, 'allies', 28, ['fi_rage']],
    ['fi_inferno', '煉獄|Inferno', 7, 14, 'dmg', 2.6, 'all', 35, ['fi_burst', 'fi_lance']],
    ['fi_sun', '太陽|Supernova', 8, 22, 'dmg', 4.0, 'all', 44, ['fi_inferno']],
  ],
  water: [
    ['wa_heal', '治癒之水|Healing Water', 1, 3, 'heal', 1.4, 'ally', 0, []],
    ['wa_ice', '冰柱|Ice Spike', 2, 4, 'dmg', 1.6, 'one', 0, []],
    ['wa_rain', '慈雨|Gentle Rain', 3, 7, 'heal', 1.0, 'allies', 10, ['wa_heal']],
    ['wa_cure', '淨化|Purify', 4, 4, 'cure', 0, 'allies', 14, ['wa_heal']],
    ['wa_blizzard', '暴風雪|Blizzard', 5, 9, 'dmg', 1.6, 'all', 20, ['wa_ice'], { st: 'paralyze', p: 0.15 }],
    ['wa_life', '生命之泉|Font of Life', 6, 12, 'heal', 2.0, 'allies', 27, ['wa_rain'], { regen: 3 }],
    ['wa_tide', '大海嘯|Tidal Wave', 7, 15, 'dmg', 2.8, 'all', 35, ['wa_blizzard']],
    ['wa_revive', '復甦之水|Water of Rebirth', 8, 18, 'revive', 1.0, 'allies', 43, ['wa_life', 'wa_cure'], { lp: 1 }],
  ],
  wind: [
    ['wi_cut', '風刃|Wind Cutter', 1, 3, 'dmg', 1.4, 'one', 0, []],
    ['wi_haste', '疾風|Haste', 2, 4, 'buff', 0, 'ally', 0, [], { buff: { agi: 2 } }],
    ['wi_gust', '旋風|Whirlwind', 3, 6, 'dmg', 1.3, 'all', 10, ['wi_cut']],
    ['wi_bolt', '落雷|Lightning', 4, 7, 'dmg', 2.4, 'one', 15, ['wi_cut'], { st: 'stun', p: 0.3 }],
    ['wi_flight', '風之翼|Wings of Wind', 5, 8, 'buff', 0, 'allies', 20, ['wi_haste'], { buff: { agi: 1, def: 1 } }],
    ['wi_storm', '雷暴|Thunderstorm', 6, 12, 'dmg', 2.2, 'all', 27, ['wi_gust', 'wi_bolt']],
    ['wi_vacuum', '真空斬|Vacuum Blade', 7, 13, 'dmg', 3.8, 'one', 34, ['wi_bolt'], { ign: 1 }],
    ['wi_tempest', '天空之怒|Tempest', 8, 20, 'dmg', 3.4, 'all', 43, ['wi_storm']],
  ],
  earth: [
    ['ea_stone', '石礫|Stone Shot', 1, 3, 'dmg', 1.5, 'one', 0, []],
    ['ea_skin', '石膚|Stoneskin', 2, 4, 'buff', 0, 'ally', 0, [], { buff: { def: 2 } }],
    ['ea_quake', '地震|Earthquake', 3, 7, 'dmg', 1.4, 'all', 11, ['ea_stone']],
    ['ea_root', '縛根|Binding Roots', 4, 5, 'status', 0, 'all', 15, ['ea_skin'], { st: 'paralyze', p: 0.5 }],
    ['ea_wall', '大地之盾|Earth Ward', 5, 9, 'buff', 0, 'allies', 21, ['ea_skin'], { buff: { def: 2 } }],
    ['ea_drain', '大地吸取|Earth Drain', 6, 10, 'drain', 2.4, 'one', 27, ['ea_quake', 'ea_root']],
    ['ea_meteor', '隕石|Meteor', 7, 15, 'dmg', 2.9, 'all', 35, ['ea_quake']],
    ['ea_gaia', '蓋亞之怒|Gaia\'s Wrath', 8, 20, 'dmg', 4.4, 'one', 43, ['ea_meteor', 'ea_drain'], { ign: 1 }],
  ],
  light: [
    ['li_heal', '治癒之光|Healing Light', 1, 4, 'heal', 1.6, 'ally', 0, []],
    ['li_ray', '聖光|Holy Ray', 2, 4, 'dmg', 1.5, 'one', 0, [], { undead: 2 }],
    ['li_bless', '祝福|Blessing', 3, 6, 'buff', 0, 'allies', 10, ['li_heal'], { buff: { mag: 1, def: 1 } }],
    ['li_cure', '神聖淨化|Sanctify', 4, 5, 'cure', 0, 'allies', 14, ['li_heal']],
    ['li_judge', '神之審判|Judgment', 5, 9, 'dmg', 1.8, 'all', 20, ['li_ray'], { undead: 2 }],
    ['li_revive', '復活|Resurrection', 6, 12, 'revive', 0.6, 'ally', 26, ['li_cure', 'li_bless'], { lp: 1 }],
    ['li_heal2', '天使之光|Angel\'s Light', 7, 14, 'heal', 2.6, 'allies', 34, ['li_heal', 'li_bless']],
    ['li_star', '聖星|Holy Nova', 8, 22, 'dmg', 3.8, 'all', 44, ['li_judge']],
  ],
  dark: [
    ['dk_bolt', '暗黑彈|Shadow Bolt', 1, 3, 'dmg', 1.6, 'one', 0, []],
    ['dk_fear', '恐懼|Terror', 2, 4, 'debuff', 0, 'all', 0, [], { debuff: { atk: 1 } }],
    ['dk_drain', '吸血|Vampiric Touch', 3, 6, 'drain', 1.8, 'one', 10, ['dk_bolt']],
    ['dk_sleep', '永眠|Slumber', 4, 6, 'status', 0, 'all', 15, ['dk_fear'], { st: 'sleep', p: 0.55 }],
    ['dk_curse', '詛咒|Hex', 5, 8, 'debuff', 0, 'one', 20, ['dk_fear'], { debuff: { def: 2, mag: 1 } }],
    ['dk_void', '虛無|Void', 6, 12, 'dmg', 2.3, 'all', 27, ['dk_bolt', 'dk_drain']],
    ['dk_death', '死之宣告|Death Knell', 7, 14, 'dmg', 4.2, 'one', 35, ['dk_curse', 'dk_drain'], { drain: 0.2 }],
    ['dk_abyss', '深淵|Abyss', 8, 22, 'dmg', 3.6, 'all', 44, ['dk_void']],
  ],
  star: [
    ['sr_spark', '星光|Starlight', 1, 3, 'dmg', 1.5, 'one', 0, []],
    ['sr_guide', '星之導引|Star Guidance', 2, 4, 'buff', 0, 'allies', 0, [], { buff: { agi: 1 }, acc: 1 }],
    ['sr_shower', '流星雨|Meteor Shower', 3, 7, 'dmg', 1.3, 'all', 11, ['sr_spark']],
    ['sr_mind', '星之心|Star Mind', 4, 5, 'special', 0, 'allies', 15, ['sr_guide'], { wp: 4 }],
    ['sr_gravity', '重力|Gravity', 5, 9, 'dmg', 0.25, 'one', 21, ['sr_shower'], { pct: 1 }],
    ['sr_aurora', '極光|Aurora', 6, 12, 'heal', 1.8, 'allies', 27, ['sr_mind'], { cure: 1 }],
    ['sr_nova', '超新星|Star Nova', 7, 15, 'dmg', 3.0, 'all', 36, ['sr_shower', 'sr_gravity']],
    ['sr_galaxy', '銀河|Galaxy', 8, 24, 'dmg', 4.2, 'all', 45, ['sr_nova']],
  ],
  spirit: [
    ['sp_mind', '心靈衝擊|Mind Blast', 1, 3, 'dmg', 1.5, 'one', 0, [], { st: 'confuse', p: 0.15 }],
    ['sp_charm', '魅惑|Bewitch', 2, 4, 'status', 0, 'one', 0, [], { st: 'confuse', p: 0.6 }],
    ['sp_illusion', '幻影|Mirage', 3, 6, 'buff', 0, 'allies', 10, ['sp_charm'], { buff: { agi: 1 }, evade: 1 }],
    ['sp_soul', '靈魂之火|Soul Fire', 4, 7, 'dmg', 1.5, 'all', 15, ['sp_mind']],
    ['sp_inspire', '激勵|Inspire', 5, 8, 'special', 0, 'allies', 21, ['sp_illusion'], { wp: 6, buff: { atk: 1 } }],
    ['sp_nightmare', '惡夢|Nightmare', 6, 11, 'status', 0, 'all', 27, ['sp_charm', 'sp_soul'], { st: 'sleep', p: 0.6, dmg: 1.0 }],
    ['sp_scream', '靈魂吶喊|Soul Scream', 7, 14, 'dmg', 2.8, 'all', 35, ['sp_soul']],
    ['sp_ascend', '昇華|Ascension', 8, 20, 'special', 0, 'allies', 44, ['sp_inspire', 'sp_nightmare'], { wp: 10, jp: 6, buff: { atk: 1, mag: 1 } }],
  ],
};
const PRICE = [0, 300, 900];
const list = [];
for (const [school, spells] of Object.entries(S)) spells.forEach(([id, name, tier, jp, kind, pow, target, diff, from, extra]) =>
  list.push({ id, school, ...N(name), tier, jp, kind, pow, target, diff, from, ...(extra || {}), price: PRICE[tier] || 0 }));
add('spells', list);

add('statuses', [
  { id: 'poison', ...N('中毒|Poison'), col: '#7adf5a', turns: 6 },
  { id: 'stun', ...N('昏迷|Stun'), col: '#ffe060', turns: 1 },
  { id: 'sleep', ...N('睡眠|Sleep'), col: '#9ab0ff', turns: 3 },
  { id: 'paralyze', ...N('麻痺|Paralysis'), col: '#ffd040', turns: 2 },
  { id: 'blind', ...N('盲目|Blind'), col: '#888888', turns: 4 },
  { id: 'confuse', ...N('混亂|Confusion'), col: '#ff8ad8', turns: 3 },
]);
