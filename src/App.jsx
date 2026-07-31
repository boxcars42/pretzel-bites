import { useState, useEffect, useCallback } from "react";
import { db, auth, googleProvider } from "./firebase";
import {
  doc, getDoc, setDoc, collection,
  getDocs
} from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// ── Palette & design tokens ──────────────────────────────────────────────────
// Light: warm white #FAFAF8, ink #1C1C1E, sage accent #5B8C7A, sand card #F0EBE3
// Dark:  #111210, #E8E4DC, #6BAF96, #1E2420
// Signature: the Hebrew word is always the largest element on screen — 72px+,
// centered, Frank Ruhl Libre, with a faint pretzel watermark behind it.

const SAMPLE_WORDS = [
  {
    id: 1, hebrew: "לְהַסְכִּים", root: "ס-כ-מ", binyan: "הִפְעִיל",
    pos: "פועל", transliteration: "lehaskím",
    en: "to agree", ru: "соглашаться",
    examples: [
      { he: "אֲנִי מַסְכִּים אִתָּךְ לְגַמְרֵי.", en: "I completely agree with you.", ru: "Я полностью согласен с тобой." },
      { he: "הֵם לֹא הִסְכִּימוּ עַל הַמְּחִיר.", en: "They didn't agree on the price.", ru: "Они не договорились о цене." },
      { he: "בּוֹא נַסְכִּים עַל מָחָר.", en: "Let's agree on tomorrow.", ru: "Давай договоримся на завтра." },
    ],
    tags: ["💬 Small talk", "🏦 Bank"], level: "Bet",
    conjugations: { present: ["מַסְכִּים","מַסְכִּימָה","מַסְכִּימִים","מַסְכִּימוֹת"], past: ["הִסְכַּמְתִּי","הִסְכַּמְתָּ","הִסְכִּים","הִסְכִּימָה"], future: ["אַסְכִּים","תַּסְכִּים","יַסְכִּים","תַּסְכִּים"] }
  },
  {
    id: 2, hebrew: "שׁוּק", root: "—", binyan: "—",
    pos: "שם עצם", transliteration: "shuk",
    en: "market / bazaar", ru: "рынок / базар",
    examples: [
      { he: "הַשּׁוּק פָּתוּחַ בְּיוֹם שִׁשִּׁי בַּבֹּקֶר.", en: "The market is open on Friday morning.", ru: "Рынок открыт в пятницу утром." },
      { he: "קָנִיתִי עַגְבָנִיּוֹת טְרִיּוֹת בַּשּׁוּק.", en: "I bought fresh tomatoes at the market.", ru: "Я купил свежие помидоры на рынке." },
      { he: "הַשּׁוּק הָיָה עָמוּס מְאוֹד.", en: "The market was very crowded.", ru: "Рынок был очень оживлённым." },
    ],
    tags: ["🛒 Supermarket", "💬 Small talk"], level: "Alef",
    conjugations: null
  },
  {
    id: 3, hebrew: "לְהִתְנַהֵג", root: "נ-ה-ג", binyan: "הִתְפַּעֵל",
    pos: "פועל", transliteration: "lehitnahég",
    en: "to behave", ru: "вести себя",
    examples: [
      { he: "הוּא מִתְנַהֵג יָפֶה מְאוֹד.", en: "He behaves very nicely.", ru: "Он ведёт себя очень хорошо." },
      { he: "אֵיךְ מִתְנַהֲגִים בַּמִּשְׂרָד?", en: "How do people behave at the office?", ru: "Как ведут себя в офисе?" },
      { he: "הִתְנַהַגְתְּ כְּמוֹ מַלְכָּה.", en: "You behaved like a queen.", ru: "Ты вела себя как королева." },
    ],
    tags: ["📚 University", "💬 Small talk"], level: "Gimel",
    conjugations: { present: ["מִתְנַהֵג","מִתְנַהֶגֶת","מִתְנַהֲגִים","מִתְנַהֲגוֹת"], past: ["הִתְנַהַגְתִּי","הִתְנַהַגְתָּ","הִתְנַהֵג","הִתְנַהֲגָה"], future: ["אֶתְנַהֵג","תִּתְנַהֵג","יִתְנַהֵג","תִּתְנַהֵג"] }
  },
  {
    id: 4, hebrew: "תּוֹר", root: "—", binyan: "—",
    pos: "שם עצם", transliteration: "tor",
    en: "queue / turn / appointment", ru: "очередь / запись",
    examples: [
      { he: "יֵשׁ תּוֹר אֶצֶל הָרוֹפֵא.", en: "There's a queue at the doctor.", ru: "У врача очередь." },
      { he: "קָבַעְתִּי תּוֹר לַמִּסְפָּרָה.", en: "I booked an appointment at the hairdresser.", ru: "Я записался к парикмахеру." },
      { he: "הַמְתֵּן בְּבַקָּשָׁה, זֶה לֹא הַתּוֹר שֶׁלְּךָ.", en: "Please wait, it's not your turn.", ru: "Подожди, пожалуйста — ещё не твоя очередь." },
    ],
    tags: ["🏥 Medical", "🏦 Bank", "🚌 Transport"], level: "Alef",
    conjugations: null
  },
  {
    id: 5, hebrew: "לְסַדֵּר", root: "ס-ד-ר", binyan: "פִּיעֵל",
    pos: "פועל", transliteration: "lesadér",
    en: "to arrange / to sort out / to tidy", ru: "устраивать / разбираться / убирать",
    examples: [
      { he: "אֲנִי אֲסַדֵּר אֶת הַחֶדֶר.", en: "I'll tidy up the room.", ru: "Я уберусь в комнате." },
      { he: "סִדַּרְנוּ אֶת הָעִנְיָן עִם הַבַּנְק.", en: "We sorted it out with the bank.", ru: "Мы разобрались с банком." },
      { he: "מִי יְסַדֵּר אֶת הַתּוֹר?", en: "Who will arrange the appointment?", ru: "Кто запишется на приём?" },
    ],
    tags: ["🏦 Bank", "💬 Small talk"], level: "Bet",
    conjugations: { present: ["מְסַדֵּר","מְסַדֶּרֶת","מְסַדְּרִים","מְסַדְּרוֹת"], past: ["סִדַּרְתִּי","סִדַּרְתָּ","סִדֵּר","סִדְּרָה"], future: ["אֲסַדֵּר","תְּסַדֵּר","יְסַדֵּר","תְּסַדֵּר"] }
  },
  {
    id: 6, hebrew: "דַּוְקָא", root: "—", binyan: "—",
    pos: "תואר הפועל", transliteration: "davká",
    en: "specifically / actually / on the contrary / of all things", ru: "именно / как раз / назло",
    examples: [
      { he: "דַּוְקָא הַיּוֹם הוּא בָּא.", en: "He came specifically today (of all days).", ru: "Именно сегодня он и пришёл." },
      { he: "אֲנִי דַּוְקָא אוֹהֵב אֶת הַגֶּשֶׁם.", en: "Actually, I like the rain.", ru: "Мне как раз нравится дождь." },
      { he: "הִיא עָשְׂתָה אֶת זֶה דַּוְקָא.", en: "She did it out of spite.", ru: "Она сделала это назло." },
    ],
    tags: ["💬 Small talk"], level: "Bet",
    conjugations: null
  },
  {
    id: 7, hebrew: "לִגְמוֹר", root: "ג-מ-ר", binyan: "פָּעַל",
    pos: "פועל", transliteration: "ligmór",
    en: "to finish / to complete", ru: "заканчивать / завершать",
    examples: [
      { he: "גָּמַרְתִּי אֶת הַשִּׁעוּרִים.", en: "I finished my homework.", ru: "Я закончил домашнее задание." },
      { he: "מָתַי תִּגְמְרִי אֶת הַתֹּאַר?", en: "When will you finish your degree?", ru: "Когда ты закончишь степень?" },
      { he: "גָּמַרְנוּ אֶת הָאֹכֶל.", en: "We finished the food.", ru: "Мы доели всё." },
    ],
    tags: ["📚 University"], level: "Alef",
    conjugations: { present: ["גּוֹמֵר","גּוֹמֶרֶת","גּוֹמְרִים","גּוֹמְרוֹת"], past: ["גָּמַרְתִּי","גָּמַרְתָּ","גָּמַר","גָּמְרָה"], future: ["אֶגְמוֹר","תִּגְמוֹר","יִגְמוֹר","תִּגְמוֹר"] }
  },
  {
    id: 8, hebrew: "בְּדִיּוּק", root: "—", binyan: "—",
    pos: "תואר הפועל", transliteration: "bediyúk",
    en: "exactly / precisely", ru: "именно / точно",
    examples: [
      { he: "זֶה בְּדִיּוּק מַה שֶּׁרָצִיתִי.", en: "That's exactly what I wanted.", ru: "Это именно то, что я хотел." },
      { he: "הַשָּׁעָה בְּדִיּוּק שֶׁבַע.", en: "It's exactly seven o'clock.", ru: "Ровно семь часов." },
      { he: "בְּדִיּוּק כָּךְ.", en: "Precisely so.", ru: "Именно так." },
    ],
    tags: ["💬 Small talk"], level: "Alef",
    conjugations: null
  },
  {
    id: 9, hebrew: "לְהַצְלִיחַ", root: "צ-ל-ח", binyan: "הִפְעִיל",
    pos: "פועל", transliteration: "lehatzlíakh",
    en: "to succeed / to manage to", ru: "успевать / удаваться / преуспевать",
    examples: [
      { he: "הִצְלַחְתְּ בַּבְּחִינָה!", en: "You passed the exam!", ru: "Ты сдала экзамен!" },
      { he: "אֲנִי מְנַסֶּה לְהַצְלִיחַ בָּעֲבוֹדָה.", en: "I'm trying to succeed at work.", ru: "Я стараюсь добиться успеха на работе." },
      { he: "לֹא הִצְלַחְנוּ לְהַגִּיעַ בַּזְּמַן.", en: "We didn't manage to arrive on time.", ru: "Нам не удалось прийти вовремя." },
    ],
    tags: ["📚 University", "💬 Small talk"], level: "Bet",
    conjugations: { present: ["מַצְלִיחַ","מַצְלִיחָה","מַצְלִיחִים","מַצְלִיחוֹת"], past: ["הִצְלַחְתִּי","הִצְלַחְתָּ","הִצְלִיחַ","הִצְלִיחָה"], future: ["אַצְלִיחַ","תַּצְלִיחַ","יַצְלִיחַ","תַּצְלִיחַ"] }
  },
  {
    id: 10, hebrew: "כֵּיף", root: "—", binyan: "—",
    pos: "שם עצם", transliteration: "keyf",
    en: "fun / pleasure / vibe (slang)", ru: "кайф / удовольствие",
    examples: [
      { he: "הָיָה כֵּיף הַיּוֹם!", en: "Today was so fun!", ru: "Сегодня был кайф!" },
      { he: "מַה כֵּיף לִרְאוֹת אֶתְכֶם.", en: "What a pleasure to see you all.", ru: "Как здорово вас видеть." },
      { he: "זֶה לֹא כֵּיף.", en: "That's not fun / That's not cool.", ru: "Это некайфово." },
    ],
    tags: ["💬 Small talk"], level: "Alef",
    conjugations: null
  },
];

const LEVELS = ["Alef", "Bet", "Gimel", "Sabra", "בן/בת ארץ"];
const XP_PER_LEVEL = 200;
const TAGS = ["💬 Small talk","🛒 Supermarket","🏥 Medical","🏦 Bank","🚌 Transport","📚 University"];

// David and Alexandra share one word bank / XP / streak / confidence now,
// instead of each having their own. Every read and write below points at
// this fixed path instead of the signed-in user's own uid.
const BANK_UID = "shared-bank";

