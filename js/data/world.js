// The world map: towns, dungeons and their places on the map, shops, guilds, pub rumours, and the ten Fate Stones.
// Coordinates are on a 960 x 540 map. A place appears on the map once it is known (rumours and events reveal it).
// `sea: 1` places need the Ship Pass (k_ticket) to travel to.
import { add, N } from './db.js';

// ---------------------------------------------------------------- towns
// shop: weapon types and tiers [from, to], armour tiers, items; magic: schools sold; guild: companions for hire
const town = (id, name, x, y, o) => ({ id, ...N(name), x, y, kind: 'town', ...o });
add('locations', [
  town('aldoria', '王都阿爾多利亞|Royal Aldoria', 480, 240, { style: 'castle', inn: 40, region: 'aldoria',
    shop: { types: ['sword', 'greatsword', 'spear', 'mace', 'bow', 'rapier'], tiers: [1, 4], armor: [1, 4], items: ['potion', 'hipotion', 'antidote', 'smelling', 'eyedrop', 'feather', 'tent'] },
    magic: ['light', 'star'], guild: ['kaz', 'agnes'], npcs: [['國王|The King', 'king'], ['騎士團長|Knight Commander', 'commander']], rumors: ['r_tomb', 'r_sewer', 'r_whitepoplar', 'r_ironhaven', 'r_frost'] }),
  town('whitepoplar', '白楊鎮|Whitepoplar', 380, 300, { style: 'village', inn: 20, region: 'aldoria',
    shop: { types: ['sword', 'axe', 'bow', 'dagger', 'fist'], tiers: [1, 3], armor: [1, 3], items: ['potion', 'antidote', 'eyedrop', 'smelling', 'bomb'] },
    magic: ['wind'], guild: ['elio'], npcs: [['村長|Village Elder', 'q_bandits']], rumors: ['r_bandit', 'r_sage', 'r_riverton'] }),
  town('sagehollow', '賢者谷|Sage Hollow', 280, 380, { style: 'village', inn: 15, region: 'sage',
    shop: { types: ['sword', 'bow', 'thrown', 'spear', 'dagger'], tiers: [1, 2], armor: [1, 2], items: ['potion', 'antidote', 'eyedrop'] },
    magic: ['wind'], guild: [], npcs: [['老賢者|The Old Sage', 'sage_elder']], rumors: ['r_wolfcave', 'r_canyon', 'r_whitepoplar'] }),
  town('greenleaf', '翠葉村|Greenleaf', 170, 230, { style: 'forest', inn: 15, region: 'green',
    shop: { types: ['staff', 'bow', 'whip', 'dagger'], tiers: [1, 3], armor: [1, 3], items: ['potion', 'antidote', 'herb_all', 'eyedrop', 'smelling'] },
    magic: ['water', 'earth'], guild: ['tova'], npcs: [['長老|Elder Willow', 'q_spring']], rumors: ['r_mistwood', 'r_portwind', 'r_spring'] }),
  town('riverton', '河畔鎮|Riverton', 390, 180, { style: 'village', inn: 25, region: 'aldoria',
    shop: { types: ['spear', 'axe', 'mace', 'thrown', 'gun'], tiers: [2, 4], armor: [2, 4], items: ['potion', 'hipotion', 'antidote', 'panacea', 'bomb', 'holywater'] },
    magic: ['earth'], guild: [], npcs: [['漁夫|Fisherman', 'q_marsh']], rumors: ['r_marsh', 'r_skyruins_hint'] }),
  town('portwind', '風見港|Portwind', 90, 380, { style: 'port', inn: 30, region: 'green',
    shop: { types: ['rapier', 'thrown', 'gun', 'dagger', 'whip'], tiers: [2, 4], armor: [2, 4], items: ['potion', 'hipotion', 'ether', 'antidote', 'smoke', 'tent'] },
    magic: ['wind', 'water'], guild: [], npcs: [['燈塔守|Lighthouse Keeper', 'q_lighthouse']], rumors: ['r_lighthouse', 'r_coral', 'r_ticket'] }),
  town('ironhaven', '鋼都|Ironhaven', 640, 220, { style: 'industrial', inn: 35, region: 'iron',
    shop: { types: ['gun', 'axe', 'mace', 'greatsword', 'thrown', 'fist'], tiers: [1, 5], armor: [1, 5], items: ['potion', 'hipotion', 'ether', 'bomb', 'smoke', 'antidote', 'tent'] },
    magic: ['fire', 'earth'], guild: ['bram', 'quill'], npcs: [['工會長|Guildmaster', 'q_factory']], rumors: ['r_mine', 'r_factory', 'r_dwarf', 'r_aldoria'] }),
  town('frosthold', '霜堡修道院|Frosthold Abbey', 500, 70, { style: 'snow', inn: 30, region: 'north',
    shop: { types: ['staff', 'scythe', 'mace', 'spear', 'axe'], tiers: [2, 5], armor: [2, 5], items: ['potion', 'hipotion', 'manawater', 'panacea', 'holywater'] },
    magic: ['dark', 'light'], guild: ['lin'], npcs: [['院長|The Abbot', 'q_icecave']], rumors: ['r_icecave', 'r_fortress', 'r_skyruins'] }),
  town('qasira', '沙都卡希拉|Qasira', 520, 450, { style: 'desert', inn: 30, region: 'desert',
    shop: { types: ['whip', 'scythe', 'dagger', 'katana', 'bow', 'sword'], tiers: [2, 5], armor: [2, 5], items: ['potion', 'hipotion', 'antidote', 'eyedrop', 'panacea', 'ether'] },
    magic: ['fire', 'spirit'], guild: ['hexa'], npcs: [['神殿祭司|Temple Priestess', 'q_pyramid']], rumors: ['r_pyramid', 'r_quicksand', 'r_oasis'] }),
  town('oasis', '月之綠洲|Moon Oasis', 640, 430, { style: 'desert', inn: 25, region: 'desert',
    shop: { types: ['fist', 'staff', 'spear', 'rapier', 'gun'], tiers: [3, 5], armor: [3, 5], items: ['hipotion', 'ether', 'manawater', 'panacea', 'feather'] },
    magic: ['star', 'spirit'], guild: [], npcs: [['占星師|Astrologer', 'q_eclipse_hint']], rumors: ['r_eclipse', 'r_volcano', 'r_coral'] }),
  town('dwarfhall', '矮人之廳|Dwarfhall', 760, 120, { style: 'mountain', inn: 40, region: 'iron', hidden: 1,
    shop: { types: ['axe', 'mace', 'greatsword', 'sword', 'spear', 'gun'], tiers: [4, 7], armor: [4, 7], items: ['hipotion', 'ether', 'elixir', 'bomb', 'panacea'] },
    magic: ['earth', 'fire'], guild: [], npcs: [['矮人王|Dwarf King', 'q_deepforge']], rumors: ['r_deepforge', 'r_warcamp'] }),
  town('elvenhome', '精靈之鄉|Elvenhome', 60, 130, { style: 'forest', inn: 30, region: 'green', hidden: 1,
    shop: { types: ['bow', 'rapier', 'staff', 'whip', 'thrown'], tiers: [4, 7], armor: [4, 7], items: ['hipotion', 'manawater', 'herb_all', 'feather', 'elixir'] },
    magic: ['wind', 'water', 'star', 'spirit'], guild: [], npcs: [['精靈女王|Elf Queen', 'q_elderwood']], rumors: ['r_elderwood', 'r_mirrorlake'] }),
  town('kirisato', '霧里|Kirisato', 880, 250, { style: 'eastern', inn: 30, region: 'east', sea: 1,
    shop: { types: ['katana', 'thrown', 'dagger', 'bow', 'spear', 'fist'], tiers: [2, 6], armor: [2, 6], items: ['potion', 'hipotion', 'ether', 'smoke', 'panacea'] },
    magic: ['spirit', 'star'], guild: ['kage'], npcs: [['神社巫女|Shrine Maiden', 'q_seashrine']], rumors: ['r_onimountain', 'r_seashrine'] }),
  town('coral', '珊瑚港|Coral Harbor', 800, 480, { style: 'port', inn: 35, region: 'south', sea: 1,
    shop: { types: ['gun', 'thrown', 'sword', 'rapier', 'whip', 'dagger'], tiers: [3, 6], armor: [3, 6], items: ['hipotion', 'ether', 'manawater', 'smoke', 'bomb', 'feather'] },
    magic: ['water', 'wind'], guild: ['rook'], npcs: [['港長|Harbormaster', 'q_wreck']], rumors: ['r_wreck', 'r_piratefort', 'r_startower'] }),
  town('sanctum', '星之聖域|Star Sanctum', 300, 70, { style: 'holy', inn: 0, region: 'sky', hidden: 1,
    shop: { types: ['sword', 'greatsword', 'katana', 'rapier', 'dagger', 'axe', 'mace', 'spear', 'bow', 'fist', 'staff', 'whip', 'scythe', 'thrown', 'gun'], tiers: [6, 7], armor: [6, 8], items: ['hipotion', 'elixir', 'ether', 'manawater', 'feather', 'lifewater'] },
    magic: ['fire', 'water', 'wind', 'earth', 'light', 'dark', 'star', 'spirit'], guild: [], npcs: [['星之巫女|Star Oracle', 'oracle']], rumors: ['r_final'] }),
]);

