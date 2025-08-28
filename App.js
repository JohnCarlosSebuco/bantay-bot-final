import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import DashboardScreen from './src/screens/DashboardScreen';
import ControlsScreen from './src/screens/ControlsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { LocaleContext, loadLang } from './src/i18n/i18n';

const Tab = createBottomTabNavigator();

export default function App() {
  const [lang, setLang] = React.useState('tl');

  React.useEffect(() => {
    (async () => setLang(await loadLang()))();
  }, []);

  return (
    <LocaleContext.Provider value={{ lang, setLang }}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#2196F3',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: {
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
            },
          }}
        >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{
            tabBarLabel: lang === 'tl' ? 'Dashboard' : 'Dashboard',
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
