import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STRINGS = {
  en: {
    // Tabs
    tab_dashboard: 'Monitor',
    tab_analytics: 'Analytics',
    tab_controls: 'Controls',
    tab_settings: 'Settings',
    tab_history: 'History',

    // App Header
    app_title: 'BantayBot',
    app_subtitle: 'Smart Crop Protection',
    connected: 'Connected',
    disconnected: 'Disconnected',
    last_update: 'Last update',

    // Soil Status
    soil_status: 'SOIL STATUS',
    soil_humidity: 'Humidity',
    soil_temp: 'Temperature',
    soil_conductivity: 'Conductivity',
    soil_ph: 'pH Level',
    soil_nutrients: 'Nutrients',

    // Status Labels
    status_dry: 'Dry',
    status_optimal: 'Optimal',
    status_wet: 'Wet',
    status_cold: 'Cold',
    status_good: 'Good',
    status_hot: 'Hot',
    status_low_nutrients: 'Low nutrients',
    status_high_nutrients: 'High nutrients',
    status_acidic: 'Too acidic',
    status_balanced: 'Balanced',
    status_alkaline: 'Too alkaline',

    // Bird Detection
    birds_today: 'Birds Today',
    bird_detection: 'Bird Detection',
    detections: 'detections',
    sensitivity: 'Sensitivity',
    reset_count: 'Reset Count',
    bird_alert: 'Bird Detected!',

    // Audio Control
    audio_scarer: 'AUDIO SCARER',
    current_track: 'Current track:',
    stop: 'Stop',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    volume: 'Volume:',
    volume_low: 'Low',
    volume_high: 'High',
    playing_now: 'Playing now',
    stopped: 'Stopped',

    // Servo Arms
    arm_movement: 'ARM MOVEMENT',
    left_arm: 'Left Arm',
    right_arm: 'Right Arm',
    arm_positions: 'Arm positions',
    oscillate: 'Oscillate',
    arms_moving: 'Arms moving',
    arms_stopped: 'Arms stopped',
    presets: 'Presets:',
    preset_rest: '✋ Rest',
    preset_alert: '⚠️ Alert',
    preset_wave: '👋 Wave',

    // Head Direction
    head_direction: 'HEAD DIRECTION',
    head_left: '⬅️ Left',
    head_center: '⏺️ Center',
    head_right: '➡️ Right',
    current_position: 'Current position:',

    // Emergency Actions
    emergency_actions: 'EMERGENCY ACTIONS',
    scare_birds: 'SCARE NOW!',
    scare_sublabel: 'Frighten the birds',
    restart: 'RESTART',
    restart_sublabel: 'Reset system',

    // Camera
    live_view: 'LIVE VIEW',
    refresh: 'Refresh',
    camera_settings: 'Camera Settings',
    brightness: 'Brightness:',
    contrast: 'Contrast:',
    quality: 'Quality:',
    grayscale_mode: 'Grayscale mode (faster)',

    // Analytics
    records_reports: 'Records & Reports',
    harvest_record: 'HARVEST RECORD',
    crop: 'Crop:',
    plant_date: 'Plant date:',
    expected_harvest: 'Expected harvest:',
    estimated_yield: 'Estimated yield:',
    days_remaining: 'days left',
    add_harvest: '+ Add Harvest',
    view_history: '📊 View History',

    // Rainfall
    rainfall_record: 'RAINFALL RECORD',
    total_rainfall: 'Total rainfall (30 days):',
    last_rain: 'Last rain:',
    days_ago: 'days ago',
    water_status: 'Status:',
    water_sufficient: 'SUFFICIENT WATER',
    water_low: 'LOW WATER',
    water_critical: 'CRITICAL',
    add_rain: '+ Add Rain Event',

    // Crop Health
    crop_health: 'CROP HEALTH',
    overall_score: 'Overall Score:',
    recommendation: 'Recommendation:',

    // Bird Activity
    bird_activity: 'BIRD ACTIVITY',
    most_active: 'Most active:',
    morning: 'Morning',
    afternoon: 'Afternoon',
    trend: 'Trend:',

    // Settings
    settings_title: 'SETTINGS',
    language: 'Language:',
    wifi_connection: 'WiFi Connection:',
    change: 'Change',
    sound_settings: 'Sound Settings:',
    sound_on_bird: 'Sound on bird detection',
    about_app: 'About App:',
    user_guide: 'User Guide',

    // History
    history_title: 'EVENT HISTORY',
    events: 'Events',
    bird_detected: 'Bird detected',
    sound_triggered: 'Sound triggered',
    head_rotated: 'Head rotated',
    hot_weather: 'Hot weather',
    clear_history: 'Clear History',

    // Common
    degrees: 'degrees',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    normal: 'Normal',
    danger: 'Danger',
    warning: 'Warning',
    info: 'Info',

    // Quick Actions
    quick_actions: 'QUICK ACTIONS',
    turn_left: '⬅️ Turn Left',
    turn_right: '➡️ Turn Right',
    center: '⏺️ Center',
    sound_alarm: '📢 Sound Alarm',
    restart_system: '🔄 Restart'
  },
  tl: {
    // Tabs
    tab_dashboard: 'Bantayan',
    tab_analytics: 'Analytics',
    tab_controls: 'Kontrol',
    tab_settings: 'Settings',
    tab_history: 'Kasaysayan',

    // App Header
    app_title: 'BantayBot',
    app_subtitle: 'Pangbantay ng Pananim',
    connected: 'Nakakonekta',
    disconnected: 'Walang koneksyon',
    last_update: 'Huling update',

    // Soil Status
    soil_status: 'KALAGAYAN NG LUPA',
    soil_humidity: 'Halumigmig',
    soil_temp: 'Temperatura',
    soil_conductivity: 'Konduktibidad',
    soil_ph: 'pH Level',
    soil_nutrients: 'Sustansya',

    // Status Labels
    status_dry: 'Tuyo',
    status_optimal: 'Sakto',
    status_wet: 'Basa',
    status_cold: 'Malamig',
    status_good: 'Mabuti',
    status_hot: 'Mainit',
    status_low_nutrients: 'Kulang sustansya',
    status_high_nutrients: 'Sobra sustansya',
    status_acidic: 'Masyado asido',
    status_balanced: 'Balanse',
    status_alkaline: 'Masyado alkaline',

    // Bird Detection
    birds_today: 'Ibon Ngayong Araw',
    bird_detection: 'Pagbabantay ng Ibon',
    detections: 'deteksyon',
    sensitivity: 'Sensitivity',
    reset_count: 'I-reset',
    bird_alert: 'Nadetect ang Ibon!',

    // Audio Control
    audio_scarer: 'TUNOG PANTAKOT',
    current_track: 'Kasalukuyang tunog:',
    stop: 'Ihinto',
    play: 'Tumunog',
    pause: 'I-pause',
    next: 'Susunod',
    volume: 'Lakas ng tunog:',
    volume_low: 'Mahina',
    volume_high: 'Malakas',
    playing_now: 'Tumutunog ngayon',
    stopped: 'Walang tunog',

    // Servo Arms
    arm_movement: 'PAGGALAW NG BRASO',
    left_arm: 'Kaliwang Braso',
    right_arm: 'Kanang Braso',
    arm_positions: 'Posisyon ng mga braso',
    oscillate: 'Gumalaw',
    arms_moving: 'Gumagalaw ang mga braso',
    arms_stopped: 'Nakatigil ang mga braso',
    presets: 'Mga preset:',
    preset_rest: '✋ Pahinga',
    preset_alert: '⚠️ Alerto',
    preset_wave: '👋 Kumaway',

    // Head Direction
    head_direction: 'DIREKSYON NG ULO',
    head_left: '⬅️ Kaliwa',
    head_center: '⏺️ Gitna',
    head_right: '➡️ Kanan',
    current_position: 'Kasalukuyang posisyon:',

    // Emergency Actions
    emergency_actions: 'MGA EMERGENCY AKSYON',
    scare_birds: 'TUMUNOG NA!',
    scare_sublabel: 'Takutin ang ibon',
    restart: 'I-RESTART',
    restart_sublabel: 'Reset system',

    // Camera
    live_view: 'LIVE NA TINGNAN',
    refresh: 'Refresh',
    camera_settings: 'Settings Kamera',
    brightness: 'Liwanag:',
    contrast: 'Contrast:',
    quality: 'Quality:',
    grayscale_mode: 'Itim-puti mode (mas mabilis)',

    // Analytics
    records_reports: 'Tala at Ulat',
    harvest_record: 'TALA NG ANI',
    crop: 'Tanim:',
    plant_date: 'Petsa ng tanim:',
    expected_harvest: 'Inaasahang ani:',
    estimated_yield: 'Tinatayang ani:',
    days_remaining: 'araw pa',
    add_harvest: '+ Magdagdag ng Ani',
    view_history: '📊 Tingnan ang History',

    // Rainfall
    rainfall_record: 'TALA NG ULAN',
    total_rainfall: 'Kabuuang ulan (30 araw):',
    last_rain: 'Huling ulan:',
    days_ago: 'araw na nakakaraan',
    water_status: 'Status:',
    water_sufficient: 'SAPAT ANG TUBIG',
    water_low: 'KULANG ANG TUBIG',
    water_critical: 'KRITIKAL',
    add_rain: '+ Idagdag Ulan Ngayon',

    // Crop Health
    crop_health: 'KALUSUGAN NG TANIM',
    overall_score: 'Overall Score:',
    recommendation: 'Rekomendasyon:',

    // Bird Activity
    bird_activity: 'AKTIBIDAD NG IBON',
    most_active: 'Pinakamaraming ibon:',
    morning: 'Umaga',
    afternoon: 'Hapon',
    trend: 'Trend ngayong linggo:',

    // Settings
    settings_title: 'MGA SETTING',
    language: 'Wika:',
    wifi_connection: 'WiFi Connection:',
    change: 'Palitan',
    sound_settings: 'Tunog Settings:',
    sound_on_bird: 'Tumunog pag may ibon',
    about_app: 'Tungkol sa App:',
    user_guide: 'Gabay',

    // History
    history_title: 'KASAYSAYAN NG MGA NANGYARI',
    events: 'Mga Nangyari',
    bird_detected: 'Nadetect ang ibon',
    sound_triggered: 'Tumunog',
    head_rotated: 'Iniliko ang ulo',
    hot_weather: 'Mainit na panahon',
    clear_history: 'Linisin ang History',

    // Common
    degrees: 'degrees',
    low: 'Mababa',
    medium: 'Katamtaman',
    high: 'Mataas',
    normal: 'Normal',
    danger: 'Panganib',
    warning: 'Bantayan',
    info: 'Impormasyon',

    // Quick Actions
    quick_actions: 'MABILIS NA AKSYON',
    turn_left: '⬅️ Pakaliwa',
    turn_right: '➡️ Pakanan',
    center: '⏺️ Gitna',
    sound_alarm: '📢 Patunogin',
    restart_system: '🔄 I-restart'
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


