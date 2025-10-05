import React, { useState, useEffect, useContext } from 'react';
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
import WebSocketService from '../services/WebSocketService';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config/config';
import { LocaleContext } from '../i18n/i18n';

// Import new farmer-first components
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
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Enhanced sensor data state with new hardware
  const [sensorData, setSensorData] = useState({
    // Motion & Position
    motion: 0,
    headPosition: 0,

    // DHT22 (backup sensor)
    dhtTemperature: 0,
    dhtHumidity: 0,

    // RS485 Soil Sensor (NEW)
    soilHumidity: 0,
    soilTemperature: 0,
    soilConductivity: 0,
    ph: 7.0,

    // Audio State (NEW)
    currentTrack: 1,
    volume: 20,
    audioPlaying: false,

    // Servo State (NEW)
    leftArmAngle: 90,
    rightArmAngle: 90,
    oscillating: false,

    // Bird Detection
    birdDetectionEnabled: true,
    birdsDetectedToday: 0,
    detectionSensitivity: 2,

    // Hardware Capabilities (NEW)
    hasDFPlayer: false,
    hasRS485Sensor: false,
    hasServos: false,
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Animation values
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const soundRef = React.useRef(null);
  const lastBeepAtRef = React.useRef(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);

  // Camera settings state
  const [cameraBrightness, setCameraBrightness] = useState(0);
  const [cameraContrast, setCameraContrast] = useState(0);
  const [grayscaleMode, setGrayscaleMode] = useState(false);

  // Camera stream state
  const [streamUrl, setStreamUrl] = useState('');
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);

  useEffect(() => {
    // Load audio settings
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

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const handleConnection = (connected) => {
      setIsConnected(connected);
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    };

    const handleData = (data) => {
      const safeNumber = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);

      setSensorData({
        // Motion & Position
        motion: data?.motion ? 1 : 0,
        headPosition: safeNumber(data?.headPosition, 0),

        // DHT22 (backup)
        dhtTemperature: safeNumber(data?.dhtTemperature, 0),
        dhtHumidity: safeNumber(data?.dhtHumidity, 0),

        // RS485 Soil Sensor
        soilHumidity: safeNumber(data?.soilHumidity, 0),
        soilTemperature: safeNumber(data?.soilTemperature, 0),
        soilConductivity: safeNumber(data?.soilConductivity, 0),
        ph: safeNumber(data?.ph, 7.0),

        // Audio State
        currentTrack: safeNumber(data?.currentTrack, 1),
        volume: safeNumber(data?.volume, 20),
        audioPlaying: data?.audioPlaying || false,

        // Servo State
        leftArmAngle: safeNumber(data?.leftArmAngle, 90),
        rightArmAngle: safeNumber(data?.rightArmAngle, 90),
        oscillating: data?.oscillating || false,

        // Bird Detection
        birdDetectionEnabled: data?.birdDetectionEnabled !== undefined ? data.birdDetectionEnabled : true,
        birdsDetectedToday: safeNumber(data?.birdsDetectedToday, 0),
        detectionSensitivity: safeNumber(data?.detectionSensitivity, 2),

        // Hardware Capabilities
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
          '🐦 ' + (lang === 'tl' ? 'Nadetect ang Ibon!' : 'Bird Detected!'),
          `${alert.message}\n${lang === 'tl' ? 'Kabuuan ngayong araw' : 'Total today'}: ${alert.count}`,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
      } else {
        Alert.alert(
          `🚨 ${alert.type.toUpperCase()}`,
          alert.message,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
      }

      // Debounced hawk beep
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

    // Audio setup
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

    // Set camera stream URL
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
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdate(new Date());
    }, 1000);
  }, []);

  // Command senders
  const sendCommand = (command, value = 0) => {
    try {
      WebSocketService.send({ command, value, timestamp: Date.now() });
    } catch (e) {
      Alert.alert(
        lang === 'tl' ? '❌ Nabigo' : '❌ Failed',
        lang === 'tl' ? 'Hindi naipadala ang utos' : 'Could not send command',
        [{ text: 'OK' }]
      );
    }
  };

  // Audio commands
  const playTrack = (track) => sendCommand('PLAY_TRACK', track);
  const stopAudio = () => sendCommand('STOP_AUDIO');
  const nextTrack = () => sendCommand('NEXT_TRACK');
  const setAudioVolume = (vol) => sendCommand('SET_VOLUME', vol);

  // Servo commands
  const setLeftServo = (angle) => {
    WebSocketService.send({ command: 'SET_SERVO_ANGLE', servo: 0, value: angle });
  };
  const setRightServo = (angle) => {
    WebSocketService.send({ command: 'SET_SERVO_ANGLE', servo: 1, value: angle });
  };
  const toggleOscillation = () => sendCommand('TOGGLE_SERVO_OSCILLATION');

  // Head rotation
  const rotateLeft = () => sendCommand('ROTATE_HEAD_LEFT', 90);
  const rotateCenter = () => sendCommand('ROTATE_HEAD_CENTER', 0);
  const rotateRight = () => sendCommand('ROTATE_HEAD_RIGHT', -90);

  // Emergency actions
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

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const refreshStream = () => {
    setStreamRefreshKey(prev => prev + 1);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>🤖 BantayBot</Text>
            <Text style={styles.subtitle}>
              {lang === 'tl' ? 'Pangbantay ng Pananim' : 'Smart Crop Protection'}
            </Text>

            <Animated.View style={[styles.connectionCard, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.connectionRow}>
                <View style={styles.connectionStatus}>
                  <View style={[styles.statusDot, {
                    backgroundColor: isConnected ? '#51CF66' : '#FF6B6B',
                    shadowColor: isConnected ? '#51CF66' : '#FF6B6B',
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 }
                  }]} />
                  <Text style={styles.statusText}>
                    {isConnected
                      ? (lang === 'tl' ? '🟢 Nakakonekta' : '🟢 Connected')
                      : (lang === 'tl' ? '🔴 Walang koneksyon' : '🔴 Disconnected')
                    }
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.muteButton}
                  onPress={() => {
                    const newMuted = !isMuted;
                    setIsMuted(newMuted);
                    AsyncStorage.setItem('is_muted', JSON.stringify(newMuted));
                    if (soundRef.current) {
                      soundRef.current.setVolumeAsync(newMuted ? 0 : volume);
                    }
                  }}
                >
                  <Text style={styles.muteIcon}>{isMuted ? '🔇' : '🔊'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.lastUpdate}>
                {lang === 'tl' ? 'Huling update' : 'Last update'}: {formatTime(lastUpdate)}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Camera Stream */}
        <View style={styles.streamCard}>
          <View style={styles.streamHeader}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveDot}>●</Text>
              <Text style={styles.liveText}>
                {lang === 'tl' ? 'LIVE NA TINGNAN' : 'ESP32 CAM'}
              </Text>
            </View>
            <TouchableOpacity onPress={refreshStream} style={styles.refreshButton}>
              <Text style={styles.refreshText}>🔄 {lang === 'tl' ? 'Refresh' : 'Refresh'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.streamBody}>
            {streamUrl ? (
              <Image
                key={streamRefreshKey}
                source={{ uri: `${streamUrl}?t=${Date.now()}` }}
                style={styles.streamImage}
                resizeMode="cover"
                onError={() => console.log('Stream error')}
              />
            ) : (
              <Text style={styles.previewPlaceholder}>
                {lang === 'tl' ? 'Naglo-load ng camera...' : 'Loading camera...'}
              </Text>
            )}
          </View>
          <View style={styles.streamInfo}>
            <Text style={styles.streamInfoText}>📡 {CONFIG.ESP32_IP}:81/stream</Text>
          </View>
        </View>

        {/* RS485 Soil Sensor Card (NEW) */}
        {sensorData.hasRS485Sensor && (
          <SoilSensorCard
            humidity={sensorData.soilHumidity}
            temperature={sensorData.soilTemperature}
            conductivity={sensorData.soilConductivity}
            ph={sensorData.ph}
            lang={lang}
          />
        )}

        {/* Bird Detection Status */}
        <View style={styles.birdSection}>
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
          style={{ marginBottom: 15 }}
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
          style={{ marginBottom: 15 }}
        />

        {/* Audio Player Control (NEW) */}
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

        {/* Servo Arm Control (NEW) */}
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

        {/* Head Direction Control */}
        <View style={styles.headSection}>
          <Text style={styles.sectionTitle}>
            {lang === 'tl' ? '🔄 DIREKSYON NG ULO' : '🔄 HEAD DIRECTION'}
          </Text>
          <View style={styles.headControls}>
            <QuickActionButton
              icon="⬅️"
              label={lang === 'tl' ? 'Pakaliwa' : 'Left'}
              color="#667eea"
              onPress={rotateLeft}
              size="medium"
              style={{ flex: 1, marginRight: 8 }}
            />
            <QuickActionButton
              icon="⏺️"
              label={lang === 'tl' ? 'Gitna' : 'Center'}
              color="#51CF66"
              onPress={rotateCenter}
              size="medium"
              style={{ flex: 1, marginHorizontal: 4 }}
            />
            <QuickActionButton
              icon="➡️"
              label={lang === 'tl' ? 'Pakanan' : 'Right'}
              color="#667eea"
              onPress={rotateRight}
              size="medium"
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
          <Text style={styles.positionText}>
            {lang === 'tl' ? 'Kasalukuyang posisyon' : 'Current position'}: {sensorData.headPosition}°
          </Text>
        </View>

        {/* Emergency Actions */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>
            {lang === 'tl' ? '⚠️ MGA EMERGENCY AKSYON' : '⚠️ EMERGENCY ACTIONS'}
          </Text>
          <View style={styles.emergencyButtons}>
            <QuickActionButton
              icon="📢"
              label={lang === 'tl' ? 'TUMUNOG NA!' : 'SCARE NOW!'}
              sublabel={lang === 'tl' ? 'Takutin ang ibon' : 'Frighten birds'}
              color="#FF6B6B"
              onPress={soundAlarm}
              size="large"
              style={{ flex: 1, marginRight: 8 }}
            />
            <QuickActionButton
              icon="🔄"
              label={lang === 'tl' ? 'I-RESTART' : 'RESTART'}
              sublabel={lang === 'tl' ? 'Reset system' : 'Reset system'}
              color="#fa709a"
              onPress={restartSystem}
              size="large"
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  connectionCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 15,
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  connectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muteButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 8,
    minWidth: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteIcon: {
    fontSize: 22,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    elevation: 3,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  content: {
    padding: 15,
  },
  streamCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  streamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    color: '#FF4757',
    marginRight: 6,
    fontWeight: '900',
  },
  liveText: {
    color: '#FF4757',
    fontWeight: '700',
  },
  streamBody: {
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  previewPlaceholder: {
    color: '#888',
    fontStyle: 'italic',
  },
  streamImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  refreshButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  streamInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  streamInfoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  birdSection: {
    marginBottom: 15,
  },
  headSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headControls: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  positionText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    fontWeight: '500',
  },
  emergencySection: {
    marginVertical: 20,
    marginBottom: 40,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emergencyButtons: {
    flexDirection: 'row',
  },
});

export default DashboardScreen;
