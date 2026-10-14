/**
 * Core emergency phrases for the non-English/Filipino UI languages. Each entry maps to one of the
 * canonical English reasons in safety.ts so reasons de-duplicate across languages.
 *
 * Scope: a first-pass safety net (breathing, chest pain, unconsciousness, seizure, severe bleeding,
 * poisoning/swallowed objects, self-harm, stroke signs). It is NOT exhaustive and needs review by
 * native-speaking clinicians before public release. The model also judges urgency independently.
 * COPY of server/src/lib/emergency-i18n.ts: keep the two in sync.
 *
 * Note: JS \b does not work for non-ASCII letters, so CJK/Cyrillic/Devanagari patterns omit it.
 */
export const MULTILINGUAL_EMERGENCY: { reason: string; re: RegExp }[] = [
  {
    reason: "severe breathing difficulty",
    re: new RegExp(
      [
        "no puedo respirar|no puede respirar|dificultad (grave |severa )?para respirar|me ahogo|falta de aire",
        "ne peux pas respirer|ne peut pas respirer|difficult[ée]s? (à|pour) respirer|j'étouffe",
        "keine luft|kann nicht atmen|atemnot|ringt nach luft",
        "não consigo respirar|não consegue respirar|falta de ar|dificuldade (grave )?(para|de) respirar",
        "non riesco a respirare|non riesce a respirare|fatica a respirare|difficoltà (grave )?(a|di) respirare|affanno",
        "sesak napas|sulit bernapas|susah bernapas|tidak bisa bernapas",
        "khó thở|không thở được|ngạt thở",
        "не могу дышать|трудно дышать|задыха(юсь|ется|ться)|одышк",
        "呼吸困难|喘不过气|无法呼吸|不能呼吸|喘不上气",
        "息ができない|呼吸困難|息苦しい|息が苦しい",
        "숨을? ?못 ?쉬|숨쉬기 ?(힘들|어렵)|호흡 ?곤란|숨이 ?(차|막)",
        "साँस (नहीं|लेने में (दिक्कत|तकलीफ|कठिनाई))|सांस (नहीं|लेने में (दिक्कत|तकलीफ|कठिनाई))|दम घुट",
      ].join("|"),
      "i",
    ),
  },
  {
    reason: "chest pain",
    re: new RegExp(
      [
        "dolor (de|en el) pecho|opresión en el pecho",
        "douleur (dans|à) (la )?poitrine|douleur thoracique|oppression thoracique",
        "brustschmerz|schmerzen in der brust|druck auf der brust|engegefühl in der brust",
        "dor (no|de) peito|dor torácica|aperto no peito",
        "dolore (al|nel) petto|dolore toracico|oppressione al petto",
        "nyeri dada|sakit dada",
        "đau ngực|tức ngực|nặng ngực",
        "боль в груди|давит в груди|сдавливает грудь",
        "胸痛|胸口痛|胸闷|胸部疼痛",
        "胸が痛|胸痛|胸の痛み|胸が苦しい|胸が締め付",
        "가슴(이|가)? ?(너무 |매우 |많이 )?(아프|아파|아픈|아팠|통증|답답|조이)|흉통",
        "सीने (में )?(दर्द|जकड़न)|छाती (में )?(दर्द|जकड़न)",
      ].join("|"),
      "i",
    ),
  },
  {
    reason: "loss of consciousness",
    re: new RegExp(
      [
        "se desmay|desvaneci|inconsciente|perdi[óo] el conocimiento|no responde",
        "évanoui|inconscient|perdu connaissance|ne répond pas",
        "bewusstlos|ohnmächtig|reagiert nicht",
        "desmai|perdeu a consciência|não responde",
        "svenut|incosciente|perso i sensi|perdita di coscienza|non risponde",
        "pingsan|tidak sadarkan diri|tak sadarkan diri|tidak responsif",
        "ngất|bất tỉnh|mất ý thức",
        "потерял(а)? сознание|без сознания|обморок|не реагирует",
        "昏倒|晕倒|昏迷|失去意识|不省人事|没有反应",
        "意識がない|意識を失|気を失|失神|反応がない",
        "의식(이)? ?(없|잃)|기절|쓰러|반응이 ?없",
        "बेहोश|होश (खो|नहीं)",
      ].join("|"),
      "i",
    ),
  },
  {
    reason: "seizure",
    re: new RegExp(
      [
        "convulsi|ataque epil[ée]ptico|crisis epil[ée]ptica",
        "crise d'épilepsie|crise épileptique",
        "krampfanfall|epileptischer anfall|krämpfe",
        "crise epil[ée]ptica",
        "crisi epilettica|attacco epilettico",
        "kejang",
        "co giật|động kinh",
        "судорог|эпилептическ|припадок",
        "抽搐|惊厥|癫痫发作",
        "けいれん|痙攣|てんかん発作",
        "경련|발작|간질",
        "मिर्गी का दौरा|दौरे पड़|झटके आ",
      ].join("|"),
      "i",
    ),
  },
  {
    reason: "severe bleeding",
    re: new RegExp(
      [
        "sangrado (abundante|intenso|severo|que no para)|hemorragia|no deja de sangrar|sangra mucho",
        "saignement (abondant|important|sévère|qui ne s'arrête pas)|hémorragie|saigne beaucoup|n'arrête pas de saigner",
        "starke blutung|blutet stark|blutung (lässt nicht nach|hört nicht auf)|blutet ununterbrochen",
        "sangramento (intenso|grave|forte|que não para)|sangra muito|não para de sangrar",
        "sanguinamento (abbondante|grave|intenso)|emorragia|sanguina molto|non smette di sanguinare",
        "pendarahan (hebat|parah|banyak)|darah tidak berhenti|berdarah banyak",
        "chảy máu (nhiều|không cầm|dữ dội)|xuất huyết|máu không ngừng",
        "сильное кровотечение|кровь не останавливается|кровотечение не останавливается|сильно кровоточ",
        "大出血|出血不止|血流不止|严重出血|大量出血",
        "大量出血|出血が止まらない|血が止まらない|ひどい出血",
        "출혈이 ?(심|멈추지)|피가 ?(많이|멈추지)|대량 ?출혈",
        "बहुत (ज़्यादा |ज्यादा )?खून|खून (बंद )?नहीं (रुक|थम)|भारी रक्तस्राव",
      ].join("|"),
      "i",
    ),
  },
  {
    reason: "possible poisoning or overdose",
    re: new RegExp(
      [
        "envenen|intoxicaci[óo]n|sobredosis|tragó (una )?(pila|batería|imán)|ingirió (lejía|veneno)",
        "empoisonn|intoxication|surdosage|avalé (une )?(pile|aimant)|ingéré (de l'eau de javel|du poison)",
        "vergiftung|vergiftet|überdosis|batterie verschluckt|magnet verschluckt",
        "intoxica[çc][ãa]o|engoliu (uma )?(pilha|bateria|ímã)|ingeriu (água sanitária|veneno)",
        "avvelen|intossicazione|ingerito (una )?(batteria|pila|magnete)|ha ingerito (candeggina|veleno)",
        "keracunan|overdosis|menelan (baterai|magnet)|minum (pemutih|racun)",
        "ngộ độc|quá liều|nuốt (pin|nam châm)|uống (thuốc tẩy|thuốc độc)",
        "отравлени|отравил|передозировк|проглотил(а)? (батарейк|магнит)|выпил(а)? (отбеливател|яд)",
        "中毒|服毒|药物过量|吞了(电池|纽扣电池|磁铁)|误服|误食",
        "過剰摂取|オーバードーズ|電池を飲|磁石を飲|誤飲|誤食",
        "과다 ?복용|(건전지|배터리|자석)(를|을) ?삼|독극물",
        "ज़हर|जहर|ओवरडोज़|ओवरडोज|बैटरी (निगल|खा)|चुंबक (निगल|खा)",
      ].join("|"),
      "i",
    ),
  },
  {
    reason: "thoughts of self-harm",
    re: new RegExp(
      [
        "suicid|quitarme la vida|quiero morir|hacerme daño",
        "me tuer|mettre fin à mes jours|veux mourir|me faire du mal",
        "suizid|selbstmord|mich umbringen|nicht mehr leben|mir etwas antun",
        "me matar|tirar a minha vida|quero morrer|me machucar",
        "uccidermi|togliermi la vita|voglio morire|farmi del male",
        "bunuh diri|ingin mati|mengakhiri hidup|menyakiti diri",
        "tự tử|muốn chết|tự làm hại|kết thúc cuộc sống",
        "суицид|самоубийств|покончить с собой|хочу умереть|навредить себе",
        "自杀|想死|轻生|不想活|伤害自己|自残",
        "自殺|死にたい|消えたい|自傷|リストカット",
        "자살|죽고 ?싶|자해|극단적 ?선택",
        "आत्महत्या|मरना चाहता|मरना चाहती|खुद को नुकसान|जान देना",
      ].join("|"),
      "i",
    ),
  },
  {
    reason: "sudden neurological symptoms",
    re: new RegExp(
      [
        "cara caída|habla (arrastrada|confusa)|debilidad (repentina|súbita)",
        "visage affaissé|paralysie faciale|difficulté à parler|faiblesse soudaine",
        "schlaganfall|gesicht hängt|undeutlich sprechen|plötzliche lähmung",
        "rosto caído|fala arrastada|fraqueza súbita|derrame",
        "ictus|viso storto|parla male|debolezza improvvisa",
        "mulut mencong|bicara pelo|lemah mendadak",
        "đột quỵ|méo miệng|nói ngọng|yếu đột ngột",
        "инсульт|перекосило лицо|невнятная речь|внезапная слабость",
        "口齿不清|嘴歪|半身(不遂|无力)|突然(无力|麻木)",
        "ろれつが回らない|顔が(歪|ゆが)|半身(麻痺|不随)|突然(のしびれ|の麻痺)",
        "말이 ?어눌|얼굴이 ?(처|비뚤)|반신 ?마비|갑자기 ?(힘이|마비)",
        "लकवा|चेहरा टेढ़ा|बोलने में दिक्कत|अचानक कमजोरी",
      ].join("|"),
      "i",
    ),
  },
];

/** "Fever" in the added languages (used only for the newborn/infant urgency floors). */
export const FEVER_MULTILINGUAL = new RegExp(
  [
    "fiebre", // es
    "fièvre", // fr
    "fieber", // de
    "febre", // pt
    "febbre", // it
    "demam", // id
    "\\bsốt\\b|sốt cao", // vi
    "температур|жар\\b", // ru
    "发烧|发热", // zh
    "発熱|熱が|熱があ", // ja
    "발열|열이 ?나|열이 ?있", // ko
    "बुखार", // hi
  ].join("|"),
  "i",
);
