// Animation System for BantayBot
// Modern, smooth animations following 2025 UX best practices

const animations = {
  // Timing functions (easing curves)
  easing: {
    // Standard easing
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',

    // Custom bezier curves - iOS-like
    standard: [0.4, 0.0, 0.2, 1],
    decelerate: [0.0, 0.0, 0.2, 1],
    accelerate: [0.4, 0.0, 1, 1],
    sharp: [0.4, 0.0, 0.6, 1],

    // Spring-based (for react-native-reanimated)
    spring: {
      damping: 15,
      mass: 1,
      stiffness: 150,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
    },
    bouncy: {
      damping: 10,
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
    },
    gentle: {
      damping: 20,
      mass: 1,
      stiffness: 120,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
    },
  },

  // Duration in milliseconds
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
    slowest: 700,

    // Semantic durations
    micro: 100,
    quick: 200,
    moderate: 300,
    patient: 400,
    relaxed: 600,
  },

  // Common animation presets
  presets: {
    // Fade animations
    fadeIn: {
      duration: 250,
      easing: [0.0, 0.0, 0.2, 1],
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      duration: 250,
      easing: [0.4, 0.0, 1, 1],
      from: { opacity: 1 },
      to: { opacity: 0 },
    },

    // Scale animations
    scaleIn: {
      duration: 250,
      easing: [0.0, 0.0, 0.2, 1],
      from: { transform: [{ scale: 0.95 }], opacity: 0 },
      to: { transform: [{ scale: 1 }], opacity: 1 },
    },
    scaleOut: {
      duration: 200,
      easing: [0.4, 0.0, 1, 1],
      from: { transform: [{ scale: 1 }], opacity: 1 },
      to: { transform: [{ scale: 0.95 }], opacity: 0 },
    },

    // Slide animations
    slideInRight: {
      duration: 300,
      easing: [0.0, 0.0, 0.2, 1],
      from: { transform: [{ translateX: 300 }], opacity: 0 },
      to: { transform: [{ translateX: 0 }], opacity: 1 },
    },
    slideInLeft: {
      duration: 300,
      easing: [0.0, 0.0, 0.2, 1],
      from: { transform: [{ translateX: -300 }], opacity: 0 },
      to: { transform: [{ translateX: 0 }], opacity: 1 },
    },
    slideInUp: {
      duration: 300,
      easing: [0.0, 0.0, 0.2, 1],
      from: { transform: [{ translateY: 300 }], opacity: 0 },
      to: { transform: [{ translateY: 0 }], opacity: 1 },
    },
    slideInDown: {
      duration: 300,
      easing: [0.0, 0.0, 0.2, 1],
      from: { transform: [{ translateY: -300 }], opacity: 0 },
      to: { transform: [{ translateY: 0 }], opacity: 1 },
    },

    // Button press
    buttonPress: {
      duration: 100,
      easing: [0.4, 0.0, 0.2, 1],
      from: { transform: [{ scale: 1 }] },
      to: { transform: [{ scale: 0.96 }] },
    },
    buttonRelease: {
      duration: 150,
      easing: [0.0, 0.0, 0.2, 1],
      from: { transform: [{ scale: 0.96 }] },
      to: { transform: [{ scale: 1 }] },
    },

    // Bounce
    bounce: {
      duration: 600,
      easing: 'ease-out',
      keyframes: {
        '0%': { transform: [{ translateY: 0 }] },
        '50%': { transform: [{ translateY: -20 }] },
        '100%': { transform: [{ translateY: 0 }] },
      },
    },

    // Pulse (for notifications, live indicators)
    pulse: {
      duration: 1500,
      easing: 'ease-in-out',
      loop: true,
      keyframes: {
        '0%': { transform: [{ scale: 1 }], opacity: 1 },
        '50%': { transform: [{ scale: 1.05 }], opacity: 0.8 },
        '100%': { transform: [{ scale: 1 }], opacity: 1 },
      },
    },

    // Shake (for errors)
    shake: {
      duration: 400,
      keyframes: {
        '0%': { transform: [{ translateX: 0 }] },
        '25%': { transform: [{ translateX: -10 }] },
        '50%': { transform: [{ translateX: 10 }] },
        '75%': { transform: [{ translateX: -10 }] },
        '100%': { transform: [{ translateX: 0 }] },
      },
    },

    // Spin (for loading)
    spin: {
      duration: 1000,
      easing: 'linear',
      loop: true,
      keyframes: {
        '0%': { transform: [{ rotate: '0deg' }] },
        '100%': { transform: [{ rotate: '360deg' }] },
      },
    },

    // Shimmer (for skeleton loaders)
    shimmer: {
      duration: 1500,
      easing: 'linear',
      loop: true,
      keyframes: {
        '0%': { transform: [{ translateX: -300 }] },
        '100%': { transform: [{ translateX: 300 }] },
      },
    },
  },

  // Transition configs for navigation
  navigation: {
    // Screen transitions
    slide: {
      duration: 300,
      easing: [0.0, 0.0, 0.2, 1],
    },
    fade: {
      duration: 250,
      easing: [0.4, 0.0, 0.2, 1],
    },
    modal: {
      duration: 350,
      easing: [0.0, 0.0, 0.2, 1],
    },

    // Tab transitions
    tab: {
      duration: 200,
      easing: [0.4, 0.0, 0.2, 1],
    },
  },

  // Haptic feedback patterns
  haptics: {
    light: 'light',
    medium: 'medium',
    heavy: 'heavy',
    success: 'success',
    warning: 'warning',
    error: 'error',
    selection: 'selection',
  },
};

export default animations;
