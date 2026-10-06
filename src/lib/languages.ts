export type Language = { code: string; native: string; english: string };

export const defaultLanguage: Language = { code: "en", native: "English", english: "English" };

export const commonLanguages: Language[] = [
  { code: "zh-CN", native: "简体中文", english: "Chinese (Simplified)" },
  { code: "zh-TW", native: "繁體中文", english: "Chinese (Traditional)" },
  { code: "vi", native: "Tiếng Việt", english: "Vietnamese" },
  { code: "el", native: "Ελληνικά", english: "Greek" },
  { code: "it", native: "Italiano", english: "Italian" },
  { code: "ar", native: "العربية", english: "Arabic" },
  { code: "hi", native: "हिन्दी", english: "Hindi" },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi" },
  { code: "tl", native: "Filipino", english: "Filipino" },
  { code: "ko", native: "한국어", english: "Korean" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "tr", native: "Türkçe", english: "Turkish" },
  { code: "mk", native: "Македонски", english: "Macedonian" },
  { code: "si", native: "සිංහල", english: "Sinhala" },
  { code: "ta", native: "தமிழ்", english: "Tamil" },
  { code: "id", native: "Bahasa Indonesia", english: "Indonesian" },
  { code: "ne", native: "नेपाली", english: "Nepali" },
  { code: "ur", native: "اردو", english: "Urdu" },
  { code: "fa", native: "فارسی", english: "Persian" },
  { code: "ja", native: "日本語", english: "Japanese" },
];

export const moreLanguages: Language[] = [
  { code: "af", native: "Afrikaans", english: "Afrikaans" },
  { code: "sq", native: "Shqip", english: "Albanian" },
  { code: "am", native: "አማርኛ", english: "Amharic" },
  { code: "hy", native: "Հայերեն", english: "Armenian" },
  { code: "az", native: "Azərbaycan", english: "Azerbaijani" },
  { code: "bn", native: "বাংলা", english: "Bengali" },
  { code: "bs", native: "Bosanski", english: "Bosnian" },
  { code: "bg", native: "Български", english: "Bulgarian" },
  { code: "my", native: "မြန်မာ", english: "Burmese" },
  { code: "hr", native: "Hrvatski", english: "Croatian" },
  { code: "cs", native: "Čeština", english: "Czech" },
  { code: "da", native: "Dansk", english: "Danish" },
  { code: "nl", native: "Nederlands", english: "Dutch" },
  { code: "fi", native: "Suomi", english: "Finnish" },
  { code: "fr", native: "Français", english: "French" },
  { code: "ka", native: "ქართული", english: "Georgian" },
  { code: "de", native: "Deutsch", english: "German" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati" },
  { code: "iw", native: "עברית", english: "Hebrew" },
  { code: "hu", native: "Magyar", english: "Hungarian" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada" },
  { code: "kk", native: "Қазақша", english: "Kazakh" },
  { code: "km", native: "ខ្មែរ", english: "Khmer" },
  { code: "ku", native: "Kurdî", english: "Kurdish" },
  { code: "lo", native: "ລາວ", english: "Lao" },
  { code: "ms", native: "Bahasa Melayu", english: "Malay" },
  { code: "ml", native: "മലയാളം", english: "Malayalam" },
  { code: "mt", native: "Malti", english: "Maltese" },
  { code: "mi", native: "Te Reo Māori", english: "Maori" },
  { code: "mr", native: "मराठी", english: "Marathi" },
  { code: "mn", native: "Монгол", english: "Mongolian" },
  { code: "no", native: "Norsk", english: "Norwegian" },
  { code: "ps", native: "پښتو", english: "Pashto" },
  { code: "pl", native: "Polski", english: "Polish" },
  { code: "pt", native: "Português", english: "Portuguese" },
  { code: "ro", native: "Română", english: "Romanian" },
  { code: "ru", native: "Русский", english: "Russian" },
  { code: "sm", native: "Gagana Samoa", english: "Samoan" },
  { code: "sr", native: "Српски", english: "Serbian" },
  { code: "sk", native: "Slovenčina", english: "Slovak" },
  { code: "sl", native: "Slovenščina", english: "Slovenian" },
  { code: "so", native: "Soomaali", english: "Somali" },
  { code: "sw", native: "Kiswahili", english: "Swahili" },
  { code: "sv", native: "Svenska", english: "Swedish" },
  { code: "te", native: "తెలుగు", english: "Telugu" },
  { code: "th", native: "ไทย", english: "Thai" },
  { code: "uk", native: "Українська", english: "Ukrainian" },
  { code: "uz", native: "Oʻzbekcha", english: "Uzbek" },
  { code: "zu", native: "isiZulu", english: "Zulu" },
];

export const translatableCodes = [...commonLanguages, ...moreLanguages].map((l) => l.code);

export function findLanguage(code: string): Language {
  return (
    [defaultLanguage, ...commonLanguages, ...moreLanguages].find((l) => l.code === code) ??
    defaultLanguage
  );
}
