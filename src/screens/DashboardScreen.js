import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WebSocketService from '../services/WebSocketService';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config/config';
import CameraSettings from '../components/CameraSettings';
import DetectionControls from '../components/DetectionControls';
import detectionHistoryService from '../services/DetectionHistoryService';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sensorData, setSensorData] = useState({
    motion: 0,
    temperature: 0,
    humidity: 0,
    soilMoisture: 0,
    headPosition: 0, // Stepper motor head position (degrees)
    birdDetectionEnabled: true,
    birdsDetectedToday: 0,
    detectionSensitivity: 2,
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Animation values (persist across renders)
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

    // Fade in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const handleConnection = (connected) => {
      setIsConnected(connected);
      // Pulse animation when connection changes
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    };

    const handleData = (data) => {
      const safeNumber = (v, fallback = 0) => (typeof v === 'number' && isFinite(v) ? v : fallback);
      const motion = data && (data.motion ? 1 : 0);
      const temperature = safeNumber(data?.temperature, 0);
      const humidity = safeNumber(data?.humidity, 0);
      const soilMoisture = safeNumber(data?.soilMoisture, 0);
      const headPosition = safeNumber(data?.headPosition, 0);
      const birdDetectionEnabled = data?.birdDetectionEnabled !== undefined ? data.birdDetectionEnabled : true;
      const birdsDetectedToday = safeNumber(data?.birdsDetectedToday, 0);
      const detectionSensitivity = safeNumber(data?.detectionSensitivity, 2);

      setSensorData({
        motion,
        temperature,
        humidity,
        soilMoisture,
        headPosition,
        birdDetectionEnabled,
        birdsDetectedToday,
        detectionSensitivity,
      });
      setLastUpdate(new Date());
    };

    const handleAlert = async (alert) => {
      // Handle bird detection alert
      if (alert.type === 'bird_detection') {
        // Save to detection history
        await detectionHistoryService.addDetection({
          type: 'bird',
          message: alert.message,
          count: alert.count || 1,
        });

        // Show alert notification
        Alert.alert(
          '🐦 Bird Detected!',
          `${alert.message}\nTotal today: ${alert.count}`,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
      } else {
        // Generic alert
        Alert.alert(
          `🚨 ${alert.type.toUpperCase()}`,
          alert.message,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
      }

      // Debounced 1.5s hawk beep on alert
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

    // Configure audio and preload hawk sound
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
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdate(new Date());
    }, 1000);
  }, []);

  

  const getSoilMoistureData = (value) => {
    if (value < 300) return { status: 'Dry', color: '#FF6B6B', icon: '🏜️', level: (value / 300) * 100 };
    if (value < 700) return { status: 'Optimal', color: '#51CF66', icon: '🌱', level: ((value - 300) / 400) * 100 + 100 };
    return { status: 'Wet', color: '#339AF0', icon: '💧', level: 100 };
  };

  const getTemperatureColor = (temp) => {
    if (temp < 20) return '#6BB6FF';
    if (temp < 30) return '#51CF66';
    return '#FF6B6B';
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const soilData = getSoilMoistureData(sensorData.soilMoisture);

  const sendQuickAction = (command, value) => {
    try {
      WebSocketService.send({ command, value, timestamp: Date.now() });
      const labels = {
        ROTATE_HEAD_LEFT: 'Rotate Head Left',
        ROTATE_HEAD_RIGHT: 'Rotate Head Right',
        ROTATE_HEAD_CENTER: 'Center Head',
        SOUND_ALARM: 'Sound Alarm',
        RESET_SYSTEM: 'Reset System',
      };
      Alert.alert('✅ Command Sent', `${labels[command] || command} triggered.`, [{ text: 'OK' }]);
      // play full hawk only for SOUND_ALARM
      if (command === 'SOUND_ALARM' && soundRef.current && !isMuted) {
        (async () => {
          try {
            await soundRef.current.setVolumeAsync(volume);
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.playAsync();
          } catch (_) {}
        })();
      }
    } catch (e) {
      Alert.alert('❌ Failed', 'Could not send command.', [{ text: 'OK' }]);
    }
  };

  // ESP32 CAM Stream state
  const [streamUrl, setStreamUrl] = useState('');
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);

  useEffect(() => {
    // Set ESP32 CAM stream URL
    const esp32Ip = CONFIG.ESP32_IP;
    setStreamUrl(`http://${esp32Ip}:81/stream`);
  }, []);

  const refreshStream = () => {
    setStreamRefreshKey(prev => prev + 1);
  };

  return (
    <ScrollView 
      style={styles.container}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>🤖 BantayBot</Text>
            <Text style={styles.subtitle}>Smart Crop Protection</Text>
            
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
                    {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
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
                Last update: {formatTime(lastUpdate)}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* ESP32 CAM Live Stream */}
        <View style={styles.streamCard}>
          <View style={styles.streamHeader}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveDot}>●</Text>
              <Text style={styles.liveText}>ESP32 CAM</Text>
            </View>
            <TouchableOpacity onPress={refreshStream} style={styles.refreshButton}>
              <Text style={styles.refreshText}>🔄 Refresh</Text>
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
              <Text style={styles.previewPlaceholder}>Loading camera...</Text>
            )}
          </View>
          <View style={styles.streamInfo}>
            <Text style={styles.streamInfoText}>📡 {CONFIG.ESP32_IP}:81/stream</Text>
          </View>
        </View>
        {/* Quick Actions */}
        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#667eea' }]} onPress={() => sendQuickAction('ROTATE_HEAD_LEFT', 90)}>
              <Text style={styles.quickButtonText}>⬅️ Turn Left</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#51CF66' }]} onPress={() => sendQuickAction('ROTATE_HEAD_CENTER', 0)}>
              <Text style={styles.quickButtonText}>⏺️ Center</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#667eea' }]} onPress={() => sendQuickAction('ROTATE_HEAD_RIGHT', -90)}>
              <Text style={styles.quickButtonText}>➡️ Turn Right</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickRow}>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#FF6B6B', flex: 1 }]} onPress={() => sendQuickAction('SOUND_ALARM')}>
              <Text style={styles.quickButtonText}>📢 Sound Alarm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#fa709a', flex: 1, marginLeft: 10 }]} onPress={() => sendQuickAction('RESET_SYSTEM')}>
              <Text style={styles.quickButtonText}>🔄 Restart</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bird Detection Controls */}
        <DetectionControls
          detectionEnabled={sensorData.birdDetectionEnabled}
          onDetectionToggle={() => {
            sendQuickAction('TOGGLE_DETECTION');
          }}
          sensitivity={sensorData.detectionSensitivity}
          onSensitivityChange={(value) => {
            sendQuickAction('SET_SENSITIVITY', value);
          }}
          birdsDetectedToday={sensorData.birdsDetectedToday}
          onResetCount={() => {
            sendQuickAction('RESET_BIRD_COUNT');
          }}
          style={{ marginBottom: 15 }}
        />

        {/* Camera Settings */}
        <CameraSettings
          brightness={cameraBrightness}
          contrast={cameraContrast}
          onBrightnessChange={(value) => {
            setCameraBrightness(value);
            sendQuickAction('SET_BRIGHTNESS', value);
          }}
          onContrastChange={(value) => {
            setCameraContrast(value);
            sendQuickAction('SET_CONTRAST', value);
          }}
          onResolutionChange={(value) => {
            sendQuickAction('SET_RESOLUTION', value);
          }}
          grayscaleMode={grayscaleMode}
          onGrayscaleModeToggle={() => {
            setGrayscaleMode(!grayscaleMode);
            sendQuickAction('TOGGLE_GRAYSCALE');
          }}
          style={{ marginBottom: 15 }}
        />

        {/* Sensor Cards Grid */}
        <Animated.View style={[styles.sensorGrid, { opacity: fadeAnim }]}>
          {/* Motion Detection Card */}
          <View style={[styles.sensorCard, sensorData.motion && styles.alertCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.sensorIcon}>
                {sensorData.motion ? '🚨' : '👁️'}
              </Text>
              <Text style={styles.sensorLabel}>Motion</Text>
            </View>
            <Text style={[styles.sensorValue, { 
              color: sensorData.motion ? '#FF6B6B' : '#51CF66' 
            }]}>
              {sensorData.motion ? 'DETECTED' : 'Clear'}
            </Text>
            {sensorData.motion && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertText}>⚠️ ALERT</Text>
              </View>
            )}
          </View>

          {/* Head Position Card */}
          <View style={styles.sensorCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.sensorIcon}>🔄</Text>
              <Text style={styles.sensorLabel}>Head Position</Text>
            </View>
            <Text style={styles.sensorValue}>{sensorData.headPosition}°</Text>
            <Text style={styles.sensorUnit}>degrees</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                width: `${((sensorData.headPosition + 180) / 360) * 100}%`,
                backgroundColor: '#667eea'
              }]} />
            </View>
          </View>

          {/* Temperature Card */}
          <View style={styles.sensorCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.sensorIcon}>🌡️</Text>
              <Text style={styles.sensorLabel}>Temperature</Text>
            </View>
            <Text style={[styles.sensorValue, { 
              color: getTemperatureColor(sensorData.temperature) 
            }]}>
              {isFinite(sensorData.temperature) ? sensorData.temperature.toFixed(1) + '°' : 'N/A'}
            </Text>
            <Text style={styles.sensorUnit}>Celsius</Text>
          </View>

          {/* Humidity Card */}
          <View style={styles.sensorCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.sensorIcon}>💨</Text>
              <Text style={styles.sensorLabel}>Humidity</Text>
            </View>
            <Text style={styles.sensorValue}>{isFinite(sensorData.humidity) ? sensorData.humidity.toFixed(1) : 'N/A'}</Text>
            <Text style={styles.sensorUnit}>percent</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { 
                width: `${isFinite(sensorData.humidity) ? Math.min(sensorData.humidity, 100) : 0}%`,
                backgroundColor: '#339AF0'
              }]} />
            </View>
          </View>

          {/* Soil Moisture Card - Full Width */}
          <View style={[styles.sensorCard, styles.fullWidth, styles.soilCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.sensorIcon}>{soilData.icon}</Text>
              <Text style={styles.sensorLabel}>Soil Moisture</Text>
            </View>
            <View style={styles.soilContent}>
              <View style={styles.soilStats}>
                <Text style={[styles.sensorValue, { color: soilData.color }]}>
                  {sensorData.soilMoisture}
                </Text>
                <Text style={styles.sensorUnit}>units</Text>
              </View>
              <View style={styles.soilStatus}>
                <Text style={[styles.soilStatusText, { color: soilData.color }]}>
                  {soilData.status}
                </Text>
                <View style={styles.soilProgressBar}>
                  <View style={[styles.soilProgressFill, { 
                    width: `${soilData.level}%`,
                    backgroundColor: soilData.color
                  }]} />
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
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
  streamMeta: {
    color: '#666',
  },
  streamBody: {
    height: 140,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  reconnectingText: {
    color: '#FF6B6B',
    fontWeight: '700',
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
  quickSection: {
    marginBottom: 20,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  quickButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sensorCard: {
    width: (width - 45) / 2,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  fullWidth: {
    width: width - 30,
  },
  alertCard: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sensorIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  sensorLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sensorValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  sensorUnit: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  alertBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  alertText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  soilCard: {
    minHeight: 120,
  },
  soilContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  soilStats: {
    alignItems: 'flex-start',
  },
  soilStatus: {
    flex: 1,
    marginLeft: 20,
  },
  soilStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  soilProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  soilProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default DashboardScreen;