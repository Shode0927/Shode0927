// 寓話を紡ぐ機構。
// 種(シード)からテーマ・主人公・舞台・物語型を選び、
// 筋の通った一夜かぎりの寓話を組み上げる。

import { Rng, mulberry32, pick, int } from './prng';

export type ThemeId = 'hikari' | 'toki' | 'koe' | 'yume' | 'kokoro' | 'kaze';

export interface Fable {
  id: string;
  seed: number;
  night: number; // 第n夜
  themeId: ThemeId;
  themeKanji: string;
  title: string;
  body: string[];
  moral: string;
  createdAt: number;
}

const EPITHETS = [
  '月夜の',
  '片耳の',
  '銀色の',
  '年老いた',
  '影をなくした',
  '星を数える',
  'いちばん小さな',
  '声のかれた',
  '旅暮らしの',
  '嘘のつけない',
  '雨の日生まれの',
  '物覚えのよすぎる',
] as const;

const ANIMALS = [
  '狐',
  '兎',
  '鴉',
  '亀',
  '野鼠',
  '梟',
  '鹿',
  '猫',
  '燕',
  '蛙',
  '狼',
  '蛍',
] as const;

const STRANGERS = [
  '古い案山子',
  '盲目の梟',
  '井戸の底の声',
  '風の行商人',
  '紙でできた蝶',
  '欠けた三日月',
  '石になった狼',
  '名前を忘れた神様',
  '影だけの旅人',
  '歌うやかん',
  '千年生きた鯉',
] as const;

interface Setting {
  name: string;
  short: string;
}

const SETTINGS: readonly Setting[] = [
  { name: '風の止んだ谷', short: '谷' },
  { name: '忘れられた灯台', short: '灯台' },
  { name: '硝子の森', short: '森' },
  { name: '月の昇らない湖', short: '湖' },
  { name: '終列車だけが停まる野原', short: '野原' },
  { name: '砂時計の砂漠', short: '砂漠' },
  { name: '星のよく落ちる岬', short: '岬' },
  { name: '地図に載らない橋のたもと', short: '橋' },
  { name: '言葉の通じない港町', short: '港' },
];

const PRICES = [
  '自分の影',
  '自分の名前',
  'いちばん古い記憶',
  '明日のぶんの眠り',
  '心臓の音をひとつ',
  '生まれた朝の匂い',
  '帰り道の記憶',
] as const;

interface ThemeDef {
  id: ThemeId;
  kanji: string;
  /** 探索譚: 求めるもの */
  desires: { full: string; short: string }[];
  /** 探索譚: 帰り道の気づき */
  realizations: string[];
  /** 問答譚: 訪問者の問い */
  questions: string[];
  /** 問答譚: 正直な答え */
  honests: string[];
  /** 問答譚: 残されたもの */
  gifts: { full: string; short: string }[];
  /** 喪失譚: 生まれつき持っていたもの */
  possessions: { full: string; short: string }[];
  /** 結びの教訓 */
  morals: string[];
}

