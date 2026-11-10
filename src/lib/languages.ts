// Languages Oja chats in. The model writes replies in the buyer's language and
// translates buyer messages for the seller on request. Prices are never translated
// by the model: they come from tools and pass the money guard as digits.
//
// "beta" = model quality not yet reviewed by a native speaker. Say so in the UI.

export const LANGUAGES = {
  en: { label: "English", native: "English", prompt: "English", beta: false },
  pcm: { label: "Nigerian Pidgin", native: "Naijá", prompt: "Nigerian Pidgin English (Naijá)", beta: true },
  yo: { label: "Yoruba", native: "Yorùbá", prompt: "Yoruba, with correct tone marks and dot-below letters (ẹ, ọ, ṣ)", beta: true },
  ha: { label: "Hausa", native: "Hausa", prompt: "Hausa in Boko (Latin) script, with hooked letters (ɓ, ɗ, ƙ)", beta: true },
  ig: { label: "Igbo", native: "Asụsụ Igbo", prompt: "Igbo, with dot-below vowels (ị, ọ, ụ)", beta: true },
  fr: { label: "French", native: "Français", prompt: "French", beta: false },
  de: { label: "German", native: "Deutsch", prompt: "German", beta: false },
  zh: { label: "Chinese", native: "中文", prompt: "Simplified Chinese (Mandarin)", beta: false },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;
export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

export function isLanguage(x: unknown): x is LanguageCode {
  return typeof x === "string" && x in LANGUAGES;
}

/** Chat widget copy. Non-English strings need native-speaker review before launch. */
export const UI: Record<LanguageCode, {
  welcome: (shop: string) => string;
  placeholder: string;
  send: string;
  typing: string;
  reviewing: (shop: string) => string;
  assistant: string;
  pay: string;
  language: string;
  aiNotice: (shop: string) => string;
}> = {
  en: {
    welcome: (s) => `Ẹ káàbọ̀. Ask ${s} anything.`,
    placeholder: "Type a message", send: "Send", typing: "Oja is typing…",
    reviewing: (s) => `${s} is reviewing the reply…`, assistant: "Oja · AI assistant",
    pay: "Pay securely with PayPal", language: "Language",
    aiNotice: (s) => `You're chatting with Oja, ${s}'s AI sales assistant. The seller can join any time.`,
  },
  pcm: {
    welcome: (s) => `Welcome o. Ask ${s} anything wey you wan know.`,
    placeholder: "Type your message", send: "Send", typing: "Oja dey type…",
    reviewing: (s) => `${s} dey check the reply…`, assistant: "Oja · AI assistant",
    pay: "Pay with PayPal, e safe", language: "Language",
    aiNotice: (s) => `Na Oja, ${s} AI sales assistant, you dey chat with. The seller fit join anytime.`,
  },
  yo: {
    welcome: (s) => `Ẹ káàbọ̀. Ẹ béèrè ohunkóhun lọ́wọ́ ${s}.`,
    placeholder: "Kọ ọ̀rọ̀ rẹ", send: "Fi ránṣẹ́", typing: "Oja ń kọ̀wé…",
    reviewing: (s) => `${s} ń wo èsì náà…`, assistant: "Oja · Olùrànlọ́wọ́ AI",
    pay: "Sanwó láìléwu pẹ̀lú PayPal", language: "Èdè",
    aiNotice: (s) => `Oja, olùrànlọ́wọ́ AI ${s}, ni ẹ ń bá sọ̀rọ̀. Olùtajà lè dá sí i nígbàkígbà.`,
  },
  ha: {
    welcome: (s) => `Barka da zuwa. Ka tambayi ${s} komai.`,
    placeholder: "Rubuta saƙo", send: "Aika", typing: "Oja yana rubutu…",
    reviewing: (s) => `${s} yana duba amsar…`, assistant: "Oja · Mataimakin AI",
    pay: "Biya cikin aminci da PayPal", language: "Harshe",
    aiNotice: (s) => `Kana magana da Oja, mataimakin AI na ${s}. Mai sayarwa zai iya shiga a kowane lokaci.`,
  },
  ig: {
    welcome: (s) => `Nnọọ. Jụọ ${s} ihe ọ bụla.`,
    placeholder: "Dee ozi", send: "Zipu", typing: "Oja na-ede…",
    reviewing: (s) => `${s} na-elele azịza ya…`, assistant: "Oja · Onye enyemaka AI",
    pay: "Kwụọ ụgwọ n'enweghị nsogbu site na PayPal", language: "Asụsụ",
    aiNotice: (s) => `Ị na-akparịta ụka na Oja, onye enyemaka AI nke ${s}. Onye na-ere ahịa nwere ike ịbanye mgbe ọ bụla.`,
  },
  fr: {
    welcome: (s) => `Bienvenue. Posez vos questions à ${s}.`,
    placeholder: "Écrire un message", send: "Envoyer", typing: "Oja écrit…",
    reviewing: (s) => `${s} relit la réponse…`, assistant: "Oja · assistant IA",
    pay: "Payer en sécurité avec PayPal", language: "Langue",
    aiNotice: (s) => `Vous discutez avec Oja, l'assistant commercial IA de ${s}. Le vendeur peut intervenir à tout moment.`,
  },
  de: {
    welcome: (s) => `Willkommen. Fragen Sie ${s}, was Sie möchten.`,
    placeholder: "Nachricht schreiben", send: "Senden", typing: "Oja schreibt…",
    reviewing: (s) => `${s} prüft die Antwort…`, assistant: "Oja · KI-Assistent",
    pay: "Sicher mit PayPal bezahlen", language: "Sprache",
    aiNotice: (s) => `Sie chatten mit Oja, dem KI-Verkaufsassistenten von ${s}. Der Verkäufer kann jederzeit dazukommen.`,
  },
  zh: {
    welcome: (s) => `欢迎光临。有任何问题都可以问 ${s}。`,
    placeholder: "输入消息", send: "发送", typing: "Oja 正在输入…",
    reviewing: (s) => `${s} 正在审核回复…`, assistant: "Oja · AI 助手",
    pay: "通过 PayPal 安全支付", language: "语言",
    aiNotice: (s) => `您正在与 ${s} 的 AI 销售助手 Oja 聊天。卖家可随时加入。`,
  },
};