function xpToLevel(xp) {
  const lvl = Math.min(Math.floor(xp / XP_PER_LEVEL), LEVELS.length - 1);
  return { level: LEVELS[lvl], progress: (xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100, xp };
}

// ── AI lookup via Anthropic API ──────────────────────────────────────────────
async function lookupWord(word) {
  const prompt = `You are a Hebrew language expert. The user looked up the Hebrew word or phrase: "${word}".

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "hebrew": "the word in Hebrew with nikud if possible",
  "transliteration": "romanized pronunciation",
  "root": "2-4 letter Hebrew root (שורש) written like ס-כ-מ, for nouns AND verbs — use — only if the word truly has no root (loanword, particle, adverb)",
  "binyan": "binyan name in Hebrew (e.g. פָּעַל, פִּיעֵל, הִפְעִיל, נִפְעַל, הִתְפַּעֵל, פֻּעַל, הֻפְעַל) or — if not a verb",
  "mishkal": "the noun/adjective's mishkal (morphological pattern) in Hebrew, e.g. קַטְלָן, מִקְטָלָה, or — if not a noun/adjective or unclear",
  "pos": "part of speech in Hebrew (פועל/שם עצם/תואר/etc)",
  "prepositions": "fixed preposition(s) this verb takes with example, e.g. 'מתעניין ב-' or — if not a verb or none",
  "grammarNote": "one short English sentence on how this word is used grammatically",
  "en": "English definition",
  "ru": "Russian definition",
  "examples": [
    {"he": "Hebrew sentence with nikud", "en": "English translation", "ru": "Russian translation"},
    {"he": "Hebrew sentence with nikud", "en": "English translation", "ru": "Russian translation"},
    {"he": "Hebrew sentence with nikud", "en": "English translation", "ru": "Russian translation"}
  ],
  "tags": ["one or more of: 💬 Small talk, 🛒 Supermarket, 🏥 Medical, 🏦 Bank, 🚌 Transport, 📚 University"],
  "level": "one of: Alef, Bet, Gimel",
  "conjugations": null or {"present":["m.sg","f.sg","m.pl","f.pl"],"past":["1sg","2msg","3msg","3fsg"],"future":["1sg","2msg","3msg","3fsg"]}
}`;

  const res = await fetch("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  console.log("API response:", JSON.stringify(data));
  const text = data.content?.find(b => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── AI: on-demand "Learn More" info ──────────────────────────────────────────
async function lookupLearnMore(word) {
  const prompt = `You are a Hebrew language expert. For the Hebrew word "${word.hebrew}" (${word.transliteration}, meaning: "${word.en}"), return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "usage": "2-3 sentences in English on how this word is actually used in modern spoken and written Israeli Hebrew",
  "collocations": ["3-5 common word pairings or set phrases using this word, in Hebrew with nikud"],
  "register": "one of: Formal, Colloquial, Both — with a short note on when to use which",
  "frequency": "one of: Very common, Common, Moderate, Rare — in contemporary Hebrew"
}`;

  const res = await fetch("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── AI: related words sharing a root or mishkal ──────────────────────────────
async function lookupRelatedWords(word) {
  const basis = word.root && word.root !== "—" ? `root (שורש) ${word.root}` : `mishkal (pattern) ${word.mishkal}`;
  const prompt = `You are a Hebrew language expert. List other common, real Hebrew words that share the same ${basis} as "${word.hebrew}". Return ONLY a JSON array (no markdown, no explanation), maximum 6 items, each shaped like: {"hebrew": "word with nikud", "transliteration": "romanized pronunciation", "en": "short English gloss"}. Do not include "${word.hebrew}" itself. If you can't find any real related words, return [].`;

  const res = await fetch("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── Icons ────────────────────────────────────────────────────────────────────
const PRETZEL_B64 = "iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAACAASURBVHic7N15nF1FmT/+z1Nnu1t3Z+vs6ewEJhAEsiCggoDLuDuiqCOjIzKCJIERt5+o0a+OjqMiCS6D6EQ2HYPLqIyjoMw4iLIIAjKGdBaydnrv23e/Z6nfH51A9vTtPudU3Xuf9+vFC03urXroOn3qOXVqARhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYiw+pDoCxsdrx7nkJZDBPGsEcCWqXUk6WwGSScjJITAHkFAATAWQAWASQBCYAAAG2BNIHihoG4AMoASgD5AEyh5EPZkliQEq5n0C9INkTAF0E0QvD76lUKvuXfr03H/9/PXvmmvaM4zjT4RtTIYKpFGA6JE2VkO2SaAYRJkKi7cDHWwEYABIAkgf+dysAEFCQQPXA5wYP/NsFkJfAABH1IQj6JVE/Af1E1E+QveSL3cjjufkbnyvH+J/NWGg4AWBa23bVgjZy3GWBoFMR0DxJwTySNB+EeQBmqI4PACQwIECdEnILJG2RJLdAUmfVL3ZycjA+z1zTnrGN1GISwSkIxGIiuQSgxRLyFIwkdzroArBDQj5HEDsk8JwguRkl8+mFt27Pqg6OsePhBIBpQV4Go3PW3FMokGeQpDOJ5BkSWAZgrurYxmkvgL8Q8KgEPSql9+jiDXv3qA5KR52rZ80mMlcQ5AoJrADwVwBmqo5rnJ4j4Gkp6WlJ8kkp6OnFe3duoU3wVQfGGCcATIlnrmnPJMzkKkicD8L5EjgXB4Zkm0AXJB4F6FEpgkftKj0y9xu7Bk/+tcax8+qOiVVbrqRArADkChBWQJMRnRgMQ+L3IPodAvyukCg/fOaXuguqg2LNhxMAFotnrmnP2GbiYiJ6OSTOB3AmAFN1XJrwATwOSfeBcL+U1kOLN2ytqA4qTJ2rFzkk3fNJyEsk4VJInA1AqI5LEx4If4LE76TEr4tO5TecELA4cALAIrPl+o4FwsclEngdAZcCcFTHVCdKAH5HEvdLwv0L1+96nACpOqhaHWx/Ai6RwCvRPCM84+WB8DAF+Fk9tz/THycALDQPrIM5e3DOxSTpzYB8FUAdqmNqEHtA+BEBmxZM3PUQrUOgOqBjkesgdvTPOT8gugzA36D+39/rYicI/yWAH87ft+s3PH+AhYUTADYuch3E9sGO8yRwGSTeBmCa6pgaXB+AX0iJTXsm7/rFRevgqQzmiPZ/C7jTj5QEBgi4V5f2Z/WNEwA2JtvWdlwAKS+XoLeAO31V9kHKHwVC3nnKzXsejrPiztXzziX47wTR36B5Ju/pZj+kvAeSvr/oll2/Ux0Mqz+cALBR23HdvAl+ELwVhGshcYbqeNhh/kIS360G/m2nfW1vfxQVbLtqQZtMeG8j4GoJvCiKOtiYPUsS/xag+p3FG/b3qg6G1QdOANhJbV3TcQ6AqwC8CyO7qDF9VQj4KSRuXbBh16/DmDx2sP0JeOchuycyPVUJ+I8w2581Lk4A2DFt/vCSFqNSvJICugaERarjYWPyf5D4Vy+Z/LdTv/hsrpYvbv7wkharVHqvJFwF4LSI4mNRkthKwNfcZPLbtbY/aw6cALDD7Lhm3nTPDN4PYDUBk1THw0IxDMJGz5f/fOotu/ed6IOdq6e3g+wPgNu/kQyDsBGG96VFX9m3W3UwTB+cADAAwPa1s5cFUnwAwBUYOTCFNZ4KgB8IMj634OYdzx76F5uvnTvfNOR1kHgf+DVPo3IJ+AlI/svCm3c/qjoYph4nAE1u++rZKwOIz4DwStWxsNj4BPxIAv8MAAR8RAJvxsgJeazxSQC/oEB+auEtux9THQxThxOAJrV1zZzTCfRJCbwFfB0w1qzul4I+svirOx9XHQiLH9/4m8yW6+aeJgL5MQDvBO/FzhgDpATuNaRx44INO55UHQyLDycATWLrP86cQ575TxJ4B7jjZ4wdzQdwp28EH19y0569qoNh0eMEoMHtu2pmquSYqyXhRgAZ1fEwxrRXlIQNVbf02aVf782rDoZFhxOABta5uuN1RFgPYJ7qWBhjdWcPCB9fePOuO3hDocbECUAD2nbtnOVS0M0AzlMdC2Os7v2vFHQdTxRsPJwANJB9V81MFZLmJ0niBvCSLsZYeAIAt1W80gf5tUDj4ASgQWxdM/tVgPgmgLmqY2GMNSYCdgRSvn/xht2/Uh0LGz9OAOrczqs7JroWvoCRw3oYYyxyBGzyLO+aJV/e16c6FjZ2nADUsa1r5lwOiPWAbFcdC2OsyRB6JHDt4pt3bVIdChsbTgDqUOfqRa1E1X8BP/UzxhQjYJMQ4qr5X31uSHUsrDacANSZztXzziUK7gSwUHUsjDF2wE4h5bsWbNj9v6oDYaPHCUCdeGAdzNkDHTcScCN4hj9jTD+eJHw5W2r/xPJb/+iqDoadHCcAdWDztXPnWwLfk5CrVMfCGGMn8ZDwjXcs+NqOnaoDYSfGCYDmtq6Z/SoJcRcBk1THwhhjo9QvpXwHLxfUGycAmpIAbV/d8WFJ+Bx4yJ8xVn98CXx20aRdn6F1CFQHw47GCYCGNn94SYtZKW6EpDerjoUxxsaDgJ8JIa7gVQL64QRAM53Xdywln34EyFNUx1IvAhnAdz14vg//0H+CADIIEAQBAjny74NHmgTyhf9NAEi8cEKyMAQECQgx8m/DEBCGAePAP6ZhwDBNCMGnKusgkAE814Pv+fCDF9o/8F9o90AGCPwXHkJlELxwug0BgsQL/1u80P4kBAwhnm/759vfMl/4DjspCWyWgt58yld3/kV1LOwFnABoZPvajksDYBMk2lTHoiPf81H1qnCrLlzXhed5cF13pGNXQAgBy7JgWiYs04JlW7AtG4bBb2yicGT7u64Hz9Og/U0TpmXBtizYNrf/CeQJ9LaF63f+p+pA2AhOADSxbfXcv5ckvwnAUh2LDgI/QKVaQaVaQbVSRbVaVXajr5UQArZtw3Ec2I4Nx3IgDH5arEXgB6i4B9q+UkGljtrfEAKWbY9cAwkHju3waNELPIJcvXD97m+qDoRxAqCcBGjrmo5PEfAp1bGoFAQBKuUySuUyKpUKXLexlhFbloVEIgHHceAkEjC4QzhMEAQoV8oolyqoVMqN1/6mhURipO25/QEQ1i+cuOt6nhyoFicACnWuXuSAKt8h0DtUx6JCtVpFqVRCqVSCW62+8E62wREA27aRTKWQTCRg2bbqkJRwq1UUyyWUiyVUm6z9LdtGMpFEMpWE3aTtT8A9thFcMeemPSXVsTQrTgAU2XHdvAl+EPwMwAWqY4mLBFApl1EsllAqF+F7vuqQtGCaJpKJJFLpFBzHUR1OZCSAarWCYqGIYonb/yDTNJFMJpFKJmEnEk11Uybgtyibr1946/as6liaUTNda9rYeXXHxKqF/yJgpepY4lCpVlEsFlAsFOH7fNM/EdM0kUylkEmlGmZkoFqtolAocKc/CoZhIJVOI51KNc/IgMTjvu29ko8Wjh8nADHbvnb+tAD+fZA4Q3UsUQr8AIViAbl8Hl6Dvc+Ni2XbyKTTSKfTdTeJzA8CFAsFFPIFVN2q6nDqkmVZSGcySKfTzTBn4C9eIC859Zbd+1QH0kw4AYjRtrULOqT07gewWHUsUalUKsjlciiVSpCyWd7qRotASGVSmLJkFdov+QckTzkfRts0BMUsKnueRu7he5D/08+BuH7eJJA567VoWfUWOLNOh0i1wc92o7jlQfTe/6/o2/wISsUit39ICIRUKoVMS6ahXxERsMMN6OJTb9m5Q3UszYITgJhsvnbufFPI+wEsUB1L2KSUKBaLyOVyqFb5aS90RJh/+TrMvexG0HE2nylt/QO6v3M1/MJApKEYmcmY9p6vI7no3GP+vZQBnvv3z+C5H3wmvoSkidi2jZaWFqTTKTTm7VvuIshLFq7f06k6kmbQiFeQdrZeP3sRfPE/AGaqjiVMMgiQy+eRy+X43X6E5r/905j31k+e9HOVXU9h7/rLIN1yJHGQncSsNZvgzDn526sd31+H5/7905HEwQDDNNCSaUFLSwuIGu42vk9K+dLFG3ZvUx1Io2v4F0uqbf3HmXPgi/vQQJ1/IANkh7PYu28fhoaGuPOPUGbeMsy97MZRfdbpWIYJF78/slgmXvKBUXX+ADDvbZ9EZv6LIoul2fmej6GhIezdtxfD2eG62SRplGYS6IEd182bpzqQRscJQIS2vn/hVOmZvwIwT3UsYZCBRHY4i3179yE7lG20m46WZr927XGH/Y+l7aXvBgkz9DjIMNH2kitG/3kSmP3qD4QeBztc4AcYyg5h3759I4lAo7x2Iczx/eC+566bO0N1KI2ME4CIPPvBmVNgub8h4FTVsYyfRD6Xx7593PHHbeKyi2v6vJGeCH/y/HA31ZGAN2kBRKq2IypqjZ2NXRCMJAJd+/Yhn8+jIXZVIizyAvmrv3xg1mTVoTQqTgAisO2qBW2GZ/4ChKWqYxmvUrGEfV1dGBgcgB/wUH/c7AnTa/5O2Uije38XyuXxzwUol8vo2t+FipGu+bv2pIZ561U3fN/HwMAAuvZ3oVRuiA32TrcN4/6dV3dMVB1II+IEIGQ73j0vIRPezyGxXHUs4+F6Hnp6etDb1wvP9VSH07T8Uq7m73iFLKpVd6T9envhebW3n+d66O3pRU9PD1zXhV8aHkMcfPy7Kq7rorenF7099f/7K4EXuRb9uHP1osZdA6kIJwAhkgB5rcFtqOPtfaWUyA4NYX9XOE+QbHxy2x6r6fPSd5Hf+dTz/79UKqGrqwvZ4eyo1uVLOTLPo6vr8CfI3PYnIP3aNnSqNXYWvlK5hK79XRjKDtX5vgzyZYTqdyWvXAsVJwAh2rqm458IeKfqOMaqXCkf6CyG6/xm0Ti6frOxps/3PvwTePnBw/5sJKnLYn/XflQqleN+t1wuY//+/cgOZSGPeInsFYbQ9+jPaopl/2++W9PnWTSklBjODqOrqwuVek7qCW/btnbOZ1SH0Ug4AQhJ59q57yXgo6rjGIsgCDDQP4Ce7p4xDRez6PT87gcY+vN/j+qzXjGL7bcf/xJ0PRfd3d0YHByEDF7o4GUgMTA48Pxw//Fsu/2j8IqjexUw+NSv0fP7e0b1WRYPz/PQ3dOD/oGB+p3IK+nGbWvmRLfWtcnwcEoIOtfOeSVJ+jmA8NdfRaxcLqN/oJ8PadGY1ToFZ37iF2hZdPxpJV4xiz9/4c0YfPo3oyrTME1MnjQJRIT+/v5RJ34Tl12M0z/yI5ip1uN+Znjro3jq//013GE+20VXpmli0qRJSCQSqkMZC1dK+drFG3b/SnUg9Y4TgHHqvL5jKfl4CMDx74gakpDIDg5hOFf7JDMWP2En0fGmD2P2a9fAykx6/s+l76L34Z9g+x0fQ2l/bRunHfzlr/VlT3LGIiz8289jyqo3gAzr+T93c/3Y8/ObsevH/4Igot0IWXgIQKalBRMmTgDVW1dAyAZELz7lqzv/ojqUelZnra6XzR9e0mKWSw8DOG3UXyKBxPxzkFpyAcyJswAA7sAelLY8iPKOxwEZ/dCc57ro7es74XAv0xMZJlrmnwV78ix4+UHkdz511Dv/uJiZicjMXQYzMxHV/r3IbX8ckpeK1h3LstA+ZQpMyzr5h8cr1PsfbaGysXLhrduz0QTb+DgBGCMJ0La1c+6BpDeP9jvJJRdgyps+CXvGkmP+fXXfZvT9+NMobXkotDiPVCgUMDAwwJP8GGPPIyJMmjgR6Uwmsjoiuf9J/HThhl1vpMbY+ih2huoA6tW71sz9BIBrRvv5CRdeiWnvuglGS/txP2O0TEHL8jchKOdQ2flEGGE+T0qJwcEBZLOcLDPGjlYqleD5PpLJROivBCK7/xGWDKxqq2x4OPtgSKE2FU4AxmD72o5LJfAtjHIVReacN6D9bZ8HRrOnOwmkTn0Z3O6tqO7fMs5IR/iej97eHpRK/F6WMXZ8brWKUqmMZDIBIcJZJBb1/Y+Ai9asanlk/cPDW8cZatPhVwA12nzt3PmGkI8RMOnknwZEshUdn/gtjHRtO1n6hQHs+n8vRTCGneAOValU0Nfbx9v4MsZGTQiB9vZ2OM74Nt+L8f7XL3zjnAVf27Gz5iCbGO8DUIMH1sE0RXD3aDt/AGg97+01X/wAYKQnofXcy2v+3qHyhTx6enq482eM1SQIAvT09KBQKIyrnBjvf5MDw7/7gXX1txRbJU4AajBncM6nADq3lu+kT790zPWlzhj7d7PZLAb6ebIfY2xspJTo7+/H0NDYz3SI+f53XsdAx8fHXGET4gRglLZe23E+JH2s1u9Z0xaOuU576qLavySBgQGe7McYC8fw8DD6+/sxlon2cd//JHBj53VzXzzmSpsMJwCjsO2qBW0QuBNjmDQpnLEvqxHJlpo+H0iJnr6ekfPAGWMsJIVCAb09fTWPKMZ5/zvAFIG8q3P1orramE0VTgBGIUh4XwMwbyzf9XNj3w7VH+4d9WellOjr6UWZZ/ozxiJQKpfQ09tT0zkCcd3/DiWB+UTV9WOuuIlwAnASW9fMuXw8J/yVx7Gev/zcH0f1uSAI0N3dg3KFO3/GWHQq5Qp6ekafBMRx/zuOv+tc23HZeApoBjxj8gSe/eDMKXBpw3jKyD/+U2Re9Joxfvfkx6+OzNbtRrXK2/oSCIZpVAzDGDKE6CYSO2HQXgL2SqLdBrDNkmIvALhekFv+vZHHk4euSM5KS9uulL020UIThStmuzJYQITTTMN4q+/55AU+PNeD67m855iuCLBMC6ZlwjAMmMKQnu//uwQ2WyS2B1awJ8jJQSdhZgtUrZ53e2kvADz29pYplilaAMClYJYPLKRAdkjCTPhyViCDeYEfTPMDv833fOfIo5KbTbVaRXdPD6ZOnQrjJHsFRH3/OxECbvnLB2b95rSv7e0fV0ENjBOAEzBd8yYJTBlPGYWnfonKrifhdJxZ0/fKzz2Owp/vO+FngiBAd08P3Cbs/AUJadlWnyBji7CMR2zQ/XZ5+P6lm7wqUNuRxiMdQemoP+9c03EnHbFXhpQSnuui6rpwXRdutYpypcKrLWJGREg4DizbHvnHMmGZFogOay6SgL94/a5Pn6isA4ngwbHqHQCOu6vcM5fBriZaL3ERXOq7wYpA+qe4VXdKIIOm2lPFrVbReyAJONGGQVHe/05KYqplGF8G8O7xFdS4muqircXWNbNfBYhfhFGWOWk2Zn/wpzAyk0f1eb8wiL1feQPcvuPvaRHIAL3dPahUq2GEqD0hhLRse49hGg+apvhBbl7u5xetq7Gnr8HWa+e+GkL+56g+LIGKW0W1UkG5XEalUqnf89Y1JYSA4zhIOAnYCQeOZddw9wpevWj9nv+KKrYH1sFs3ZZ5ve/Ly7zAv6Baqc5qloTAdmxMbT9xEhDF/a8GUhBeueDmXePMJhpTU1yktXrmmvaMYyb/DGBuWGXa00/B9Ku+DWtyxwk/5/Y9h/3fuhLV/Z3H/UwgJXp7elCpVMIKT0umaVYs037MssSdyXL+O0s3IZZsZ+SUx+KfATpxYx2XRLlcQbFYQrlcgudFlqc0NNM0kUwmkUwmkUg4GMft6rmCXTn9zC91j29Xm1F64N1IZPzMez0veIfrVpd7nmfHUa8qjuNg6tSpR46+HCbM+98YbC/YlWVxtX894QTgGLau6fgqgLVhlyvsFNouuhKt570d5oSZh/2dN7QPww/djaEHboOsHj0c/TwJ9Pb1olQ6wWfqmGmarmXaj9iW+Mo5d+R/pCKGrWs7bobEmrDKq1arKBaKKBQKvCvjSRiGgXQ6jXQqBcsOr9+UhK8uvnnX9aEVWIPH3tV2meu517luZYXn+TGcuRu/ZCqJKVPaT9ihhHL/GyMCfWXh+p0fDL3gOscJwBG2XTtnuRT0MKJcIUEEe+pCmJNmAwC8gT2odo/uHIv+gQEUGmydPxHBsZ1dpm2tX3FH7iYClI2fb7lu3otEEDyGCA7KkgAq5TLy+TyKxRJ4NuEIAuAkEshkMkilkojotuRREJy98JY9T0dR+GhIgJ54V9s/VLzqDeVyeWGjzRtJp9OYPHkUw/zjuP+Ngy8lrVi8IeRjVuscJwCHkABtW9PxIIDzVMdyLENDQxgeHlYdRmgMw/CTjvOrAObac+8eDnXMbywOtP9vAVwQdV2+7yOfyyNXyCHwm3O+gDAEWjItyGQyMIw4Dial/1m4fudFOpwd/6crWk4p+/76Srlyie/7DXMqa1trG9omtKkO43j+d9H6XS9VHYROOAE4xLbVc94uie5WHcexFAqFA9tx1j/LMku2nbi92Ja84aKv92oznLFt9dx3SpJ3xllnICWKhTyGh3NNM1fANE20trQilUlDnOC9cTTk2xet3/39mCs9rgeuac+khks3VSrlv/VcL6E6njBMnjwZ6XRadRjHJIG3LV6/6weq49AFJwAH7L5+drLii78gxIl/YalUK+jp7qn7pWaGaVaSieSGFXfmPqJymP9YRib+lTYDmHnSD0dAAigWi8hmh+C5jZkImKaJCRMmIJlKqbzx7K14pVOXapR4AoAExCPvSP9Txa2srfdEgECYNn0qbHt8RwlHQmJ3quKdOvPWfUXVoeiAdwI8oOyLj0DDzt/zPPSNYQ9unZim6ba0ZDYEp3uZlXfmPqRb5w8AVrn0MSjq/IGRTDydSmHmjBmYNHESDNEwo8IwhIGJkyZh5swZSKnt/AFglmMlPqI2hKMREKy6u/BRf6nXkslkvmGaRt1u7iEh0dvTB9/TcMIrYU7Rsf5RdRi64BEAAJ2rZ80WZGyWgFbjVhIS3fu7Ua3Ttf6GEDKZSt5ftZN/c8F3+nKq4zmeZ6+fPcvwxRYAKdWxHCSlRDabrfs5H22tbWhtbQUJrW41JSn9UxZv2LtHdSDH88Bl7ZmEVfhepVR6TSClVj+80XJsG1OnTTvh8kBFikTmaQtv3r5LdSCq8QgAAEHG53Xr/AFgcGCwbjv/ZCKxJZVuW7byzsIrdO78AUD49Blo1PkDIysj6nnU56BABrp1/gCQJDI+oTqIE7loU2/+xXcXX9fSMuFFiURim+p4xqJSrWJocFB1GMeSktL7jOogdKDdb2bcOq/vWEo+noJmyVChWEB/X/1N+jNNw006qRtX3JX7oupYRmPLdXNPE4F8Cppti10sFtHXN/aT1HSi6aQwXxo4c/FNu55RHchoPPzOzOpqpfwltw43FdK1/QNBZ5zy1Z1/UR2ISlp1eioIH+ug2c/BdV0M9g+oDqMmI++wk49ObktPr5fOHwAokF+EZp2/53kYGKiv9j+RwYFBHSc2GuTRZ1UHMVqr7spvSFrJWalU6vF6e2obHBiA52o3pcEQvvyU6iBUq7drKVTbrp19hhTiT9AoAZDywHt/t36G/g3D8JPp9AdX3j58s+pYarF1Tcc5AB6FRr8HUkrs7+6GW6evfo7Htm1M0/B9MJFcufDm3Y+qjqMWj13R8o+FQvGL9bR/gGXbmK5f+0shjbMWbNjxpOpAVNGm41NCiM9Bs5/B0NBQXXX+jpPY1TKhZWG9df4HfAYadf4AkM1mG67zB0a2Q85ms6rDOIoM6EbVMdRq+e25r6QzmSWJRELbSYxHcqtVDA0NqQ7jSBSQ19SjAFrd/OJ0YMvfR6DRz6BcLqOnp0d1GKNCREil0v+x6q78G1XHMhY6Pv2XKxX0dner36YuIgRg6vRpcDRbH16PowAH/eGd6e8XC8W3abC54ai0T52KZEKrbQ4kkVxVr+0/Xlo9/cZJEn0WGt38gyBA/0B9TPozDMPPpNPvr9fOHwAksA4atb+UEgMD/XVyGx8bCaCvrx9Ss6OS63EU4KBz7ypc3tqWvkYYhl4/1OMYGOjX7ahskqCmHQXQ5gYYp+2r558ZkP8n1XEcql4O+bEsq5BKZs475/bBp1THMladq+eeRST/CI2u/4GBAeTroP3D0JLJYOKkSarDOFTdvwt+9IoJZ5VLhQdd19VqOeuxZDIZTNKs/QG5bNH63X9WHUjcmnIEQJJ/g+oYDlWulOui87cTia6kmZhXz50/AJDAh6BR51+uVJqm8weAfD6PSqWiOoxDUUB+XR8Vu+L2oSdEwpmfcJz9qmM5mXw+j3K5rDqMQ5GEaMrdAbW5Ccalc/Ws2UTGdgBanMstpcS+ri74mh8Ek0wmnygvKa28aB30DvQktq1d0CGltw2aLP2TUmJ/1364nnbLpCJlWRamT5+u06xwV0p/gc67A47GM5fBHjaTj5VKpTNUx3IipmlixowZOrV/1Qvk/FNv2b1PdSBxaroRABLGGmjS+QMjs7517/xT6eQfXvy90tn13vkDQADvemjS+QPAcHa46Tp/YGSvC822ObaIxFrVdXiC6AAAIABJREFUQYzX0k2ovvh7pWWZVOoXqmM5Ec/zdGt/2xJ0reog4qZN+hWHAye+7QIwQXUsAOB6HvZ3dWm95Ws6lf7ZqrsLr1cdRxg6Vy9qJaruBtCqOhZg5CbYpXn7R4mIMGPGDJimNvlYjsrmnIW3btdvveIY/OEd6XuLxcJfq47jeAgH2t/Spv0HK16pQ7eTIqPUVCMARqV4JTTp/AFgaGBA65t/OpP5QaN0/gAAqlwJTTp/ABgcHNS6/aMmpcTgkFZ7xbcg4b1bdRBhOffuwmvS6dQ9quM4HgmJgUGtdrycmDCT71UdRJyaJgGQAJGkq1XHcVCpWEJJr4kwh0mn0v+56s7821THERYJEEH8g+o4DiqXyyiVSqrDUK5ULGk1ISwA3i8baGR01V3Fy1Kp1E9Ux3E8uv0eSGB1I7X/yTRNArB9TcfLASxWHQcwsh56aFi7XbGel0qlf7Pq7sJrVMcRph1rOy4B5Cmq4wBG2n9Qz1PSlBgcHNRmHxsCTt22Zu6FquMI07l3F9+USib/V3UcxzM4NKRN+wNYuPW6eS9THURcmiYBkBLvUx3DQfl8Hm5Vz4lfyWTyiXPvLlysOo6wBZDvVx3DQfl8Hq5+h6Mo47ou8gV9XrsSpDYjhWE593ullyaTyadVx3Esnmbtj8DXpq+IWlMkAM9+cOYUELTYtU5KiWEN90QHRtb5l5eUVqqOI2zPXj97FiRpMZdB5/ZXKZvNQmryGCiBNz533dwZquMIW6tXWu44TrfqOI4lO5SFDPRofwK9eff1s7XaqSgqTZEAGJ71dwC02IA8N5yD7/uqwziKZVlFsswXNcJSvyMJX1wBTZb+5fJ6tr9qvu8jP6zNU6Dl+fhb1UGEbekmVB1hn25ZVkF1LEfyAx+5fE51GAclqr54l+og4tDwCYAESEp5peo4gJH9/odzWq19BTCyt38qmXnx+Xfk6+MkohoRoMUvcxAEGM7q1/66yA5n9VkVQfIK1SFEYfn3cn2pVOplhtDv7IDh3LA250To9Mo4Sg2fAGxf23E+AaeqjgMYefrT7CCMkVP9kskP1Pv2vsezffXslQBOUx0HoGf76yQIAuSGtXkKPL3zurlnqw4iCud8N/vHRDJ5nW6T3QM/QC6nySgQYWnn6nnnqg4jag2fAEDS21WHAABSr5vb89LJ1PdX3Jn/V9VxREWS8XeqYwAAGUjkcvq1v25yuRwCTUYBKGjMUQAAWHVXfkMqldRueWAuN6zNKBCJQIu+I0oNnQDIy2BIyL9RHQcA5AsF7Z7+HCexa+XdhYa9yJ9Zt9SWkFrsZZAv5BH4erW/7ST2205Cq8Nj/MDX6GAsesdjV52jzbbhYTv37uKbHMfRau97Pwj0ORhL4i1yXWP3kQ39H7d9RseFAKapjgPQ7+nPMAzfSTgvVx1HlBL9+UsBTFYdByC1G/0xhAgcO3lpa9K6yDCEVpnJyDwZHZ4CZXub03OR6iiilLETF5iGodXE35EzAnRof8zsHJxzgeogotTQCYCU0OLpr1gowtPowB8CkEqlb1j+3ew21bFEKSBoMfpTKBTh+fq0PwCkUul/WXHH4J+XbcxtTiRTX1Adz6F8z0exUFQdBgCAiLS4hqJy5h3ZHXYq8SGdZgP4vo+CJu1vSKFFHxKVhk0AHlgHE4Q3qY4DALKaPf2nUslHV9wx/FXVcUTpgXUwCVKLtf+6jf44icSWFXfmPnrw/6+6M//xZDLRqTKmI+nzM6M3PbBOjyWkUTn3jsJXk6nU46rjOJQu7S8h/0ZeBkN1HFFp2ARg9uCciwFMUR1HpVqBW62qDuN5hmF4nmG8VnUcUZvdP+fl0GD4v1KpoKpZ+zutmQuP/PNM2niJaZrabE9YqVZR0eLnJtvn9M19qeooomZK45U6tX+1WkW1okP7Y9qBV8kNqWETAJL0ZtUxANBnWcsByVTqo4263v9QJDRpf10mNB2QTKU+uvzWvq4j//yM2wrdqVTyEypiOp68Lk+BBt6iOoaoLf9eri+RTH5KdRyH0mVjoKCBXwM1bAIAyFepjiDwA5SKerzLAoBkIrFl5R25L6uOI2oSIEgoP8zID3yt2t9xEntP1P7Lb8/9s51IHJUcqFIsFLVYOUEyUH4txWHlHbnPJ5zEDtVxHFQsFrVYOSWk+r4kKg2ZAHRe37EUoA7VceQLeW3WtAoS0jKSDf8kAwCd1807E8Bs1XEU8wVt2h9EcBzr8pN9zEmY7yBNNoiRkCgUdNi1ljpG7imNz7ASbxJEWly0UkoU8urbXwLzt6+dv0R1HFFoyASAfHq16hgAoFhUf/EelEwm711+16CWp4GFjaT/16pjAICCRu2fSiZ+u/z23IMn+9yKjfn/TqaSv48jptHIa/IzJI+0uKaiturOoScTyeT9quM4SJf2l4GvRZ8StoZMAEBSeWO51Sqqmhz5a5qmW5yQatgNf45EUn0CWHX1aX9hGL4pzVG/x0yn6E2GYWhxYpE2v0ca3FPi4tj2Ww1N9gbQpf0DQkMmgA2XADxzTXsGEso3b8hrMXQ5IplMfPOir/fqNRstIjuv7pgIQPke3joMXR6USiS/ufx7ub7Rfv6M2wrdiUTytihjqoUmIykXdK5e1Ko6iDictXFoKJFIflt1HAfp0P4EvOTJG6alVccRtoZLAGwzcTEAW3UcRU0mf5mWWc4vzP+j6jji4jryZdDg6F9t2t80q4XF+etq/V6mml9jmqYW67CKeiTTliBX+YNFXA60f0V1HIA27Z/IVBIXqg4ibA2XABCR8u1tq9WqNme+J53kzRetgxbDeXGQkl6mOgad2j/hJL47lvZfugnVRMK5K4qYauX7vhZ7aUiSF6qOIS5LN6GasBPfVB0HoE/7g3Cx6hDC1nAJACTOVx1CuVxWHQIAwLLM0vI7c/+f6jjiRBLKEwBd2t8wDE+kW2t++j9IpNqu1WWf+JIGP1OpwbUVp8Ip+Rt0GQXQof0DSOV9S9gaKgF45pr2DIAzVcdRKpVUhwAAsO3EdwlQv5A2JtuuWtAGYJnqOHRp/0QisWn5rfvG/C5i+a37inbC0eLI2HJJfQdAwNnNMg8AAC5aB89x9BgF0qX9D/QxDaOhEoCEmVwFDd7/uhrMWjUMwy+2JT+kOo44BY73UkD9vt1atL8wgqQ0PzDeclKt1lWGYShPIquuBkPAgEnSbbinwBNxneR1OqwI0aX9HTO1QnUQYWqoBECH4X/f9xFI5fdLJB3nV80y8/95hPNUh6BL+ztJ575ld2cHx1vOsm9kBx3H+U0YMY1HEARa7AoHEbxYdQhxuuA7fTnHcX6tOg5t2l+DPiZMDZUABKR++Z/nqn9lSkRI2EbTzPw/iAgrVcegQ/uDAMeyP3ryD46OZVkf1WFvQNdTP7ICScqvsbglTGM1kforQIv2J04AtCQvg6FDB+AHykfL4DjOzmUbc5tVxxGnA/v/n606Dh3a37ad/WdtHPpTWOWd893sH23bUX6AlO+p/9lKwgoJTfZKjsmLbs9tSTjObtVx6ND+gDyvkY4HbpgEYOv0jiWQaFMdhw57v1uW/VXVMcSt87q5pwKYoDoOHdrfsa3QN3Exbfu7YZdZMw1+tgRM2rp6zgLVccTNsq2vqY5Bh/YH0Lpj5vxFqoMIS8MkACTkGapjANR3AKZpusvvGF6vNAgFhJRaTM5R3f6GMIK8kf9s6OWmWtYZhlD6Elb1z/YgAfUjjXHLLch9WfX2wLq0vw9f+UqjsDRMAoBAaNEoqi9Ry7QfaaalfwdJ4CzVMQDq299x7Ecv2ojQ10wtv3Vf0bGdx8Mutxaqf7YHSUFaXGtxumgdPCdhP6YyBl3an6QeD5thaJgEgEiPRjGF2h+pbYmvKA1AFQktjmtV3f6mY34hsrJN+4tRlT0aQvHP9gXydNURqGBa1gaV9evT/qTFw2YYdPmJjpuEVL4BEAAIQ938ENM0q+fckf+RsgAUIkCLm7LK9jcMw1u+MRfZxj3L78huUjkMbJqazL3SJNmM2/KNw3cbpqlsKr427Q9o8bAZhoZIAHZcN28CQHNUxwEAhsIOwDLtR5VVrtDu62dPAjBDdRyA2vZ3bPv/oq7Dsq1no67jeITQpQOgOQd2nWw6jmP9UVXd+rQ/5m/+8JIW1UGEoSESAFf6y6DJ0hzTNJUNVZmmuENJxYq5HmnzRKay/Q3D/Peo67As856o6zgWIQRMU/kmnweRTPjaXHNxMoXxPRX16tb+ZrncEKMADZEACNAS1TEcyrbjP41YCCHzZl79Ui0FAqLTVMdwKBXtT4JAKTPypVopS6xXsSmMYzux13kikqDVNReXannCtwSJ2Ofj6db+JHGq6hjC0BAJAAKapzqEQ6m4WC3b3hPF7O96IAlarctW1P5dy28dzEZdz9JvDw/Ylh37pkC2E39SdSIU6HXNxeW8TXtKlm11xV2vbu0vKZinOoYwNEYCIDBfdQiHSqYSsddpCeO3sVeqCSH1uhmraH9bmLHt12/a5v/EVddByWQy7ipPQi5UHYEqpmU9GHedurU/gbTqc8aqMRKAQM5THcKhbNuJ/X0VmWJTrBVqREKvBEBF+wvD/I/4KhP3xlYXRuZVqHitciKS9HroiBMJI9aVRlq2PzBPdQxhaIwEQMNfxlQqFVtdgoTML8jFelPWjFYJABBv+4MIOSP7s7iqK2YSP4xzHkAqHePPcpRIw2suLiKR/ZEQ8c0D0LH9Af36nLGo+wRg9/WzkwCmqY7jSJlMBnEtTLBsq++iddDgGLr4jSwBxUTVcRwpzva3TTMX5/yPi77emzdNsxBPbYRMOhNPVbWZ0ihLwWq1/Fa4pmX1x1Obtu0/o3P1Ir1mJo5B3ScAnmvOhSZLAA9lmibSMWWuhhBNdfLfofzAn606hmOJtf1Nc2ssFR3CMs1tcdSTyaR0Wv51GKdYmaU6BlUMYWyJox6N218IKneoDmK86j4BkEagxQZAx9La2hpLZiJMQ9nmHMoFYqrqEI4nrvY3DOMPMVRzGBFHnQS0tLRGXs1YeSamq45BFdMU0d9zNG9/QHACoJoM5BTVMRyPZVnItEQ/SmhB3Bd5JZoiQ9+bcFztLwwZ2fa/x69T/DTqOlpaWmBZVtTVjBkFvrbXXtQkKPJ7ju7tL0nfvme06j8BINK6ESa0tUW7PSwR7PLw/dFVoLdABlrfhKNvfyBHhfiXgDqZB6Ic3TBMAxPaJkRYw/iRJK2vvSgVjNx9UU4ErYf2l1Jo3feMRgMkANC6EUgITJo8KbLyTcOoLN2EamQVaI5I75tw1O1vCMNTsQHU8lv3FaM6GIgATJo0CSp2HKxFQPpNPo7LRRtRNgwjkvtOvbS/AI8AKCeknKw6hpNJJpJoa43m7BAhjMh3f9OZbPL2NwwjH0nBo6s7kpUArRPakEzotfHLsRD0fviIWlT3nnppfwlof+85mbpPAKTU+xXAQa0T2iLZzco0xP7QC60jRNB7nPCAqNpfGKI39EJHiYToC7vMZDK6ZClsBNRHoBERBoW+JXQ9tb+E/g8fJ1P3CQCoPrIwAjBl8hQ4iXC3iSUSO0MtsM5ISXWxFjuq9hfC2BtqgTXVTaHWnUgkMHlKXeTzAAApofMU9cgZwnguzPLqrf0F6uPh80TqPwGQiO4Fa8hIENrb25FwwusESNCe0AqrT/XxuICI2p8o9j0ADhJChLYXgJNw0N7eDqH5e9/DkKybay8KJMNLAOux/SXVT99zPPWfABD0f1l0CEGEKVPbkQ5rq1jCvnAKqlt19RQWdvsLSZ2hFDQWJEKpO5VOY2r7VO0nfR2N6uraC5sU4dx76rb9g/rqe46l/hMAQK9TIkZBEGHylCmYNGkSxruJIaG5XwFQnSUAQMjtb2MgnKhqJyEHx1UAARMmTMCUyZPr7+Y/ou6uvTARaNc4C6j39q/7rYC13GOxRnXbCJlMBpZtY2BgAG51bCtqpB80dQKAOkwADwql/atyKOSwRo3IGHMCYNs2Jk2apN0pbzWh+r32wiCEfG6s322M9pd1HPyI+k8ACDZiO5cqfI5tY/r06cjncshmswiCoKbvJ+zwZ+LWFYLVzO0vhLoRABJezXULIdA2oQ2ZTIt+B3jUSkLfbepiIKVV8wqUhmp/UN0+fB5U/wlAHY8AHEQY2fYyk8kgn88jl8vB80a3x0qZrJhOZdMTSZh13P8DGF/7C8NUlgAIOfq6DcNAJpNBS0sLhGiEN48A0NwJgI1g1PeeBm1/HgFQTtZ/IxxERGhpaUFLSwalUhmlUhHFYumET4Vp4TV1AiAb6CY8lvZ3ScR0LOvRyKQT7gMgDIFUIoVkKolkMgEND+0cr4a59sbC9YLcif6+Cdq/7h8+6z8BaIAs7GiEZDKJZDKJiZMAt1JF1a3CrVZRdV0EfoAgGPkHw8PKdoLTRCNcw0cYffsLK6EsAQiMVC8hCyHEyD+GgG1ZsGwblm3Dtu3Gu+UfrqkTgKSXG86Bmrn9OQFQbffu3QYRgQTBIAOmZcI0TZiWCcd2tD5NajQIgO3YsJ1j5zkLu3b58Uakl927dgkJghAHrgFhwDANWIYJ07Zg2zZs067bh4+TtX9lUosHRStBkzMnehMSdX8LOTYJuG4V1WoVruvC9T14no8g8CEDiSCQIMiGGcsei56lCOYMaHsaeyhc10W1UkHV8+B7HjzXgy9HrgEpZYSnfMWjIX57gyAAAsCHj6p7+GxqIQQSicTzT1QN9P4JAPDU3GkJoLtpXwNIIkCO3JAPXgOoAqVDPiOI4Dgj10AilYBpNMRlDwBozWYzgJqJgKJ3qAVRnnQYM8/zUC6XUCqWUamUEciTzC4hAup5Buo4zSguSR7+m1b/giBAqVhCsVxEpVw54eu3Ol26eJj6vxOe5HcwCAIUi0UUi0UAhGQqgZZMCxIhbclqtEyBNbkDRks7glIW3nAP3N7nAFnbbO6xsktmAkDTJgACJAPIE/4mBlKiVC6hVC4BgyO7jqVTGaTTqbr/Ja4GtrIEIGFZLX6NqxZ0Iw/cHwqFAsqVSk3fJZBs5gTAKGUToJjewJKA1T4PZutUiGQb/Fwv3P5d8HPhHEdRKpeRz+VQKpXRTG1a9wkASZLyJB3ACyRKxRJKxRIsy0JrSytSmXTNo8PCSaP1JVcgc9Zr4cw+/ai/94d7UHj6Pgz9921we7bXWHqNsdgU7ubydYYIErK2JqyUK6iUK8gODSLT0lLXM5ODwMsoq9vzWlC3P7cAuVwO+VwOY01iSDRRT3EMZIkEIjkQ+gXW1AWYcOGVSJ/xChit7Uf9fWXPn5F//GcY/t/bEVSLNZUtARQLBQxns3BHuermUET1nwDWfQJwshGA43FdF/0D/RjODWPChAmjPqktc/brMeVNnzzmxXiQ0ToVree/Ey3nvg3DD96B/p/+E6QXydHZEF5zJwAgGvNvoB8EyGazyA0Po6WlFa2trSBRXyMCRKTuNERDtNXb/U9KiWw2i3wud/Ih/pOVhbFfew1BisgmwZHlYPIbPo7W898JEsfvppzZp8OZfTomXPhe9P3o08g/8fNRlV8sFjGUzcJz3bBCrkt1nwCMZGFjn+Llui56e3uRTCYxaeIkGOZx3mkSYdJrPoSJl35g9LEZJtpe9h44Hcuw/7b3wc9HMGHbbO4EgIgCAON6ER1IiexwFvlCHhMmTEA6nQ4puuhJyIUAHlJSt8RCFfWOVaFQwNDgEPwgnHmzB6695uVHc+8xWiZj+pW3ITHv7NF/p3Uqpv3dLbBnnoqBe7903M/5vo/BwcEDr4THh6je0t+j1ef43eFCaYRSqYSuri4UC8d+nT7xkmtq6vwPlZh/DqZf+S2QGf77MvLR7AlAaEMrvu+jv78fvX29oXUSUSOSpyirXJK6umvg+z76+vrQ398farsKQbVNGmgwFIR/7yHLqbnzf+HLhImvWI0JF//DMf+6kC+M3OND6PwPVMgJgGpECC0LD2SAvv5+DA4MQB4yPJhcdC4mveaGcZWdmH8OJr/+Y+MN8RjqfzvK8SAhQp+GXCqW0LWvC+VyOeyiwxfQYlVVK00+RqlULqNrf5g3/RcIhH/t1ROK4CTWyW/4+Ng6/0PLeN1HkVi48vn/L6XE4MAg+gf6a95q+0SIqD6eEk6g/hMAUOjTUHL5PHp6ekYuFiJMev1HARr/j6r1JVfAnrYohAgPEUEWXk8EUSQbIQVBgN6eHmSHh6MoPjwEZZ1wAKks+RiN4eFh9PX0IPCjGamniK69eiFDfviwpi5A6/nvHH9BJDDljTeOPB0GAbq7e5DLn3DTwjEREfQ9cav/BEBQJLM4KpUK9nd3w1lwLhJzzwqlTBIm2l767lDKer5MgrpJYBogosh6aAkgOzSE/v5+nSf7Ln3yhmmxT1p45pr2DIH+Ku56R0MCGBgYwNDQUKTNRoKUncSog0BgYpjlTbjwyhNO+KuF03EmnAUr0d3djWo1mjc1UfU9car/BIBEZO/hPNeFOOWloZaZOuMVBzYQCUcggumhFVafxncm/SgUCgX09fcd9lpII3am4rw49kqtxPnQcCtcCYm+3l7k89E/nBOJpk4ACDQtvMIE0mdcGlpxAECLXgI3yln+Ic4/UqX+E4CIJ+K0Ljkv1PLMtmmwJs8NscQQfwnrkCHE7jjqKRaL6Ovr03IkQAr5svgrpQtjr/MkJIC+vn6USvG8mifCrlgq0pVEaA8fVvs8GK1TwyoOANB26gWhlnckkvU/CbTuEwBEvBelM3l26GWaE8J7aKcQfwnrkhD/F1dVpVIJ/YPKzt45PgWdMUHGXueJSAAD/f0oRTDZ73gE4rv29CRDe/gI8554kD15VuhlHooE4rvYIlL3CYAgEeksLSPZEnqZIhFimU2eABgIHo+zvkK+gOxwNs4qR2Pl7utnT4qrss7V09sBWh5XfaMxPJRF4ThLeKNimMEfY61QMxLh3XuEHf40FjPVFnqZhxGk3Y2gVnWfAAAy0kaoDnWHXqaX6w2tLKLmfgUgDOvhuOscHsqiVNRqBZhd8cRlcVVGwnkbNNpErFQqxZ6UEYCq5zwaa6WaIQovAfDz4ezpf6jqYFfoZR5KEGk4HFibuk8ABERPlOWXe3aEW6CU8AbCe20tIZt6BOCsjUNDhjBi3ZFNAujv74fna7QKiBDC+qlRkkF8dZ2E73kjqzRiJgzDP/euAc3XiEYsxNFHd2APEPIk21J3yPfuI0mKtO+JQ90nACREpGle/+O/CLW8yu6n4OdCvWFNl3V72n04DFPEvh47kAEG+gd0mhN4wY7r5s2LupIt13csAGhV1PWMhgTQF/LmLqNlGkaT7wEAAhDarD1/uBeVvc+EVRwAYODx/wy1vKMIEf7wcMzqPgEAUaSzwHt//0PIELcPHe1hFTVwdl3d0dR7ARiGsUdFveUDR4hqgjwZvCfqSkQg3wNNEs78cA6VspqJ2MKIZ/WJrjZ/YNYkAKHubZ5//GehlSV9D72//1Fo5R2LINoXaQUxqPsEwLRFpOM8pa6t2P+bjaGU5WW7MfzgnaGUdaiqQ/NDL7SOkGGE++hQg1zZhdVxJtJnvALJhatgtqmbkkESH3jmmvbIjgfe/OElLZA0tgMxQmC2TUNy4Sqkz3gFrDlnIldStwzbIOPPyirXgE0i9HtO9rcb4Q2FM6Dbdf+3UeqO9ih2MuRzkVYQA20m8owVuWbkS3G23/0JTD7nr2FPnDH2QqRE3w8/VfOZ1aMh/GAJgFhnw+vEIOMhALFNggOA1KxTMf/yT2HKyjdA2IdsiS4lKruexOB9X0fh6V/GGRIATLatxPsA3BRF4Wa5dDUQ7u5vJ0WE9LJXYuIl18CZs+ywTbRmVYroe+Q/8Nz316G4b0u8YRn0YKwVaiYQdFrYw0DSLaP/J5/FtL+7ZVybpVUG9mHH9z8VYmTHZvniycgriVjdjwCceXvf1qhHJKuDXXj6C29CUB37zO/BX21A4clw5xMcFBAtiaTgOhGQjPhl3+FmXHolVnz1SUy94PLDO38AIIIz90WYfuWtmPaeb4CO/PuIkaQPdq5eFPoBUQfKXBt2uSdCloNp77oZ0//+X+F0nHlUp2A4KUx7yduxcv0zmPXqeAcmHN+I5pe5ThCiuefkn/g5Bu+7ZczfD6ol/Pnzb4xk9dZhiHDmHdmIZxlGr+4TAAICYYjIT2Ua3vIw/vix81Hpq/HVX+Cj/2dfwMB/fjmawAAQcFpkhdeBVbfnthiGEcvJXDMu/nuces23IEZxtHPmRX+N6e+9FRBGDJE9bxYJ931hFypQvRrAzLDLPX6FBqa/55vInPOGk36UDBOnXHULZr7iqhgCG1kBsOzubLTjy5qTkKdGVfbAvV9C348+DdQ496oysA9P3HghhrdGvzrTNIy6PwcAaIAEAABMIWLZkSm//Qk89qGV6LrvtlFNDCw/9wT2bngrhu7/RqRxScimHgEAANM0I5+Rm5p1KpZc/c3avnPqSzHhoisjiug4pPzM1vcvDG2G9va186dJQvRjqoeY8PJ/QGrpy2v6zuL3bUByRvQHFDqmVfeTv8aLJCJLAAAg+z/fwd5bLkdl559O+lnpe9j3q1vx2AfPxnDnI1GG9TwSpNVGIGNV93MAAIAMYwiuG/6WfcdQHdqPzV9/H3b+8PNoP+8tmHz2q5CZdQqM1qkIill42W6Utz2MwlO/RGnbw6GvbT0WAi2Rl8GgTaj786nHyjTMxyuoRPqEOv/yT4GM2s+/mXjptRh+8E4Eldh2qpso7ernAbw3jMKCwP8iYjx1UjhpTLzkmtq/Z9qYf/k6/N9N0W5TQIZo7h0AL4OxjRDyueZHK297BHtueiOSi85F+oxXIrFwJcy2aRCpNvjDPcjv3YL+x/8LvQ/dE/mEvyMJYQwB9T8I0BAJgBCiB8CcOOssdW/Hrh9/Ebt+/EW0t7cjmYz3Xe8REs9Om9sB7Kz7d1JjZRgWy2SOAAAgAElEQVR0L4DXRla+k8LkFa8f03dFshWp016G/J/im6pAoPdsXTP324vW73xoPOVsvbbjfBDeFVZco5H6q5dDjHEL7imr3gjDScGvRDcoaJj2z1D/28CP2fYZsxcACH2eyTFJiVLn71Hq/P1hf1wqldDbG96OqrUyhAh/60IFGuIVgKBolwKeTFynj52IiWiH5HRnGOb3KcRjlo+UnnsGDCc15u87c88KMZpRIUB+68kbpo15k/Unb5iWlgK3IeZ1/87cM8f8XcNJId1xeojRHI5AyGesH0RWQR0IpFB+rykqvucSoSHmgDREAmAIKD2Vq1JRfyqkFEFTTwQ8a+PQkGmZke3OZk8Y3/p+o7U9pEhq8ldp1xnzlOp0xfk6KUgsjZYp4/r+eNvqRCzbHL7o671NvQsgkfpJx5VyWWn9gkRD7APREAkAEZ18pkiEXNdVsh3poYiEVqezqWAa1lNRle0Vx7fte1BStG28xLu3ru24otavbV09590g1Py9MATl8e2u6BWGQorkaKZlN+1+GwcRsEJl/X4QwPPUnsNhkmiIg6AaIgGw3WBc7znDUK2q25UMACDli9UGoJ4Q4vtRlV3c++y4JnS63dtCjKZGEl/rXN3xV6P9eOf1HUuJaOyLscfJ7Rn76KqUAYr7OkOM5nBCiLsjK7xOSAmlZ0G4iu+1BACGUN7nhKEhEoAzvlfoNox4T4Q7kvIEAJi345p5TX0yoJFu/bYQIpJlF9XBrrGvL5YBCs/cH25AtckQ4Zfb1i7oONkHn71+9izyca8Ewj+gfZSKf75/zMlWrvMRVIf2hxzRCEFCFozcHZEUXic2XztnJijeCddHqlbU3muFYfhnbRyKbpgpRg2RAACAYRhKT2VxXfVLQnzbP1d1DCotv3Vf0bTsyPYD2PnDz4/pe7nHfgJvYG/I0dRstpTevTuv7jjuVr47r+6YaHjilwDmxhjXUdz+3cg//tMxfXfnPf8UcjQvsGx730Ubofbls2KWIZSPNFZdtQmA6r4mTA2TAJhCKN2cQ4MRAEhJTZ0AAIBtGP8dVdl9D/8EPQ9tquk7XnY/+n86tsQhAqe7Fn66+/rZR61Z3X397KRr4acgLFUR2JH6/+Nz8LK15XI9D34ffY+Gd6LckUzb+E1khdcJKQPl9xjV91rDUNvXhKlhEgAyzHhPAzmC67mQMWz6cyLECQAs2/rnKNesbV7/bvQ/Prpt4L2h/dj/r++BP9wTYUQ1u6Dqi58cmgR0rl7klH3xAwAXKIzrMF62G/tvfQ+87OiG8/v/eC/+suHvI4uHANiG9ZXIKqgXREpHAAINJgCSEJuVBhCixkkAJB5TGoAEPOWvAeSKB9Y1xuZOY3XWxqE/mZYV2RCdXyni6c+9Dtu+++HjzjaXMkD3/9yJpz9+Hip7la5QPSYJvOJgEtC5epEDqt5DEW6iNFaVPc/g6RsvQPdv74aUx57i4+UHsXXjDXj6c68f12FdJ2NZ1tBZG4eUrjZS7bGrzrEgcbbKGNyq6nssYMB4WHUMYWmYzsIiekB1DJWqC8s++SExEUrNHpq7DNjZ1EuVLMv6teu6b4yqfBn42PWTf8He//oGJp39KrSdci7sidPh5gdR2rcFfY/8FOXenSAAyekzYNm1bx8cNQm8ouKJHxOqAPBK1fEci1t1kd2/C0M3vRPb7/o4pqx4HZIzT4GVmYjq4H5kn/09Bp74Jfxy9MvyLce5rxG2fh2PiXbPmRKkdMtT1e//AUCY4teqYwhLwyQAndXcH9qJlA7Du9UKFE6eBgCIQL4EQFMnAKZjfgFFRJYAHOSX8+h96B70PnTPMf9eAsgOZzFlyvg2tokM6dnxH5QdzuLgb3O55znsuXeDkjgIgBCmNhM5VAkMvITUvuVU/v5fCCHP/m72CaVBhKhhXgG8dRN80zJjO23lWCo6TAQEvUp1DKot/7fhh+0IXwPUolgsKr9p1aNqtYpiUY/99m3byq64fahhbvpjJunVqkNQ/QrANIw8AWp3fQtRwyQAAGAKY5fK+qtV9RMBAXnhvqtmjn3T+gZhO/a9qmM4aKgxlgzHSqefmenYY1uT2ECevGFamoCXqIxBSomq4nlWhmHsVBpAyBoqATAMQ3GWLnV4R5Uo2tbLVAehnOV8OMrDgWpRLpdRKqo/MKpeFItFlBXv9f48Ili29QnVYaiWqjgvB5BQGcPImStqH7CEMBrq9WpDJQBkWMonZ1TL6g8GgpDKh+pUW/lvA7sdx9HmeOTBoUFIxTeveiAhMajR07/jONvO/vZQQz31jYlQP/yvw6FrZBr3qY4hTA2VAKSs4Ccxn1x6lLIGFymApp8HAACGaSnbz/5InuchN6zFtAStDQ8Pw1e8zvtQpmHerDoGHZCUyieMKk8ACPj/27vzALmqOm38z7l7Lb0l3Z0Eks4edIBASEjCIogOKuI2jmgAxejwMgokAbdxxpFfdHx9x9dRERx0ECRkIUpQUXTwFQVG9kV2FOnurEDS3dXVXXvV3c7vj05L6KTTVd236pxb9f38NROqbj0mVfd871l1RfmV2BDBkqOPNEB/+JBWdF3XFPX5qqLgmNmzxf/Fqv7iRd95pUd0DJE4oDww8n2QYh2ewhhmzpoFTaubxTeBclwXB/bvl2AezQhV05yz7nCtepr0NRm7rpz3Jk/x/yw2Bce+V14B98V9NzRdL561wxG6DDJoddUDAACargnddN3zfeEzVUeCKMK77ERjgG8axn+LzjHK5xyDg4M0EHAEHEBycFCaxh8AIqZxV6M3/gDgqp7we0mpZAtt/AFA19R9QgNUQd0VAIqiCj+nuVSSYQITe7foBDLQrejlCqvOCYGTUSqVkMnQUMBYmXRafBfvIRRF4bYZXSc6hwwYF38vkeG7wdT62QFwVP0VAKr2c9EZZPiyAvxvez61sFN0CtFO+VHiNStiSbWGOz08DEeicW7RHNdBKpUSHeMNLMt84swfJerm0JfJOngPeavoHCUJJldrmvJT0RmCVn8FgJX6megnvmKxKEM3r8Z0++9Fh5CBqVjrxE/KeJ3PORIDA1J1d4vCwZFIyNX1DwboLLJBdAwp6M4aCN4xlgMo2WILAIUxHsllpBlODErdFQArboSjGZrQdUS+78OWoBeAM3aR6AwyWLY1+bClW6+IznEox3EwNDQkOoZwyeQQHMl2SrRMa8/ybclHReeQxBrRAUqlEnxf7FQMzdCHjt8Bub6oAai7AgAANEV/QXQGSTYyOWPXVfPmiQ4hAyOqr5OoEwAAkM1mkc8J3b1aqHwuj1y2+gf5VIIBMHXtM6JzyODlq7sWgEH4EePFgvhNtDRFfVF0hmqozwJAY78VnUGSAoD53BdewctgxabMnYZpCV0hciSDyaQMu0fWnGPbGEwOio5xGMOy9i7fkv2Z6BwyYD5fAwmWihckKABUVfuN6AzVUJcFgB0zbxH9rbVLJXiCu60AwOecCoCDzIh+pejvxViccyQGEvB8T3SUmvF8D/0J+eZAMACWrl0tOocsGGcXis7gui4cwfv/gwEsat4iNkR1yHY/DMwDF+hZx3GEns07vX06YlGxxwOP4Ccuum6f8GERGTy8xtpXLBZni84xlmEY6JwxA4ok5xdUC+ccff19sEvy9XpYlrXn9B8X54nOIYOd6+af5DPvGdE5stkMkkmxc2UMXc+cucNpFhqiSuqyBwAAdF1/TnQGWQ6AYaDJgKN0Q75eAGDk+Nt63ySIAxhMDErZ+IMBpmZ8SnQMWXiKJ/zpHwAKefFDqaoqvi2plrotADRNFX6EZ6FQkOIAGM7wD93rFgnbHlkmp27O/MKKWH8SneNICvk8koPyjYsHZSiZRL6QFx3jiKJW5NnlW9N1Oc5bqRc3Hm8wjrWic3DOpdhUTdfUO0VnqJa6LQBg4SbRx8FyzlEsiP8Cg6NTURzaE+AgQ4t9SPReEePJ5XJ1uTxwaHgYWclm/I9SFIUzX/uw6ByyMIYyHwYwQ3SOYrEIX/A8EcYYIib7kdAQVVS3BcCKGzMJw9CF30llmMEKAJzzK0RnkMXyLYN/jkQj0m7qkclkpNsZbypSqRQy6bToGOOKWNYvVv0k87LoHLJQOLtSdAYAUvQW6YaePP7mdFJ0jmqp2wIAAFRNe1x0hnwhDwlGAQDg9J71XctFh5BFviW6RtU0CU5tOrJUKoXhYaH7WQUilUpJXcxomuZwZn1cdA5ZdF819xQOvkp0Dg6OQk78w5Ou6g+JzlBNdV0AME27VXQG3/Nl2RMADPzTojPI4pwbBrKxiPV/ROc4mnQ6LXXjORHZG38AiFiRjau3JeXtnqgxxrkUByAV8gX4XPwyakVTbhadoZpknBAdGA4of/h71fY8TxWZIx6PYdq06SIjjCo4njfnzf/5av3ONKvQQ2usvaVicY7oHEfT3NyM1tZW0TEq4rou9r+2X4pJsOOxLGv36T8uzhedQxZ/+ewx7aqj7QNgic6SSCSQz4sdAlBV1Tv7p57QcxCqrb57AABfN40e0TnyeTlWAwCI6Kr2CdEhZGKqkfMVRc4JgaPS6XTohgM0TUN7ZwdET8Qdj8IUrqjR80XnkInmapdCgsaf+74Uc6cMXa/7eSF1XQAAgK5pwpdw+L4vx2oAAAD/NL8AQntEZLJi29DzsWhki+gcEwnjcEDEstDeIWcREIlGblm9LSnlclAR7tsIjXP8o+gcAJAvFKTYJVLTdOFLyaut7gsAIxr9tgw3oFxWmkNfFvQc0yXFJh+yWLE19wnDMKR/xA7DmPpYEctCR0cHmESjjaZhJFduy/0v0TlkMifZdTGAeaJzACNLYYVjDDbj3xYdo9rqvgA46Qd9/bpu9IvOUSgWhB9pOYpxXEO9AK9jgG9ErXfIPhQAhHN1gGVZ0gwHKEzhlh4/nwFy/BglcPBe8M+icwCjk6bFH6Vu6ub+M7Zkhbcb1Vb3BQAAaLom/HRAzrkcle2Ixb2z5lwgOoRMVm5KPxGJRn8gOkc5aDhg8mLx6PeWb0s+KjSEZA72CB4nOgcA5PI5yLBuWjO0X4vOUAsNUQDoivV1GXog5doJjV3DNzbGv3+5Vm3NXm5a1h7ROcoRxp4A0UWAZVm9p27Jrhfy4ZLiG6Ewjn8SnWOUDPdIBsBU2DdF56iFhmgAlm8Z/LOpG8IfmRzHgWNLcxDKm3uGumh74DEiMetsTVVd0TnKEdaeABFzAlRVdWHEzq7ph4ZA79CcCwCcIDoHMLL1r/CjfwHohjF08ubG2BmyIQoAANAMQ/gwAABkJKhwRzHgy7zO94Ko1Ck3D+8xY9FPi+6qLlcYewJqPSeAMQYrFr309M2Dr9bkA0OCb4QCzv5VdI5R2Zwc90bdMO4RnaFWGqYAMFXjKzI0dflcTprJgOA4cee6uX8nOoZsVm3O3BSNxm4XnaNcYdwnoJbDAdF4dMuqzRnhu4LKpmew64OQ5Onf93w5jk9ngML0fxMdo1YapgA4+dbki4ZhCD8cyJdrMiC4wjfSioDDrdqW/YgVsXpF5ygXFQFHZllW76otuUuq9gEhxS+Ayhj+P9E5RmVzWSnW/pu6MXjqlqEXROeolYYpAABA03QpZnbKNAwAjhN7Z3ZdKjqGjCKmtcLQdPFHkpWJioA30nWt0BIzVgZ+4Tqwc+acyyDJ0z8gx+Q/ADAMXfjGcbXUUAWAydWvyjC26zqONAcEAQAUfLX3sgUtomPIZtmm4WEjYr5bVRVJxmwmFtqJge3BTgxUVcWPRCLvqOejXCdr11XzWjlTviI6x6hisQjXFT/vljEG1Wyc7n+gwQqAZbelu3XDPCA6BzBy5rs0ODp5xP2S6BgyWrkl+z+RSPOlMhSO5QrlxMCIhY6gJgYyhng8dumKzZkHp36x+uN53r8CvEN0jlHptByHMeqmuf+Um4dDsQw4KA1VAACAqetS7PteKBTgSrDk5a84NvSun71YdAwZrdw6fEssGv9WeEqAcA4HWKNLBKdQBDAAsVj8m8tvzdwSXLL60b1uzkIwdqXoHKNsW57eUENVN4nOUGt1fdThkRgzo19Rd+Y+6/n+pIsfxhR0nPFhzHrbWsQXLIMeb0Mp+RqGnv0d9v3qu8jteb6s62QyGbRNmzbZGEEzOGP/DoD2BjiCldsyn3v0o7E357O5d4vOUq7RJ6swHSU8WgQMDAxMalJYJBr9xaqtmS9UIVpdYIx9C4ApOseoTKb8p//4vKWY/Z4NaFv6dpjTjoGTHUJ251PYf+8m9D90OzCFSYSqqvhKrOVrgDwTtGshTA81gXlkTeSZQrFw0mTeqzd34IQv7EDr8UfeU4RzH7t/8lXsvv2rE34hFcZwzDHHQlHl6YjhinLO4mt33y86h6weuTDybKFQWCo6RyVaWlrQ0hKuKR7FQnGkCKhgW9hIJPL0adsLp1QxVqj1XDn3bVD470XnGOW5Hl597TVMuPUvY5i/ZiPmXvCvYOzI98rhF+7HC9+8AE46Maks0Uj0j6u351dM6s0hJk/LU0OmqX9jMu9TzShOuubucRt/YKR3YP6ajZj34WsmvJ7POTJZieYCAFB8/zu0LHB8q7cXlkUiVrfoHJUI4ymClc4JsCyre59bOLXKsULrvo3QoOA7onMcKp1Jo5x9/0fvp+M1/gDQesJbcdKX74ZiRCaVRdGUr0/qjSHXkAXAKbemt+u6VvGuE11//89oWri8rNfO+8g1iM8/ecLXZTMZcFk2BgLAgZN7Z879jOgcsmKA3+wWTzAta6/oLJUIZRFQ5pwA07RebfGKJ3x4B7waRQud2cmuzwNcmp4r3/fLWvoXn7cUcy8ob7PCpkUr0PV3lY/+6LqeW7kl+7OK31gHGrIAAADLtH5VyeuZqmP2eVeU/3qmlPV6z/fl2hcAABj/Ss/VsxeJjiGr43fANpunvdk0zT7RWSoRytUBExQBhmEOZI2W447fAWkO2ZBN7xXHLmHAxF2SNZTNlrfxz+z3bDjqk/9hrz9/HZha2dQ2Uzcaau3/oRq2APC48RmFsbIHGJsWLIMWb6voM9qWvr2s12XSGfgS7IJ1iAhc9kM6J2B8K258LR+NRN5kGsag6CyVCOM+AdY4+wQYppmIRSNL3rmlr7FmblWAb4TCVfUmAJboLKO4z5FJlzf0We49dJTeNB1N85eV/XpFUXgkis9W9CF1pGELgNXbkq9Ylvnncl9vtM2q+DOMaceU9TrP95CTrheAvXXn+jn/KDqGzJZtGh7m8eb51BNQfWPnBJiGMdgWN49btilk/0NqrHdo7uUA3iI6x6EymQw8v7zRGqN1ZsXXN6aVf6+2TPP5E2/Kher3G6SGLQAAQNetsk/C8gqVb1bh5sq/N6XTadl6AcDBvtHzmWPmiM4hszN/lMjY05sXha0ICO0+Ae0dsCyrv2l6ZDHt8nd0vRsWdIFzqSa3+dyvaOmfV6h8krSbK7+HSzM1ac5DEKGhC4Dlm4d/rut6Wd+wzM6nwb3KNu7J9D5Z9ms9z0NWshUBAJrhaj8QHUJ2s9UWp71jxh8jkcnNQBYllEVAxMKMzs5n2qwmOXaPkRl3vwegSXSMQ6VTaXgVTHqu5B4KANxzkN3zXFmvNQ0jtWJTpmHH/4EGLwAAwDTNreW8zs0NI/HEXRVd+8C9lZ1Amk6l5Tkq+HXv7l0392LRIWS1a+08i8H+harg3e3t7aAioPo48I6Sq/x819p50oxry6ZnQ9clHHiv6ByH8n2/4i3Q99+7qaLXDzx2J9xseYe+GqaxuaKL16GGLwCGWOzziqqWNSDVu/mLcPPldV8NPfd79D9yR0VZJvMDqQXO+PdeunLufNE5ZNO9bpHpNvs7wPBOYOQwkfaOdliRcLVLYZwYCIZ3+s3+L/ZdPTtcFVcNvHx11wIA14nOMVYqnap4d8f+h27H8Av3l/VaN5/Czs1fLOu1qqp6LNJc3ovrWMMXAO/c0pezTPPecl5b2N+NF77xwQmLgHTPE3jxW2smtTVlJpORsRegVVP4T17ceLwhOogsutctMsHsOxjwnkP/nIGho6MjdEVAGPcJ4MA7bE+5k4qA1z152XJd8fg2cEi19aPnechmJjHRmXO88M0LkOk5+lCAm0/hhX//IAp9O8u6rGVZv1lx42uhOeq7Whq+AACAKPRPlbskcOi53+PJzy3HwMN3HDYnwMkMYtf2a/D0v5w16S0pfd/H8LCUN+JTzWSmoY7KHM94jf8oBoaO9o7QDQeEcXUAFQFv1GYlvgGw1aJzjJVKVf70P8pJJ/DUl87Crh9vhJN947xP7jnof3gHnvzscgw9X9ZzHBTGuG7p5W/qUsdonfdBj1wUfa6Qz59YyXu0eBvic5dCi7fBHnwVmZ1PgZe5vOVoGICZM2dBN/QpXytgnHO8f/H1eyubDFFHJmr8D8U5RyKRQKFQ8aaTQjU3N4fqACEAYMBvDdX/wJzvvBKuv+wA9Vw59zwo/NeQ7L7u2A729+0vZ9ffCTFVQ9P8ZTCmHws3O4TsnufKHvMfZUUiz5y+vVD+ZgF1TKovikjPfrzl7YPp1O+C+JIGIRKJoKNDmiO7X8fQrzF28rxr9+wXHaXWdq2dZ3lN/p2jY/7loCKghjj+n5pRPjB/0+6GWyHwl6tnH6t6yjMA2kVnGau/v1+aI38ZgKbm+NtWbM7eJzqLDGgI4KCTbk393jKsV0XnGFUoFKT50bwBR6frY3ujHRg0dsJfuRhjoNUBNdKgEwP5Riiqr2yGhI1/IZ+X6j5mWNZeavxfRwXAIVRN/5LoDIcaGhoKpNssePzsnTO7pPq7qqbRpX7ldPsfCa0OqJ1GXCLYm5yzERxvE51jLA6OpGRFpGYaDT/z/1A0BDDGQx82EiXbni46x6jWtjY0N0m1l8cozoE1i6/be7voINVUyZj/RGg4oHYaZU5A77q5H+SM74CED3OyrSwxDbP/jNtLM0TnkIl0XxrRdMuQ6tSsVCoFz5PylFPGgE29V85ZITpItQTZ+AM0HFBLjbA64OWr5p0MxjdDwvu453pIV7Dlby2Ylv4V0RlkQz0AR/Dgh40h27aleeSJxWKYPl2aTokx+F6FaSsXfHdXqPbCn0jQjf+hqCegduq1J2DX5fNmeqr/OBikPKtjcHAQuZw8hzQahpE683Z57umykK5ylIERMf+36AyHyuVyKBVLomOMg3X53PtZ97pFpugkQZnqmP9EaE5A7dTjnIBda+dZnub9XNbGv1AsStX4A4Cpm1IdiiQLKgCOYOWtmf8wDEOqPs9kchBczhmBAHA6Y/YPRYcIwmRn+1eKNguqoTpbHeA3+z+UcbMfAPA5x1BSrkMaDUNPn7ot839F55ARFQDjsExDqmMiHddFSs4dAkd9rGd91xdEh5iKanb7Hwn1BNROvcwJ6F7f9c8c+KjoHONJDQ/DdV3RMd7AMs0vi84gK5oDcBQPfsQYtEv2NNE5/ooBs2bMhG5IuyW/D/CLF12378eig1RqMpv8BIXmBNRQiDcL6t0w9yLO+RZI+uBml2z09R2Qqp/SMMzEmbeXJNxRTQ5SfpFkEdWtq0VneAMOJJNJqX5gYygA29y7bu75ooNUolbd/uOhnoAaCulwQPe6rvdyzjdB0ns25xyDQ4PS3ZtMy/gn0RlkRj0AE3h4jfVqsVg8RnSOQ7W2tqK5uVl0jKMp+Iy/a8l39/1BdJCJiHzyH4t6AmooRD0B3VfNeyvz/bsBSFshpoZTSKXlKgYNy9p/5o/lunfLRspqUibRiPFJ2eqkVCoF23YmfqE4EYWzu3rWdy0XHeRoRD/5j0X7BNRQSHoCXr5q3snM938OiRt/x3GkW/MPBpi6canoGLKTq2WT1MMXWn8qFopvFp3jULphYOaMGWBM6n/ChK+ws5Zcu+fPooOM1b1ukckU+6fgkG64gnoCakfmfQJ6rzh2CdfUB8DRKTrLeDjn6DvQB9uxRUd5g0gk8vxp2wtLReeQHfUAlEFBZI3CmFTDW45tI52SrOo+XLvi83t2XTVvnuggh5K58QdoTkAtybo6oHfDgi6uKvfI3PgDI7P+ZWv8Fca4oVvSrpSQCRUAZVi9feg5KxK9X3SOsVKZFEolWTcI+qtjPd//be+GBV2igwCvb/Ija+M/ioGho6MjdEWAbPu/l0O2zYJ2XTVvHufufQCT4jcznmKxiHQmIzrGYaxI9PfLNw89JzpHGFABUCbDZB9RVVWuTfn5yJabvu+LTjKRxZy7f+i5evYikSFkmvBXjtEiQNM10VEqEsYiAAzv9Jr8O0UXAb1XHLvE8/w/AFggMsdEPN/DYGJQdIzDqKrqaVy5UHSOsKACoEyn3JIdiEQjPxCdYyzXdTEo2c5b45gLT3mw98rZJ4r48O51i0yvxb8jLI3/qHQqDdeRa2OVctCOgZXrXtf1N1xV75N1i99DJZNJeL5cz0MAEI1GblixPZMQnSMspJ5BJhsOsIdGDgpqEZ1lrOnTpiEWj4uOUY4hhfvvWnD9K4/X6gNlH/MfTyifpMegiYHlObhi5jcA2mv1mZOVzWaQTA6JjnEYw9DTZ9zutDFA+i5RWVAPQAUYwE3D+rSMVVNyeAiOI/XSwFFtvqL8tufKrjNq8WHU+ItFEwMn1ruh60wA9yIEjb/jOBgakq9nhwGwzOil1PhXRsa2THoPr7H+XCwW3yQ6x1i6pmPmzBlgSijqurzC8IEF3917T7U+gBp/ebS0tKClRbqOs6OqRU9Az/q55wD8lwCk777jvo8DB/rguPI9aEQi1gunbS8KGV4Ms1C0FLJRDf39mqpIV2k6roNEUr6JOeOI+hy/7F03pyoTdnatnWcpzP4lNf5yCOOcgGqvDuje0PVRgN+NMDT+ABKDg1I2/qqq+IwZHxSdI4yoAJiEVZszL1uR2K2icxxJIV+QcmnOOCzO2LbuDV3/zgPsjRqd8MeBdwR1zVqo18Z/FO0YOIIDrHt910bGsRmAGb6oEh8AACAASURBVNR1qymdSkm7MZUVif5o9W3pbtE5woiGACaJA8rDHzESpZLdJjrL4RhmzOiEaYbi3gIAYMAOQ/U/PtXuVur2l18jDwccPHL6ZgZcHFS2aisWixjo75fuoB8AMAxj+Izb7ek09j851AMwSQzwY7HIGiZlDcUxkBiAJ9m53EfDgQtKHrt354b5MyZ7DWr8wyGswwFTnRj4l88e086YfU+YGn/XdZFIJKRs/BljsCLWR6nxnzwZW69QefTCyB/yhcJbROc4Et0wMLNzBpgSnn9mBuzyVbx38Xf2vljJ+6jxD59GWiLYs37OCQC7C8C86iQLHuccB/r64NhybfU7KhqL3b96W+4c0TnCjHoApsg0zfdpmiblL8SxbQyGZ1IgAIAD85mPh3rXz313ue+hCX/hFNYlgpVODOxe1/VegD2EMDX+GNllVNbGX9O0EmC+X3SOsKMCYIqWbRoeNqORK2R9xs7n86G7yYKjhYP/qmdD13efvGy5frSX0oS/cAvl30OZEwPv2wite33XRsZwJ4DmGqULxPDwMPL5vOgYR8QARCPWVau3JaU/DU12srZbofPIRdHHC/n8qaJzjCdEOwW+AQce1xTlI/Ov3b177H+jbv/6UW/DAd3rjp3NmLodwJkCok1JNptFUuLtxaOxyKOrtxVOE52jHlAPQEB0xzxX0zVpj+ZLJpPSVvRHw4CVnu8/0XPl3PMO/XNq/OtLGJcIjjcxsHd919sZU59ECBv/QrGA5JC8jb+maXaTpYfqNy8z6gEI0ONrW9dmh1O3QMo5syOzZjs7w7U88BAcDNcPFzo+12KmFGr861OYewJmv/KK3TOr68sM+DJC+HDl2DYO9PWBc0nvXwCamuKfXrElK92hbGFFBUDAHrko8lghX1gpOsd4FEXBjJkzoGtHHVqXFgP+4AMlBpwrOkslqPEvXxiLAA7cwwALgJQrgibiuR4O9B2A58l3wt+oqBV9dPWP89T1H6BwHTQeAoxFztV194DjOEKOFJ2I7/vo7+vHzJkzoaqq6DgV48BZYataqfGvTDo9MrcrTEVA2ArSQ3m+j/6Bfqkbf0PT84VpsXOB8A1jyix03VSyW70tmTYt6yOMydtMeZ6H/v5++D7tn1Ft1PhPThjnBISR7/tI9PdLfZIoA4MVty4+54aBrOgs9YYKgCpYuSVzVzQW2yE6x9E4joOBRELa8b56QI3/1FARUF2ccwwMDKAk6Vr/UZFY9CcrNmXuFJ2jHsn7mBpyHFAeWWPtLxaLnaKzHE00GkV7+3TQVyFY1PgHJ4xnB8hutPEvFouioxyVYZoDZ/ykNJO2+60O6gGoEgb4cRY7W1FVqb+4+XweA/3UExAkavyDFcazA2Q2usuf7I2/qip+xIz+LTX+1UMFQBUt3T74khWJ/pPsz9aFYgGJQSoCgkCNf3WEcdtgGXEAycFB6fcEYQBikdg/Ld889JzoLPVM9rapLjxyUeT+Qr5wtugcE4lEImhvb4fMExhlRo1/9YVxiaAsRhv/XC4nOsqEItHo7067LR/alRVhQT0ANaDHC+eapiHv9loHFQrUEzBZYWz8DdNMGKaZEJ2jEtQTMDlhavxNw0jq8XzZh4GRyaMCoAZW3AjHamo6U9VUeRfaHlTIF5AYSIBLupuhjMLY+JuGMdisWks0LbbQMK0B0XkqQXMCKsM5RyIxEIrGX1VVzzBjZ6+4EfKuS6wjVADUyPKbBv9sRaOfCkP3eqFYwED/ABUBZQhr49/aZC1ZeltqaPW2ZNqZ3rTANM0+0bkqQUsEy+MfnO1fyB92XpGEGKLRyIZTtwy9IDpJo5C/Naozj14c/Wk+l/+g6BzliFgRTO9ohxKCokWEsDb+TdMji5d+PzV06J8/um5as9uX67HtUoeobJNBSwTHx/2DS/1Kcs/2HxWPxn688rbchaJzNBK6swvw8Brr5WKxuFh0jnKYhoGOjk4oKnUWHSqsjX9rk7Xk+JvTR5yPct/lHXFjMN1TKpVm1DrbVNDEwMP5vo/+/gHYtrQHlL6BZVq7Tv9JcYHoHI2GCgABnl7b2prN515xbCcmOks5NF3HjI5OqFr4zg6YiNrUDn16F9SmDviFFNx0P5yB3QAff+lxPTb+o+q2CGAK9I550Jo7oURa4GUG4AzuhZcJ1RzIsniuh/7EABzJd/gbpet6IaJZXSu21+E/huSoABDkiUumr8znhh/xPC8Uj9aapqGjsyO0pwgeSjFjaH7LJYgvew/M2Scc9t+9dD9yz9+D4ftvgtO/8w3/LYyNv2GaiVgksnjZpvIGzZ9e29qaKxS67VKpvdrZgnSk4QC9cwFa33opYie+A2rz4aMbpVdeQPapu5B+YDN8W+618eWwbRsDAwNSH+xzKFVR/Xik5Yzl25KPis7SiKgAEOjxj7d+IpdO/Sgsy+4URUF7ezssyxIdZdLip7wP7X93zREbg7G45yL94BYM/vLr4K4dysa/3Cf/scLeE8B0E9Pf/yU0n3ExmDLxoadeuh+Jn30F2ad/VYOU1VEsFpFIJEJzyBcDQ6wpftnKLZkfis7SqKgAEOyJj8W/n8lkPyU6R7kYY5jWNg2xeChGL17HGKad/3m0nXtFxW8t7vojXv72RzD4Sm8VglXPZBv/UWEtAqbNXojjPns7rHmnVPZGzjF0z/eQ/PV/VCdYFeWyWQwOJRGmhTvxePz7K7dmLxedo5FRASCBRy+KPpzP508TnaMSYZt93XbuFZj2ni9M+v2plx7GM9e8Db4TjklV4832r1TYVgcouoWT/+1etBw3+Z/T4C+/juHf/1eAqaorjD1T0UjkgdXbC2eJztHoQjH+XO9WOfm3RCxrn+gclUilUiPdjSEYvogsWo1p539uStdoedPpWHjJNwJKVF2GaSai0eiiqTb+ALD6+mQ6Fo0sCcuOgQvXfnNKjT8ATH/vF2EtXBlQourxOUcikQhd429a1r5V2wtvFZ2DUAEgBbYDXntH9ATDMEK1s0k+n0f/gT54ris6yvgYw7T3fRFgU/+qH3veFYjOfnMAoarHNIzBtrh5XLkT/sqxbNPwsDO9eb7smwVFj1mCY98ZwGgaU9D+gX8FJN7/wnVd9Pf1SX+oz1imYaSilrWUTviTAxUAklh8fTKtRqPLNE0LRx/zQbZjY/+BA9IeLRpZfDqsucsCuRZTNcw+f10g16qGqY75H805Nwxk7enNi2QuAua87zNg6sQT/sphdp2EyKLVgVwraMViEQcOHIAdkmV+ozRNK8XNyLIgi1MyNVQASOS0TcO7m2JNb1dVNVTV8eimI5lMRnSUw8SWvjPQ67WvfL+UT4ajY/7VaPxHnXPDQFbtjC0xDFO6swMYU9C+8n2BXjN24jsCvV4Q0uk0Bvr7QzPTf5Sqql6T1fy2k7akdonOQl5HBYBklt069FAkHrtEYYr8g+tvwDE0NIREIgEu0c3JWnBqoNczpx2DyMyFgV5zqoIc85+IrHMCIrMWwWibFeg1rYWrAr3eVPi+j0QigeHh4TBN9AcAKIrCY9H4hcu2Jh8WnYW8ERUAElp5a3pbrDm+jinyPWlOJJ/PY/+BA7BtOQ7z0lpnBn5Nc/rswK85WdUY85+IjHMCqvFvorUE/92ZFA709feHbrwfAMAY4rHoVSu2pHaIjkIORwWApE69Nf2fsXjs38K4UtN1XfT1HUAumxUdBYoZD/yaWrQ58GtORi26/ccj23CAGgn+31mJNAV+zUlhQFtrK8JwkugbMTQ1xb6yYkv2OtFJyJFRASCxlZuz1zQ1x64P288eGDmDfDCZxEC/2G1Jq7HXuz10IPBrVsowjOEmberr/Kdi9fXJtKbHFpmmVfMCZCx7uD/wa3rp4K85WZZloaOjIzRFAAMQi8e+d+rm7EbRWcj4gpkyS6rm1M3Z9U9+ND4tnc1eLDrLZBSKBRzYfwDTpk9DJBKp+ec7g3uhtR0T3AU5R7F/d3DXm4SDjUErY+xAz/qWfgD7OdCngPdxhv3grJ8zHFB8DEFBkXMUmO/bnq7kVF9zNdvN+KbC51+7exgAdl01r1Up+cw1tCZPcTXV8WNcUQzGEIEPy1fQxjhmgvFOznEMwDoZMAPALACdnMeMRCKBQkHcmfPF/t0A54FO0HQG5dqaY7QIGBgYgOzbh8disdtWbs3Ku2SGAKACIBRWbM1+9LGLos25fP69orNMhud7GBgYQDweR1tbW02fYvJ/vj/Q5Vzp3idhp8Q9GVqRg0+CI0NDBoDZAGYzABzsr1vBMg7wkT8EAHBFgeIBHC4cHYDvo2d9FwDA8314OgDujrxGGekY5BwAG7nWyB+wIw5IMcbQ3tE+cvZ8QcxyUHv4ADK7nkbTggq3/z2K/J/uDexaQQlDERCNRf/fym25UD6wNBoaAgiJVbfl3xeLx+4SnWMqstks9u/fj1Kxdlsd5J65G/CDG4IYeOj2wK5VKcuy0NH+18ZfKgwMHe0dQnp5RvU/+JPArsV9F7lnfxPY9YIk83BANBr97ept+XeJzkHKQwVAiKzamntfLBYL73FlOLiDWX8fhpJDNXmCcRK7kX78jkCuVUq+hld/8/1ArlUpmW/6oxhjaG9vF1YEvPLr61EafCWQa2Ue+Qmcwb2BXKsaZPw+RKPR362+LR/sxhukqqgACJlV23LvjcVivxedYyo4gEw2g76+vposF0z++j+mPqGLc3TftB5eMRdMqApYEQsdnXLd7MczOhxgRWp/ZLRvF9Bzy2cPjl1MnpvqQ/LubweUqnpkKgKi0di9q2/Lnys6B6mMKjoAqdxNzzubr1geO812nEWis0yF53nI5rLwPR+WZVXtRsZLORR3Pon48g9MeqvY3Tu+hlfvviHgZBOT6SZfLgaGaDQKx3Hg1viciNy+F6FoOlr/ZnIHzfl2Aft/cAmcgXBsWKdpGkzDFLpHwMEn/78VFoBMGhUAIfXD552tnz4lutRxHLlPpymDbdvI5/PQdR2aVp15qYN7/4JXH/4Z2pe/G1q0/GOMue9h59Z/wZ4dX6tKrqMJ05P/WIwxRGNR2LZd8yJg6Pl74eaGMe3kc8EqOASqlHwNz331POR3PQXLqn0PxmRpugbTFFMERGPRX66+Lf/umn8wCQQVACF20/PO7Vcsjy1yHGep6CxT5fs+crkcXMeBaZpQlOBGp0bPS7eHDqDvge3QY62Izz9pwsYh/fKj+NO3LkL/A9sDy1KuMbP9Q4lBXBGQfvkxDL9wH2Jdx8OcfuxRX8s9F/t/dxP+9K01yL/2MkqlkUmqoSoCtNoXAbF4bMfqbfm/r9kHksCF9+5C/uqPH2v+djqbuVrWZUGVUhhDU3Mzmpubp/z0O9r4jxWZsQAdp38I05a9C5GZC2G0zYSbHYKdfA3Df/oDBh67E8Mv/s+Ux5MnI4zd/kfDD55bL2SfAMbQdsJb0b7qA2h981tgTDsGWrwN9tABFA70Ivn0bzDw8B0o9O087K3Nzc1obW2tfeYpKBaLVV8iyADE47GbT92au7RqH0Jqoj7uMARPfKz5a9ls5kv1UgQAI12bbW1tiFiTm1U+XuMvs3pr/EcJLQKmIJRFQOFgEVCNY4MYQzwe/feVW3L/HPzFSa3REECd+OFzpXvXnRofchz3XXxkC5jQ830f+VwepVIJhmFAVcv/uoay8Q/xmP9ERM4JmIpQDgdUaU6AwhQejcY2rNqa+3qgFybC1N+dpsE9+dGmD+SK+Ts816ur4o4BiESjaG1rhTbBTP5QNv51+uQ/FvUE1E6QwwGqovqRePyilZtTwe22RISr77tNg3rqkmmnZfPp+13XNURnCZrCGOJNTWhubj7iRMFQNv51MOGvEhxc6LbBk9XS0oKWlvJXkMggiOEATdPsaDTy9hWbMw8GGI1IoDHuOA3oxcvauoZSuWfskt0mOks1MEVBUzyO5pZmKAdn84ey8W+QJ/+xqCegdqbSE2DoeqY5Zq1cuinzUhWiEcEa667TYB78ZHuTks8+VywW54nOUi2KqqC5uRnc40ilQ9b4N9iT/1jUE1A7kykCLMN6paXJOOn4m9PCj3sm1dGYd54GwgHlsYsi9+XzhcltjUaqotEb/1FUBNROJUVANBZ5dNW2whkM8GsQjQhCZwHUOQb4q28rnB2Px29otG5mWcl8ql+tyXCK4GSkUikMDw+LjlGRcr53jDHEYvH/Wr2tcBo1/vWP7kAN5KmPt16SyWV+VG8rBMKkUcf8J0JzAmpnvJ4AVVH8WCx69Yot2esERSM1RnehBvP02taTs/ncA47txEVnaTTU+B8dFQG1M7YI0HS9EDOa3rZ8W/JRwdFIDdGdqAE9eVlbSyld+GOpWFwoOkujoDH/8tCcgNoZLQIMw9xrKvryFdszCdGZSG3R3ahB7Vo7z0qx9J6h4aHOeto+WEb05F8Z6gmoHcdx9loF87j5m3aHq+IigaBJgA2oe90i0232d8Sb4p0zZsyAWqUjeAk1/pPBGEN7e3voJgam0+nQTQzUdb3Lb/Z/se/q2eH6yyaBoLtSg+let8gEs+9gwHtG/8z3fQwmBlEohuuJS3bU+E8N9QTUDgN+a6j+B+Z855Vw/WWTKaE7UwM5UuM/igNIp1NID6eqcYZYw6Ex/2DQnIDaoSKg8dDdqUF0r1tkMsX+KTjOP9rrbLuERGIwVCe2yYae/INFPQG1w4F7LNV/PxUBjYHuUA2g3MZ/lM99DA0mkQv4ONFGQI1/dVARUDtUBDQOmgRY517ceLzBmHNnuY0/AChMwfT2dkyfNh1MoYasXNT4Vw9NDKwdBpxb8tSfvbjx+Lo7TZS8ERUAdYwDzExmbgT4uybz/lg8hlkzZkI36D5QrmwmC9u2aR5FgDgA27aRzWYDOdu+1tLpdOhOqQT4u8xk9la+kdqIekaPKnWsd/3cb3Pwq6d+JY5UKo1UKg1Q01YWRVFgmiZM04RhGDANA0yhe2k5uO+jZNuwbRulYglFuwTuh39b+nBODGTfXnjdns+KzkGqgwqAOtW9oesCxnF7kNe0bRuDg4NwHCfIyzYEBkAzdJi6CcM0oBsGdF2H0uDDBT7ncBwHjm3Dtkso2TZc26nbMjOURQBjFy/87p7bROcgwWvsu0+devnqrgWKj6fAEfidhnOOdCqFdDpdtzfpWmEANE0bKQYMHbqmw9B1qJpWd/MIOOdwXXeksXcc2I4D17bhum7DfY9CWARkmectX/ifr74sOggJVn3dZQj4Rii9yTkPAWx1NT/HLtkYTFJvQDUwAKqmQdM16NpIQaCpKjRVg6qpUFRVuh8uB+B7HjzXg+u5cD0PnuvCcR04jgu/ARv6owldEcDxyMLpe89kG+mI4HpCe8DWmZ7k3E8y8Ko2/gBgmAZmzZqJdDqDVCoVyslZsuIAXNeF67oo4kgb4DBo6kghoKoKFEWBqoz830xRoSgMTFGgMAamMChs5DWHGvv/+4eOsfORpaA+98F9Dp9zcN+H73Nw34Pn+fB8D77vw/N8+J4H1/NA80PKNzopMDRFAMNpOwfnrgX2/Eh0FBIc2R4kyBTs+XRXm6OzvwC8o5af67oukkPJ0O3WRohoodongKFfZcpx86/dHa51jWRcNC25jrg6Pl/rxh8YGcfu7OhEe3s7VEWt9ccTElqh2ieAo9Pz+edExyDBoR6AOvHSF45r0oqFvQCEPk74vo9UKoVMNkM9woSUKURzAoZcKzL3Tf/3LxnRQcjUUQ9AndBKxcsguPEHRsaW29raMGvmLFiWJToOIaGQSqXC0hPQphbz/0t0CBIMKgDqBcdloiMcStd1dHZ2oqOjA6pGc00JmUhYhgMYZ58WnYEEgwqAOtC7Yc6pAF8iOseRRCIRHDNrFgzaTpiQCYVi22CGRd1XzT1FdAwydVQA1AOurBEd4WjS6TRs2xYdg5BQCMNwAPP9C0VnIFNHBUAd4ODnic4wnlQqJf8TDSGSkX44gDNp7zmkfLQKIOS6183sYMzog4T/ltT4EzI1Eu8TwGHrMxf9oLdfdBAyedQDEHKKYp4FavwJqUsS9wQwprtnig5BpoYKgJDj3D9JdIaxqPEnJDiyFgE+40tFZyBTQwVA6CmLRSc4FDX+hARPziKAS3XvIZWjAiDsGF8kOsIoavwJqR7ZigAGRgVAyFEBEHY+ZoiOAFDjT0gtSFYEdIoOQKaGCoCwY2gSHYEaf0JqR6IiIC46AJkaKgDCLybyw6nxJ6T2JCkChD98kKmhAoBMGjX+hIgjQRFA532GHBUA4ZcV8aHU+BMinuAiQMi9hwSHCoCw47X/EVLjT4g8BBYBVACEHBUAYaegr5YfF8bGX9M0hzHpNkskkmJg0DTNEZ2jEiJOEeSo7b2HBI8KgLDjrKdWHxXGxt80jMHpLdGZTVa8IxqLf80yrFeoGCBjMQCGaSTj8fiNsba2Lq+zbZppmqFq4AScIthdyw8jwdNEByBTwxl/mdVgKk5YG//WJmvJ8Tenkwf/6MsAvvzUP7TOdUvuvziO837btmdwTnOZGhEDoBt6Wtf130d09V+Wbsq8BLx+bPV9l3csMgfTPaVSSYq9NsqRTqcBoCYHCClUAIQePQqFXO+6uR/kjP+0mp8RxsbfMM1ELBJZvGzT0R+Jnvx4y0Lfc7/kOu55JceeyX0qBuoZUxh03Tyga+p/W4r2tZO2pHYd7fVPr21tzRUK3Xap1F6rjEFoaWlBS0tLlT+FfXDRdXt+XuUPIVVEBUDIVfs44DA2/kd48i/LfWthNfnxT7qe9zG75CxzXdesVkZSO5qmOrqm9zBV+ylgfHP1tmS6kvffd3lH3AhZTwBQ9aOEuae7ncd967VEtT6AVB8VAHWgZ33XiwD+JujrNlLjfySPfyJ+Nmx+qeO659JQQYgwwND1tKHpD0FVv79yS+auqV6SioDDvLDour0nVuPCpHZoDkBd4P8NsEALgLA2/k1aZPHxN6eGgrjeyluy/wPgfwCge9205nTKu9Bz3Q85rrfMce3pvu8H8TFkihhj0DUtpera86qq3Rkz2C0jBWBwE/nPuWEg++jF05YYYD12qdgR2IWrrGpzAhjuDvaCRATqAagD3VfNPYX5/I9BXS+sjX9QT/7luG8trJjf/CG47kWO553i2E6nz336PdXAyDi+nlQV9XlN0f7bg/6DSrv1J4t6Akb4irJsybW7nwnsgkQIumHViZ71XS8BOG6q1wlj41/uhL9qGikIWt7PPfc8z/dWeJ4317XdOKfdUqeGMei6ltVUdbeqqk8oTLs7o6buOmcTiqIiNfrEQA68tPi6vW8OIBIRjAqAOtG9Yc7VjLNvT+Ua1PgH6761sJq8lvf63D3P8/wVruvO9zwv5vvUU3AkiqJwVVVzmqbtUhTlCQXs7qye/ZXIxn48jVwEMI6rF16/99qAIhGB6EZUJ5793IxYzDb3AJg+mfeHsfGvdbd/UJ79WMv8EuNnwPff4nNvqe/w2a7vdniuazZCf4Giqr6mqcMqU/oUVXlJgfooN/hjp96SfYABoZlY0YjDARxI2m5h7vE3DNA2wHWACoA60rN+7tcA/qVK3xfGxl/mJ//Jenpta6vruH/LFJzocr4Yvj/H9/ks3/en+b4f8zzPkH0lAmMMqqraqqJkmaIMKQrbD0XZpzHWzYBnFVW7t97+zRqrJ4D/26Lr9l0TeCAiBBUAdWTXVfNaPe7/BRyd5b6HGv9wefLjLQvB/BO5x+aB85k+9zs4eDs4n8Y5WnyfN3HwGHzf4oDKwRVwrgIA51A45woA+JwzjBYTjEFhI/tJMsZ8xg4+hTPmMTCfAR4UpcjAcqrC0mBIg7EkA0soTBkAYweYynfrnvLsRBvr1KMGKgL6WFE7buGNO8N1wyDjogKgzvSum/tJzvjN5bw2jI1/WLv9SX179OJpzZ6be7muhwM4/8Si6/dtqmogUlN0GFCdWTB9zyYAD0/0urA2/iPr/KnxJ3JZvS2ZNv3ocaZpDYjOUomyjxJmeGjh9fturX4iUktUANQZthE+Y9qFAMbdDCesjX9rk7Vk6W3BbPJDSNBW7BhKqVp0UdhOESyjCBh2PfYxBlrTWm+oAKhDC7+7cy/nuOxI/y3MjT89+RPZrd6WTKtabEk9FQGM88vf9L09DTe3oxFQAVCnFl+/9w5w/q1D/yysjT91+5MwqavhAIZvLrx+33YxiUi1UQFQxxZev+/zYNgEhLfxp25/EkZ1MRzA2PaFbXu/KDYRqSYqAOoYA/hwoeOyTCbzTNgaf8MwE9FodBE9+ZOwWr0tmY5GIm8yDDNUR+am02lkMplnhgvtH2cbw7MxE6kcLQNsAPethWUVrWcLxeIS0VnKYZrWbrNl2vErbnwtLzoLIVNFvz8iKyoAGgQHlMcujDyWLxRWiM5yNNFo5PFVtxVOC9OWsIRMhH5/REY0BNAgGOCv3l44tSne9A1FUaRbzqMoCm9qil+/+rbCKrr5kHpDvz8iI+oBaECPXxQ/y3ZKv7Idp0l0FgAwDD1tWdb5KzZnHhSdhZBqo98fkQUVAA2KA8oTH41/v1DIX+p5vpCeIEVReCRi3ZlfnP/wORvhishAiAj0+yMyoAKgwT31D61z7UJpa7FYOqNW59QrTOGWZT6oWJGLV96S3FeLzyRERvT7IyJRAUAAAM9fGpuRy/P/sm37PNd1jWp8hqZptmEYd8ei7B9PvCkXqvXRhFQT/f6ICFQAkMM8ubb5Is92rirZzlLXdc2pXEvTtaKh68+pin7tqVvTtKMYIROg3x+pFSoAyFE9c0nTEsfHJ13PXc05n+t5Xofv+ybnXPV9zgBAURhnjHmKopRUVR1gjO1RNeURgym3nLw587Lo/w2EhBX9/gghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEghox2wAAAKNJREFUEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQ+fz/nefDg7gGWykAAAAASUVORK5CYII=";

const PretzelIcon = ({ size = 32 }) => (
  <img
    src={`data:image/png;base64,${PRETZEL_B64}`}
    width={size}
    height={size}
    alt="Pretzel Bites logo"
    style={{ objectFit: "contain", display: "block" }}
  />
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const FlameIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c0 0-5 5-5 11a5 5 0 0 0 10 0c0-3-1.5-5.5-3-7.5C13.5 7 13 9 12 10c0 0-2-2-2-5 0 0-1 2-1 4 0 0-1-1-1-3C8 4 12 2 12 2z"/>
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// ── Word Card Component ───────────────────────────────────────────────────────
function WordCard({ word, dark, onConfidence, confidence, onUpdateWord, onFilterRoot, onFilterMishkal, onRelatedWordClick, isFocused }) {
  const [lang, setLang] = useState("en");
  const [showConj, setShowConj] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [learnMoreLoading, setLearnMoreLoading] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState(false);

  const hasRootOrMishkal = (word.root && word.root !== "—") || (word.mishkal && word.mishkal !== "—");

  async function handleLearnMore() {
    setShowLearnMore(v => !v);
    if (word.learnMore || learnMoreLoading) return;
    setLearnMoreLoading(true);
    try {
      const info = await lookupLearnMore(word);
      onUpdateWord?.(word.id, { learnMore: info });
    } catch {
      onUpdateWord?.(word.id, { learnMore: { usage: "Couldn't load this right now — try again.", collocations: [], register: "", frequency: "" } });
    }
    setLearnMoreLoading(false);
  }

  async function handleShowRelated() {
    if (word.relatedWords || relatedLoading) return;
    setRelatedLoading(true);
    setRelatedError(false);
    try {
      const related = await lookupRelatedWords(word);
      onUpdateWord?.(word.id, { relatedWords: related });
    } catch {
      setRelatedError(true);
    }
    setRelatedLoading(false);
  }

  // Auto-show related words on the focused (search result) card only —
  // not for every card in a long Word Bank list.
  useEffect(() => {
    if (isFocused && hasRootOrMishkal && !word.relatedWords) {
      handleShowRelated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id, isFocused]);

  const conf = confidence || "none";
  const confColors = {
    none: "transparent",
    red: dark ? "#7f1d1d" : "#fee2e2",
    yellow: dark ? "#713f12" : "#fef9c3",
    green: dark ? "#14532d" : "#dcfce7",
  };

  return (
    <div style={{
      background: confColors[conf] !== "transparent" ? confColors[conf] : (dark ? "#1a2420" : "#ffffff"),
      border: `1.5px solid ${dark ? "#2d3d38" : "#e5e0d8"}`,
      borderRadius: 20,
      padding: "32px 36px",
      marginBottom: 20,
      transition: "background 0.3s",
    }}>
      {/* Hebrew word — the hero */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{
          fontFamily: "'Frank Ruhl Libre', serif",
          fontSize: 64,
          fontWeight: 700,
          color: dark ? "#e8e4dc" : "#1c1c1e",
          lineHeight: 1.1,
          direction: "rtl",
          letterSpacing: "-1px",
        }} className="word-hebrew">{word.hebrew}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: dark ? "#7aab96" : "#5b8c7a", marginTop: 4, letterSpacing: "0.08em" }}>
          {word.transliteration}
        </div>
      </div>

      {/* Metadata row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
        {word.pos && <Chip dark={dark} label={word.pos} />}
        {word.root && word.root !== "—" && (
          <span onClick={() => onFilterRoot?.(word.root)} style={{ cursor: onFilterRoot ? "pointer" : "default" }} title="Show all words with this root">
            <Chip dark={dark} label={`שורש: ${word.root}`} />
          </span>
        )}
        {word.binyan && word.binyan !== "—" && <Chip dark={dark} label={`בניין: ${word.binyan}`} accent />}
        {word.mishkal && word.mishkal !== "—" && (
          <span onClick={() => onFilterMishkal?.(word.mishkal)} style={{ cursor: onFilterMishkal ? "pointer" : "default" }} title="Show all words with this mishkal">
            <Chip dark={dark} label={`משקל: ${word.mishkal}`} />
          </span>
        )}
        {word.prepositions && word.prepositions !== "—" && <Chip dark={dark} label={word.prepositions} muted />}
        {word.level && <Chip dark={dark} label={`Ulpan ${word.level}`} muted />}
      </div>
      {word.grammarNote && (
        <div style={{ textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 12, color: dark ? "#7a8a84" : "#8a9490", marginTop: -12, marginBottom: 20, fontStyle: "italic" }}>
          {word.grammarNote}
        </div>
      )}

      {/* Lang toggle + definition */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", background: dark ? "#111210" : "#f0ebe3", borderRadius: 100, padding: 3, gap: 2, marginBottom: 12 }}>
          {["en","ru"].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: "5px 18px", borderRadius: 100, border: "none", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
              background: lang === l ? (dark ? "#2d3d38" : "#ffffff") : "transparent",
              color: lang === l ? (dark ? "#6baf96" : "#5b8c7a") : (dark ? "#6b7a74" : "#8a9490"),
              transition: "all 0.2s",
            }}>{l === "en" ? "English" : "Русский"}</button>
          ))}
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600,
          color: dark ? "#e8e4dc" : "#1c1c1e",
        }}>{word[lang]}</div>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {word.tags?.map(t => (
          <span key={t} style={{
            fontFamily: "'Inter', sans-serif", fontSize: 12,
            background: dark ? "#1e2c26" : "#eaf3ef",
            color: dark ? "#6baf96" : "#3d7a66",
            borderRadius: 100, padding: "3px 10px",
          }}>{t}</span>
        ))}
      </div>

      {/* Examples */}
      <div style={{ borderTop: `1px solid ${dark ? "#2d3d38" : "#e5e0d8"}`, paddingTop: 20 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: dark ? "#4a6b5e" : "#8a9e96", marginBottom: 14 }}>
          Examples
        </div>
        {(word.examples || []).map((ex, i) => (
          <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < (word.examples?.length || 0) - 1 ? `1px dashed ${dark ? "#243028" : "#e8e4dc"}` : "none" }}>
            <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 20, direction: "rtl", color: dark ? "#c8c4bc" : "#2c2c2e", marginBottom: 4 }}>{ex.he}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: dark ? "#7a8a84" : "#5a6a64" }}>{ex[lang]}</div>
          </div>
        ))}
      </div>

      {/* Conjugations */}
      {word.conjugations && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowConj(v => !v)} style={{
            background: "none", border: `1px solid ${dark ? "#2d3d38" : "#d0cdc6"}`,
            borderRadius: 8, padding: "6px 14px", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", fontSize: 13,
            color: dark ? "#6baf96" : "#5b8c7a",
          }}>
            {showConj ? "Hide" : "Show"} Conjugations ▾
          </button>
          {showConj && (
            <div className="conj-grid" style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[["Present","present"],["Past","past"],["Future","future"]].map(([label, key]) => (
                <div key={key}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: dark ? "#4a6b5e" : "#8a9e96", marginBottom: 8 }}>{label}</div>
                  {(word.conjugations?.[key] || []).map((f, i) => (
                    <div key={i} style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 16, direction: "rtl", color: dark ? "#c8c4bc" : "#2c2c2e", marginBottom: 4 }}>{f}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Learn More */}
      <div style={{ marginTop: 14 }}>
        <button onClick={handleLearnMore} style={{
          background: "none", border: `1px solid ${dark ? "#2d3d38" : "#d0cdc6"}`,
          borderRadius: 8, padding: "6px 14px", cursor: "pointer",
          fontFamily: "'Inter', sans-serif", fontSize: 13,
          color: dark ? "#6baf96" : "#5b8c7a",
        }}>
          📖 {showLearnMore ? "Hide" : "Learn More"} {learnMoreLoading ? "…" : "▾"}
        </button>
        {showLearnMore && word.learnMore && (
          <div style={{ marginTop: 14, fontFamily: "'Inter', sans-serif", fontSize: 13, color: dark ? "#c8c4bc" : "#3a3a3c", lineHeight: 1.6 }}>
            <div style={{ marginBottom: 10 }}>{word.learnMore.usage}</div>
            {word.learnMore.collocations?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: dark ? "#4a6b5e" : "#8a9e96", marginBottom: 6 }}>Common collocations</div>
                {word.learnMore.collocations.map((c, i) => (
                  <div key={i} style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 16, direction: "rtl" }}>{c}</div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: dark ? "#7a8a84" : "#5a6a64" }}>
              {word.learnMore.register && <span>Register: {word.learnMore.register}</span>}
              {word.learnMore.frequency && <span>Frequency: {word.learnMore.frequency}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Related words */}
      {hasRootOrMishkal && (
        <div style={{ marginTop: 14 }}>
          {!word.relatedWords && !isFocused && (
            <button onClick={handleShowRelated} style={{
              background: "none", border: `1px solid ${dark ? "#2d3d38" : "#d0cdc6"}`,
              borderRadius: 8, padding: "6px 14px", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: 13,
              color: dark ? "#6baf96" : "#5b8c7a",
            }}>
              🔗 {relatedLoading ? "Loading…" : "Show related words"}
            </button>
          )}
          {isFocused && relatedLoading && !word.relatedWords && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: dark ? "#4a6b5e" : "#8a9e96" }}>Finding related words…</div>
          )}
          {relatedError && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#dc2626" }}>Couldn't load related words.</div>}
          {word.relatedWords?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: dark ? "#4a6b5e" : "#8a9e96", marginBottom: 8 }}>Related words</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {word.relatedWords.map((r, i) => (
                  <button key={i} onClick={() => onRelatedWordClick?.(r.hebrew)} style={{
                    background: dark ? "#1e2c26" : "#eaf3ef", border: "none", borderRadius: 100,
                    padding: "6px 14px", cursor: onRelatedWordClick ? "pointer" : "default",
                    fontFamily: "'Frank Ruhl Libre', serif", fontSize: 15, direction: "rtl",
                    color: dark ? "#6baf96" : "#3d7a66",
                  }} title={r.en}>{r.hebrew}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confidence */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, alignItems: "center" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: dark ? "#4a6b5e" : "#8a9e96" }}>I know this word:</span>
        {[["🔴","red","Still learning"],["🟡","yellow","Getting there"],["🟢","green","Mastered"]].map(([emoji, val, label]) => (
          <button key={val} onClick={() => onConfidence(word.id, val)} title={label} style={{
            background: conf === val ? (dark ? "#2d3d38" : "#e8f4ef") : "transparent",
            border: `1.5px solid ${conf === val ? (dark ? "#6baf96" : "#5b8c7a") : (dark ? "#2d3d38" : "#e0dbd4")}`,
            borderRadius: 100, padding: "4px 12px", cursor: "pointer", fontSize: 14,
          }}>{emoji}</button>
        ))}
      </div>
    </div>
  );
}

