// Modern 2025 Color Palette for BantayBot
// Based on current trends: softer, more sophisticated colors with better contrast

const colors = {
  // Primary Brand Colors - Modern green/teal for agriculture tech
  primary: {
    50: '#E6F7F5',
    100: '#B3E8E0',
    200: '#80D9CB',
    300: '#4DCAB5',
    400: '#26BDA0',
    500: '#00B08B',  // Main primary
    600: '#009E7D',
    700: '#008A6D',
    800: '#00765E',
    900: '#005A47',
  },

  // Secondary Colors - Vibrant purple/indigo for accents
  secondary: {
    50: '#EEE9FF',
    100: '#D4C5FF',
    200: '#BAA1FF',
    300: '#A07DFF',
    400: '#8659FF',
    500: '#6C35FF',  // Main secondary
    600: '#5F2EE0',
    700: '#5227C1',
    800: '#4520A2',
    900: '#371A7A',
  },

  // Success - Fresh green
  success: {
    50: '#EDFAF2',
    100: '#D1F2DE',
    200: '#A4E6BD',
    300: '#77DA9C',
    400: '#4ACE7B',
    500: '#2BB65A',  // Main success
    600: '#229E4B',
    700: '#1A863E',
    800: '#126E31',
    900: '#0A5624',
  },

  // Warning - Warm orange
  warning: {
    50: '#FFF6E6',
    100: '#FFE7B8',
    200: '#FFD88A',
    300: '#FFC95C',
    400: '#FFBA2E',
    500: '#FFAB00',  // Main warning
    600: '#E09900',
    700: '#C18700',
    800: '#A27500',
    900: '#7A5800',
  },

  // Error - Sophisticated red
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336',  // Main error
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },

  // Info - Modern blue
  info: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',  // Main info
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  // Neutral Colors - Sophisticated grays
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    1000: '#000000',
  },

  // Semantic Colors for Light Theme
  light: {
    background: {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      tertiary: '#F5F5F5',
      elevated: '#FFFFFF',
    },
    surface: {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      tertiary: '#EEEEEE',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      disabled: '#D1D5DB',
      inverse: '#FFFFFF',
    },
    border: {
      primary: '#E5E7EB',
      secondary: '#F3F4F6',
      focus: '#00B08B',
    },
    shadow: 'rgba(0, 0, 0, 0.08)',
  },

  // Semantic Colors for Dark Theme
  dark: {
    background: {
      primary: '#0F172A',
      secondary: '#1E293B',
      tertiary: '#334155',
      elevated: '#1E293B',
    },
    surface: {
      primary: '#1E293B',
      secondary: '#334155',
      tertiary: '#475569',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
      disabled: '#64748B',
      inverse: '#0F172A',
    },
    border: {
      primary: '#334155',
      secondary: '#475569',
      focus: '#26BDA0',
    },
    shadow: 'rgba(0, 0, 0, 0.3)',
  },

  // Gradient Definitions
  gradients: {
    primary: ['#00B08B', '#26BDA0'],
    secondary: ['#6C35FF', '#8659FF'],
    success: ['#2BB65A', '#4ACE7B'],
    warning: ['#FFAB00', '#FFC95C'],
    error: ['#F44336', '#EF5350'],
    info: ['#2196F3', '#42A5F5'],
    sunset: ['#FF6B6B', '#FFB347'],
    ocean: ['#667eea', '#764ba2'],
    forest: ['#134E5E', '#71B280'],
    sky: ['#4facfe', '#00f2fe'],
    fire: ['#fa709a', '#fee140'],
    purple: ['#a8edea', '#fed6e3'],
  },

  // Status Colors
  status: {
    online: '#2BB65A',
    offline: '#F44336',
    away: '#FFAB00',
    busy: '#F44336',
  },

  // Special Colors
  overlay: {
    light: 'rgba(255, 255, 255, 0.9)',
    medium: 'rgba(255, 255, 255, 0.7)',
    dark: 'rgba(0, 0, 0, 0.5)',
  },

  // Transparent
  transparent: 'transparent',
};

export default colors;
