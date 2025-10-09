// Modern Typography System for BantayBot
// Following 2025 trends with clear hierarchy and readability

const typography = {
  // Font Families - Using system defaults for best performance
  fonts: {
    primary: 'System',  // iOS: SF Pro, Android: Roboto
    secondary: 'System',
    mono: 'monospace',
  },

  // Font Sizes - Using a modular scale (1.250 - Major Third)
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 15,
    lg: 17,
    xl: 19,
    '2xl': 23,
    '3xl': 28,
    '4xl': 34,
    '5xl': 41,
    '6xl': 49,
    '7xl': 59,
    '8xl': 71,
    '9xl': 85,
  },

  // Font Weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line Heights - For better readability
  lineHeight: {
    none: 1,
    tight: 1.15,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
    widest: 1.6,
  },

  // Text Variants - Pre-defined text styles
  variants: {
    // Display Texts (Large headlines)
    display: {
      large: {
        fontSize: 85,
        lineHeight: 1.15,
        fontWeight: '700',
        letterSpacing: -0.8,
      },
      medium: {
        fontSize: 59,
        lineHeight: 1.15,
        fontWeight: '700',
        letterSpacing: -0.8,
      },
      small: {
        fontSize: 49,
        lineHeight: 1.15,
        fontWeight: '700',
        letterSpacing: -0.4,
      },
    },

    // Headings
    heading: {
      h1: {
        fontSize: 34,
        lineHeight: 1.25,
        fontWeight: '700',
        letterSpacing: -0.4,
      },
      h2: {
        fontSize: 28,
        lineHeight: 1.25,
        fontWeight: '700',
        letterSpacing: 0,
      },
      h3: {
        fontSize: 23,
        lineHeight: 1.25,
        fontWeight: '600',
        letterSpacing: 0,
      },
      h4: {
        fontSize: 19,
        lineHeight: 1.5,
        fontWeight: '600',
        letterSpacing: 0,
      },
      h5: {
        fontSize: 17,
        lineHeight: 1.5,
        fontWeight: '600',
        letterSpacing: 0,
      },
      h6: {
        fontSize: 15,
        lineHeight: 1.5,
        fontWeight: '600',
        letterSpacing: 0.4,
      },
    },

    // Body texts
    body: {
      large: {
        fontSize: 17,
        lineHeight: 1.75,
        fontWeight: '400',
        letterSpacing: 0,
      },
      medium: {
        fontSize: 15,
        lineHeight: 1.5,
        fontWeight: '400',
        letterSpacing: 0,
      },
      small: {
        fontSize: 13,
        lineHeight: 1.5,
        fontWeight: '400',
        letterSpacing: 0,
      },
    },

    // Labels
    label: {
      large: {
        fontSize: 15,
        lineHeight: 1.5,
        fontWeight: '500',
        letterSpacing: 0,
      },
      medium: {
        fontSize: 13,
        lineHeight: 1.5,
        fontWeight: '500',
        letterSpacing: 0,
      },
      small: {
        fontSize: 11,
        lineHeight: 1.5,
        fontWeight: '500',
        letterSpacing: 0.4,
      },
    },

    // Captions
    caption: {
      large: {
        fontSize: 13,
        lineHeight: 1.5,
        fontWeight: '400',
        letterSpacing: 0,
      },
      medium: {
        fontSize: 11,
        lineHeight: 1.5,
        fontWeight: '400',
        letterSpacing: 0.4,
      },
      small: {
        fontSize: 11,
        lineHeight: 1.25,
        fontWeight: '400',
        letterSpacing: 0.4,
      },
    },

    // Button Text
    button: {
      large: {
        fontSize: 17,
        lineHeight: 1.25,
        fontWeight: '600',
        letterSpacing: 0.4,
      },
      medium: {
        fontSize: 15,
        lineHeight: 1.25,
        fontWeight: '600',
        letterSpacing: 0.4,
      },
      small: {
        fontSize: 13,
        lineHeight: 1.25,
        fontWeight: '600',
        letterSpacing: 0.4,
      },
    },

    // Overline (small uppercase text)
    overline: {
      large: {
        fontSize: 13,
        lineHeight: 1.25,
        fontWeight: '600',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
      },
      medium: {
        fontSize: 11,
        lineHeight: 1.25,
        fontWeight: '600',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
      },
      small: {
        fontSize: 11,
        lineHeight: 1.25,
        fontWeight: '600',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
      },
    },
  },
};

export default typography;
