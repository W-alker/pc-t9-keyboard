/**
 * 普通话拼音音节表（无声调）。
 *
 * 这 **不是词库**，只是「合法拼音音节」的集合（约 410 个），
 * 用来把单击产生的数字串切分/消歧成合法拼音字母串。
 * 真正的「拼音 → 汉字」由系统输入法完成。
 *
 * 约定：ü 一律写作 v（lü→lv, nü→nv, lüe→lve, nüe→nve），
 * 与微软拼音 / 搜狗 / QQ / 微信 在 QWERTY 上的输入习惯一致。
 */

export const PINYIN_SYLLABLES: readonly string[] = [
  // 零声母 / y / w
  "a", "ai", "an", "ang", "ao",
  "e", "ei", "en", "eng", "er",
  "o", "ou",
  "ya", "yan", "yang", "yao", "ye", "yi", "yin", "ying", "yo", "yong", "you",
  "yu", "yuan", "yue", "yun",
  "wa", "wai", "wan", "wang", "wei", "wen", "weng", "wo", "wu",

  // b
  "ba", "bai", "ban", "bang", "bao", "bei", "ben", "beng",
  "bi", "bian", "biao", "bie", "bin", "bing", "bo", "bu",
  // p
  "pa", "pai", "pan", "pang", "pao", "pei", "pen", "peng",
  "pi", "pian", "piao", "pie", "pin", "ping", "po", "pou", "pu",
  // m
  "ma", "mai", "man", "mang", "mao", "me", "mei", "men", "meng",
  "mi", "mian", "miao", "mie", "min", "ming", "miu", "mo", "mou", "mu",
  // f
  "fa", "fan", "fang", "fei", "fen", "feng", "fo", "fou", "fu",

  // d
  "da", "dai", "dan", "dang", "dao", "de", "dei", "den", "deng",
  "di", "dia", "dian", "diao", "die", "ding", "diu",
  "dong", "dou", "du", "duan", "dui", "dun", "duo",
  // t
  "ta", "tai", "tan", "tang", "tao", "te", "teng",
  "ti", "tian", "tiao", "tie", "ting", "tong", "tou",
  "tu", "tuan", "tui", "tun", "tuo",
  // n
  "na", "nai", "nan", "nang", "nao", "ne", "nei", "nen", "neng",
  "ni", "nian", "niang", "niao", "nie", "nin", "ning", "niu",
  "nong", "nou", "nu", "nuan", "nuo", "nv", "nve",
  // l
  "la", "lai", "lan", "lang", "lao", "le", "lei", "leng",
  "li", "lia", "lian", "liang", "liao", "lie", "lin", "ling", "liu", "lo",
  "long", "lou", "lu", "luan", "lun", "luo", "lv", "lve",

  // g
  "ga", "gai", "gan", "gang", "gao", "ge", "gei", "gen", "geng",
  "gong", "gou", "gu", "gua", "guai", "guan", "guang", "gui", "gun", "guo",
  // k
  "ka", "kai", "kan", "kang", "kao", "ke", "kei", "ken", "keng",
  "kong", "kou", "ku", "kua", "kuai", "kuan", "kuang", "kui", "kun", "kuo",
  // h
  "ha", "hai", "han", "hang", "hao", "he", "hei", "hen", "heng",
  "hong", "hou", "hu", "hua", "huai", "huan", "huang", "hui", "hun", "huo",

  // j
  "ji", "jia", "jian", "jiang", "jiao", "jie", "jin", "jing",
  "jiong", "jiu", "ju", "juan", "jue", "jun",
  // q
  "qi", "qia", "qian", "qiang", "qiao", "qie", "qin", "qing",
  "qiong", "qiu", "qu", "quan", "que", "qun",
  // x
  "xi", "xia", "xian", "xiang", "xiao", "xie", "xin", "xing",
  "xiong", "xiu", "xu", "xuan", "xue", "xun",

  // zh
  "zha", "zhai", "zhan", "zhang", "zhao", "zhe", "zhei", "zhen", "zheng",
  "zhi", "zhong", "zhou", "zhu", "zhua", "zhuai", "zhuan", "zhuang",
  "zhui", "zhun", "zhuo",
  // ch
  "cha", "chai", "chan", "chang", "chao", "che", "chen", "cheng",
  "chi", "chong", "chou", "chu", "chua", "chuai", "chuan", "chuang",
  "chui", "chun", "chuo",
  // sh
  "sha", "shai", "shan", "shang", "shao", "she", "shei", "shen", "sheng",
  "shi", "shou", "shu", "shua", "shuai", "shuan", "shuang",
  "shui", "shun", "shuo",
  // r
  "ran", "rang", "rao", "re", "ren", "reng", "ri", "rong", "rou",
  "ru", "rua", "ruan", "rui", "run", "ruo",

  // z
  "za", "zai", "zan", "zang", "zao", "ze", "zei", "zen", "zeng",
  "zi", "zong", "zou", "zu", "zuan", "zui", "zun", "zuo",
  // c
  "ca", "cai", "can", "cang", "cao", "ce", "cen", "ceng",
  "ci", "cong", "cou", "cu", "cuan", "cui", "cun", "cuo",
  // s
  "sa", "sai", "san", "sang", "sao", "se", "sen", "seng",
  "si", "song", "sou", "su", "suan", "sui", "sun", "suo",
];

export const SYLLABLE_SET: ReadonlySet<string> = new Set(PINYIN_SYLLABLES);

/**
 * 高频音节加权表（粗粒度，纯启发式，无完整词频）。
 * 仅用于在多个等长切分之间给出更自然的默认排序，可随时增删。
 */
export const COMMON_SYLLABLES: ReadonlySet<string> = new Set([
  "de", "shi", "wo", "ni", "ta", "men", "le", "zai", "you", "he",
  "hao", "bu", "yi", "ge", "shang", "xia", "lai", "qu", "shuo", "kan",
  "xiang", "hui", "neng", "dao", "shi", "zhe", "na", "zhi", "dou", "hen",
  "wei", "yao", "jiu", "zhong", "guo", "jia", "ren", "sheng", "xie", "xie",
  "zen", "me", "yang", "shen", "wen", "ti", "hua", "shu", "dian", "nao",
]);