function Chip({ dark, label, accent, muted }) {
  return (
    <span style={{
      fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
      background: accent ? (dark ? "#1e3828" : "#dcf0e8") : muted ? (dark ? "#1a2420" : "#f0ebe3") : (dark ? "#243028" : "#eaf0ed"),
      color: accent ? (dark ? "#6baf96" : "#2d7a5e") : muted ? (dark ? "#4a6b5e" : "#8a9e96") : (dark ? "#9abfb4" : "#4a7a68"),
      borderRadius: 100, padding: "4px 12px",
    }}>{label}</span>
  );
}

// ── Exercise Modal ────────────────────────────────────────────────────────────
function ExerciseModal({ words, dark, onClose, onXP }) {
  const [size, setSize] = useState(null); // null = choosing
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState(null); // flashcard | mc | fill
  const [flipped, setFlipped] = useState(false);
  const [input, setInput] = useState("");
  const [mcChoice, setMcChoice] = useState(null);
  const [result, setResult] = useState(null); // correct | wrong
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [lang, setLang] = useState("en");

  const SIZES = { short: 10, medium: 25, long: 50 };

  function startExercise(s) {
    const count = Math.min(SIZES[s], words.length);
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, count);
    setQueue(shuffled);
    setSize(s);
    setIdx(0);
    pickMode();
  }

  function pickMode() {
    const modes = ["flashcard", "mc", "fill"];
    setMode(modes[Math.floor(Math.random() * modes.length)]);
    setFlipped(false);
    setInput("");
    setMcChoice(null);
    setResult(null);
  }

  function nextCard(correct) {
    if (correct) setScore(s => s + 1);
    if (idx + 1 >= queue.length) {
      setDone(true);
      const xp = correct ? 50 : 20;
      onXP(xp);
    } else {
      setIdx(i => i + 1);
      pickMode();
    }
  }

  const current = queue[idx];

  // MC options
  const mcOptions = current ? (() => {
    const others = words.filter(w => w.id !== current.id).sort(() => Math.random() - 0.5).slice(0, 3);
    return [...others, current].sort(() => Math.random() - 0.5);
  })() : [];

  const bg = dark ? "#0e1612" : "#ffffff";
  const overlay = "rgba(0,0,0,0.6)";

  return (
    <div style={{ position: "fixed", inset: 0, background: overlay, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: bg, borderRadius: 24, padding: 36, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: dark ? "#4a6b5e" : "#8a9e96" }}>✕</button>

        {!size && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 32, fontWeight: 700, color: dark ? "#e8e4dc" : "#1c1c1e", marginBottom: 8 }}>Daily Practice</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: dark ? "#6b7a74" : "#8a9490", marginBottom: 32 }}>Choose your session length</div>
            <div className="size-picker" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              {[["קצר","short","10 words","~5 min"],["בינוני","medium","25 words","~15 min"],["ארוך","long","50 words","~30 min"]].map(([he, key, w, t]) => (
                <button key={key} onClick={() => startExercise(key)} style={{
                  background: dark ? "#1a2420" : "#f0ebe3",
                  border: `2px solid ${dark ? "#2d3d38" : "#d8d3cc"}`,
                  borderRadius: 16, padding: "20px 24px", cursor: "pointer", minWidth: 130,
                  transition: "all 0.2s", flex: 1,
                }}>
                  <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 28, color: dark ? "#6baf96" : "#5b8c7a", marginBottom: 4 }}>{he}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: dark ? "#e8e4dc" : "#1c1c1e" }}>{w}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: dark ? "#4a6b5e" : "#8a9e96" }}>{t}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "inline-flex", background: dark ? "#111210" : "#f0ebe3", borderRadius: 100, padding: 3, gap: 2 }}>
                {["en","ru"].map(l => (
                  <button key={l} onClick={() => setLang(l)} style={{
                    padding: "5px 16px", borderRadius: 100, border: "none", cursor: "pointer",
                    fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                    background: lang === l ? (dark ? "#2d3d38" : "#ffffff") : "transparent",
                    color: lang === l ? (dark ? "#6baf96" : "#5b8c7a") : (dark ? "#6b7a74" : "#8a9490"),
                  }}>{l === "en" ? "English" : "Русский"}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {size && !done && current && (
          <div>
            {/* Progress bar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: 12, color: dark ? "#4a6b5e" : "#8a9e96", marginBottom: 6 }}>
                <span>{idx + 1} / {queue.length}</span>
                <span style={{ textTransform: "capitalize" }}>{mode}</span>
              </div>
              <div style={{ background: dark ? "#1a2420" : "#e8e0d0", borderRadius: 100, height: 6 }}>
                <div style={{ background: dark ? "#6baf96" : "#5b8c7a", height: 6, borderRadius: 100, width: `${((idx) / queue.length) * 100}%`, transition: "width 0.4s" }} />
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 56, fontWeight: 700, color: dark ? "#e8e4dc" : "#1c1c1e", direction: "rtl" }}>{current.hebrew}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: dark ? "#6baf96" : "#5b8c7a" }}>{current.transliteration}</div>
            </div>

            {/* Flashcard */}
            {mode === "flashcard" && (
              <div>
                {!flipped ? (
                  <button onClick={() => setFlipped(true)} style={{ width: "100%", background: dark ? "#1a2420" : "#f0ebe3", border: `2px dashed ${dark ? "#2d3d38" : "#d0cdc6"}`, borderRadius: 16, padding: 24, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14, color: dark ? "#4a6b5e" : "#8a9e96" }}>
                    Tap to reveal meaning
                  </button>
                ) : (
                  <div>
                    <div style={{ background: dark ? "#1e3828" : "#eaf3ef", borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 16 }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, color: dark ? "#6baf96" : "#2d7a5e" }}>{current[lang]}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => nextCard(false)} style={{ flex: 1, background: dark ? "#3d1515" : "#fee2e2", border: "none", borderRadius: 12, padding: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, color: dark ? "#f87171" : "#dc2626" }}>🔴 Still learning</button>
                      <button onClick={() => nextCard(true)} style={{ flex: 1, background: dark ? "#1e3828" : "#dcfce7", border: "none", borderRadius: 12, padding: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, color: dark ? "#4ade80" : "#16a34a" }}>🟢 Got it</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Multiple choice */}
            {mode === "mc" && (
              <div className="mc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {mcOptions.map((opt, i) => {
                  const isCorrect = opt.id === current.id;
                  const chosen = mcChoice === opt.id;
                  let bg2 = dark ? "#1a2420" : "#f0ebe3";
                  if (result && isCorrect) bg2 = dark ? "#1e3828" : "#dcfce7";
                  if (result && chosen && !isCorrect) bg2 = dark ? "#3d1515" : "#fee2e2";
                  return (
                    <button key={opt.id} onClick={() => {
                      if (result) return;
                      setMcChoice(opt.id);
                      setResult(isCorrect ? "correct" : "wrong");
                      setTimeout(() => nextCard(isCorrect), 900);
                    }} style={{
                      background: bg2, border: `2px solid ${chosen && result ? (isCorrect ? "#16a34a" : "#dc2626") : (dark ? "#2d3d38" : "#d0cdc6")}`,
                      borderRadius: 12, padding: 16, cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                      fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
                      color: dark ? "#e8e4dc" : "#1c1c1e",
                    }}>{opt[lang]}</button>
                  );
                })}
              </div>
            )}

            {/* Fill in the blank */}
            {mode === "fill" && (
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: dark ? "#6b7a74" : "#8a9490", marginBottom: 12, textAlign: "center" }}>
                  Type the {lang === "en" ? "English" : "Russian"} meaning:
                </div>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && input.trim() && !result) {
                      const correct = current[lang].toLowerCase().includes(input.trim().toLowerCase()) || input.trim().toLowerCase().includes(current[lang].split("/")[0].trim().toLowerCase());
                      setResult(correct ? "correct" : "wrong");
                      setTimeout(() => nextCard(correct), 1000);
                    }
                  }}
                  placeholder="Type and press Enter…"
                  style={{
                    width: "100%", padding: "14px 16px", borderRadius: 12, boxSizing: "border-box",
                    border: `2px solid ${result === "correct" ? "#16a34a" : result === "wrong" ? "#dc2626" : (dark ? "#2d3d38" : "#d0cdc6")}`,
                    background: dark ? "#111210" : "#fafaf8",
                    fontFamily: "'Inter', sans-serif", fontSize: 16,
                    color: dark ? "#e8e4dc" : "#1c1c1e",
                    outline: "none",
                  }}
                  disabled={!!result}
                  autoFocus
                />
                {result && (
                  <div style={{ marginTop: 12, textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: result === "correct" ? (dark ? "#4ade80" : "#16a34a") : (dark ? "#f87171" : "#dc2626") }}>
                    {result === "correct" ? "✓ Correct!" : `✗ Answer: ${current[lang]}`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {done && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🥨</div>
            <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 32, fontWeight: 700, color: dark ? "#e8e4dc" : "#1c1c1e", marginBottom: 8 }}>Session complete!</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: dark ? "#6b7a74" : "#8a9490", marginBottom: 24 }}>
              {score} / {queue.length} correct · +{score > queue.length / 2 ? 50 : 20} XP earned
            </div>
            <button onClick={onClose} style={{ background: dark ? "#2d3d38" : "#5b8c7a", color: dark ? "#6baf96" : "#ffffff", border: "none", borderRadius: 12, padding: "14px 32px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16 }}>
              Back to my words
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function PretzelBites() {
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [bank, setBank] = useState(SAMPLE_WORDS);
  const [confidence, setConfidence] = useState({});
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("search"); // search | bank
  const [exercise, setExercise] = useState(false);
  const [filterTag, setFilterTag] = useState(null);
  const [filterConf, setFilterConf] = useState(null);
  const [filterRoot, setFilterRoot] = useState(null);
  const [filterMishkal, setFilterMishkal] = useState(null);
  const [toast, setToast] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkSummary, setBulkSummary] = useState("");

  const { level, progress } = xpToLevel(xp);
  
// Auth listener
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthLoading(false);
  });
  return unsub;
}, []);

