// Spacing System for BantayBot
// Based on 4px grid system - modern standard for 2025

const spacing = {
  // Base unit: 4px
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,

  // Semantic spacing - Named values for common use cases
  none: 0,
  xs: 4,      // Extra small padding/margin
  sm: 8,      // Small padding/margin
  md: 16,     // Medium padding/margin
  lg: 24,     // Large padding/margin
  xl: 32,     // Extra large padding/margin
  '2xl': 40,  // 2x extra large
  '3xl': 48,  // 3x extra large
  '4xl': 64,  // 4x extra large
  '5xl': 80,  // 5x extra large

  // Component-specific spacing
  components: {
    // Cards
    cardPadding: {
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
    },
    cardGap: {
      sm: 8,
      md: 12,
      lg: 16,
    },

    // Buttons
    buttonPadding: {
      horizontal: {
        sm: 12,
        md: 16,
        lg: 20,
      },
      vertical: {
        sm: 8,
        md: 12,
        lg: 16,
      },
    },

    // Forms
    inputPadding: {
      horizontal: 16,
      vertical: 12,
    },
    formFieldGap: 16,

    // Lists
    listItemPadding: {
      horizontal: 16,
      vertical: 12,
    },
    listItemGap: 8,

    // Screen padding
    screenPadding: {
      horizontal: 16,
      vertical: 16,
      top: 16,
      bottom: 24,
    },

    // Section spacing
    sectionGap: 24,
    sectionPadding: 16,

    // Icon spacing
    iconMargin: {
      sm: 8,
      md: 12,
      lg: 16,
    },
  },

  // Layout breakpoints (for responsive design)
  breakpoints: {
    xs: 0,
    sm: 360,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};

export default spacing;