// ---------------------------------------------------------------- dungeons (each is also a place on the map)
// lv: the lowest enemy rank met there (battle rank lifts it by up to 3); fams: enemy families; floors; size [w, h];
// boss: fought at the last floor's altar; treasure: fixed finds [floor, item]; spots: events on a floor [floor, event]
const dun = (id, name, x, y, o) => ({ id, ...N(name), x, y, ...o });
const DUN = [
  dun('d_wolfcave', '狼嚎洞窟|Howling Cave', 230, 440, { theme: 'cave', lv: 1, floors: 2, size: [24, 18], fams: ['beast', 'ooze', 'bird'], boss: 'b_alphawolf', treasure: [[1, 'k_fang'], [2, 'ring_skill']] }),
  dun('d_canyon', '峽谷遺跡|Canyon Ruins', 340, 470, { theme: 'ruins', lv: 2, floors: 3, size: [28, 20], fams: ['construct', 'reptile', 'bird'], boss: 'b_guardian', treasure: [[2, 'k_gear'], [3, 'spear4']] }),
  dun('d_bandit', '山賊砦|Bandit Fort', 420, 360, { theme: 'fort', lv: 1, floors: 2, size: [26, 18], fams: ['human', 'beast'], boss: 'b_banditking', treasure: [[2, 'goggles']] }),
  dun('d_sewer', '王都地下水道|Royal Sewers', 520, 280, { theme: 'sewer', lv: 1, floors: 3, size: [26, 20], fams: ['ooze', 'aquatic', 'insect', 'undead'], boss: 'b_sewerking', treasure: [[3, 'amulet_poison']] }),
  dun('d_tomb', '古代王墓|Ancient Tomb', 570, 320, { theme: 'tomb', lv: 4, floors: 4, size: [30, 22], fams: ['undead', 'ghost', 'construct'], boss: 'b_pharaoh', treasure: [[2, 'charm_dark'], [4, 'lumina']], stone: 'st_light' }),
  dun('d_marsh', '毒沼|Poison Marsh', 330, 130, { theme: 'swamp', lv: 2, floors: 2, size: [26, 20], fams: ['plant', 'reptile', 'insect', 'ooze'], boss: 'b_marshhydra', treasure: [[2, 'k_herb']] }),
  dun('d_mistwood', '迷霧森林|Misty Wood', 120, 170, { theme: 'forest', lv: 1, floors: 3, size: [26, 20], fams: ['plant', 'insect', 'fae', 'beast'], boss: 'b_blightroot', treasure: [[3, 'k_dew']] }),
  dun('d_spring', '妖精之泉|Faerie Spring', 110, 300, { theme: 'forest', lv: 3, floors: 3, size: [26, 20], fams: ['fae', 'plant', 'elemental'], boss: 'b_faeriequeen', treasure: [[3, 'titania']], stone: 'st_life' }),
  dun('d_lighthouse', '燈塔|Old Lighthouse', 50, 450, { theme: 'tower', lv: 2, floors: 4, size: [18, 18], fams: ['bird', 'aquatic', 'ghost'], boss: 'b_siren', treasure: [[4, 'k_ticket']] }),
  dun('d_mine', '廢棄礦坑|Abandoned Mine', 700, 170, { theme: 'mine', lv: 1, floors: 3, size: [28, 20], fams: ['insect', 'construct', 'ooze', 'undead'], boss: 'b_minegolem', treasure: [[2, 'k_gear'], [3, 'gun3']] }),
  dun('d_factory', '蒸汽工廠遺跡|Steam Works', 700, 290, { theme: 'factory', lv: 3, floors: 3, size: [28, 22], fams: ['construct', 'elemental', 'human'], boss: 'b_steamtitan', treasure: [[3, 'genesis']] }),
  dun('d_icecave', '冰窟|Ice Cavern', 430, 45, { theme: 'ice', lv: 2, floors: 3, size: [26, 20], fams: ['elemental', 'beast', 'ghost'], boss: 'b_icewyrm', treasure: [[3, 'k_ice']] }),
  dun('d_fortress', '冰牙要塞|Icefang Fortress', 600, 45, { theme: 'castle', lv: 5, floors: 4, size: [30, 22], fams: ['human', 'undead', 'construct', 'beast'], boss: 'b_frostgeneral', treasure: [[2, 'amulet_body'], [4, 'titanedge']] }),
  dun('d_pyramid', '沙漠神殿|Desert Temple', 610, 505, { theme: 'desert', lv: 3, floors: 4, size: [28, 22], fams: ['undead', 'reptile', 'insect', 'construct'], boss: 'b_sphinx', treasure: [[2, 'k_seal'], [4, 'k_crown']] }),
  dun('d_quicksand', '流沙迷宮|Quicksand Maze', 430, 505, { theme: 'desert', lv: 4, floors: 3, size: [30, 22], fams: ['insect', 'reptile', 'elemental', 'ghost'], boss: 'b_sandworm', treasure: [[3, 'hydralash']] }),
  dun('d_onimountain', '鬼哭山|Weeping Oni Peak', 920, 190, { theme: 'mountain', lv: 4, floors: 4, size: [28, 22], fams: ['fae', 'demon', 'beast', 'bird'], boss: 'b_onilord', treasure: [[4, 'onikiri']] }),
  dun('d_seashrine', '海底神社|Undersea Shrine', 910, 330, { theme: 'sea', lv: 5, floors: 3, size: [28, 22], fams: ['aquatic', 'reptile', 'elemental'], boss: 'b_seadragon', treasure: [[3, 'k_pearl']], stone: 'st_water' }),
  dun('d_wreck', '沉船墓場|Ship Graveyard', 860, 510, { theme: 'sea', lv: 3, floors: 3, size: [26, 20], fams: ['aquatic', 'undead', 'ghost'], boss: 'b_ghostcaptain', treasure: [[3, 'shootingstar']] }),
  dun('d_piratefort', '海盜要塞|Corsair Keep', 720, 515, { theme: 'fort', lv: 4, floors: 3, size: [28, 20], fams: ['human', 'aquatic', 'bird'], boss: 'b_pirateking', treasure: [[3, 'regen_ring']] }),
  dun('d_deepforge', '深淵熔爐|Deep Forge', 830, 80, { theme: 'volcano', lv: 5, floors: 4, size: [30, 22], fams: ['construct', 'elemental', 'dragon', 'demon'], boss: 'b_forgegolem', treasure: [[2, 'earthrage'], [4, 'judgment']], stone: 'st_earth' }),
  dun('d_elderwood', '古樹迷宮|Elderwood Maze', 40, 60, { theme: 'forest', lv: 5, floors: 4, size: [30, 22], fams: ['plant', 'fae', 'beast', 'elemental'], boss: 'b_eldertreant', treasure: [[2, 'heavenbow'], [4, 'fatestaff']], stone: 'st_spirit' }),
  dun('d_volcano', '火龍山|Dragonfire Peak', 770, 340, { theme: 'volcano', lv: 6, floors: 4, size: [30, 22], fams: ['dragon', 'elemental', 'demon', 'reptile'], boss: 'b_firedragon', treasure: [[3, 'dragongod']], stone: 'st_fire' }),
  dun('d_skyruins', '浮遊遺跡|Sky Ruins', 230, 40, { theme: 'sky', lv: 6, floors: 4, size: [30, 22], fams: ['bird', 'construct', 'elemental', 'fae'], boss: 'b_skyguardian', treasure: [[2, 'glimmer_band'], [4, 'dragonfists']], stone: 'st_wind' }),
  dun('d_crypt', '冥府墓窟|Crypt of the Rotting King', 160, 360, { theme: 'tomb', lv: 5, floors: 4, size: [30, 22], fams: ['undead', 'ghost', 'demon'], boss: 'b_morvane', treasure: [[3, 'endbringer']], stone: 'st_dark' }),
  dun('d_mirrorlake', '鏡之湖|Mirror Lake', 230, 300, { theme: 'sea', lv: 6, floors: 3, size: [28, 22], fams: ['aquatic', 'fae', 'ghost', 'elemental'], boss: 'b_ishtra', treasure: [[3, 'sage_stone']], stone: 'st_fate' }),
  dun('d_warcamp', '鐵血軍營|Iron Legion Camp', 600, 140, { theme: 'fort', lv: 6, floors: 4, size: [30, 22], fams: ['human', 'construct', 'beast', 'demon'], boss: 'b_gorrak', treasure: [[4, 'hero_medal']] }),
  dun('d_eclipse', '日蝕神殿|Temple of the Eclipse', 690, 385, { theme: 'void', lv: 7, floors: 4, size: [30, 22], fams: ['demon', 'elemental', 'ghost', 'dragon'], boss: 'b_nyx', treasure: [[3, 'nightedge']], stone: 'st_star' }),
  dun('d_startower', '星之塔|Tower of Stars', 920, 430, { theme: 'tower', lv: 8, floors: 6, size: [22, 22], fams: ['dragon', 'demon', 'elemental', 'construct', 'fae'], boss: 'b_astra', treasure: [[3, 'body9'], [6, 'head6']] }),
  dun('d_voidtemple', '虛空神殿|Temple of the Void', 470, 150, { theme: 'void', need: 'k_key', lv: 7, floors: 5, size: [30, 24], fams: ['demon', 'dragon', 'ghost', 'undead', 'elemental'], boss: 'b_sorrax', treasure: [[2, 'body8'], [4, 'shield6']] }),
];
// deeper dungeons get more floors (the boss waits on the last one)
for (const d of DUN) d.floors += (d.lv >= 2 ? 1 : 0) + (d.lv >= 5 ? 1 : 0);
add('dungeons', DUN);
add('locations', DUN.map((d) => ({ id: d.id, ...N(`${d.zh}|${d.en}`), x: d.x, y: d.y, kind: 'dungeon', dungeon: d.id, sea: ['d_onimountain', 'd_seashrine', 'd_wreck', 'd_piratefort', 'd_startower'].includes(d.id) ? 1 : 0 })));

