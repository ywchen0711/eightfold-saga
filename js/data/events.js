// Story and quests, written as small scripts. An event is { id, steps, at?, cond?, once? }:
//   at: a place id — the event runs when you arrive there (if cond holds; once = only ever once)
//   events named `<dungeon>_win` run after that dungeon's boss falls; `pro_<hero>` is that hero's prologue;
//   town NPC buttons and hero meetings call events by id.
// Steps (see js/engine/events.js for all of them):
//   ['say', who, '中文|English']   who: a hero id, 'nar' (narration), or '名字|Name'
//   ['choice', '問題|Question', [['選項|Option', ...steps], ...]]
//   ['if', cond, [...then], [...else]]  cond: { flag, noflag, item, hero, party, noparty, stones, apostles, gold, clear }
//   ['flag', name, value?] ['give', id, n?] ['take', id] ['gold', n] ['join', id] ['reveal', ...placeIds]
//   ['battle', bossId] ['heal'] ['goto', placeId] ['learn', heroId|'hero', spellId] ['ending', 'normal'|'true']
import { add, N } from './db.js';
const say = (who, s) => ['say', who, s];
const nar = (s) => ['say', 'nar', s];

// a boss only met in an event
add('bosses', [{ id: 'b_vizier', ...N('篡位者 札哈|Zahar the Usurper'), tier: 4, art: 'human', hue: 280, skills: ['darkbolt', 'charm', 'doublecut', 'hellfire'], immune: ['sleep', 'confuse', 'paralyze'], size: 1.6, k: { hp: 1.2 }, res: {}, minions: ['human4', 'human4'] }]);

