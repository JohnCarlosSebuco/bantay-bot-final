// Border Radius System for BantayBot
// Modern rounded corners following 2025 design trends

const borderRadius = {
  // No radius
  none: 0,

  // Subtle rounding
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,

  // Full rounding
  full: 9999,
  round: 9999,  // Alias for full

  // Component-specific
  components: {
    // Buttons
    button: {
      sm: 8,
      md: 12,
      lg: 16,
      pill: 9999,
    },

    // Cards
    card: {
      sm: 12,
      md: 16,
      lg: 20,
    },

    // Inputs
    input: {
      sm: 8,
      md: 10,
      lg: 12,
    },

    // Badges
    badge: {
      sm: 6,
      md: 8,
      lg: 10,
      pill: 9999,
    },

    // Modals
    modal: {
      sm: 16,
      md: 20,
      lg: 24,
    },

    // Bottom sheets
    bottomSheet: {
      top: 24,  // Only round the top corners
    },

    // Avatar
    avatar: 9999,

    // Chips
    chip: 16,

    // Dialogs
    dialog: 20,

    // Images
    image: {
      sm: 8,
      md: 12,
      lg: 16,
    },
  },
};

export default borderRadius;
