import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../tailwind.config';

const fullConfig = resolveConfig(tailwindConfig);

function getColorFromClass(className: string): string {
  const match = className.match(/(?:bg|text)-([a-z]+)-(\d+)/);
  if (!match) return '#ffffff';
  
  const [_, color, shade] = match;
  return (fullConfig.theme?.colors as any)?.[color]?.[shade] || '#ffffff';
}

export interface ColorScheme {
  id: string;
  name: string;
  colors: {
    [key: number]: {
      color: string;      // hex color
      textColor: string;  // hex color
    };
  };
}

const TAILWIND_CLASSES = {
  id: "default",
  name: "Tailwind Light",
  colors: {
    0: {
      color: "bg-violet-50",
      textColor: "text-violet-800"
    },
    1: {
      color: "bg-sky-50",
      textColor: "text-sky-800"
    },
    2: {
      color: "bg-amber-50",
      textColor: "text-amber-800"
    },
    3: {
      color: "bg-red-50",
      textColor: "text-red-800"
    },
    4: {
      color: "bg-blue-50",
      textColor: "text-blue-800"
    },
    5: {
      color: "bg-emerald-50",
      textColor: "text-emerald-800"
    },
    6: {
      color: "bg-fuchsia-50",
      textColor: "text-fuchsia-800"
    },
    7: {
      color: "bg-orange-50",
      textColor: "text-orange-800"
    },
    8: {
      color: "bg-cyan-50",
      textColor: "text-cyan-800"
    },
    9: {
      color: "bg-lime-50",
      textColor: "text-lime-800"
    }
  }
};

const NATURE_CLASSES = {
  id: "nature",
  name: "Nature Tones",
  colors: {
    0: {
      color: "bg-emerald-50",  // Forest
      textColor: "text-emerald-800"
    },
    1: {
      color: "bg-amber-50",    // Sand
      textColor: "text-amber-800"
    },
    2: {
      color: "bg-sky-50",      // Ocean
      textColor: "text-sky-800"
    },
    3: {
      color: "bg-rose-50",     // Coral
      textColor: "text-rose-800"
    },
    4: {
      color: "bg-lime-50",     // Grass
      textColor: "text-lime-800"
    },
    5: {
      color: "bg-orange-50",   // Sunset
      textColor: "text-orange-800"
    },
    6: {
      color: "bg-cyan-50",     // Lake
      textColor: "text-cyan-800"
    },
    7: {
      color: "bg-yellow-50",   // Sun
      textColor: "text-yellow-800"
    },
    8: {
      color: "bg-teal-50",     // Lagoon
      textColor: "text-teal-800"
    },
    9: {
      color: "bg-green-50",    // Moss
      textColor: "text-green-800"
    }
  }
};

const VIBRANT_CLASSES = {
  id: "vibrant",
  name: "Vibrant Pastels",
  colors: {
    0: {
      color: "bg-pink-50",
      textColor: "text-pink-800"
    },
    1: {
      color: "bg-blue-50",
      textColor: "text-blue-800"
    },
    2: {
      color: "bg-yellow-50",
      textColor: "text-yellow-800"
    },
    3: {
      color: "bg-purple-50",
      textColor: "text-purple-800"
    },
    4: {
      color: "bg-orange-50",
      textColor: "text-orange-800"
    },
    5: {
      color: "bg-cyan-50",
      textColor: "text-cyan-800"
    },
    6: {
      color: "bg-red-50",
      textColor: "text-red-800"
    },
    7: {
      color: "bg-lime-50",
      textColor: "text-lime-800"
    },
    8: {
      color: "bg-fuchsia-50",
      textColor: "text-fuchsia-800"
    },
    9: {
      color: "bg-emerald-50",
      textColor: "text-emerald-800"
    }
  }
};

const MONOCHROME_CLASSES = {
  id: "monochrome",
  name: "Monochrome",
  colors: {
    0: {
      color: "bg-gray-50",
      textColor: "text-gray-900"
    }
  }
};

// Convert Tailwind classes to hex colors
export const COLOR_SCHEMES: ColorScheme[] = [
  {
    ...TAILWIND_CLASSES,
    colors: Object.entries(TAILWIND_CLASSES.colors).reduce((acc, [key, value]) => {
      acc[key as unknown as number] = {
        color: getColorFromClass(value.color),
        textColor: getColorFromClass(value.textColor)
      };
      return acc;
    }, {} as ColorScheme['colors'])
  },
  {
    ...NATURE_CLASSES,
    colors: Object.entries(NATURE_CLASSES.colors).reduce((acc, [key, value]) => {
      acc[key as unknown as number] = {
        color: getColorFromClass(value.color),
        textColor: getColorFromClass(value.textColor)
      };
      return acc;
    }, {} as ColorScheme['colors'])
  },
  {
    ...VIBRANT_CLASSES,
    colors: Object.entries(VIBRANT_CLASSES.colors).reduce((acc, [key, value]) => {
      acc[key as unknown as number] = {
        color: getColorFromClass(value.color),
        textColor: getColorFromClass(value.textColor)
      };
      return acc;
    }, {} as ColorScheme['colors'])
  },
  {
    ...MONOCHROME_CLASSES,
    colors: Object.entries(MONOCHROME_CLASSES.colors).reduce((acc, [key, value]) => {
      acc[key as unknown as number] = {
        color: getColorFromClass(value.color),
        textColor: getColorFromClass(value.textColor)
      };
      return acc;
    }, {} as ColorScheme['colors'])
  }
];
  