const E = (id, steps, o = {}) => ({ id, steps, ...o });
add('events', [
  // ------------------------------------------------------------ prologues
  E('pro_jeff', [
    nar('鋼都，蒸汽與齒輪之城。傑夫的工坊裡，一封信被塞進了門縫。|Ironhaven, city of steam and gears. A letter has been slipped under the door of Jeff\'s workshop.'),
    say('加瑞特的信|Garret\'s letter', '傑夫，我在北邊的廢棄礦坑找到了不該存在的東西：會自己轉動的古代齒輪。如果我沒回來，別來找我。|Jeff — in the abandoned mine to the north I found something that shouldn\'t exist: ancient gears that turn by themselves. If I don\'t come back, don\'t look for me.'),
    say('jeff', '……師父每次說「別來找我」，意思都是「快來救我」。|...Every time the old man says "don\'t look for me", he means "come and get me."'),
    ['reveal', 'd_mine'], ['flag', 'prologue'],
    nar('（廢棄礦坑出現在地圖上了。工會可以雇用夥伴，準備好再出發吧。）|(The Abandoned Mine is now on the map. You can hire companions at the guild — get ready first.)'),
  ]),
  E('pro_erin', [
    nar('翠葉村。千年古樹的葉子，一片接一片地變黑掉落。|Greenleaf. One by one, the leaves of the thousand-year-old trees are blackening and falling.'),
    say('長老薇洛|Elder Willow', '艾琳，北邊的迷霧森林起了怪霧，樹木的病就是從那裡開始的。|Erin, a strange fog has risen in the Misty Wood to the north. The trees\' sickness began there.'),
    say('erin', '我去看看。藥師的工作，就是找出病根。|I\'ll go and see. A healer\'s job is to find the root of the illness.'),
    ['reveal', 'd_mistwood'], ['flag', 'prologue'],
  ]),
  E('pro_josh', [
    nar('賢者谷的清晨。村裡的羊又少了三隻，山谷裡迴盪著狼嚎。|Morning in Sage Hollow. Three more sheep are gone, and howling echoes down the valley.'),
    say('jasper', '哥，我看到了！是一頭白色的大狼，牠往西南的洞窟跑了！|Josh, I saw it! A huge white wolf — it ran to the cave in the southwest!'),
    say('josh', '騎士不會丟下村子不管。走吧，賈斯柏，但你要跟緊我。|A knight doesn\'t abandon his village. Let\'s go, Jasper — but stay close to me.'),
    ['join', 'jasper'], ['reveal', 'd_wolfcave'], ['flag', 'prologue'],
  ]),
  E('pro_jasper', [
    nar('賢者谷的清晨。賈斯柏爬上屋頂，看見一頭白狼叼走了羊。|Morning in Sage Hollow. From the rooftop, Jasper watches a white wolf carry off a sheep.'),
    say('jasper', '我跟上去看看就好……哥哥一定會說不行，所以不告訴他！|I\'ll just follow it a little... Josh would say no, so I won\'t tell him!'),
    say('josh', '賈斯柏！你想一個人去哪裡？……唉，我跟你一起去。|Jasper! Where do you think you\'re going alone? ...Fine. I\'m coming with you.'),
    ['join', 'josh'], ['reveal', 'd_wolfcave'], ['flag', 'prologue'],
  ]),
  E('pro_lyra', [
    nar('沙都卡希拉的酒館。蒙面的舞姬跳完最後一支舞，衛兵衝了進來。|A tavern in Qasira. As the veiled dancer finishes her last dance, guards burst in.'),
    say('衛兵|Guard', '找到了！流亡的王女莉亞，札哈大人要妳的命！|There she is! The exiled princess Lyra — Lord Zahar wants your head!'),
    say('lyra', '想要我的命？先跟上我的舞步吧。|You want my head? Keep up with my steps first.'),
    ['fight', ['human1', 'human1']],
    say('lyra', '這裡待不下去了……北方的王都，也許有人願意幫我奪回王冠。|I can\'t stay here... In the royal capital to the north, someone might help me win back my crown.'),
    ['reveal', 'aldoria', 'd_pyramid'], ['flag', 'prologue'],
  ]),
  E('pro_gareth', [
    nar('王都阿爾多利亞，王座之間。|Royal Aldoria, the throne room.'),
    say('國王|The King', '葛雷斯，地下水道湧出的怪物不是自然的。有人在城底下舉行儀式。查清楚。|Gareth, the monsters pouring out of the sewers are not natural. Someone is holding a rite beneath the city. Find out who.'),
    say('gareth', '遵命，陛下。|As you command, Your Majesty.'),
    ['reveal', 'd_sewer'], ['flag', 'prologue'],
  ]),
  E('pro_chizuru', [
    nar('霧之島，霧里。道場的灰燼還在冒煙。|Kirisato, the isle of mist. The ashes of the dojo are still smoking.'),
    say('chizuru', '師父說過，只有傳說中的鬼切能斬斷鬼王。……先把村裡的鬼趕走。|Master said only the legendary Onikiri can cut down the Oni Lord. ...First, I drive the oni out of the village.'),
    ['fight', ['fae2', 'fae1', 'fae1']],
    say('神社巫女|Shrine Maiden', '千鶴，鬼族的騷動和大陸上的異變有關。帶著這張船票，去大陸找「八星」吧。|Chizuru, the oni\'s rage is tied to what is happening on the continent. Take this ship pass and find the "Eight Stars" there.'),
    ['give', 'k_ticket'], ['reveal', 'aldoria', 'portwind', 'd_onimountain'], ['flag', 'prologue'],
  ]),
  E('pro_morrow', [
    nar('霜堡修道院的禁書庫。燭火在莫羅翻開的古書上搖晃。|The forbidden library of Frosthold Abbey. Candlelight flickers over the old book Morrow has opened.'),
    say('morrow', '「當日蝕吞下第十顆星，邪神將從虛空歸來」……日期，就是今年。|"When the eclipse swallows the tenth star, the evil god returns from the Void"... The date is this year.'),
    say('nar', '書架後傳來冰冷的笑聲，一個幽靈撲了上來！|Cold laughter behind the shelves — a ghost lunges!'),
    ['fight', ['ghost1', 'ghost1']],
    say('morrow', '連禁書庫都有使徒的眼線。必須立刻告訴國王。|Even the forbidden library has the apostles\' eyes. The king must be told at once.'),
    ['reveal', 'aldoria', 'd_icecave'], ['flag', 'prologue'],
  ]),
  // ------------------------------------------------------------ prologue dungeons
  E('d_mine_win', [
    nar('礦坑深處，加瑞特被鎖在巨大的齒輪旁。|Deep in the mine, Garret is chained beside a giant gear.'),
    say('加瑞特|Garret', '傻小子，叫你別來……不過幹得好。聽著，這些齒輪是封印的一部分，有人想把它們拆走。他們自稱「使徒」。|Fool boy, I told you not to come... but well done. Listen: these gears are part of a seal, and someone wants them gone. They call themselves "apostles".'),
    ['if', { noflag: 'act2' }, [say('加瑞特|Garret', '去王都告訴國王。這不是我們工匠能處理的事。|Go to the capital and tell the king. This is beyond us craftsmen.'), ['reveal', 'aldoria'], ['flag', 'prologue_done']]],
    ['gold', 300],
  ]),
  E('d_mistwood_win', [
    say('erin', '樹根上纏著黑色的霧……這不是病，是詛咒。|Black mist coils around the roots... this is no sickness. It\'s a curse.'),
    say('樹之聲|Voice of the Trees', '腐朽之王……甦醒了……告訴……王……|The Rotting King... has woken... tell... the king...'),
    ['if', { noflag: 'act2' }, [['reveal', 'aldoria', 'whitepoplar'], ['flag', 'prologue_done']]],
    ['gold', 200],
  ]),
  E('d_wolfcave_win', [
    say('jasper', '白狼王的眼睛……剛才是紅色的，現在變回藍色了。|The wolf king\'s eyes... they were red, and now they\'re blue again.'),
    say('josh', '有東西在操控牠。牠是被黑霧逼瘋的。|Something was controlling it. The black mist drove it mad.'),
    ['if', { noflag: 'act2' }, [say('老賢者|The Old Sage', '黑霧……是邪神使徒的力量。孩子們，去王都吧，把這件事告訴國王。|Black mist... the power of the evil god\'s apostles. Children, go to the capital and tell the king.'), ['reveal', 'aldoria', 'whitepoplar'], ['flag', 'prologue_done']]],
    ['gold', 200],
  ]),
  E('d_sewer_win', [
    nar('水道最深處有一座黑色祭壇，上面刻著四個印記。|At the bottom of the sewers stands a black altar, carved with four sigils.'),
    ['if', { hero: 'gareth' }, [say('gareth', '四使徒的印記……必須立刻回報陛下。|The sigils of the four apostles... His Majesty must hear of this at once.'), ['flag', 'prologue_done']],
      [say('騎士團長|Knight Commander', '幹得好，冒險者。這是王國的謝禮。|Well done, adventurer. The kingdom thanks you.'), ['gold', 600]]],
  ]),
  // ------------------------------------------------------------ the main story
  E('act2_start', [
    nar('王座之間。國王從王座上站了起來。|The throne room. The king rises from his throne.'),
    say('國王|The King', '你帶來的消息，和各地傳來的報告完全一致。邪神索拉克斯的四使徒已經甦醒了。|Your news matches every report from across the land. The four apostles of the evil god Sorrax have awoken.'),
    say('國王|The King', '千年前，八位英雄以十顆命運之石封印了邪神。如今石頭散落各地，使徒們正在找它們。|A thousand years ago, eight heroes sealed the god with the ten Fate Stones. Now the stones are scattered, and the apostles are hunting them.'),
    say('國王|The King', '腐朽之王莫凡在西方的墓窟，鐵血將軍葛拉克的軍團在北方平原紮營。另外兩名使徒，下落不明。|Morvane the Rotting King lurks in a western crypt; the Iron General Gorrak\'s legion camps on the northern plain. The other two... no one knows.'),
    say('國王|The King', '命運之石握在你手中越多，邪神的力量就越弱。我把這件事託付給你了。|The more Fate Stones you hold, the weaker the god becomes. I entrust this to you.'),
    ['gold', 1000], ['give', 'hipotion', 3], ['flag', 'act2'], ['reveal', 'd_crypt', 'd_warcamp', 'd_tomb', 'riverton', 'ironhaven', 'frosthold', 'greenleaf', 'sagehollow'],
    ['if', { noparty: 'gareth', nohero: 'gareth' }, [say('gareth', '陛下，請讓我同行。|Your Majesty, let me go with them.'), ['recruit', 'gareth']]],
    nar('（主線開始：打倒四使徒，收集命運之石。在酒館打聽消息，世界會越來越大。）|(The main quest begins: defeat the four apostles and gather the Fate Stones. Ask around in pubs and the world will open up.)'),
  ], { at: 'aldoria', cond: { flag: 'prologue_done', noflag: 'act2' }, once: 1 }),
  // reaching the capital before finishing the prologue also starts the story
  E('act2_early', [['flag', 'prologue_done']], { at: 'aldoria', cond: { noflag: 'prologue_done', flag: 'prologue', nohero: 'gareth' }, once: 1, then: 'act2_start' }),
  E('king', [
    ['if', { noflag: 'act2' }, [say('國王|The King', '王國正面臨危機。若你有消息，請告訴我。|The kingdom faces a crisis. If you bring news, tell me.')], [
      ['if', { apostles: 4 }, [say('國王|The King', '四使徒都倒下了！去星之聖域，問星之巫女如何前往虛空神殿。|All four apostles have fallen! Go to the Star Sanctum and ask the Star Oracle how to reach the Temple of the Void.'), ['reveal', 'sanctum']],
        [say('國王|The King', '命運之石的光芒……你已經找到了一些。繼續前進吧。|The light of the Fate Stones... you have found some already. Keep going.'),
          ['if', { stones: 5 }, [say('國王|The King', '收下這個，它曾屬於千年前的英雄。|Take this. It once belonged to a hero of a thousand years ago.'), ['giveonce', 'hero_medal']]]]]]],
  ]),
  E('commander', [
    ['if', { clear: 'd_sewer' }, [say('騎士團長|Knight Commander', '水道清乾淨了，多虧了你。王國的騎士永遠歡迎你。|The sewers are clean thanks to you. The knights will always welcome you.')],
      [say('騎士團長|Knight Commander', '王都的地下水道怪物成群，若你有本事，請幫我們清理。|Monsters swarm in the royal sewers. If you\'re able, help us clear them.'), ['reveal', 'd_sewer']]],
  ]),
  E('act3', [
    nar('第二位使徒倒下的瞬間，天空裂開了一道縫。北方的雲端，一座白色的城市緩緩降下。|As the second apostle falls, the sky splits open. In the clouds to the north, a white city slowly descends.'),
    say('星之巫女的聲音|Voice of the Star Oracle', '八星的繼承者啊，來星之聖域吧。邪神的日蝕已經開始了。|Heirs of the Eight Stars, come to the Star Sanctum. The god\'s eclipse has begun.'),
    ['flag', 'act3'], ['reveal', 'sanctum', 'd_skyruins'],
  ]),
  E('oracle', [
    ['if', { apostles: 4 }, [
      say('星之巫女|Star Oracle', '四使徒已滅。這把虛空之鑰能打開邪神的神殿。你手中的命運之石越多，邪神就越弱。|The four apostles are gone. This Key of the Void opens the god\'s temple. The more Fate Stones you hold, the weaker the god will be.'),
      ['giveonce', 'k_key'], ['reveal', 'd_voidtemple'], ['flag', 'final'],
      say('星之巫女|Star Oracle', '去吧。……若你想先試試自己的力量，東南海上的星之塔頂端有星神等著。|Go. ...If you would first test your strength, the star god awaits atop the Tower of Stars in the southeastern sea.'), ['reveal', 'd_startower']],
      [say('星之巫女|Star Oracle', '四使徒尚存。打倒他們，日蝕才會停止。命運之石會在你需要時指引你。|The apostles still live. Only when they fall will the eclipse stop. The Fate Stones will guide you when you need them.'), ['heal']]],
  ]),
  E('apostle_fall', [
    ['if', { apostles: 2, noflag: 'act3' }, [['run', 'act3']]],
    ['if', { apostles: 4 }, [nar('四使徒全部倒下了。大陸中央，漆黑的神殿從地底升起。|All four apostles have fallen. In the middle of the continent, a black temple rises from the earth.'), ['reveal', 'sanctum']]],
  ]),
  E('d_crypt_win', [say('莫凡|Morvane', '腐朽……才是萬物的歸宿……邪神大人……|Rot... is where all things end... Lord Sorrax...'), ['flag', 'ap_morvane'], ['run', 'apostle_fall']]),
  E('d_mirrorlake_win', [say('伊絲特拉|Ishtra', '鏡子碎了……可是你的倒影，會一直跟著你喔。|The mirror is broken... but your reflection will follow you forever.'), ['flag', 'ap_ishtra'], ['run', 'apostle_fall']]),
  E('d_warcamp_win', [say('葛拉克|Gorrak', '輸給……人類的軍隊……不，是輸給你們這幾個人……哈哈……|Beaten by a human army... no — by a handful of you... ha ha...'), ['flag', 'ap_gorrak'], ['run', 'apostle_fall']]),
  E('d_eclipse_win', [say('尼克絲|Nyx', '星星……還在發光……為什麼……|The stars... still shine... why...'), ['flag', 'ap_nyx'], ['run', 'apostle_fall']]),
  E('d_voidtemple_win', [
    nar('邪神的身體崩解成無數的光點，十顆命運之石的光芒照亮了虛空。|The god\'s body crumbles into countless motes of light; the glow of the Fate Stones fills the Void.'),
    ['ending', 'normal'],
  ]),
  E('d_startower_win', [say('阿斯特拉|Astra', '人之子啊，你的光芒勝過了星辰。把我的祝福帶走吧。|Child of mortals, your light outshines the stars. Take my blessing with you.'), ['give', 'elixir', 3], ['giveonce', 'sage_stone'], ['flag', 'astra']]),
  // ------------------------------------------------------------ side quests (town NPCs)
  E('q_bandits', [
    ['if', { clear: 'd_bandit' }, [['if', { noflag: 'q_bandits_paid' }, [say('村長|Village Elder', '山賊王被打倒了！這點心意請收下。|The Bandit King is beaten! Please accept this.'), ['gold', 500], ['give', 'shield2'], ['flag', 'q_bandits_paid']],
      [say('村長|Village Elder', '村子終於平靜了。謝謝你。|The village is finally at peace. Thank you.')]]],
      [say('村長|Village Elder', '山賊盤據在東南的砦裡，搶走了我們的糧食。拜託你了！|The bandits hold the fort to the southeast and took our grain. Please help us!'), ['reveal', 'd_bandit']]],
  ]),
  E('sage_elder', [
    say('老賢者|The Old Sage', '千年前，八位英雄各自從不同的土地出發，最後在虛空神殿會合。你們就像他們一樣。|A thousand years ago, eight heroes set out from eight lands and met at the Temple of the Void. You are just like them.'),
    ['if', { flag: 'act2' }, [say('老賢者|The Old Sage', '峽谷遺跡裡有古代人的齒輪，和封印有關。去看看吧。|In the Canyon Ruins lie the ancients\' gears, part of the seal. Go and see.'), ['reveal', 'd_canyon']]],
  ]),
  E('q_spring', [
    ['if', { clear: 'd_spring' }, [say('長老薇洛|Elder Willow', '泉水恢復了清澈，森林也會慢慢好起來的。|The spring runs clear again; the forest will slowly heal.')],
      [['if', { flag: 'act2' }, [say('長老薇洛|Elder Willow', '南方的妖精之泉也被汙染了。妖精女王迷失了心智……請救救她。|The Faerie Spring to the south is tainted too. The faerie queen has lost her mind... please save her.'), ['reveal', 'd_spring']],
        [say('長老薇洛|Elder Willow', '森林的病根在北方。|The root of the forest\'s sickness lies to the north.')]]]],
  ]),
  E('d_spring_win', [
    say('妖精女王|Faerie Queen', '謝謝你，人類。我被黑霧迷惑了……請收下命之石。精靈之鄉從此為你敞開。|Thank you, mortal. The black mist clouded my mind... take the Amethyst of Life. Elvenhome is open to you now.'),
    ['reveal', 'elvenhome'],
  ]),
  E('q_marsh', [
    ['if', { clear: 'd_marsh' }, [['if', { noflag: 'q_marsh_paid' }, [say('漁夫|Fisherman', '九頭蛇死了？太好了！這些藥給你。|The hydra\'s dead? Wonderful! Take these remedies.'), ['give', 'panacea', 3], ['give', 'hipotion', 3], ['flag', 'q_marsh_paid']], [say('漁夫|Fisherman', '今天的魚特別肥！|The fish are fat today!')]]],
      [say('漁夫|Fisherman', '西北的毒沼出現了多頭大蛇，我們沒辦法出船。|A many-headed serpent haunts the poison marsh to the northwest. We can\'t take the boats out.'), ['reveal', 'd_marsh']]],
  ]),
  E('q_lighthouse', [
    ['if', { clear: 'd_lighthouse' }, [say('燈塔守|Lighthouse Keeper', '燈塔安靜了。船票你已經拿到了吧？南方的珊瑚港和東方的霧里，都能去了。|The lighthouse is quiet. You found the ship pass, right? Coral Harbor and Kirisato are open to you now.'), ['reveal', 'coral', 'kirisato']],
      [say('燈塔守|Lighthouse Keeper', '燈塔上住進了會唱歌的海妖，船都觸礁了。打倒牠，燈塔頂的船票就是你的。|A singing siren has taken my lighthouse, and ships are wrecking. Beat it and the ship pass at the top is yours.'), ['reveal', 'd_lighthouse']]],
  ]),
  E('d_lighthouse_win', [nar('燈塔的光又穩定了下來。船票可以前往珊瑚港與霧里。|The lighthouse burns steady again. The pass takes ships to Coral Harbor and Kirisato.'), ['reveal', 'coral', 'kirisato']]),
  E('q_factory', [
    ['if', { clear: 'd_factory' }, [['if', { noflag: 'q_factory_paid' }, [say('工會長|Guildmaster', '蒸汽巨人停了！工會給你的報酬。|The Steam Titan has stopped! The guild\'s reward.'), ['gold', 2000], ['flag', 'q_factory_paid']], [say('工會長|Guildmaster', '鋼都欠你一份情。|Ironhaven owes you one.')]]],
      [['if', { flag: 'act2' }, [say('工會長|Guildmaster', '城南的蒸汽工廠遺跡裡，古代巨人又動起來了。|In the old steam works south of town, the ancient titan is moving again.'), ['reveal', 'd_factory']], [say('工會長|Guildmaster', '最近城裡不太平靜啊。|The city has been uneasy lately.')]]]],
  ]),
  E('q_icecave', [
    ['if', { item: 'k_ice' }, [say('院長|The Abbot', '永凍之心！有了它，修道院的結界就能撐下去。這是謝禮，還有……北方天空的事。|The Frozen Heart! With it the abbey\'s ward will hold. Your reward — and word of the northern sky.'), ['take', 'k_ice'], ['give', 'charm_fire'], ['gold', 800], ['reveal', 'd_fortress']],
      [say('院長|The Abbot', '西邊冰窟裡有一顆永凍之心，能守護修道院。冰之白龍守著它。|In the ice cavern to the west lies a Frozen Heart that can protect the abbey. An ice wyrm guards it.'), ['reveal', 'd_icecave']]],
  ]),
  E('q_pyramid', [
    ['if', { item: 'k_crown' }, [
      ['if', { party: 'lyra' }, [say('lyra', '王冠……終於回到我手上了。札哈，該結束了。|The crown... back in my hands at last. Zahar, it ends now.'), ['battle', 'b_vizier'],
        say('神殿祭司|Temple Priestess', '女王陛下萬歲！卡希拉的人民永遠感謝你們。|Long live the queen! The people of Qasira will be grateful forever.'), ['take', 'k_crown'], ['give', 'hero_medal'], ['gold', 3000], ['flag', 'lyra_queen']],
        [say('神殿祭司|Temple Priestess', '這是沙漠王冠！真正的王女莉亞在哪裡？她應該在……東邊的綠洲附近？|The Desert Crown! Where is the true princess, Lyra? She may be near the oasis to the east...'), ['reveal', 'oasis']]]],
      [say('神殿祭司|Temple Priestess', '沙漠神殿裡供奉著古代王冠。篡位者札哈也在找它。|The ancient crown rests in the desert temple. Zahar the usurper seeks it too.'), ['reveal', 'd_pyramid']]],
  ]),
  E('q_eclipse_hint', [
    say('占星師|Astrologer', '我在星盤上看見四顆凶星：腐朽、深淵、鐵血、星蝕。|In my star chart I see four baleful stars: Rot, Abyss, Iron and Eclipse.'),
    ['if', { apostles: 2 }, [say('占星師|Astrologer', '星蝕者就在綠洲南方的日蝕神殿。|The Eclipse waits in the temple south of the oasis.'), ['reveal', 'd_eclipse']],
      [say('占星師|Astrologer', '深淵魔女藏在映出謊言的湖裡，就在森林與山谷之間。|The Witch of the Abyss hides in a lake that reflects lies, between the forest and the valley.'), ['reveal', 'd_mirrorlake']]],
  ]),
  E('q_deepforge', [
    ['if', { clear: 'd_deepforge' }, [say('矮人王|Dwarf King', '熔爐的火又燒起來了！矮人永遠記得你們。|The forge burns again! The dwarves will remember you forever.'), ['giveonce', 'amulet_life']],
      [say('矮人王|Dwarf King', '深淵熔爐被怪物佔領了，地之石也在裡面。人類，能幫我們嗎？|Monsters hold our Deep Forge, and the Topaz of Earth is inside. Human, will you help us?'), ['reveal', 'd_deepforge']]],
  ]),
  E('q_elderwood', [
    ['if', { clear: 'd_elderwood' }, [say('精靈女王|Elf Queen', '古樹之王安息了。願星辰守護你。|The Elder King rests at last. May the stars watch over you.')],
      [say('精靈女王|Elf Queen', '古樹迷宮裡沉睡著靈之石，但古樹之王已被黑霧吞噬。|The Moonstone of Souls sleeps in the Elderwood Maze, but its king has been swallowed by black mist.'), ['reveal', 'd_elderwood', 'd_mirrorlake']]],
  ]),
  E('q_seashrine', [
    ['if', { clear: 'd_seashrine' }, [say('神社巫女|Shrine Maiden', '海龍大人平靜下來了。謝謝你們。|The sea dragon is calm again. Thank you.')],
      [say('神社巫女|Shrine Maiden', '海底神社的海龍發狂了，水之石也在那裡。鬼哭山的鬼族也還在作亂。|The sea dragon of the Undersea Shrine has gone mad, and the Aquamarine is there. The oni of the peak still rage too.'), ['reveal', 'd_seashrine', 'd_onimountain']]],
  ]),
  E('d_onimountain_win', [['if', { party: 'chizuru' }, [say('chizuru', '鬼切……師父，我做到了。|Onikiri... Master, I did it.')]], nar('鬼族的騷動平息了。|The oni raids are over.')]),
  E('q_wreck', [
    ['if', { clear: 'd_wreck' }, [say('港長|Harbormaster', '幽靈船不再出現了！西邊的海盜王還在作亂就是了。|No more ghost ship! Though the Pirate King to the west still plunders.'), ['reveal', 'd_piratefort']],
      [say('港長|Harbormaster', '沉船墓場的幽靈船長擋住了航道。拜託了！|The ghost captain of the ship graveyard blocks the sea lanes. Please!'), ['reveal', 'd_wreck', 'd_piratefort']]],
  ]),
  E('d_piratefort_win', [say('海盜王|Pirate King', '哈！好久沒輸得這麼痛快了。我的寶藏你拿去吧！|Ha! Haven\'t lost this well in years. Take my treasure!'), ['gold', 4000]]),
  E('d_skyruins_win', [nar('浮遊遺跡的核心安靜下來，遠方的雲上出現了一座白色的聖域。|The heart of the Sky Ruins falls quiet; a white sanctum appears on the distant clouds.'), ['reveal', 'sanctum']]),
  E('d_pyramid_win', [nar('祭壇上放著一頂古老的黃金王冠。|An ancient golden crown rests on the altar.'), ['if', { party: 'lyra' }, [say('lyra', '這是……母后的王冠。回卡希拉吧。|This is... my mother\'s crown. Back to Qasira.')]]]),
  E('d_tomb_win', [nar('古代王的棺木裡，光之石靜靜發著光。|In the ancient king\'s coffin, the Diamond of Light glows softly.')]),
  E('d_canyon_win', [say('老賢者|The Old Sage', '（遠方傳來老賢者的聲音）齒輪要交給鋼都的工匠，他們知道怎麼用。|(The old sage\'s voice, from afar) Take the gear to the craftsmen of Ironhaven. They will know what to do.'), ['reveal', 'ironhaven', 'dwarfhall']]),
  E('d_fortress_win', [say('冰牙將軍|Icefang General', '我……終於能……長眠了……|At last... I can... rest...'), ['gold', 2500]]),
  // ------------------------------------------------------------ heroes you can meet (when they are not the protagonist)
  ...['jeff', 'erin', 'josh', 'jasper', 'lyra', 'gareth', 'chizuru', 'morrow'].map((h) => E('meet_' + h, [['meet', h]])),
]);

