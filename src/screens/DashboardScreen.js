import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WebSocketService from '../services/WebSocketService';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sensorData, setSensorData] = useState({
    motion: 0,
    distance: 0,
    temperature: 0,
    humidity: 0,
    soilMoisture: 0
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Animation values (persist across renders)
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const soundRef = React.useRef(null);
  const lastBeepAtRef = React.useRef(0);
  const [isMuted] = useState(false);

  useEffect(() => {
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
      const distance = safeNumber(data?.distance, -1);
      const temperature = safeNumber(data?.temperature, 0);
      const humidity = safeNumber(data?.humidity, 0);
      const soilMoisture = safeNumber(data?.soilMoisture, 0);

      setSensorData({ motion, distance, temperature, humidity, soilMoisture });
      setLastUpdate(new Date());
    };

    const handleAlert = async (alert) => {
      Alert.alert(
        `🚨 ${alert.type.toUpperCase()}`,
        alert.message,
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
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
          { shouldPlay: false, volume: 1.0 }
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

  const sendQuickAction = (command) => {
    try {
      WebSocketService.send({ command, timestamp: Date.now() });
      const labels = {
        MOVE_ARMS: 'Move Arms',
        SOUND_ALARM: 'Sound Alarm',
        RESET_SYSTEM: 'Reset System',
      };
      Alert.alert('✅ Command Sent', `${labels[command] || command} triggered.`, [{ text: 'OK' }]);
      // play full hawk only for SOUND_ALARM
      if (command === 'SOUND_ALARM' && soundRef.current && !isMuted) {
        (async () => {
          try {
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.playAsync();
          } catch (_) {}
        })();
      }
    } catch (e) {
      Alert.alert('❌ Failed', 'Could not send command.', [{ text: 'OK' }]);
    }
  };

  // Stream mock state
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [bitrateKbps, setBitrateKbps] = useState(850);
  const [latencyMs, setLatencyMs] = useState(120);

  const connectStream = () => {
    setIsReconnecting(true);
    setTimeout(() => {
      setIsReconnecting(false);
      setIsStreamConnected(true);
      setBitrateKbps(800 + Math.round(Math.random() * 400));
      setLatencyMs(80 + Math.round(Math.random() * 120));
    }, 1200);
  };

  const disconnectStream = () => {
    setIsStreamConnected(false);
  };

  const simulateReconnect = () => {
    if (!isStreamConnected) return;
    setIsReconnecting(true);
    setTimeout(() => {
      setIsReconnecting(false);
      setBitrateKbps(700 + Math.round(Math.random() * 300));
      setLatencyMs(100 + Math.round(Math.random() * 150));
    }, 1200);
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
              <Text style={styles.lastUpdate}>
                Last update: {formatTime(lastUpdate)}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Live Stream (Mock) */}
        <View style={styles.streamCard}>
          <View style={styles.streamHeader}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveDot}>●</Text>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            {isStreamConnected ? (
              <Text style={styles.streamMeta}>{bitrateKbps} kbps · {latencyMs} ms</Text>
            ) : (
              <Text style={styles.streamMeta}>Disconnected</Text>
            )}
          </View>
          <View style={styles.streamBody}>
            {isReconnecting ? (
              <Text style={styles.reconnectingText}>Reconnecting…</Text>
            ) : (
              <Text style={styles.previewPlaceholder}>
                {isStreamConnected ? 'Stream active (mock preview)' : 'No preview available'}
              </Text>
            )}
          </View>
          <View style={styles.streamActions}>
            {isStreamConnected ? (
              <TouchableOpacity style={[styles.streamButton, { backgroundColor: '#FF6B6B' }]} onPress={disconnectStream}>
                <Text style={styles.streamButtonText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.streamButton, { backgroundColor: '#51CF66' }]} onPress={connectStream}>
                <Text style={styles.streamButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.streamButton, { backgroundColor: '#339AF0' }]} onPress={simulateReconnect}>
              <Text style={styles.streamButtonText}>Simulate Reconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Quick Actions */}
        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#667eea' }]} onPress={() => sendQuickAction('MOVE_ARMS')}>
              <Text style={styles.quickButtonText}>🤖 Move Arms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#FF6B6B' }]} onPress={() => sendQuickAction('SOUND_ALARM')}>
              <Text style={styles.quickButtonText}>📢 Make Sound</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#fa709a' }]} onPress={() => sendQuickAction('RESET_SYSTEM')}>
              <Text style={styles.quickButtonText}>🔄 Restart</Text>
            </TouchableOpacity>
          </View>
        </View>

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

          {/* Distance Card */}
          <View style={styles.sensorCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.sensorIcon}>📏</Text>
              <Text style={styles.sensorLabel}>Distance</Text>
            </View>
            <Text style={styles.sensorValue}>{sensorData.distance >= 0 ? sensorData.distance : 'N/A'}</Text>
            <Text style={styles.sensorUnit}>centimeters</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { 
                width: `${sensorData.distance >= 0 ? Math.min((sensorData.distance / 100) * 100, 100) : 0}%`,
                backgroundColor: sensorData.distance >= 0 && sensorData.distance < 20 ? '#FF6B6B' : '#51CF66'
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
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
  streamActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streamButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  streamButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  quickSection: {
    marginBottom: 20,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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