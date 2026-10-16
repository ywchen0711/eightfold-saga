// Language: Chinese (traditional) or English, remembered per browser. Content carries { zh, en }; UI words live here.
let lang = (() => { try { return localStorage.getItem('efs_lang') || ((navigator.language || '').startsWith('zh') ? 'zh' : 'en'); } catch (e) { return 'zh'; } })();
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem('efs_lang', l); } catch (e) { /* ignore */ } }
export const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en ?? o.zh ?? '');
const W = {
  title: ['八星傳說', 'Eightfold Saga'], subtitle: ['邪神復甦', 'Rise of the Evil God'], newGame: ['新的旅程', 'New Journey'], cont: ['繼續', 'Continue'],
  chooseHero: ['選擇你的主角', 'Choose your hero'], start: ['以此人展開旅程', 'Begin as this hero'], back: ['返回', 'Back'], close: ['關閉', 'Close'], ok: ['確定', 'OK'], cancel: ['取消', 'Cancel'],
  inn: ['旅店', 'Inn'], shop: ['商店', 'Shop'], magicShop: ['魔法店', 'Magic Shop'], pub: ['酒館', 'Pub'], guild: ['傭兵公會', 'Guild'], depart: ['出發', 'Depart'], menu: ['選單', 'Menu'],
  worldMap: ['世界地圖', 'World Map'], travel: ['前往', 'Travel'], here: ['你在這裡', 'You are here'], needShip: ['需要船票', 'Needs a Ship Pass'], needKey: ['需要虛空之鑰', 'Needs the Key of the Void'],
  rest: ['休息', 'Rest'], restDone: ['全員的 HP、LP、WP、JP 都恢復了。進度已存檔。', 'HP, LP, WP and JP fully restored. Game saved.'], noGold: ['金錢不足', 'Not enough gold'],
  buy: ['購買', 'Buy'], sell: ['賣出', 'Sell'], have: ['持有', 'Owned'], equipped: ['裝備中', 'Equipped'], learn: ['學習', 'Learn'], learned: ['已學會', 'Learned'],
  locked: ['相剋屬性，無法學習', 'Opposed school: cannot learn'], whoLearns: ['誰要學習？', 'Who will learn it?'], hire: ['雇用', 'Hire'], dismiss: ['離隊', 'Dismiss'], partyFull: ['隊伍已滿（最多 5 人）', 'Party is full (5 max)'],
  rumorNone: ['酒保：「最近沒什麼新消息。」', 'Barkeep: "No news lately."'], talkHero: ['交談', 'Talk'], talk: ['交談', 'Talk'],
  attack: ['攻擊', 'Attack'], techs: ['技', 'Techs'], spells: ['術', 'Spells'], items: ['道具', 'Items'], defend: ['防禦', 'Defend'], flee: ['逃跑', 'Flee'], auto: ['自動', 'Auto'],
  target: ['選擇目標', 'Choose a target'], noTechs: ['還沒有閃現任何技', 'No techniques glimmered yet'], noSpells: ['沒有可用的術', 'No spells'], noItems: ['沒有道具', 'No items'],
  glimmer: ['閃現！', 'Glimmer!'], win: ['勝利！', 'Victory!'], lose: ['全滅……', 'Defeated...'], fled: ['成功逃跑了', 'Got away'], cantFlee: ['無法逃跑！', 'No escape!'],
  gold: ['金錢', 'Gold'], got: ['獲得', 'Got'], hpUp: ['最大HP', 'Max HP'], wpUp: ['最大WP', 'Max WP'], jpUp: ['最大JP', 'Max JP'], lvUp: ['等級', 'level'],
  continueBtn: ['繼續', 'Continue'], gameOver: ['全滅', 'Party Wiped Out'], retrySave: ['從存檔重來', 'Load last save'], backTown: ['回到上一個城鎮（金錢減半）', 'Back to the last town (lose half your gold)'],
  status: ['狀態', 'Status'], equip: ['裝備', 'Equip'], skills: ['技與術', 'Skills'], stones: ['命運之石', 'Fate Stones'], system: ['系統', 'System'], save: ['存檔', 'Save'], saved: ['已存檔', 'Saved'],
  language: ['語言', 'Language'], toTitle: ['回標題', 'Title screen'], use: ['使用', 'Use'], none: ['（無）', '(none)'], remove: ['卸下', 'Remove'],
  slot_wpn1: ['武器1', 'Weapon 1'], slot_wpn2: ['武器2', 'Weapon 2'], slot_body: ['身體', 'Body'], slot_head: ['頭部', 'Head'], slot_shield: ['盾', 'Shield'], slot_acc: ['飾品', 'Accessory'],
  hp: ['HP', 'HP'], lp: ['LP', 'LP'], wp: ['WP', 'WP'], jp: ['JP', 'JP'], str: ['腕力', 'STR'], dex: ['器用', 'DEX'], agi: ['敏捷', 'AGI'], int: ['智力', 'INT'], wil: ['意志', 'WIL'], con: ['體質', 'CON'],
  def: ['防禦', 'DEF'], mdef: ['魔防', 'MDEF'], br: ['戰鬥等級', 'Battle rank'], battles: ['戰鬥次數', 'Battles'], weaponLv: ['武器熟練度', 'Weapon skill'], magicLv: ['魔法熟練度', 'Magic skill'],
  floor: ['樓', 'F'], exit: ['離開地城', 'Leave dungeon'], down: ['下樓', 'Go down'], up: ['上樓', 'Go up'], altar: ['祭壇', 'Altar'], chest: ['寶箱', 'Chest'], empty: ['空的', 'Empty'],
  bossAgain: ['這裡的主人已經被打倒了。', 'The master of this place has fallen.'], stoneGot: ['獲得命運之石', 'Fate Stone obtained'], cleared: ['攻略完成', 'Cleared'],
  reveal: ['地圖上出現了', 'New place on the map'], joined: ['加入了隊伍', 'joined the party'], partyFullJoin: ['隊伍已滿，之後可以在他的家鄉找到他', 'The party is full; you can find them at home later'],
  learnedSpell: ['學會了', 'learned'], left: ['LP 耗盡，離開隊伍回家鄉休養', 'ran out of LP and went home to recover'], lpLeft: ['剩餘 LP', 'LP left'],
  heroDead: ['主角的 LP 歸零了……', 'The hero has no LP left...'], ending: ['完', 'The End'], keepPlaying: ['繼續冒險', 'Keep exploring'],
  oppNote: ['※ 學會一種魔法後，相剋的魔法就無法學習（火↔水、風↔地、光↔闇、星↔靈）', '* Learning a school locks out its opposite (Fire↔Water, Wind↔Earth, Light↔Dark, Star↔Spirit)'],
  helpBattle: ['技：以 WP 施放，攻擊時有機率「閃現」新技。術：以 JP 施放。HP 戰後全滿，LP、WP、JP 要在旅店恢復。', 'Techs cost WP; attacking can make you glimmer new ones. Spells cost JP. HP refills after each battle; LP, WP and JP only at inns.'],
  sea: ['（海路）', '(by sea)'], unknownPlace: ['？？？', '???'], kills: ['擊倒', 'Defeated'], glimmers: ['閃現次數', 'Glimmers'], playTime: ['遊戲時間', 'Play time'],
  lpWarn: ['LP 只能在旅店恢復。LP 歸零的夥伴會離隊，主角歸零則遊戲結束。', 'LP only comes back at inns. Companions at 0 LP leave; at 0 the hero\'s journey ends.'],
  field: ['移動', 'Move'], camp: ['使用帳篷，全員 WP、JP 恢復了。', 'You pitch a tent: everyone\'s WP and JP are restored.'], fieldOnly: ['只能在戰鬥中使用', 'Only usable in battle'],
  cancelCmd: ['重新選擇', 'Undo'], nowp: ['WP 不足', 'Not enough WP'], nojp: ['JP 不足', 'Not enough JP'],
};
export const t = (k) => { const w = W[k]; return w ? (lang === 'zh' ? w[0] : w[1]) : k; };