// what each hero says when you meet them, and what they need before joining
export const MEET = {
  jeff: { line: '一個人調查礦坑太危險了。帶上我吧，我的銃很準。|Investigating alone is too dangerous. Take me along — my gun is accurate.' },
  erin: { line: '受傷的人需要藥師。我也一起去吧。|The wounded need a healer. Let me come too.' },
  josh: { line: '我想成為真正的騎士。讓我和你們一起戰鬥！|I want to become a real knight. Let me fight with you!' },
  jasper: { line: '帶我去嘛！我射箭很準的！|Take me with you! I\'m a great shot!' },
  lyra: { line: '你們在對抗使徒？那我們的敵人是同一個。|You fight the apostles? Then we share an enemy.' },
  gareth: { line: '陛下命我協助你們。我的劍屬於王國，也屬於你們。|His Majesty bids me help you. My sword belongs to the kingdom — and to you.', need: { flag: 'act2' } },
  chizuru: { line: '我在找鬼切。你們的旅途，也許會帶我找到它。|I seek the Onikiri. Your road may lead me to it.' },
  morrow: { line: '預言中的八星……原來就是你們。讓我同行，我知道邪神的弱點。|The Eight Stars of the prophecy... it\'s you. Let me come; I know the god\'s weaknesses.' },
};
