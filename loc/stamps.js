(function () {
this.stampInfo = {
    1: "vii here goes ikuze",
    2: "lyria hurray hooray",
    3: "io awesome gujjobu good job",
    4: "rackam much obliged thanks yoroshikuna",
    5: "katalina reporting in", // todo
    6: "lyria come forth", // todo
    7: "jita pots potions please pls plz heals healing hirupurizu",
    8: "gran give up", // todo
    9: "gran thanks arigatou",
    10: "jita good work otsukaresama",
    11: "eugen asarutotaimudaze strike time",
    12: "rosetta lets do it chansune",
    13: "io wait up chotto", // todo
    14: "lyria sorry gomennasai",
    15: "katalina wait for backup", // todo
    16: "vii totally crushed yararechimattaze",
    17: "rackam go wild", // todo
    18: "walder ive got your back", // todo
    19: "farrah im on it yarussu",
    20: "mary gimme loot torehanchodai",
    21: "gran full arsenal ueponbasuto",
    22: "jita phalanx farankusu",
    23: "gran panacea hiruoru",
    24: "jita laser focus fokasu",
    25: "jita crack shot bureikuasashin",
    26: "gran gravity wave gurabiti",
    27: "jita pandemonium", // todo
    28: "gran bullseye run kirusutoriku",
    29: "eugen heave ho soiya",
    30: "jin heave ho soiya",
    31: "soriz yo heave ho seiya",
    32: "legend of rackam",
    33: "rackam rakamuuuu",
    34: "rackaaam rakamuuuu",
    35: "rackaaaaam rakamuuuu",
    36: "rackaaam rakamuuuu",
    37: "amazing hesuge",
    38: "there you have it toiuwakenanjyayo",
    39: "farrah im on it yarussu",
    40: "lyria drool gyun",
    41: "lyria hi ohayou",
    42: "lyria vii congrats omedetou",
    43: "katalina stare",
    44: "lyria ok hai",
    45: "siero hello there! irasshai" /* sierokarte shortened because of conflict with lyria */,
    46: "lyria let me help", // todo
    47: "sir yes sir saiesusa",
    48: "jita gotta run", // todo
    49: "rosetta teehee tehepero star kira",
    50: "rosetta !? shock",
    51: "sturm ??? confused sweating flustered",
    52: "drang ouch!", // todo
    53: "rosamia let me at em feeling madayarerudesho?" /* ok omitted because of conflict with lyria */,
    55: "vira bam bam plush",
    56: "vira it's a secret himitsu",
    57: "ferry whoa fuee huee",
    58: "pommern nightmare",    
    60: "lyria gong jyan jan",
    63: "ferry sigh desuyoda",    
    70: "sutera hey! stop it! kunanno",
    71: "lyria vii viicakes warabimochi",
    72: "lyria vii go",
    77: "siero about that", // todo
    78: "vii nice he",
    79: "vii zzz sleep",
    80: "rosetta for you kiss chuu",
    81: "drang aww... deredere",
    82: "sturm ...",
    83: "lyria chomp musha",
    84: "mary boom bun",
    85: "achoo hekushu", // todo
    86: "tada", // todo
    87: "stan whoops daradara", // todo
    88: "vii", // todo
    89: "vii alec oh no... gatagatagatagata",
    90: "rackam wobble fura",
    91: "katalina bop bogo",
    92: "lyria vii drip drop zaaaa",
    93: "sen nya meow",
    94: "jita kira star wink",
    96: "gran nailed it yatta",
    97: "katalina please tanomu",
    98: "lyria peace",
    99: "lyria yummy jyururia",
    100: "rackam uh bye", // todo
    101: "io be quiet urusaibakaa",
    102: "siero stare",
    103: "siero pffft puu",
    104: "rowain aw yeah", // todo
    105: "vira wiggle ufufuniginigi",
    106: "jin command me", // todo
    107: "sturm drang poke punipunipunipunipuni",
    108: "yuel whats up gacha",
    109: "yuel nope batan",
    110: "vii heyo zu",
    111: "charlotta box nooooo waaaaaaaaaa",
    112: "metera bad slap bakapan",
    113: "sutera fail", // todo
    // todo 114
    115: "katalina ten", // todo
    116: "seruel no can do", // todo
    117: "danua",
    118: "zeta wha-wha-what haa",
    119: "vaseraga ive said too much", // todo
    120: "eustace mission accomplished", // todo
    121: "beatrix why me kusookusoo",
    122: "bea thump kneel bow dogeza ban",
};

this.kanaToRomajiTable = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  ゔぁ: 'va',
  ゔぃ: 'vi',
  ゔ: 'vu',
  ゔぇ: 've',
  ゔぉ: 'vo',
  か: 'ka',
  き: 'ki',
  きゃ: 'kya',
  きぃ: 'kyi',
  きゅ: 'kyu',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  ぎゃ: 'gya',
  ぎぃ: 'gyi',
  ぎゅ: 'gyu',
  ぎぇ: 'gye',
  ぎょ: 'gyo',
  さ: 'sa',
  す: 'su',
  せ: 'se',
  そ: 'so',
  ざ: 'za',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  し: 'shi',
  しゃ: 'sha',
  しゅ: 'shu',
  しょ: 'sho',
  じ: 'ji',
  じゃ: 'ja',
  じゅ: 'ju',
  じょ: 'jo',
  た: 'ta',
  ち: 'chi',
  ちゃ: 'cha',
  ちゅ: 'chu',
  ちょ: 'cho',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  だ: 'da',
  ぢ: 'di',
  づ: 'du',
  で: 'de',
  ど: 'do',
  な: 'na',
  に: 'ni',
  にゃ: 'nya',
  にゅ: 'nyu',
  にょ: 'nyo',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ひゃ: 'hya',
  ひゅ: 'hyu',
  ひょ: 'hyo',
  ふぁ: 'fa',
  ふぃ: 'fi',
  ふぇ: 'fe',
  ふぉ: 'fo',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  びゃ: 'bya',
  びゅ: 'byu',
  びょ: 'byo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  ぴゃ: 'pya',
  ぴゅ: 'pyu',
  ぴょ: 'pyo',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  みゃ: 'mya',
  みゅ: 'myu',
  みょ: 'myo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  りゃ: 'rya',
  りゅ: 'ryu',
  りょ: 'ryo',
  わ: 'wa',
  を: 'wo',
  ん: 'n',
  ゐ: 'wi',
  ゑ: 'we',
  きぇ: 'kye',
  きょ: 'kyo',
  じぃ: 'jyi',
  じぇ: 'jye',
  ちぃ: 'cyi',
  ちぇ: 'che',
  ひぃ: 'hyi',
  ひぇ: 'hye',
  びぃ: 'byi',
  びぇ: 'bye',
  ぴぃ: 'pyi',
  ぴぇ: 'pye',
  みぇ: 'mye',
  みぃ: 'myi',
  りぃ: 'ryi',
  りぇ: 'rye',
  にぃ: 'nyi',
  にぇ: 'nye',
  しぃ: 'syi',
  しぇ: 'she',
  いぇ: 'ye',
  うぁ: 'wha',
  うぉ: 'who',
  うぃ: 'wi',
  うぇ: 'we',
  ゔゃ: 'vya',
  ゔゅ: 'vyu',
  ゔょ: 'vyo',
  すぁ: 'swa',
  すぃ: 'swi',
  すぅ: 'swu',
  すぇ: 'swe',
  すぉ: 'swo',
  くゃ: 'qya',
  くゅ: 'qyu',
  くょ: 'qyo',
  くぁ: 'qwa',
  くぃ: 'qwi',
  くぅ: 'qwu',
  くぇ: 'qwe',
  くぉ: 'qwo',
  ぐぁ: 'gwa',
  ぐぃ: 'gwi',
  ぐぅ: 'gwu',
  ぐぇ: 'gwe',
  ぐぉ: 'gwo',
  つぁ: 'tsa',
  つぃ: 'tsi',
  つぇ: 'tse',
  つぉ: 'tso',
  てゃ: 'tha',
  てぃ: 'thi',
  てゅ: 'thu',
  てぇ: 'the',
  てょ: 'tho',
  とぁ: 'twa',
  とぃ: 'twi',
  とぅ: 'twu',
  とぇ: 'twe',
  とぉ: 'two',
  ぢゃ: 'dya',
  ぢぃ: 'dyi',
  ぢゅ: 'dyu',
  ぢぇ: 'dye',
  ぢょ: 'dyo',
  でゃ: 'dha',
  でぃ: 'dhi',
  でゅ: 'dhu',
  でぇ: 'dhe',
  でょ: 'dho',
  どぁ: 'dwa',
  どぃ: 'dwi',
  どぅ: 'dwu',
  どぇ: 'dwe',
  どぉ: 'dwo',
  ふぅ: 'fwu',
  ふゃ: 'fya',
  ふゅ: 'fyu',
  ふょ: 'fyo',
  ぁ: 'a',
  ぃ: 'i',
  ぇ: 'e',
  ぅ: 'u',
  ぉ: 'o',
  ゃ: 'ya',
  ゅ: 'yu',
  ょ: 'yo',
  っ: '',
  ゕ: 'ka',
  ゖ: 'ka',
  ゎ: 'wa',
  '　': ' ',
  んあ: 'n\'a',
  んい: 'n\'i',
  んう: 'n\'u',
  んえ: 'n\'e',
  んお: 'n\'o',
  んや: 'n\'ya',
  んゆ: 'n\'yu',
  んよ: 'n\'yo',
};

}());