// Load data only after user is logged in
useEffect(() => {
  if (!user) return;
  async function loadData() {
    try {
      const metaDoc = await getDoc(doc(db, "users", BANK_UID, "meta", "data"));
      if (metaDoc.exists()) {
        const data = metaDoc.data();
        setXp(data.xp || 0);
        setStreak(data.streak || 0);
        setConfidence(data.confidence || {});
      }
      const bankSnap = await getDocs(collection(db, "users", BANK_UID, "wordBank"));
      if (!bankSnap.empty) {
        const words = bankSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        setBank(words);
      } else {
        setBank(SAMPLE_WORDS);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    }
    setLoaded(true);
  }
  loadData();
}, [user]);

useEffect(() => {
  if (!loaded || !user) return;
  setDoc(doc(db, "users", BANK_UID, "meta", "data"), { xp, streak, confidence });
}, [xp, streak, confidence, loaded, user]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const addXP = useCallback((amount) => {
    setXp(x => x + amount);
    showToast(`+${amount} XP 🎉`);
  }, [showToast]);

  async function performLookup(term) {
    if (!term.trim()) return;
    setTab("search");
    setSearching(true);
    setSearchResult(null);
    setSearchError("");
    try {
      const word = await lookupWord(term.trim());
      word.id = Date.now();
      if (!Array.isArray(word.examples)) word.examples = [];
      setSearchResult(word);
      // Auto-save to bank if not duplicate
      setBank(b => {
  const exists = b.some(w => w.hebrew === word.hebrew);
  if (!exists) {
    // Save new word to Firebase
    if (user) setDoc(doc(db, "users", BANK_UID, "wordBank", String(word.id)), word);
    addXP(5);
    showToast("Word saved to your bank! +5 XP");
    return [word, ...b];
  }
  return b;
});

    } catch {
      setSearchError("Couldn't look up that word. Try again or check your spelling.");
    }
    setSearching(false);
  }

  function handleSearch() {
    performLookup(search);
  }

  async function handleBulkAdd() {
    const terms = [...new Set(
      bulkText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
    )];
    if (terms.length === 0) return;
    setBulkAdding(true);
    setBulkSummary("");
    setBulkProgress({ current: 0, total: terms.length });

    let added = 0, duplicates = 0, failed = 0;
    for (let i = 0; i < terms.length; i++) {
      setBulkProgress({ current: i + 1, total: terms.length });
      try {
        const word = await lookupWord(terms[i]);
        word.id = Date.now() + i;
        if (!Array.isArray(word.examples)) word.examples = [];
        let isDuplicate = false;
        setBank(b => {
          if (b.some(w => w.hebrew === word.hebrew)) { isDuplicate = true; return b; }
          if (user) setDoc(doc(db, "users", BANK_UID, "wordBank", String(word.id)), word);
          return [word, ...b];
        });
        if (isDuplicate) duplicates++; else added++;
      } catch {
        failed++;
      }
    }

    if (added > 0) setXp(x => x + 5 * added);
    const parts = [`${added} word${added === 1 ? "" : "s"} added`];
    if (duplicates > 0) parts.push(`${duplicates} already in the bank`);
    if (failed > 0) parts.push(`${failed} couldn't be looked up`);
    setBulkSummary(parts.join(" · "));
    setBulkText("");
    setBulkAdding(false);
    showToast(added > 0 ? `+${5 * added} XP 🎉` : "No new words added");
  }

  function handleRelatedWordClick(hebrew) {
    setSearch(hebrew);
    performLookup(hebrew);
  }

  const handleUpdateWord = useCallback((id, patch) => {
    setBank(b => b.map(w => (w.id === id ? { ...w, ...patch } : w)));
    setSearchResult(r => (r && r.id === id ? { ...r, ...patch } : r));
    if (user) setDoc(doc(db, "users", BANK_UID, "wordBank", String(id)), patch, { merge: true });
  }, [user]);

  function goFilterRoot(root) {
    setTab("bank");
    setFilterMishkal(null);
    setFilterRoot(r => (r === root ? null : root));
  }

  function goFilterMishkal(mishkal) {
    setTab("bank");
    setFilterRoot(null);
    setFilterMishkal(m => (m === mishkal ? null : mishkal));
  }

  const handleConfidence = useCallback((id, val) => {
    setConfidence(c => {
      const prev = c[id];
      const next = { ...c, [id]: val };
      if (val === "green" && prev !== "green") addXP(10);
      return next;
    });
  }, [addXP]);

  // Filtered bank
  const filteredBank = bank.filter(w => {
    if (filterTag && !w.tags?.includes(filterTag)) return false;
    if (filterConf && (confidence[w.id] || "none") !== filterConf) return false;
    if (filterRoot && w.root !== filterRoot) return false;
    if (filterMishkal && w.mishkal !== filterMishkal) return false;
    return true;
  });

  // Styles
  const bg = dark ? "#0e1210" : "#fafaf8";
  const text = dark ? "#e8e4dc" : "#1c1c1e";
  const subtle = dark ? "#4a6b5e" : "#8a9e96";
  const cardBg = dark ? "#141a16" : "#ffffff";
  const border = dark ? "#1e2c26" : "#e5e0d8";
  const sage = dark ? "#6baf96" : "#5b8c7a";
  
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const allowedEmails = ["davidoh4242@gmail.com", "miron.alexandrra@gmail.com"];
      if (!allowedEmails.includes(result.user.email)) {
        await signOut(auth);
        alert("Access denied. This app is private.");
        return;
      }
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 48, color: sage }}>🥨</div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <img src={`data:image/png;base64,${PRETZEL_B64}`} width={80} height={80} alt="logo" />
      <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 42, fontWeight: 700, color: text }}>Pretzel Bites</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: subtle }}>Your Hebrew vocabulary companion</div>
      <button onClick={handleSignIn} style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "#ffffff", border: "1.5px solid #e0dbd4",
        borderRadius: 12, padding: "14px 24px", cursor: "pointer",
        fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600,
        color: "#1c1c1e", boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}>
        <img src="https://www.google.com/favicon.ico" width={20} height={20} alt="Google" />
        Continue with Google
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "'Inter', sans-serif", transition: "background 0.3s, color 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: dark ? "#2d3d38" : "#1c1c1e", color: "#ffffff", padding: "10px 20px", borderRadius: 100, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Exercise modal */}
      {exercise && <ExerciseModal words={bank} dark={dark} onClose={() => setExercise(false)} onXP={addXP} />}

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${border}`, background: cardBg, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PretzelIcon size={34} />
            <span style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 22, fontWeight: 700, color: text }}>Pretzel Bites</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Streak */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#f97316" }}>
              <FlameIcon />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{streak}</span>
            </div>
            {/* XP - hidden on mobile via class */}
            <div className="header-xp" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: subtle, fontWeight: 600 }}>{level}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: sage }}>{xp} XP</div>
              </div>
              <div style={{ width: 48, height: 6, background: dark ? "#1a2420" : "#e8e0d0", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: sage, borderRadius: 100, transition: "width 0.5s" }} />
              </div>
            </div>
            {/* Dark mode */}
            <button onClick={() => setDark(d => !d)} style={{ background: "none", border: "none", cursor: "pointer", color: subtle, display: "flex", alignItems: "center" }}>
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button onClick={handleSignOut} style={{
  background: "none", border: `1px solid ${border}`,
  borderRadius: 8, padding: "5px 10px", cursor: "pointer",
  fontFamily: "'Inter', sans-serif", fontSize: 12,
  color: subtle,
}}>Sign out</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Level progress bar */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: sage }}>{level}</span>
              <span style={{ fontSize: 12, color: subtle }}>{xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP to next level</span>
            </div>
            <div style={{ background: dark ? "#1a2420" : "#e8e0d0", borderRadius: 100, height: 8 }}>
              <div style={{ background: `linear-gradient(90deg, ${sage}, ${dark ? "#9dd4be" : "#7cb9a0"})`, height: 8, borderRadius: 100, width: `${progress}%`, transition: "width 0.5s" }} />
            </div>
          </div>
          <button onClick={() => setExercise(true)} style={{
            background: sage, color: "#ffffff", border: "none", borderRadius: 12,
            padding: "10px 18px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
            fontWeight: 700, fontSize: 14, whiteSpace: "nowrap",
          }}>
            Daily Practice 🥨
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: dark ? "#111210" : "#f0ebe3", borderRadius: 12, padding: 4 }}>
          {[["search",<><span className="tab-label-full">Look up a word</span><span className="tab-label-short">Search</span></>],["bank",`My Bank (${bank.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
              background: tab === key ? cardBg : "transparent",
              color: tab === key ? text : subtle,
              boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        {/* Search tab */}
        {tab === "search" && (
          <div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search in Hebrew or English… e.g. לְהַבִּין or understand"
                style={{
                  width: "100%", padding: "16px 92px 16px 18px", borderRadius: 14,
                  border: `1.5px solid ${border}`, background: cardBg,
                  fontFamily: "'Inter', sans-serif", fontSize: 16,
                  color: text, outline: "none", boxSizing: "border-box",
                  direction: /[\u0590-\u05FF]/.test(search) ? "rtl" : "ltr",
                }}
              />
              {search && (
                <button onClick={() => { setSearch(""); setSearchResult(null); setSearchError(""); }} style={{
                  position: "absolute", right: 54, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", borderRadius: 10, padding: "8px",
                  cursor: "pointer", color: subtle, display: "flex", alignItems: "center",
                }}>
                  <XIcon />
                </button>
              )}
              <button onClick={handleSearch} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: sage, border: "none", borderRadius: 10, padding: "8px 10px",
                cursor: "pointer", color: "#ffffff", display: "flex", alignItems: "center",
              }}>
                <SearchIcon />
              </button>
            </div>
            <div style={{ fontSize: 12, color: subtle, marginBottom: 16 }}>Every word you look up is automatically saved to your bank.</div>

            <div style={{ marginBottom: 24 }}>
              <button onClick={() => setBulkOpen(o => !o)} style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                color: sage, fontFamily: "'Inter', sans-serif", fontSize: 13,
                fontWeight: 600, textDecoration: "underline",
              }}>
                {bulkOpen ? "Hide bulk add" : "Add multiple words at once"}
              </button>

              {bulkOpen && (
                <div style={{ marginTop: 12 }}>
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder="Paste words in Hebrew, English or Russian — one per line, or separated by commas…"
                    rows={6}
                    disabled={bulkAdding}
                    style={{
                      width: "100%", padding: 14, borderRadius: 14,
                      border: `1.5px solid ${border}`, background: cardBg,
                      fontFamily: "'Inter', sans-serif", fontSize: 14,
                      color: text, outline: "none", boxSizing: "border-box", resize: "vertical",
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={handleBulkAdd}
                      disabled={bulkAdding || !bulkText.trim()}
                      style={{
                        background: sage, color: "#ffffff", border: "none", borderRadius: 10,
                        padding: "9px 16px", cursor: bulkAdding || !bulkText.trim() ? "default" : "pointer",
                        fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13,
                        opacity: bulkAdding || !bulkText.trim() ? 0.6 : 1,
                      }}
                    >
                      {bulkAdding ? `Adding ${bulkProgress.current}/${bulkProgress.total}…` : "Add all words"}
                    </button>
                    {bulkSummary && !bulkAdding && (
                      <div style={{ fontSize: 13, color: subtle, fontFamily: "'Inter', sans-serif" }}>{bulkSummary}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {searching && (
              <div style={{ textAlign: "center", padding: 48 }}>
                <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 48, animation: "pulse 1.5s infinite", color: sage }}>🥨</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: subtle, marginTop: 12 }}>Looking up your word…</div>
              </div>
            )}
            {searchError && <div style={{ color: "#dc2626", fontFamily: "'Inter', sans-serif", fontSize: 14, marginBottom: 16 }}>{searchError}</div>}
            {searchResult && (
              <WordCard
                word={searchResult}
                dark={dark}
                onConfidence={handleConfidence}
                confidence={confidence[searchResult.id]}
                onUpdateWord={handleUpdateWord}
                onFilterRoot={goFilterRoot}
                onFilterMishkal={goFilterMishkal}
                onRelatedWordClick={handleRelatedWordClick}
                isFocused
              />
            )}

            {!searchResult && !searching && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 80, color: dark ? "#1a2420" : "#e8e0d0", marginBottom: 8, direction: "rtl" }}>מילים</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: subtle }}>Type any word to get started</div>
              </div>
            )}
          </div>
        )}

        {/* Bank tab */}
        {tab === "bank" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              <button onClick={() => setFilterConf(null)} style={{ padding: "5px 14px", borderRadius: 100, border: `1px solid ${filterConf === null && !filterTag ? sage : border}`, background: filterConf === null && !filterTag ? (dark ? "#1e3828" : "#eaf3ef") : "transparent", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13, color: filterConf === null && !filterTag ? sage : subtle }}>All</button>
              {[["🔴","red"],["🟡","yellow"],["🟢","green"]].map(([e, v]) => (
                <button key={v} onClick={() => setFilterConf(c => c === v ? null : v)} style={{ padding: "5px 14px", borderRadius: 100, border: `1px solid ${filterConf === v ? sage : border}`, background: filterConf === v ? (dark ? "#1e3828" : "#eaf3ef") : "transparent", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13, color: filterConf === v ? sage : subtle }}>{e}</button>
              ))}
              <div style={{ width: 1, background: border, margin: "0 4px" }} />
              {TAGS.map(t => (
                <button key={t} onClick={() => setFilterTag(f => f === t ? null : t)} style={{ padding: "5px 14px", borderRadius: 100, border: `1px solid ${filterTag === t ? sage : border}`, background: filterTag === t ? (dark ? "#1e3828" : "#eaf3ef") : "transparent", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12, color: filterTag === t ? sage : subtle }}>{t}</button>
              ))}
            </div>

            {(filterRoot || filterMishkal) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: subtle }}>Filtering by {filterRoot ? "root" : "mishkal"}:</span>
                <span style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 16, direction: "rtl", color: sage }}>{filterRoot || filterMishkal}</span>
                <button onClick={() => { setFilterRoot(null); setFilterMishkal(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: subtle, fontSize: 13 }}>✕ clear</button>
              </div>
            )}

            {filteredBank.length === 0 && (
              <div style={{ textAlign: "center", padding: 48, color: subtle, fontFamily: "'Inter', sans-serif" }}>No words match this filter.</div>
            )}

            {/* Stats row */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                ["Total words", bank.length, "📚"],
                ["Mastered 🟢", Object.values(confidence).filter(v => v === "green").length, "✅"],
                ["Still learning 🔴", Object.values(confidence).filter(v => v === "red").length, "📖"],
              ].map(([label, val, icon]) => (
                <div key={label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: sage }}>{val}</div>
                  <div style={{ fontSize: 11, color: subtle, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {filteredBank.map(w => (
              <WordCard
                key={w.id}
                word={w}
                dark={dark}
                onConfidence={handleConfidence}
                confidence={confidence[w.id]}
                onUpdateWord={handleUpdateWord}
                onFilterRoot={goFilterRoot}
                onFilterMishkal={goFilterMishkal}
                onRelatedWordClick={handleRelatedWordClick}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        * { box-sizing: border-box; }
        input::placeholder { color: ${subtle}; }
        button:hover { opacity: 0.88; }
        @media (max-width: 480px) {
          .word-hebrew { font-size: 44px !important; }
          .word-card { padding: 20px 16px !important; }
          .conj-grid { grid-template-columns: 1fr !important; }
          .mc-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .header-xp { display: none !important; }
          .size-picker { flex-direction: column !important; align-items: stretch !important; }
          .size-btn { min-width: unset !important; }
          .tab-label-full { display: none; }
          .tab-label-short { display: inline; }
        }
        @media (min-width: 481px) {
          .tab-label-short { display: none; }
        }
      `}</style>
    </div>
  );
}
