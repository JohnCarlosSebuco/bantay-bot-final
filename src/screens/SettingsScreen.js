import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Animated,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CONFIG } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocaleContext, saveLang } from '../i18n/i18n';
import SpeakerControl from '../components/SpeakerControl';
import { useTheme } from '../theme/ThemeContext';

const SettingsScreen = () => {
  const { lang, setLang } = useContext(LocaleContext);
  const { theme, isDark, toggleTheme } = useTheme();
  const [esp32IP, setEsp32IP] = useState(CONFIG.ESP32_IP);
  const [wsPort, setWsPort] = useState(CONFIG.ESP32_PORT.toString());
  const [updateInterval, setUpdateInterval] = useState(CONFIG.UPDATE_INTERVAL.toString());
  const [notifications, setNotifications] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Not tested');
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSettings();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: theme.animations.duration.slow,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadSettings();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const loadSettings = async () => {
    try {
      const savedIP = await AsyncStorage.getItem('esp32_ip');
      const savedPort = await AsyncStorage.getItem('ws_port');
      const savedInterval = await AsyncStorage.getItem('update_interval');
      const savedNotifications = await AsyncStorage.getItem('notifications');
      const savedAutoReconnect = await AsyncStorage.getItem('auto_reconnect');
      const savedVolume = await AsyncStorage.getItem('volume');
      const savedMuted = await AsyncStorage.getItem('is_muted');

      if (savedIP) setEsp32IP(savedIP);
      if (savedPort) setWsPort(savedPort);
      if (savedInterval) setUpdateInterval(savedInterval);
      if (savedNotifications !== null) setNotifications(JSON.parse(savedNotifications));
      if (savedAutoReconnect !== null) setAutoReconnect(JSON.parse(savedAutoReconnect));
      if (savedVolume !== null) setVolume(parseFloat(savedVolume));
      if (savedMuted !== null) setIsMuted(JSON.parse(savedMuted));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await AsyncStorage.multiSet([
        ['esp32_ip', esp32IP],
        ['ws_port', wsPort],
        ['update_interval', updateInterval],
        ['notifications', JSON.stringify(notifications)],
        ['auto_reconnect', JSON.stringify(autoReconnect)],
        ['volume', volume.toString()],
        ['is_muted', JSON.stringify(isMuted)]
      ]);

      CONFIG.ESP32_IP = esp32IP;
      CONFIG.ESP32_PORT = parseInt(wsPort);
      CONFIG.UPDATE_INTERVAL = parseInt(updateInterval);

      Alert.alert(
        lang === 'tl' ? 'Tagumpay' : 'Settings Saved',
        lang === 'tl' ? 'Matagumpay na nai-save ang iyong mga setting!' : 'Your settings have been saved successfully!',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert(
        lang === 'tl' ? 'Nabigo' : 'Save Failed',
        lang === 'tl' ? 'Nabigong i-save ang mga setting. Subukan muli.' : 'Failed to save settings. Please try again.',
        [{ text: 'OK', style: 'destructive' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setConnectionStatus('Testing...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(`http://${esp32IP}:80/status`, {
        timeout: 5000
      });

      if (response.ok) {
        setConnectionStatus('Connected');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          lang === 'tl' ? 'Tagumpay ang Koneksyon' : 'Connection Success',
          lang === 'tl' ? 'Matagumpay na nakakonekta sa BantayBot!' : 'Successfully connected to BantayBot!',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      setConnectionStatus('Failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        lang === 'tl' ? 'Nabigong Koneksyon' : 'Connection Failed',
        lang === 'tl'
          ? `Hindi makakonekta sa ${esp32IP}. Pakisuri:\n• Naka-on ang ESP32\n• Parehong WiFi network\n• Tama ang IP address`
          : `Could not connect to ${esp32IP}. Please check:\n• ESP32 is powered on\n• Both devices are on same WiFi\n• IP address is correct`,
        [{ text: 'OK', style: 'destructive' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      lang === 'tl' ? 'I-reset ang Settings' : 'Reset Settings',
      lang === 'tl'
        ? 'Ire-reset nito ang lahat ng settings sa default values. Magpatuloy?'
        : 'This will reset all settings to default values. Continue?',
      [
        { text: lang === 'tl' ? 'Kanselahin' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'tl' ? 'I-reset' : 'Reset',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setEsp32IP('192.168.1.100');
            setWsPort('80');
            setUpdateInterval('1000');
            setNotifications(true);
            setAutoReconnect(true);
            setConnectionStatus('Not tested');
          }
        }
      ]
    );
  };

  const toggleLanguage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLang = lang === 'tl' ? 'en' : 'tl';
    setLang(newLang);
    await saveLang(newLang);
    Alert.alert(
      lang === 'tl' ? 'Na-update ang Wika' : 'Language Updated',
      `Language set to ${newLang === 'tl' ? 'Tagalog' : 'English'}`
    );
  };

  const InputCard = ({ title, value, onChangeText, placeholder, keyboardType = 'default', description, icon }) => (
    <View style={styles.inputCard}>
      <View style={styles.inputHeader}>
        {icon && <Ionicons name={icon} size={20} color={theme.colors.primary[500]} style={{ marginRight: theme.spacing[2] }} />}
        <Text style={styles.inputLabel}>{title}</Text>
      </View>
      {description && <Text style={styles.inputDescription}>{description}</Text>}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={theme.colors.text.disabled}
      />
    </View>
  );

  const ToggleCard = ({ title, value, onValueChange, description, icon }) => (
    <View style={styles.toggleCard}>
      <View style={styles.toggleContent}>
        <View style={styles.toggleInfo}>
          <View style={[styles.toggleIconContainer, { backgroundColor: theme.colors.primary[50] }]}>
            <Ionicons name={icon} size={20} color={theme.colors.primary[500]} />
          </View>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleTitle}>{title}</Text>
            {description && <Text style={styles.toggleDescription}>{description}</Text>}
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onValueChange(val);
          }}
          trackColor={{ false: theme.colors.background.tertiary, true: theme.colors.primary[500] }}
          thumbColor={'white'}
          ios_backgroundColor={theme.colors.background.tertiary}
        />
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    header: {
      paddingTop: 60,
      paddingBottom: theme.spacing[6],
      paddingHorizontal: theme.spacing[4],
      backgroundColor: theme.colors.background.primary,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    brandSection: {
      flex: 1,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[1],
    },
    logoIcon: {
      marginRight: theme.spacing[2],
    },
    title: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    content: {
      flex: 1,
      padding: theme.spacing[4],
    },
    section: {
      marginBottom: theme.spacing[5],
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing[2],
    },
    inputCard: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[3],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    inputHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    inputLabel: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    inputDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing[2],
      lineHeight: 18,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[3],
      fontSize: theme.typography.fontSize.md,
      backgroundColor: theme.colors.background.secondary,
      color: theme.colors.text.primary,
    },
    toggleCard: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[3],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    toggleContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    toggleIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    toggleTextContainer: {
      flex: 1,
    },
    toggleTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[1],
    },
    toggleDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    connectionTestCard: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[3],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.info[500],
    },
    connectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    connectionTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    connectionStatus: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background.secondary,
    },
    testButton: {
      backgroundColor: theme.colors.info[500],
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    testButtonText: {
      color: 'white',
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    infoCard: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[3],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.secondary,
    },
    infoLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    infoValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    languageButton: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[4],
      alignItems: 'center',
      marginTop: theme.spacing[3],
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    languageButtonText: {
      color: theme.colors.primary[500],
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    aboutCard: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[5],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    aboutTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[3],
    },
    aboutText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text.secondary,
      lineHeight: 22,
      marginBottom: theme.spacing[3],
    },
    teamText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: 'center',
      paddingTop: theme.spacing[3],
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.secondary,
    },
    actionButtons: {
      paddingBottom: theme.spacing[6],
    },
    saveButton: {
      backgroundColor: theme.colors.success[500],
      borderRadius: theme.borderRadius.xl,
      paddingVertical: theme.spacing[4],
      paddingHorizontal: theme.spacing[6],
      alignItems: 'center',
      marginBottom: theme.spacing[3],
      ...theme.shadows.md,
    },
    saveButtonText: {
      color: 'white',
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    resetButton: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      paddingVertical: theme.spacing[4],
      paddingHorizontal: theme.spacing[6],
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border.primary,
    },
    resetButtonText: {
      color: theme.colors.text.secondary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.brandSection}>
                <View style={styles.brandRow}>
                  <Ionicons
                    name="settings"
                    size={28}
                    color={theme.colors.primary[500]}
                    style={styles.logoIcon}
                  />
                  <Text style={styles.title}>
                    {lang === 'tl' ? 'Mga Setting' : 'Settings'}
                  </Text>
                </View>
                <Text style={styles.subtitle}>
                  {lang === 'tl' ? 'I-configure ang iyong BantayBot' : 'Configure your BantayBot'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            {/* Connection Settings Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="wifi" size={20} color={theme.colors.info[500]} />
                <Text style={styles.sectionTitle}>
                  {lang === 'tl' ? 'Mga Setting ng Koneksyon' : 'Connection Settings'}
                </Text>
              </View>

              <InputCard
                title={lang === 'tl' ? 'ESP32 IP Address' : 'ESP32 IP Address'}
                value={esp32IP}
                onChangeText={setEsp32IP}
                placeholder="192.168.1.100"
                keyboardType="numeric"
                description={lang === 'tl' ? 'Ang IP address ng iyong BantayBot ESP32' : 'The IP address of your BantayBot ESP32'}
                icon="globe-outline"
              />

              <InputCard
                title={lang === 'tl' ? 'WebSocket Port' : 'WebSocket Port'}
                value={wsPort}
                onChangeText={setWsPort}
                placeholder="81"
                keyboardType="numeric"
                description={lang === 'tl' ? 'Port para sa real-time communication' : 'Port for real-time communication'}
                icon="radio-outline"
              />

              <InputCard
                title={lang === 'tl' ? 'Update Interval (ms)' : 'Update Interval (ms)'}
                value={updateInterval}
                onChangeText={setUpdateInterval}
                placeholder="1000"
                keyboardType="numeric"
                description={lang === 'tl' ? 'Gaano kadalas hilingin ang sensor updates' : 'How often to request sensor updates'}
                icon="timer-outline"
              />

              {/* Connection Test */}
              <View style={styles.connectionTestCard}>
                <View style={styles.connectionHeader}>
                  <Text style={styles.connectionTitle}>
                    <Ionicons name="pulse-outline" size={18} color={theme.colors.info[500]} />{' '}
                    {lang === 'tl' ? 'Test ng Koneksyon' : 'Connection Test'}
                  </Text>
                  <Text
                    style={[
                      styles.connectionStatus,
                      {
                        color:
                          connectionStatus === 'Connected'
                            ? theme.colors.success[600]
                            : connectionStatus === 'Failed'
                            ? theme.colors.error[600]
                            : theme.colors.text.tertiary,
                      },
                    ]}
                  >
                    {connectionStatus}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.testButton, isLoading && styles.buttonDisabled]}
                  onPress={testConnection}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonText}>
                    {isLoading
                      ? (lang === 'tl' ? 'Sinusubok...' : 'Testing...')
                      : (lang === 'tl' ? 'Subukan ang Koneksyon' : 'Test Connection')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Speaker & Audio Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="volume-high" size={20} color={theme.colors.warning[500]} />
                <Text style={styles.sectionTitle}>
                  {lang === 'tl' ? 'Speaker & Audio' : 'Speaker & Audio'}
                </Text>
              </View>
              <SpeakerControl
                volume={volume}
                onVolumeChange={setVolume}
                isMuted={isMuted}
                onMuteToggle={() => setIsMuted(!isMuted)}
                style={{ marginBottom: theme.spacing[3] }}
              />
            </View>

            {/* App Preferences Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="apps" size={20} color={theme.colors.primary[500]} />
                <Text style={styles.sectionTitle}>
                  {lang === 'tl' ? 'Mga Preference ng App' : 'App Preferences'}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    <Ionicons name="language-outline" size={16} color={theme.colors.text.secondary} />{' '}
                    {lang === 'tl' ? 'Wika' : 'Language'}
                  </Text>
                  <Text style={styles.infoValue}>{lang === 'tl' ? 'Tagalog' : 'English'}</Text>
                </View>
                <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
                  <Text style={styles.languageButtonText}>
                    {lang === 'tl' ? 'Lumipat sa English' : 'Switch to Tagalog'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ToggleCard
                title={lang === 'tl' ? 'Push Notifications' : 'Push Notifications'}
                value={notifications}
                onValueChange={setNotifications}
                description={lang === 'tl' ? 'Makatanggap ng alerts kapag may motion' : 'Receive alerts when motion is detected'}
                icon="notifications-outline"
              />

              <ToggleCard
                title={lang === 'tl' ? 'Dark Mode' : 'Dark Mode'}
                value={isDark}
                onValueChange={toggleTheme}
                description={lang === 'tl' ? 'Lumipat sa madilim na tema' : 'Switch to dark theme'}
                icon="moon-outline"
              />

              <ToggleCard
                title={lang === 'tl' ? 'Auto Reconnect' : 'Auto Reconnect'}
                value={autoReconnect}
                onValueChange={setAutoReconnect}
                description={lang === 'tl'
                  ? 'Awtomatikong subukang muling kumonekta kapag nawala ang koneksyon'
                  : 'Automatically try to reconnect when connection is lost'}
                icon="sync-outline"
              />
            </View>

            {/* System Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color={theme.colors.success[500]} />
                <Text style={styles.sectionTitle}>
                  {lang === 'tl' ? 'Impormasyon ng Sistema' : 'System Information'}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {lang === 'tl' ? 'Bersyon ng App' : 'App Version'}
                  </Text>
                  <Text style={styles.infoValue}>1.0.0</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {lang === 'tl' ? 'Uri ng Build' : 'Build Type'}
                  </Text>
                  <Text style={styles.infoValue}>Production</Text>
                </View>
                <View style={styles.infoRow} style={{ borderBottomWidth: 0 }}>
                  <Text style={styles.infoLabel}>
                    {lang === 'tl' ? 'Huling Update' : 'Last Updated'}
                  </Text>
                  <Text style={styles.infoValue}>{lang === 'tl' ? 'Ngayon' : 'Today'}</Text>
                </View>
              </View>

              <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>
                  <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary[500]} />{' '}
                  {lang === 'tl' ? 'Tungkol sa BantayBot' : 'About BantayBot'}
                </Text>
                <Text style={styles.aboutText}>
                  {lang === 'tl'
                    ? 'Isang solar-powered automated scarecrow na may integrated sensors at mobile monitoring para sa proteksyon ng pananim.'
                    : 'A solar-powered automated scarecrow with integrated sensors and mobile monitoring for crop protection.'}
                </Text>
                <Text style={styles.teamText}>
                  {lang === 'tl'
                    ? 'Ginawa ng PUP-Lopez BSIT Students'
                    : 'Developed by PUP-Lopez BSIT Students'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.buttonDisabled]}
                onPress={saveSettings}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  <Ionicons name="checkmark-circle" size={20} color="white" />{' '}
                  {isLoading
                    ? (lang === 'tl' ? 'Sine-save...' : 'Saving...')
                    : (lang === 'tl' ? 'I-save ang Settings' : 'Save Settings')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
                <Text style={styles.resetButtonText}>
                  <Ionicons name="refresh-circle-outline" size={18} color={theme.colors.text.secondary} />{' '}
                  {lang === 'tl' ? 'I-reset sa Defaults' : 'Reset to Defaults'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SettingsScreen;
