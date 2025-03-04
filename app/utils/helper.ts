import { PAGE_NAME_SEPARATOR } from "@/app/constants";

// Helper function to compare dates that might be in YYYY, YYYY-MM, or YYYY-MM-DD format
export function compareDates(dateA: string, dateB: string): number {
    const aIsNegative = dateA.startsWith("-");
    const bIsNegative = dateB.startsWith("-");
    
    const aParts = (aIsNegative ? dateA.slice(1) : dateA)
      .split("-")
      .map(Number);
    const bParts = (bIsNegative ? dateB.slice(1) : dateB)
      .split("-")
      .map(Number);
    
    const aYear = aParts[0] * (aIsNegative ? -1 : 1);
    const bYear = bParts[0] * (bIsNegative ? -1 : 1);
  
    if (aYear !== bYear) return aYear - bYear;
    if (aParts[1] && bParts[1] && aParts[1] !== bParts[1]) return aParts[1] - bParts[1];
    if (aParts[2] && bParts[2]) return aParts[2] - bParts[2];
    return aParts.length - bParts.length;
  }

/**
 * Formats a page name by:
 * 1. Decoding URL-encoded characters
 * 2. Removing language prefixes (e.g., "zh:PageName")
 * 3. Replacing underscores with spaces
 * 
 * @param name The page name to format
 * @param pageNameSeparator The separator used between language code and page name (default is ":")
 * @returns The formatted page name
 */
export function formatPageName(name: string, pageNameSeparator: string = PAGE_NAME_SEPARATOR): {
  formattedName: string;
  language: string;
} {
  // Make sure the name is fully decoded
  let decodedName = name;
  try {
    // In case it's double-encoded
    decodedName = decodeURIComponent(name);
  } catch (e) {
    // If it fails, it's likely already decoded
  }

  // Parse language prefix if present (e.g., "zh:PageName")
  const langPrefixMatch = decodedName.match(
    new RegExp(`^([a-z]{2})${pageNameSeparator}(.*)`)
  );

  if (langPrefixMatch) {
    const [, langPrefix, actualName] = langPrefixMatch;
    const cleanName = actualName.replace(/_/g, " ");
    
    return {
      formattedName: cleanName,
      language: langPrefix
    };
  }

  // Default case - no language prefix found
  return {
    formattedName: decodedName.replace(/_/g, " "),
    language: "en" // Default to English
  };
}