const THEMES: readonly ThemeDef[] = [
  {
    id: 'hikari',
    kanji: '光',
    desires: [
      { full: '消えない小さな灯', short: '消えない灯' },
      { full: '朝を呼ぶひとすじの光', short: 'ひとすじの光' },
      { full: '空から落ちた星のかけら', short: '星のかけら' },
    ],
    realizations: [
      '手に入れた灯よりも、それを探して歩いた夜道の星のほうが、ずっと明るかったことに。',
      '欲しかったのは光ではなく、光を分けたい誰かだったことに。',
    ],
    questions: [
      'おまえの夜は、なぜそんなに暗い。',
      'おまえは最後に、いつ空を見上げた。',
    ],
    honests: [
      'わからない。ただ、暗いと言いに来てくれるおまえがいる夜だけ、ここは少しだけ明るい。',
      'わからない。けれど暗いとわかるのは、昔たしかに明るかったからだと思う。',
    ],
    gifts: [
      { full: '朝までかかっても燃え尽きない、豆粒ほどの灯', short: '豆粒ほどの灯' },
      { full: '夜のあいだだけ光る、小さな石', short: '小さな光る石' },
    ],
    possessions: [
      { full: '胸の奥に、小さな灯', short: '胸の灯' },
      { full: '夜目のきく、よく光る瞳', short: '光る瞳' },
    ],
    morals: [
      '灯は、誰かに分けたぶんだけ明るくなる。',
      '闇を恐れる目にだけ、星は見える。',
      '探していた光は、たいてい背中を照らしている。',
    ],
  },
  {
    id: 'toki',
    kanji: '時',
    desires: [
      { full: 'どこかに置き忘れた一日', short: '忘れた一日' },
      { full: '止まった時計の動かし方', short: '時計の動かし方' },
      { full: '終わらない夕暮れ', short: '終わらない夕暮れ' },
    ],
    realizations: [
      '取り戻した一日を何に使えばいいのか、もう思い出せないことに。',
      '急いで歩いた日々のほうが、立ち止まった一日より、ずっとぼやけて見えることに。',
    ],
    questions: [
      'おまえの昨日と明日は、どちらが重い。',
      'おまえは何を待って、ここに座っている。',
    ],
    honests: [
      'わからない。わからないまま、ずいぶん経った。それだけは、確かに私のものだ。',
      '待っているものは、もう思い出せない。けれど待つあいだに、四季を百ぺん見た。悪くなかった。',
    ],
    gifts: [
      { full: '一日に一度だけ、好きな時刻を打つ振り子時計', short: '振り子時計' },
      { full: '砂が落ちきらない砂時計', short: '砂時計' },
    ],
    possessions: [
      { full: '一日を人の倍ゆっくり使う才能', short: 'ゆっくりの才能' },
      { full: '決して遅れない、正確な体内時計', short: '体内時計' },
    ],
    morals: [
      '失った時間は、惜しんだ時間よりも軽い。',
      '待つことも、歩くことのひとつである。',
      '時は、数えた者にだけ長くなる。',
    ],
  },
  {
    id: 'koe',
    kanji: '声',
    desires: [
      { full: '名前を呼んでくれる声', short: '名前を呼ぶ声' },
      { full: '忘れてしまった子守唄', short: '忘れた子守唄' },
      { full: '返事のある言葉', short: '返事のある言葉' },
    ],
    realizations: [
      '欲しかったのは声そのものではなく、呼ばれて振り向く、その一瞬だったことに。',
      '黙って隣にいた者の沈黙が、どんな声より雄弁だったことに。',
    ],
    questions: [
      'おまえの声は、誰のためのものだ。',
      'おまえが最後に名前を呼んだのは、誰だ。',
    ],
    honests: [
      'わからない。ただ、こうしておまえと話す夜は、自分の声が嫌いではない。',
      '思い出せない。だから今夜は、おまえの名前を聞かせてくれないか。',
    ],
    gifts: [
      { full: '遠くの誰かの寝言が聞こえる、小さな貝殻', short: '小さな貝殻' },
      { full: '一晩にひとことだけ返事をする、古い鈴', short: '古い鈴' },
    ],
    possessions: [
      { full: '谷じゅうに届く、よく通る声', short: 'よく通る声' },
      { full: 'どんな歌もひと息で覚える耳', short: '歌を覚える耳' },
    ],
    morals: [
      'いちばん遠くへ届く声は、いちばん静かな声である。',
      '呼ぶ声よりも、返す声のほうが勇気がいる。',
      '声は失くしても、言葉は胸に残る。',
    ],
  },
  {
    id: 'yume',
    kanji: '夢',
    desires: [
      { full: '続きの見られる夢', short: '夢の続き' },
      { full: '空を飛ぶ夢の種', short: '夢の種' },
      { full: '眠らずにすむ夜', short: '眠らない夜' },
    ],
    realizations: [
      '夢の続きよりも、目を覚まして誰かに夢を話す朝のほうが、好きだったことに。',
      '飛ぶ夢を見なくなったのは、歩くのが楽しくなった日からだったことに。',
    ],
    questions: [
      'おまえは夢の中で、何になっている。',
      '昨夜の夢を、覚えているか。',
    ],
    honests: [
      '覚えていない。けれど目が覚めたとき、誰かに会いたかった。それだけ覚えている。',
      '夢の中の私は、いつも今の私だ。それが少し、誇らしい。',
    ],
    gifts: [
      { full: '枕の下に置くと続きが見られる、夢の栞', short: '夢の栞' },
      { full: '眠るたびに少しずつ育つ、銀色の種', short: '銀色の種' },
    ],
    possessions: [
      { full: '眠ればかならず同じ場所へ行ける夢', short: 'いつもの夢' },
      { full: '夢と朝を間違えない、確かな目', short: '確かな目' },
    ],
    morals: [
      '夢は、覚めるためではなく、持ち帰るために見る。',
      '眠れない夜は、夢のほうが会いに来ている。',
      '語られた夢は、半分だけ本当になる。',
    ],
  },
  {
    id: 'kokoro',
    kanji: '心',
    desires: [
      { full: '悲しみの置き場所', short: '悲しみの置き場所' },
      { full: '冷めないぬくもり', short: '冷めないぬくもり' },
      { full: '涙の止め方', short: '涙の止め方' },
    ],
    realizations: [
      '差し出したもののあった場所が、からっぽのままで、いちばんあたたかかったことに。',
      '悲しみは置いてくるものではなく、連れて歩けるほど軽くなるものだったことに。',
    ],
    questions: [
      'おまえの胸の音は、誰に聞かせるための音だ。',
      'おまえは最後に、いつ泣いた。',
    ],
    honests: [
      '覚えていない。ただ、泣けなくなってから、月を見る時間が長くなった。',
      'わからない。けれどおまえが毎晩来るので、胸の音は前より速い。',
    ],
    gifts: [
      { full: '抱えると胸の音と同じ速さで脈打つ、丸い石', short: '丸い石' },
      { full: '涙を一粒ずつ仕舞える、小さな硝子の瓶', short: '硝子の瓶' },
    ],
    possessions: [
      { full: '何があってもこぼれない、なみなみの心', short: 'こぼれない心' },
      { full: '誰の悲しみでも温められる、大きな胸', short: '大きな胸' },
    ],
    morals: [
      '心は、注いだ場所で育つ。',
      '涙は、乾くのではなく、実になる。',
      'ぬくもりは、貸したことを忘れた頃に返ってくる。',
    ],
  },
  {
    id: 'kaze',
    kanji: '風',
    desires: [
      { full: '帰り道を知っている風', short: '帰り道の風' },
      { full: '飛ぶための翼', short: '飛ぶための翼' },
      { full: '遠い町の匂い', short: '遠い町の匂い' },
    ],
    realizations: [
      '翼がなくても、自分の足でここまで来られたことに。',
      '追い風を待つあいだに、向かい風の中を歩く脚ができていたことに。',
    ],
    questions: [
      'おまえはなぜ、ここを動かない。',
      '風はどこから来ると思う。',
    ],
    honests: [
      'わからない。ただ、ここで待っていれば、世界のほうが風に乗ってやって来る。',
      'わからない。けれど風が通るたび、遠くの誰かの話し声がする。だから窓は開けてある。',
    ],
    gifts: [
      { full: 'どんな凪の日にも回りつづける、小さな風車', short: '小さな風車' },
      { full: '行きたい方角へだけなびく、一枚の羽根', short: '一枚の羽根' },
    ],
    possessions: [
      { full: '明日の天気がわかる、風を読む耳', short: '風を読む耳' },
      { full: 'どこまでも歩ける、丈夫な四つ足', short: '丈夫な足' },
    ],
    morals: [
      '逆らった風の強さのぶんだけ、翼は強くなる。',
      '風向きは選べないが、帆の張り方は選べる。',
      '遠くへ行く者より、遠くを思う者のほうが、よく旅をしている。',
    ],
  },
];

