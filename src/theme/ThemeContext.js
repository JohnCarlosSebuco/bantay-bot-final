// Theme Context for BantayBot
// Manages theme state and provides theme to all components

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from './index';

// Create the context
const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const [theme, setCurrentTheme] = useState(lightTheme);
  const [themePreference, setThemePreference] = useState('system'); // 'light', 'dark', 'system'

  // Load theme preference from storage on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when system color scheme changes (if using system theme)
  useEffect(() => {
    if (themePreference === 'system') {
      const shouldBeDark = systemColorScheme === 'dark';
      setIsDark(shouldBeDark);
      setCurrentTheme(shouldBeDark ? darkTheme : lightTheme);
    }
  }, [systemColorScheme, themePreference]);

  // Load saved theme preference
  const loadThemePreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('theme_preference');
      const savedDarkMode = await AsyncStorage.getItem('dark_mode');

      if (savedPreference) {
        setThemePreference(savedPreference);

        if (savedPreference === 'light') {
          setIsDark(false);
          setCurrentTheme(lightTheme);
        } else if (savedPreference === 'dark') {
          setIsDark(true);
          setCurrentTheme(darkTheme);
        } else {
          // System preference
          const shouldBeDark = systemColorScheme === 'dark';
          setIsDark(shouldBeDark);
          setCurrentTheme(shouldBeDark ? darkTheme : lightTheme);
        }
      } else if (savedDarkMode !== null) {
        // Backward compatibility with old dark_mode setting
        const darkMode = JSON.parse(savedDarkMode);
        setIsDark(darkMode);
        setCurrentTheme(darkMode ? darkTheme : lightTheme);
        setThemePreference(darkMode ? 'dark' : 'light');
      } else {
        // Default to system
        const shouldBeDark = systemColorScheme === 'dark';
        setIsDark(shouldBeDark);
        setCurrentTheme(shouldBeDark ? darkTheme : lightTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Default to light theme on error
      setIsDark(false);
      setCurrentTheme(lightTheme);
    }
  };

  // Toggle between light and dark theme
  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    setCurrentTheme(newIsDark ? darkTheme : lightTheme);
    setThemePreference(newIsDark ? 'dark' : 'light');

    try {
      await AsyncStorage.multiSet([
        ['theme_preference', newIsDark ? 'dark' : 'light'],
        ['dark_mode', JSON.stringify(newIsDark)], // Keep for backward compatibility
      ]);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Set specific theme (light, dark, or system)
  const setTheme = async (preference) => {
    setThemePreference(preference);

    try {
      await AsyncStorage.setItem('theme_preference', preference);

      if (preference === 'light') {
        setIsDark(false);
        setCurrentTheme(lightTheme);
        await AsyncStorage.setItem('dark_mode', JSON.stringify(false));
      } else if (preference === 'dark') {
        setIsDark(true);
        setCurrentTheme(darkTheme);
        await AsyncStorage.setItem('dark_mode', JSON.stringify(true));
      } else {
        // System preference
        const shouldBeDark = systemColorScheme === 'dark';
        setIsDark(shouldBeDark);
        setCurrentTheme(shouldBeDark ? darkTheme : lightTheme);
        await AsyncStorage.setItem('dark_mode', JSON.stringify(shouldBeDark));
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const value = {
    theme,
    isDark,
    themePreference,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

// Export context for advanced usage
export default ThemeContext;
