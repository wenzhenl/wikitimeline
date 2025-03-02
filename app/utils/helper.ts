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