const COUNT_WORDS = ['七', '九', '十三', '二十一', '四十九', '百'] as const;

// 喪失譚は「持つことと使うこと」の話なので、テーマを問わず筋に合う結びを使う
const LOSS_MORALS = [
  '天賦は、使う手の中でだけ生きる。',
  '失せ物は、探す者ではなく、使う者のもとへ帰る。',
  '持っていることと、生きていることは、別のことである。',
] as const;

interface ArcResult {
  body: string[];
  titleNoun: string;
  moral?: string;
}

/** 探索譚 — 求めて、歩いて、手に入れて、気づく */
function questArc(rng: Rng, t: ThemeDef, hero: string, setting: Setting): ArcResult {
  const desire = pick(rng, t.desires);
  const stranger = pick(rng, STRANGERS);
  const price = pick(rng, PRICES);
  const nights = pick(rng, COUNT_WORDS);

  const body = [
    `むかし、${setting.name}に、${hero}が住んでいた。${heroNoun(hero)}には、どうしても欲しいものがあった。${desire.full}である。`,
    `${heroNoun(hero)}は幾つもの夜を歩いた。からだは夜露に重くなり、来た道は星の数ほどになった。それでも、${desire.short}のことを思うと、不思議と足は前へ出た。`,
    `${nights}つめの夜、${heroNoun(hero)}は${stranger}に出会った。${stranger}は言った。「${desire.full}が欲しいなら、${price}を置いていけ」。${heroNoun(hero)}は長く迷い、迷ったまま、それを差し出した。`,
    `たしかに${desire.short}は手に入った。だが帰り道、${heroNoun(hero)}はふと気がついた。${pick(rng, t.realizations)}`,
    `${heroNoun(hero)}は${setting.short}へ帰った。${desire.short}は今も、${setting.short}のどこかで灯っているという。ただ、それを自慢する者を、誰も見たことがない。`,
  ];
  return { body, titleNoun: desire.short };
}