// ---------------------------------------------------------------- the ten Fate Stones (each one held makes the party stronger and the evil god weaker)
add('stones', [
  { id: 'st_fire', ...N('紅玉・炎之石|Ruby of Flame'), col: '#ff4a3a', bonus: { str: 2 } },
  { id: 'st_water', ...N('藍玉・水之石|Aquamarine of Tides'), col: '#3a9aff', bonus: { wil: 2 } },
  { id: 'st_wind', ...N('翠玉・風之石|Emerald of Winds'), col: '#3adf7a', bonus: { agi: 2 } },
  { id: 'st_earth', ...N('黃玉・地之石|Topaz of Earth'), col: '#e8b040', bonus: { con: 2 } },
  { id: 'st_light', ...N('金剛石・光之石|Diamond of Light'), col: '#f8f8ff', bonus: { wil: 1, int: 1 } },
  { id: 'st_dark', ...N('黑曜石・闇之石|Obsidian of Night'), col: '#5a3a7a', bonus: { int: 2 } },
  { id: 'st_star', ...N('星彩石・星之石|Star Sapphire'), col: '#9ac8ff', bonus: { dex: 2 } },
  { id: 'st_spirit', ...N('月長石・靈之石|Moonstone of Souls'), col: '#e0d0ff', bonus: { int: 1, wil: 1 } },
  { id: 'st_life', ...N('紫水晶・命之石|Amethyst of Life'), col: '#b05ae8', bonus: { con: 1, str: 1 } },
  { id: 'st_fate', ...N('蛋白石・命運之石|Opal of Fate'), col: '#ffd0e8', bonus: { str: 1, dex: 1, agi: 1, int: 1, wil: 1, con: 1 } },
]);

