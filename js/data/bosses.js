// Bosses. Stats come from the tier tables (tier 1-9) times `k`, and grow with the battle rank like everything else.
// art: an enemy family drawer (or 'god'), drawn big with its own hue. minions: enemy ids that fight beside it.
// phases: at a share of HP left, the boss says something and gains skills (and can change hue).
import { add, N } from './db.js';

export const BOSS_TIER = {
  hp: [520, 950, 1600, 2500, 3700, 5300, 7600, 11000, 16000], atk: [16, 25, 37, 51, 67, 82, 96, 112, 130],
  def: [3, 6, 10, 16, 23, 31, 40, 50, 62], agi: [8, 11, 14, 17, 20, 23, 26, 30, 34], gold: [150, 300, 500, 800, 1200, 1700, 2400, 3300, 5000],
};
const IMMUNE = ['sleep', 'confuse', 'paralyze'];
const B = (id, name, tier, art, hue, skills, o = {}) => ({ id, ...N(name), tier, art, hue, skills, immune: IMMUNE, size: 1.7, k: {}, res: {}, ...o });
add('bosses', [
  B('b_alphawolf', '白狼王|Alpha Wolf', 1, 'beast', 210, ['bite', 'claw', 'howl', 'charge'], { minions: ['beast1'], k: { hp: 0.9 }, res: { fire: 1.3 }, drop: ['ring_skill'] }),
  B('b_banditking', '山賊王|Bandit King', 1, 'human', 20, ['slash', 'doublecut', 'steal', 'whirl'], { minions: ['human1', 'human1'], drop: ['hipotion', 'hipotion'] }),
  B('b_sewerking', '下水道之王|King of the Sewers', 1, 'ooze', 80, ['acid', 'poisonspit', 'tackle', 'split'], { k: { hp: 1.2 }, res: { fire: 1.5, blunt: 0.5 }, size: 2 }),
  B('b_blightroot', '枯朽之根|Blightroot', 1, 'plant', 60, ['vine', 'spores', 'drainroot', 'poisonspit'], { res: { fire: 1.6, water: 0.5 } }),
  B('b_minegolem', '礦坑魔像|Mine Golem', 1, 'construct', 30, ['bash', 'quake', 'guard'], { k: { hp: 1.3, def: 1.4, agi: 0.6 }, res: { wind: 1.5, blunt: 1.3, slash: 0.7 } }),
  B('b_guardian', '遺跡守護者|Ruin Guardian', 2, 'construct', 170, ['bash', 'laser', 'guard', 'quake'], { k: { def: 1.4 }, res: { wind: 1.5, slash: 0.7, pierce: 0.7 } }),
  B('b_marshhydra', '沼澤九頭蛇|Marsh Hydra', 2, 'reptile', 100, ['bite', 'poisonspit', 'tailwhip', 'constrict'], { k: { hp: 1.2 } }),
  B('b_siren', '燈塔海妖|Siren of the Lighthouse', 2, 'aquatic', 300, ['song', 'bubble', 'shock', 'tidal'], { res: { wind: 1.6, water: 0 } }),
  B('b_icewyrm', '冰之白龍|Ice Wyrm', 2, 'dragon', 195, ['icebreath', 'bite', 'roar', 'frost'], { res: { fire: 1.5, water: 0 } }),
  B('b_faeriequeen', '迷惘的妖精女王|Lost Faerie Queen', 3, 'fae', 320, ['illusion', 'trick', 'gale', 'heal', 'starfall'], { k: { atk: 0.9 }, drop: ['k_dew'] }),
  B('b_steamtitan', '蒸汽巨人|Steam Titan', 3, 'construct', 15, ['missile', 'laser', 'repair', 'bash'], { k: { hp: 1.2, def: 1.3 }, res: { wind: 1.5, water: 1.3, fire: 0.5 } }),
  B('b_sphinx', '獅身人面獸|Sphinx', 3, 'beast', 45, ['claw', 'mindblast', 'roar', 'meteor'], { res: { earth: 0.5 } }),
  B('b_ghostcaptain', '幽靈船長|Ghost Captain', 3, 'ghost', 170, ['darkbolt', 'lifedrain', 'scream', 'tidal'], { undead: 1, res: { light: 2, slash: 0.6, pierce: 0.6, dark: 0 } }),
  B('b_pharaoh', '古代王|The Pharaoh', 4, 'undead', 45, ['curse', 'darkwave', 'lifedrain', 'petrify'], { undead: 1, res: { light: 2, fire: 1.3, dark: 0 }, minions: ['undead4'],
    phases: [{ at: 0.5, say: '我的王國……不會消失！|My kingdom... shall not fade!', add: ['meteor'] }] }),
  B('b_sandworm', '沙蟲|Sandworm', 4, 'insect', 35, ['bite', 'quake', 'constrict', 'acid'], { k: { hp: 1.3 }, res: { earth: 0, water: 1.5 }, size: 2.1 }),
  B('b_onilord', '鬼王|Oni Lord', 4, 'demon', 0, ['bash', 'hellfire', 'roar', 'whirl'], { minions: ['fae4', 'fae4'], res: { light: 1.5 } }),
  B('b_pirateking', '海盜王|Pirate King', 4, 'human', 210, ['doublecut', 'missile', 'whirl', 'steal'], { minions: ['human3', 'aquatic3'] }),
  B('b_frostgeneral', '冰牙將軍|Icefang General', 5, 'undead', 190, ['whirl', 'frost', 'icebreath', 'curse'], { undead: 1, res: { fire: 1.5, water: 0, light: 1.6 }, minions: ['undead5', 'undead5'] }),
  B('b_seadragon', '海龍|Sea Dragon', 5, 'dragon', 200, ['tidal', 'shock', 'bite', 'roar'], { res: { water: 0, wind: 1.5 } }),
  B('b_forgegolem', '熔爐巨像|Forge Colossus', 5, 'construct', 10, ['flare', 'hellfire', 'bash', 'repair'], { k: { hp: 1.3, def: 1.3 }, res: { fire: 0, water: 1.6 } }),
  B('b_eldertreant', '古樹之王|King of the Elderwood', 5, 'plant', 100, ['quake', 'drainroot', 'spores', 'heal'], { k: { hp: 1.4 }, res: { fire: 1.6, earth: 0, water: 0 } }),
  B('b_firedragon', '火龍伊格尼斯|Ignis the Fire Dragon', 6, 'dragon', 5, ['firebreath', 'hellfire', 'dragonclaw', 'roar'], { res: { fire: 0, water: 1.5 }, size: 2.1,
    phases: [{ at: 0.4, say: '渺小的人類，竟敢……！|Puny mortals, how dare you...!', add: ['meteor'] }] }),
  B('b_skyguardian', '天空守護者|Guardian of the Sky', 6, 'construct', 50, ['laser', 'gale', 'missile', 'radiance'], { k: { def: 1.3 }, res: { earth: 0, wind: 0.5 } }),
  // the four apostles of the evil god
  B('b_morvane', '腐朽之王 莫凡|Morvane, the Rotting King', 5, 'undead', 280, ['darkwave', 'lifedrain', 'curse', 'nightmare'], { undead: 1, apostle: 1, k: { hp: 1.4 }, res: { light: 1.8, dark: 0, fire: 1.3 }, minions: ['ghost5', 'undead6'],
    phases: [{ at: 0.5, say: '邪神大人……賜我力量……！|Lord Sorrax... grant me strength...!', add: ['meteor', 'lifedrain'], hue: 300 }] }),
  B('b_ishtra', '深淵魔女 伊絲特拉|Ishtra, Witch of the Abyss', 6, 'fae', 200, ['tidal', 'illusion', 'charm', 'mindblast', 'frost'], { apostle: 1, k: { hp: 1.3, atk: 0.9 }, res: { water: 0, wind: 1.4 },
    phases: [{ at: 0.5, say: '鏡中的你，才是真正的你。|The one in the mirror is the real you.', add: ['nightmare', 'darkwave'], hue: 260 }] }),
  B('b_gorrak', '鐵血將軍 葛拉克|Gorrak, the Iron General', 6, 'human', 350, ['charge', 'whirl', 'doublecut', 'roar', 'guard'], { apostle: 1, k: { hp: 1.5, def: 1.3 }, minions: ['human6', 'human5'],
    phases: [{ at: 0.4, say: '全軍，突擊！|All forces, charge!', add: ['missile', 'hellfire'] }] }),
  B('b_nyx', '星蝕者 尼克絲|Nyx, the Eclipse', 7, 'demon', 250, ['starfall', 'darkwave', 'meteor', 'mindblast'], { apostle: 1, k: { hp: 1.4 }, res: { star: 0, light: 1.5, dark: 0.3 },
    phases: [{ at: 0.5, say: '星光將永遠熄滅。|The stars shall go out forever.', add: ['nightmare', 'hellfire'], hue: 220 }] }),
  // optional: the star god at the top of the Tower of Stars
  B('b_astra', '星神阿斯特拉|Astra, God of Stars', 9, 'god', 190, ['starfall', 'radiance', 'meteor', 'heal', 'mindblast'], { k: { hp: 1.2 }, res: { star: 0 }, immune: ['sleep', 'confuse', 'paralyze', 'stun', 'poison', 'blind'], size: 2.2, drop: ['elixir', 'elixir'] }),
  // the evil god. Each Fate Stone you hold takes 7% off its life and attack.
  B('b_sorrax', '邪神索拉克斯|Sorrax, the Evil God', 9, 'god', 300, ['darkwave', 'meteor', 'hellfire', 'curse', 'mindblast'], { final: 1, k: { hp: 1.5 }, res: { dark: 0, light: 1.3 },
    immune: ['sleep', 'confuse', 'paralyze', 'stun', 'poison', 'blind'], size: 2.3,
    phases: [{ at: 0.66, say: '千年的封印……就由你們來為我解開吧。|A thousand years sealed... and you shall be the ones to break it.', add: ['starfall', 'nightmare'], hue: 330 },
      { at: 0.33, say: '這個世界，本來就屬於虛無！|This world has always belonged to the Void!', add: ['tidal', 'roar'], hue: 0, buff: { atk: 1 } }] }),
]);