/** 問答譚 — 毎晩の問いに、ある夜ほんとうのことを答える */
function dialogueArc(rng: Rng, t: ThemeDef, hero: string, setting: Setting): ArcResult {
  const stranger = pick(rng, STRANGERS);
  const question = pick(rng, t.questions).replace(/。$/, '');
  const honest = pick(rng, t.honests);
  const gift = pick(rng, t.gifts);
  const nights = pick(rng, COUNT_WORDS);

  const body = [
    `${setting.name}のはずれに、${hero}が独りで暮らしていた。訪ねてくる者は、長いあいだ、誰もいなかった。`,
    `ある晩、${stranger}がやって来て、戸も叩かずに尋ねた。「${question}」。${heroNoun(hero)}は答えられなかった。${stranger}は何も言わず、帰っていった。`,
    `次の晩も、その次の晩も、${stranger}は同じことを尋ねた。${heroNoun(hero)}は賢い答えをこしらえては並べた。立派な答えほど、${stranger}は黙って帰った。`,
    `${nights}日目の晩、${heroNoun(hero)}は考えるのをやめて、ほんとうのことを言った。「${honest}」`,
    `${stranger}は初めて笑い、それきり来なくなった。代わりに戸口へ、${gift.full}が残されていた。${heroNoun(hero)}は今もそれを、問いの返事だと思っている。`,
  ];
  return { body, titleNoun: gift.short };
}

/** 喪失譚 — 失くして、探して、流れた先で知る */
function lossArc(rng: Rng, t: ThemeDef, hero: string, setting: Setting): ArcResult {
  const possession = pick(rng, t.possessions);
  const stranger = pick(rng, STRANGERS);
  const moral = pick(rng, LOSS_MORALS);

  const body = [
    `${hero}は、生まれたときから${possession.full}を持っていた。${setting.name}では知らぬ者のない自慢だった。`,
    `ところがある朝、それが失くなっていた。${heroNoun(hero)}は${setting.short}を隅から隅まで探した。岩の下も、水の底も、自分の影の裏側さえも。`,
    `探しくたびれた頃、${heroNoun(hero)}は${stranger}に出会った。${stranger}は静かに言った。「探しものは、失くした場所にはないよ。おまえがそれを使わなくなった日から、少しずつ、こちらへ流れてくるのさ」。`,
    `${heroNoun(hero)}は思い当たった。${possession.short}を最後に使った日が、もう思い出せないことに。自慢になった日から、それは飾りになっていたのだ。`,
    `${heroNoun(hero)}は${setting.short}へ戻り、翌朝から、あるかないかを確かめもせず、それを使って暮らした。${possession.short}がいつ戻ったのか、本人も覚えていないという。`,
  ];
  return { body, titleNoun: possession.short, moral };
}

/** 「片耳の狐」→「狐」を取り出す(本文の地の文用) */
function heroNoun(hero: string): string {
  for (const a of ANIMALS) {
    if (hero.endsWith(a)) return a;
  }
  return hero;
}

const ARCS = [questArc, dialogueArc, lossArc] as const;

export function weaveFable(seed: number): Fable {
  const rng = mulberry32(seed);
  const theme = pick(rng, THEMES);
  const epithet = pick(rng, EPITHETS);
  const animal = pick(rng, ANIMALS);
  const hero = `${epithet}${animal}`;
  const setting = pick(rng, SETTINGS);
  const arc = pick(rng, ARCS);

  const result = arc(rng, theme, hero, setting);
  const { body, titleNoun } = result;
  const moral = result.moral ?? pick(rng, theme.morals);
  const night = int(rng, 1, 999);

  return {
    id: `fable-${seed.toString(16)}`,
    seed,
    night,
    themeId: theme.id,
    themeKanji: theme.kanji,
    title: `${hero}と${titleNoun}`,
    body,
    moral,
    createdAt: Date.now(),
  };
}
