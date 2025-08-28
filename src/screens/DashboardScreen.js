import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WebSocketService from '../services/WebSocketService';

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

    const handleAlert = (alert) => {
      Alert.alert(
        `🚨 ${alert.type.toUpperCase()}`,
        alert.message,
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
    };

    WebSocketService.on('connected', handleConnection);
    WebSocketService.on('data', handleData);
    WebSocketService.on('alert', handleAlert);

    WebSocketService.connect();

    return () => {
      WebSocketService.off('connected', handleConnection);
      WebSocketService.off('data', handleData);
      WebSocketService.off('alert', handleAlert);
      WebSocketService.disconnect();
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