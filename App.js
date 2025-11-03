import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from './src/screens/DashboardScreen';
import ControlsScreen from './src/screens/ControlsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import HarvestPlannerScreen from './src/screens/HarvestPlannerScreen';
import AddHarvestScreen from './src/screens/AddHarvestScreen';
import RainfallTrackerScreen from './src/screens/RainfallTrackerScreen';
import CropHealthMonitorScreen from './src/screens/CropHealthMonitorScreen';
import BirdAnalyticsScreen from './src/screens/BirdAnalyticsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import { LocaleContext, loadLang } from './src/i18n/i18n';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import ConfigService from './src/services/ConfigService';
import FirebaseService from './src/services/FirebaseService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Analytics Stack Navigator
function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="HarvestPlanner" component={HarvestPlannerScreen} />
      <Stack.Screen name="AddHarvest" component={AddHarvestScreen} />
      <Stack.Screen name="RainfallTracker" component={RainfallTrackerScreen} />
      <Stack.Screen name="CropHealthMonitor" component={CropHealthMonitorScreen} />
      <Stack.Screen name="BirdAnalytics" component={BirdAnalyticsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  );
}

// Main App Component with Navigation
function AppContent() {
  const [lang, setLang] = React.useState('tl');
  const { theme, isDark } = useTheme();

  React.useEffect(() => {
    (async () => {
      try {
        // Initialize ConfigService first
        await ConfigService.initialize();
        console.log('✅ ConfigService initialized on app startup');

        // Initialize Firebase services
        await FirebaseService.initialize();
        console.log('✅ Firebase services initialized on app startup');

        // Load language
        setLang(await loadLang());
      } catch (error) {
        console.error('❌ Error during app initialization:', error);
        // App can still work with HTTP fallback if Firebase fails
      }
    })();
  }, []);

  return (
    <LocaleContext.Provider value={{ lang, setLang }}>
      <NavigationContainer>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary[500],
            tabBarInactiveTintColor: theme.colors.text.tertiary,
            tabBarStyle: {
              backgroundColor: theme.colors.surface.primary,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border.primary,
              paddingBottom: theme.spacing[2],
              paddingTop: theme.spacing[2],
              height: 60,
              ...theme.shadows.sm,
            },
            tabBarLabelStyle: {
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
            },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Dashboard') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'AnalyticsTab') {
                iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              } else if (route.name === 'Controls') {
                iconName = focused ? 'game-controller' : 'game-controller-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              } else if (route.name === 'History') {
                iconName = focused ? 'time' : 'time-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: lang === 'tl' ? 'Dashboard' : 'Dashboard',
          }}
        />
        <Tab.Screen
          name="AnalyticsTab"
          component={AnalyticsStack}
          options={{
            tabBarLabel: lang === 'tl' ? 'Analytics' : 'Analytics',
          }}
        />
        <Tab.Screen
          name="Controls"
          component={ControlsScreen}
          options={{
            tabBarLabel: lang === 'tl' ? 'Kontrol' : 'Controls',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: lang === 'tl' ? 'Settings' : 'Settings',
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarLabel: lang === 'tl' ? 'History' : 'History',
          }}
        />
        </Tab.Navigator>
      </NavigationContainer>
    </LocaleContext.Provider>
  );
}

// Root App Component with Theme Provider
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
