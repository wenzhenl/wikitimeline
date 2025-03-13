// Interface for language options
export interface LanguageOption {
  code: string;
  name: string;
}

// All languages for Wikipedia with 1,000,000 articles or more
export const COMMON_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "中文" },
  { code: "ar", name: "العربية" },
  { code: "fa", name: "فارسی" },
  { code: "arz", name: "مصرى" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "polski" },
  { code: "ceb", name: "Cebuano" },
  { code: "sv", name: "svenska" },
  { code: "uk", name: "українська" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "war", name: "Winaray" },
  { code: "ko", name: "한국어" },
];

// Default enabled language (just English)
export const DEFAULT_ENABLED_LANGUAGES = ["en"];

// Local storage key for enabled languages
export const STORAGE_KEY_ENABLED_LANGUAGES = "wikiTimeline_enabledLanguages";
