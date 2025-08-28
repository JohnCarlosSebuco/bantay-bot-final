import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STRINGS = {
  en: {
    tab_dashboard: 'Dashboard',
    tab_controls: 'Controls',
    tab_settings: 'Settings',
    tab_history: 'History',

    app_title: 'BantayBot',
    app_subtitle: 'Smart Crop Protection',
    connected: 'Connected',
    disconnected: 'Disconnected',
    last_update: 'Last update',

    quick_actions: 'Quick Actions',
    action_move_arms: 'Move Arms',
    action_make_sound: 'Make Sound',
    action_restart: 'Restart',
    command_sent: 'Command Sent',
    command_failed: 'Failed to send command',

    motion: 'Motion',
    detected: 'DETECTED',
    clear: 'Clear',
    distance: 'Distance',
    centimeters: 'centimeters',
    temperature: 'Temperature',
    celsius: 'Celsius',
    humidity: 'Humidity',
    percent: 'percent',
    soil_moisture: 'Soil Moisture',
    units: 'units',

    settings_title: 'Settings',
    settings_subtitle: 'Configure your BantayBot',
    lang_label: 'Language',
    lang_tl: 'Tagalog',
    lang_en: 'English',
    language_note: 'Switch app language',

    history_title: 'History',
    history_subtitle: 'Motion events and periodic sensor logs',
    motion_events: 'Motion Events',
    clear_all: 'Clear',
    none_motion: 'No motion events yet',
    env_every_min: 'Environmental (every 1 min)',
    none_env: 'No samples yet',

    live: 'LIVE',
    disconnected_status: 'Disconnected',
    connect: 'Connect',
    disconnect: 'Disconnect',
    simulate_reconnect: 'Simulate Reconnect',
    reconnecting: 'Reconnecting…',
    no_preview: 'No preview available',
    stream_active: 'Stream active (mock preview)'
  },
  tl: {
    tab_dashboard: 'Dashboard',
    tab_controls: 'Kontrol',
    tab_settings: 'Settings',
    tab_history: 'History',

    app_title: 'BantayBot',
    app_subtitle: 'Smart Crop Protection',
    connected: 'Nakakonekta',
    disconnected: 'Naputol',
    last_update: 'Huling update',

    quick_actions: 'Mabilis na Aksyon',
    action_move_arms: 'Galawin ang Braso',
    action_make_sound: 'Patunogin',
    action_restart: 'I-restart',
    command_sent: 'Naipadala ang Utos',
    command_failed: 'Hindi naipadala ang utos',

    motion: 'Kilos',
    detected: 'NAKUHA',
    clear: 'Malinaw',
    distance: 'Distansya',
    centimeters: 'sentimetro',
    temperature: 'Temperatura',
    celsius: 'Celsius',
    humidity: 'Halumigmig',
    percent: 'porsyento',
    soil_moisture: 'Lupa (kahalumigmigan)',
    units: 'yunit',

    settings_title: 'Settings',
    settings_subtitle: 'I-configure ang BantayBot',
    lang_label: 'Wika',
    lang_tl: 'Tagalog',
    lang_en: 'English',
    language_note: 'Palitan ang wika ng app',

    history_title: 'History',
    history_subtitle: 'Mga kilos at pana-panahong tala ng sensor',
    motion_events: 'Mga Kilos',
    clear_all: 'Linisin',
    none_motion: 'Wala pang tala ng kilos',
    env_every_min: 'Environmental (bawat 1 min)',
    none_env: 'Wala pang sample',

    live: 'LIVE',
    disconnected_status: 'Naputol',
    connect: 'Kumonekta',
    disconnect: 'Idiskonekta',
    simulate_reconnect: 'Gayahin ang Reconnect',
    reconnecting: 'Kumokonekta muli…',
    no_preview: 'Walang preview',
    stream_active: 'Aktibo ang stream (mock preview)'
  }
};

export const LocaleContext = React.createContext({
  lang: 'tl',
  setLang: () => {},
});

export function useI18n() {
  const { lang } = React.useContext(LocaleContext);
  const t = React.useCallback((key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key, [lang]);
  return { t };
}

export async function loadLang() {
  try {
    const v = await AsyncStorage.getItem('app_lang');
    return v === 'en' ? 'en' : 'tl';
  } catch (_) {
    return 'tl';
  }
}

export async function saveLang(lang) {
  try { await AsyncStorage.setItem('app_lang', lang); } catch (_) {}
}


