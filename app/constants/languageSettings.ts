// Interface for language options
export interface LanguageOption {
  code: string;
  name: string;
}

// All available languages for Wikipedia
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
];

// Default enabled language (just English)
export const DEFAULT_ENABLED_LANGUAGES = ["en"];

// Local storage key for enabled languages
export const STORAGE_KEY_ENABLED_LANGUAGES = "wikiTimeline_enabledLanguages"; 