// ---------------------------------------------------------------- pub rumours: reveal places (and sometimes set a flag)
// need: a flag that must be set first. Rumours are told one after another at the pub.
const R = (id, text, reveal, o = {}) => ({ id, ...N(text), reveal, ...o });
add('rumors', [
  R('r_tomb', '王都東南的古代王墓最近傳出怪聲，聽說裡面有發光的寶石。|Strange sounds from the Ancient Tomb southeast of the capital. They say a glowing gem lies inside.', ['d_tomb'], { need: 'act2' }),
  R('r_sewer', '王都的地下水道冒出了大量怪物，衛兵都不敢下去。|Monsters are pouring out of the royal sewers. Even the guards won\'t go down.', ['d_sewer']),
  R('r_whitepoplar', '西邊的白楊鎮最近被山賊騷擾得很慘。|Whitepoplar, to the west, is being plagued by bandits.', ['whitepoplar']),
  R('r_ironhaven', '東方的鋼都是機械與火藥之城，什麼新奇玩意都有。|Ironhaven in the east is a city of machines and gunpowder. You can buy anything new there.', ['ironhaven']),
  R('r_frost', '北方的霜堡修道院藏有大量古書，學者們都往那裡跑。|Frosthold Abbey in the north keeps a great library. Scholars flock there.', ['frosthold']),
  R('r_bandit', '山賊的據點就在鎮子東南的山丘上。|The bandits\' hideout is on the hill southeast of town.', ['d_bandit']),
  R('r_sage', '南方的賢者谷住著一位活了一百歲的老賢者。|In Sage Hollow, to the south, lives a sage a hundred years old.', ['sagehollow']),
  R('r_riverton', '北邊的河畔鎮靠捕魚維生，最近沼澤那邊不太對勁。|Riverton to the north lives off fishing, but something is wrong in the marsh.', ['riverton']),
  R('r_wolfcave', '谷西南的洞窟裡住著一頭白色的狼王。|A white wolf king lives in the cave southwest of the valley.', ['d_wolfcave']),
  R('r_canyon', '峽谷深處有古代人的遺跡，裡面的石像會動。|Deep in the canyon are ruins of the ancients. The statues there move.', ['d_canyon']),
  R('r_mistwood', '森林北邊起了一層怪霧，進去的人都迷路了。|A strange fog has risen in the woods to the north. Everyone who goes in gets lost.', ['d_mistwood']),
  R('r_portwind', '往西南走就是風見港，那裡有往南方群島的船。|Southwest lies Portwind, where ships leave for the southern isles.', ['portwind']),
  R('r_spring', '森林南方有座妖精之泉，聽說泉水能治百病。|South of the forest is a faerie spring whose water cures any illness.', ['d_spring'], { need: 'act2' }),
  R('r_marsh', '沼澤裡出現了一條多頭的大蛇，漁夫都不敢出船。|A many-headed serpent has appeared in the marsh. The fishermen won\'t go out.', ['d_marsh']),
  R('r_skyruins_hint', '有人說在北方的天空看到了浮在雲上的城。|Someone swears they saw a city floating on the clouds in the north.', [], { need: 'act2' }),
  R('r_lighthouse', '港外的舊燈塔又亮了，可是燈塔守明明在鎮上……|The old lighthouse is lit again, though its keeper is here in town...', ['d_lighthouse']),
  R('r_coral', '南方的珊瑚港是海盜和商人的天下，需要船票才能去。|Coral Harbor in the south belongs to pirates and merchants. You need a ship pass.', ['coral']),
  R('r_ticket', '燈塔守說，誰能讓燈塔恢復平靜，他就送一張船票。|The lighthouse keeper says he\'ll give a ship pass to whoever quiets the lighthouse.', ['d_lighthouse']),
  R('r_mine', '鋼都北邊的礦坑已經廢棄很久了，最近卻傳出敲打聲。|The mine north of Ironhaven was abandoned long ago, yet hammering echoes from it now.', ['d_mine']),
  R('r_factory', '城南的蒸汽工廠遺跡裡，有座巨大的機械還在運轉。|In the old steam works south of the city, a giant machine still runs.', ['d_factory'], { need: 'act2' }),
  R('r_dwarf', '東北的山裡有矮人王國，但他們很少讓外人進去。|There is a dwarf kingdom in the northeastern mountains, but they rarely let outsiders in.', ['dwarfhall'], { need: 'act2' }),
  R('r_aldoria', '王都阿爾多利亞是這塊大陸的中心。|Royal Aldoria is the heart of the continent.', ['aldoria']),
  R('r_icecave', '修道院西邊的冰窟裡，有一條白色的龍在沉睡。|In the ice cavern west of the abbey sleeps a white wyrm.', ['d_icecave']),
  R('r_fortress', '東邊的冰牙要塞被一群不死的士兵佔領了。|Icefang Fortress to the east has been taken by soldiers who will not die.', ['d_fortress'], { need: 'act2' }),
  R('r_skyruins', '古書記載：當四顆星連成一線，浮遊遺跡將降到北方的山頂。|An old book says: when four stars align, the Sky Ruins descend onto the northern peaks.', ['d_skyruins'], { need: 'stones3' }),
  R('r_pyramid', '城東南的沙漠神殿裡，供奉著古代王的王冠。|The desert temple southeast of the city keeps the crown of the ancient kings.', ['d_pyramid']),
  R('r_quicksand', '城西的流沙迷宮，據說底下住著一條巨大的沙蟲。|They say a giant sandworm lives beneath the quicksand maze west of the city.', ['d_quicksand']),
  R('r_oasis', '往東走有座月之綠洲，那裡的占星師什麼都知道。|East lies the Moon Oasis. Its astrologer knows everything.', ['oasis']),
  R('r_eclipse', '綠洲南方出現了一座漆黑的神殿，月亮都被它吃掉了。|A pitch-black temple has appeared south of the oasis. It swallowed the moon.', ['d_eclipse'], { need: 'apostles2' }),
  R('r_volcano', '東方的火龍山又開始噴火了，聽說山頂有龍守著一顆紅寶石。|Dragonfire Peak in the east is erupting again. A dragon guards a ruby at its top.', ['d_volcano'], { need: 'act2' }),
  R('r_deepforge', '矮人的深淵熔爐被怪物佔據了，他們正在找勇士。|Monsters have seized the dwarves\' Deep Forge. They are looking for heroes.', ['d_deepforge']),
  R('r_warcamp', '鐵血將軍的軍團在北方的平原上紮營了。|The Iron General\'s legion has made camp on the northern plain.', ['d_warcamp'], { need: 'act2' }),
  R('r_elderwood', '女王說，古樹迷宮深處藏著靈之石。|The queen says the Moonstone of Souls lies deep in the Elderwood Maze.', ['d_elderwood']),
  R('r_mirrorlake', '森林與山谷之間有座湖，湖面映出的不是你的臉。|Between the forest and the valley is a lake. The face it reflects is not yours.', ['d_mirrorlake'], { need: 'act2' }),
  R('r_onimountain', '島北的鬼哭山上，鬼族又開始作亂了。|The oni of Weeping Oni Peak in the north of the island are raiding again.', ['d_onimountain']),
  R('r_seashrine', '退潮的時候，海底神社的鳥居會露出海面。|At low tide the gate of the Undersea Shrine rises above the waves.', ['d_seashrine']),
  R('r_wreck', '港外的沉船墓場，夜裡會出現幽靈船。|A ghost ship sails the ship graveyard outside the harbor at night.', ['d_wreck']),
  R('r_piratefort', '海盜王的要塞就在港口西邊的岩礁上。|The Pirate King\'s keep sits on the reef west of the harbor.', ['d_piratefort']),
  R('r_startower', '東南海上有座直通天際的塔，從沒有人活著回來過。|A tower rises to the sky in the southeastern sea. No one has ever come back from it.', ['d_startower'], { need: 'act3' }),
  R('r_final', '虛空神殿已經浮現在大陸中央。四使徒都倒下了，現在只剩邪神本身。|The Temple of the Void has risen in the middle of the continent. The four apostles have fallen; only the god remains.', ['d_voidtemple'], { need: 'apostles4' }),
]);
