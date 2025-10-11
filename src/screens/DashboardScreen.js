import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
  Image,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import WebSocketService from '../services/WebSocketService';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config/config';
import { LocaleContext } from '../i18n/i18n';
import { useTheme } from '../theme/ThemeContext';

// Import components
import SoilSensorCard from '../components/SoilSensorCard';
import AudioPlayerControl from '../components/AudioPlayerControl';
import ServoArmControl from '../components/ServoArmControl';
import StatusIndicator from '../components/StatusIndicator';
import QuickActionButton from '../components/QuickActionButton';
import CameraSettings from '../components/CameraSettings';
import DetectionControls from '../components/DetectionControls';
import detectionHistoryService from '../services/DetectionHistoryService';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const { lang } = useContext(LocaleContext);
  const { theme, isDark } = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sensor data state
  const [sensorData, setSensorData] = useState({
    motion: 0,
    headPosition: 0,
    dhtTemperature: 0,
    dhtHumidity: 0,
    soilHumidity: 0,
    soilTemperature: 0,
    soilConductivity: 0,
    ph: 7.0,
    currentTrack: 1,
    volume: 20,
    audioPlaying: false,
    leftArmAngle: 90,
    rightArmAngle: 90,
    oscillating: false,
    birdDetectionEnabled: true,
    birdsDetectedToday: 0,
    detectionSensitivity: 2,
    hasDFPlayer: false,
    hasRS485Sensor: false,
    hasServos: false,
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);
  const lastBeepAtRef = useRef(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [cameraBrightness, setCameraBrightness] = useState(0);
  const [cameraContrast, setCameraContrast] = useState(0);
  const [grayscaleMode, setGrayscaleMode] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);

  useEffect(() => {
    const loadAudioSettings = async () => {
      try {
        const savedVolume = await AsyncStorage.getItem('volume');
        const savedMuted = await AsyncStorage.getItem('is_muted');
        if (savedVolume !== null) setVolume(parseFloat(savedVolume));
        if (savedMuted !== null) setIsMuted(JSON.parse(savedMuted));
      } catch (error) {
        console.log('Error loading audio settings:', error);
      }
    };
    loadAudioSettings();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: theme.animations.duration.slow,
      useNativeDriver: true,
    }).start();

    const handleConnection = (connected) => {
      setIsConnected(connected);
      if (connected) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };

    const handleData = (data) => {
      const safeNumber = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);
      setSensorData({
        motion: data?.motion ? 1 : 0,
        headPosition: safeNumber(data?.headPosition, 0),
        dhtTemperature: safeNumber(data?.dhtTemperature, 0),
        dhtHumidity: safeNumber(data?.dhtHumidity, 0),
        soilHumidity: safeNumber(data?.soilHumidity, 0),
        soilTemperature: safeNumber(data?.soilTemperature, 0),
        soilConductivity: safeNumber(data?.soilConductivity, 0),
        ph: safeNumber(data?.ph, 7.0),
        currentTrack: safeNumber(data?.currentTrack, 1),
        volume: safeNumber(data?.volume, 20),
        audioPlaying: data?.audioPlaying || false,
        leftArmAngle: safeNumber(data?.leftArmAngle, 90),
        rightArmAngle: safeNumber(data?.rightArmAngle, 90),
        oscillating: data?.oscillating || false,
        birdDetectionEnabled: data?.birdDetectionEnabled !== undefined ? data.birdDetectionEnabled : true,
        birdsDetectedToday: safeNumber(data?.birdsDetectedToday, 0),
        detectionSensitivity: safeNumber(data?.detectionSensitivity, 2),
        hasDFPlayer: data?.hasDFPlayer || false,
        hasRS485Sensor: data?.hasRS485Sensor || false,
        hasServos: data?.hasServos || false,
      });
      setLastUpdate(new Date());
    };

    const handleAlert = async (alert) => {
      if (alert.type === 'bird_detection') {
        await detectionHistoryService.addDetection({
          type: 'bird',
          message: alert.message,
          count: alert.count || 1,
        });
        Alert.alert(
          lang === 'tl' ? 'Nadetect ang Ibon!' : 'Bird Detected!',
          `${alert.message}\n${lang === 'tl' ? 'Kabuuan ngayong araw' : 'Total today'}: ${alert.count}`,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
      } else {
        Alert.alert(
          alert.type.toUpperCase(),
          alert.message,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
      }

      try {
        const now = Date.now();
        if (now - lastBeepAtRef.current < 1500) return;
        if (!isMuted && soundRef.current) {
          lastBeepAtRef.current = now;
          await soundRef.current.replayAsync();
          setTimeout(async () => {
            try { await soundRef.current.pauseAsync(); } catch (_) {}
          }, 1500);
        }
      } catch (_) {}
    };

    WebSocketService.on('connected', handleConnection);
    WebSocketService.on('data', handleData);
    WebSocketService.on('alert', handleAlert);
    WebSocketService.connect();

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/Hawk.mp3'),
          { shouldPlay: false, volume: isMuted ? 0 : volume }
        );
        soundRef.current = sound;
      } catch (_) {}
    })();

    const esp32Ip = CONFIG.ESP32_IP;
    setStreamUrl(`http://${esp32Ip}:81/stream`);

    return () => {
      WebSocketService.off('connected', handleConnection);
      WebSocketService.off('data', handleData);
      WebSocketService.off('alert', handleAlert);
      WebSocketService.disconnect();
      if (soundRef.current) {
        try { soundRef.current.unloadAsync(); } catch (_) {}
        soundRef.current = null;
      }
    };
  }, [lang]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdate(new Date());
    }, 1000);
  }, []);

  const sendCommand = (command, value = 0) => {
    try {
      WebSocketService.send({ command, value, timestamp: Date.now() });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      Alert.alert(
        lang === 'tl' ? 'Nabigo' : 'Failed',
        lang === 'tl' ? 'Hindi naipadala ang utos' : 'Could not send command',
        [{ text: 'OK' }]
      );
    }
  };

  const playTrack = (track) => sendCommand('PLAY_TRACK', track);
  const stopAudio = () => sendCommand('STOP_AUDIO');
  const nextTrack = () => sendCommand('NEXT_TRACK');
  const setAudioVolume = (vol) => sendCommand('SET_VOLUME', vol);
  const setLeftServo = (angle) => WebSocketService.send({ command: 'SET_SERVO_ANGLE', servo: 0, value: angle });
  const setRightServo = (angle) => WebSocketService.send({ command: 'SET_SERVO_ANGLE', servo: 1, value: angle });
  const toggleOscillation = () => sendCommand('TOGGLE_SERVO_OSCILLATION');
  const rotateLeft = () => sendCommand('ROTATE_HEAD_LEFT', 90);
  const rotateCenter = () => sendCommand('ROTATE_HEAD_CENTER', 0);
  const rotateRight = () => sendCommand('ROTATE_HEAD_RIGHT', -90);
  const soundAlarm = () => {
    sendCommand('SOUND_ALARM');
    if (soundRef.current && !isMuted) {
      (async () => {
        try {
          await soundRef.current.setVolumeAsync(volume);
          await soundRef.current.setPositionAsync(0);
          await soundRef.current.playAsync();
        } catch (_) {}
      })();
    }
  };
  const restartSystem = () => sendCommand('RESET_SYSTEM');
  const refreshStream = () => {
    setStreamRefreshKey(prev => prev + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

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
      marginBottom: theme.spacing[6],
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
      marginTop: theme.spacing[1],
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isConnected ? theme.colors.success[50] : theme.colors.error[50],
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius.full,
      ...theme.shadows.sm,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isConnected ? theme.colors.success[500] : theme.colors.error[500],
      marginRight: theme.spacing[2],
    },
    statusText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: isConnected ? theme.colors.success[700] : theme.colors.error[700],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statsRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing[4],
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[4],
      marginHorizontal: theme.spacing[1],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[2],
    },
    statValue: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[1],
    },
    statLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      fontWeight: theme.typography.fontWeight.medium,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    content: {
      padding: theme.spacing[4],
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    sectionAction: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionActionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary[500],
      fontWeight: theme.typography.fontWeight.semibold,
      marginRight: theme.spacing[1],
    },
    cameraCard: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[4],
      ...theme.shadows.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    cameraHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.error[50],
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.md,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.error[500],
      marginRight: theme.spacing[2],
    },
    liveText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.error[700],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    refreshButton: {
      padding: theme.spacing[2],
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background.secondary,
    },
    streamContainer: {
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.background.tertiary,
      aspectRatio: 16 / 9,
      marginBottom: theme.spacing[3],
    },
    streamImage: {
      width: '100%',
      height: '100%',
    },
    streamPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streamPlaceholderText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing[2],
    },
    streamInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: theme.spacing[3],
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.secondary,
    },
    streamInfoText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      fontFamily: theme.typography.fonts.mono,
    },
    section: {
      marginBottom: theme.spacing[4],
    },
    controlsGrid: {
      flexDirection: 'row',
      gap: theme.spacing[2],
    },
    emergencyCard: {
      backgroundColor: theme.colors.error[50],
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[6],
      borderWidth: 2,
      borderColor: theme.colors.error[200],
    },
    emergencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    emergencyTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.error[700],
      marginLeft: theme.spacing[2],
    },
    emergencyButtons: {
      flexDirection: 'row',
      gap: theme.spacing[2],
    },
  });

  return (
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
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandSection}>
              <View style={styles.brandRow}>
                <Ionicons
                  name="shield-checkmark"
                  size={28}
                  color={theme.colors.primary[500]}
                  style={styles.logoIcon}
                />
                <Text style={styles.title}>BantayBot</Text>
              </View>
              <Text style={styles.subtitle}>
                {lang === 'tl' ? 'Pangbantay ng Pananim' : 'Smart Crop Protection'}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {isConnected ? (lang === 'tl' ? 'Konektado' : 'Connected') : (lang === 'tl' ? 'Offline' : 'Offline')}
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.primary[50] }]}>
                <Ionicons name="git-network-outline" size={20} color={theme.colors.primary[500]} />
              </View>
              <Text style={styles.statValue}>{sensorData.birdsDetectedToday}</Text>
              <Text style={styles.statLabel}>{lang === 'tl' ? 'Ibon' : 'Birds'}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.success[50] }]}>
                <Ionicons name="leaf-outline" size={20} color={theme.colors.success[500]} />
              </View>
              <Text style={styles.statValue}>{sensorData.ph.toFixed(1)}</Text>
              <Text style={styles.statLabel}>pH</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.info[50] }]}>
                <Ionicons name="water-outline" size={20} color={theme.colors.info[500]} />
              </View>
              <Text style={styles.statValue}>{sensorData.soilHumidity}%</Text>
              <Text style={styles.statLabel}>{lang === 'tl' ? 'Lupa' : 'Soil'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Live Camera Feed */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {lang === 'tl' ? 'Kamera' : 'Live Camera'}
              </Text>
              <TouchableOpacity onPress={refreshStream} style={styles.refreshButton}>
                <Ionicons name="refresh" size={18} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraCard}>
              <View style={styles.cameraHeader}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary }}>
                  {formatTime(lastUpdate)}
                </Text>
              </View>

              <View style={styles.streamContainer}>
                {streamUrl ? (
                  <Image
                    key={streamRefreshKey}
                    source={{ uri: `${streamUrl}?t=${Date.now()}` }}
                    style={styles.streamImage}
                    resizeMode="cover"
                    onError={() => console.log('Stream error')}
                  />
                ) : (
                  <View style={styles.streamPlaceholder}>
                    <Ionicons name="camera-outline" size={48} color={theme.colors.text.disabled} />
                    <Text style={styles.streamPlaceholderText}>
                      {lang === 'tl' ? 'Naglo-load...' : 'Loading...'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.streamInfo}>
                <Ionicons name="wifi-outline" size={12} color={theme.colors.text.tertiary} style={{ marginRight: theme.spacing[1] }} />
                <Text style={styles.streamInfoText}>{CONFIG.ESP32_IP}:81/stream</Text>
              </View>
            </View>
          </View>

          {/* Bird Detection Status */}
          <View style={styles.section}>
            <StatusIndicator
              status={sensorData.birdDetectionEnabled ? 'good' : 'warning'}
              label={lang === 'tl' ? 'Pagbabantay ng Ibon' : 'Bird Detection'}
              value={`${sensorData.birdsDetectedToday} ${lang === 'tl' ? 'ibon ngayong araw' : 'birds today'}`}
              icon="🐦"
              lang={lang}
              size="medium"
            />
          </View>

          {/* Detection Controls */}
          <DetectionControls
            detectionEnabled={sensorData.birdDetectionEnabled}
            onDetectionToggle={() => sendCommand('TOGGLE_DETECTION')}
            sensitivity={sensorData.detectionSensitivity}
            onSensitivityChange={(value) => sendCommand('SET_SENSITIVITY', value)}
            birdsDetectedToday={sensorData.birdsDetectedToday}
            onResetCount={() => sendCommand('RESET_BIRD_COUNT')}
            style={{ marginBottom: theme.spacing[4] }}
          />

          {/* Camera Settings */}
          <CameraSettings
            brightness={cameraBrightness}
            contrast={cameraContrast}
            onBrightnessChange={(value) => {
              setCameraBrightness(value);
              sendCommand('SET_BRIGHTNESS', value);
            }}
            onContrastChange={(value) => {
              setCameraContrast(value);
              sendCommand('SET_CONTRAST', value);
            }}
            onResolutionChange={(value) => sendCommand('SET_RESOLUTION', value)}
            grayscaleMode={grayscaleMode}
            onGrayscaleModeToggle={() => {
              setGrayscaleMode(!grayscaleMode);
              sendCommand('TOGGLE_GRAYSCALE');
            }}
            style={{ marginBottom: theme.spacing[4] }}
          />

          {/* Soil Sensor */}
          {sensorData.hasRS485Sensor && (
            <SoilSensorCard
              humidity={sensorData.soilHumidity}
              temperature={sensorData.soilTemperature}
              conductivity={sensorData.soilConductivity}
              ph={sensorData.ph}
              lang={lang}
            />
          )}

          {/* Audio Player */}
          {sensorData.hasDFPlayer && (
            <AudioPlayerControl
              currentTrack={sensorData.currentTrack}
              totalTracks={7}
              volume={sensorData.volume}
              audioPlaying={sensorData.audioPlaying}
              onPlay={() => playTrack(sensorData.currentTrack)}
              onStop={stopAudio}
              onNext={nextTrack}
              onVolumeChange={setAudioVolume}
              lang={lang}
            />
          )}

          {/* Servo Arms */}
          {sensorData.hasServos && (
            <ServoArmControl
              leftArmAngle={sensorData.leftArmAngle}
              rightArmAngle={sensorData.rightArmAngle}
              oscillating={sensorData.oscillating}
              onLeftChange={setLeftServo}
              onRightChange={setRightServo}
              onToggleOscillation={toggleOscillation}
              lang={lang}
            />
          )}

          {/* Head Controls */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {lang === 'tl' ? 'Direksyon ng Ulo' : 'Head Direction'}
              </Text>
              <Text style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary }}>
                {sensorData.headPosition}°
              </Text>
            </View>
            <View style={styles.controlsGrid}>
              <QuickActionButton
                icon="⬅️"
                label={lang === 'tl' ? 'Kaliwa' : 'Left'}
                gradient={theme.colors.gradients.primary}
                onPress={rotateLeft}
                size="small"
                style={{ flex: 1 }}
              />
              <QuickActionButton
                icon="⏺️"
                label={lang === 'tl' ? 'Gitna' : 'Center'}
                gradient={theme.colors.gradients.success}
                onPress={rotateCenter}
                size="small"
                style={{ flex: 1 }}
              />
              <QuickActionButton
                icon="➡️"
                label={lang === 'tl' ? 'Kanan' : 'Right'}
                gradient={theme.colors.gradients.primary}
                onPress={rotateRight}
                size="small"
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* Emergency Actions */}
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="warning" size={24} color={theme.colors.error[600]} />
              <Text style={styles.emergencyTitle}>
                {lang === 'tl' ? 'Emergency na Aksyon' : 'Emergency Actions'}
              </Text>
            </View>
            <View style={styles.emergencyButtons}>
              <QuickActionButton
                icon="📢"
                label={lang === 'tl' ? 'Takutin!' : 'Scare Now!'}
                gradient={theme.colors.gradients.error}
                onPress={soundAlarm}
                size="medium"
                style={{ flex: 1 }}
              />
              <QuickActionButton
                icon="🔄"
                label={lang === 'tl' ? 'I-restart' : 'Restart'}
                gradient={theme.colors.gradients.warning}
                onPress={restartSystem}
                size="medium"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

export default DashboardScreen;
