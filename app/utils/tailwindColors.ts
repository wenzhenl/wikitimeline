import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../tailwind.config';

const fullConfig = resolveConfig(tailwindConfig);

export function getColorFromClass(className: string): string {
  // Extract color name and shade from class name
  // e.g., "bg-violet-50" -> { color: "violet", shade: "50" }
  const match = className.match(/(?:bg|text)-([a-z]+)-(\d+)/);
  if (!match) return '#ffffff';
  
  const [_, color, shade] = match;
  return (fullConfig.theme?.colors as any)?.[color]?.[shade] || '#ffffff';
} 