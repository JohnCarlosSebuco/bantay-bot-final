import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SoilSensorCard = ({
  humidity = 0,
  temperature = 0,
  conductivity = 0,
  ph = 7.0,
  lang = 'tl',
  style
}) => {
  // Status determination
  const getHumidityStatus = (val) => {
    if (val < 40) return { status: lang === 'tl' ? 'Tuyo' : 'Dry', color: '#FF6B6B', icon: '🏜️' };
    if (val <= 70) return { status: lang === 'tl' ? 'Sakto' : 'Optimal', color: '#51CF66', icon: '🌱' };
    return { status: lang === 'tl' ? 'Basa' : 'Wet', color: '#339AF0', icon: '💧' };
  };

  const getTempStatus = (val) => {
    if (val < 20) return { status: lang === 'tl' ? 'Malamig' : 'Cold', color: '#6BB6FF' };
    if (val <= 30) return { status: lang === 'tl' ? 'Mabuti' : 'Good', color: '#51CF66' };
    return { status: lang === 'tl' ? 'Mainit' : 'Hot', color: '#FF6B6B' };
  };

  const getConductivityStatus = (val) => {
    if (val < 200) return { status: lang === 'tl' ? 'Kulang sustansya' : 'Low nutrients', color: '#FF6B6B' };
    if (val <= 2000) return { status: lang === 'tl' ? 'Sakto' : 'Optimal', color: '#51CF66' };
    return { status: lang === 'tl' ? 'Sobra sustansya' : 'High nutrients', color: '#FFA94D' };
  };

  const getPHStatus = (val) => {
    if (val < 5.5) return { status: lang === 'tl' ? 'Masyado asido' : 'Too acidic', color: '#FF6B6B' };
    if (val <= 7.5) return { status: lang === 'tl' ? 'Balanse' : 'Balanced', color: '#51CF66' };
    return { status: lang === 'tl' ? 'Masyado alkaline' : 'Too alkaline', color: '#FFA94D' };
  };

  const humidityData = getHumidityStatus(humidity);
  const tempData = getTempStatus(temperature);
  const conductivityData = getConductivityStatus(conductivity);
  const phData = getPHStatus(ph);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🌱</Text>
        <Text style={styles.headerText}>
          {lang === 'tl' ? 'KALAGAYAN NG LUPA' : 'SOIL STATUS'}
        </Text>
      </View>

      {/* Humidity */}
      <View style={styles.sensorRow}>
        <View style={styles.sensorInfo}>
          <Text style={styles.sensorIcon}>💧</Text>
          <View style={styles.sensorDetails}>
            <Text style={styles.sensorLabel}>
              {lang === 'tl' ? 'Halumigmig' : 'Humidity'}
            </Text>
            <View style={styles.valueRow}>
              <Text style={[styles.sensorValue, { color: humidityData.color }]}>
                {humidity}%
              </Text>
              <Text style={[styles.statusText, { color: humidityData.color }]}>
                {humidityData.icon} {humidityData.status}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${Math.min(humidity, 100)}%`, backgroundColor: humidityData.color }]} />
        </View>
      </View>

      {/* Temperature */}
      <View style={styles.sensorRow}>
        <View style={styles.sensorInfo}>
          <Text style={styles.sensorIcon}>🌡️</Text>
          <View style={styles.sensorDetails}>
            <Text style={styles.sensorLabel}>
              {lang === 'tl' ? 'Temperatura' : 'Temperature'}
            </Text>
            <View style={styles.valueRow}>
              <Text style={[styles.sensorValue, { color: tempData.color }]}>
                {temperature}°C
              </Text>
              <Text style={[styles.statusText, { color: tempData.color }]}>
                ✅ {tempData.status}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${Math.min((temperature / 50) * 100, 100)}%`, backgroundColor: tempData.color }]} />
        </View>
      </View>

      {/* Conductivity */}
      <View style={styles.sensorRow}>
        <View style={styles.sensorInfo}>
          <Text style={styles.sensorIcon}>⚡</Text>
          <View style={styles.sensorDetails}>
            <Text style={styles.sensorLabel}>
              {lang === 'tl' ? 'Konduktibidad' : 'Conductivity'}
            </Text>
            <View style={styles.valueRow}>
              <Text style={[styles.sensorValue, { color: conductivityData.color }]}>
                {conductivity} µS/cm
              </Text>
              <Text style={[styles.statusText, { color: conductivityData.color }]}>
                ✅ {conductivityData.status}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${Math.min((conductivity / 3000) * 100, 100)}%`, backgroundColor: conductivityData.color }]} />
        </View>
      </View>

      {/* pH Level */}
      <View style={styles.sensorRow}>
        <View style={styles.sensorInfo}>
          <Text style={styles.sensorIcon}>🧪</Text>
          <View style={styles.sensorDetails}>
            <Text style={styles.sensorLabel}>
              {lang === 'tl' ? 'pH Level' : 'pH Level'}
            </Text>
            <View style={styles.valueRow}>
              <Text style={[styles.sensorValue, { color: phData.color }]}>
                {ph.toFixed(1)}
              </Text>
              <Text style={[styles.statusText, { color: phData.color }]}>
                ✅ {phData.status}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${(ph / 14) * 100}%`, backgroundColor: phData.color }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#E8F5E9',
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  sensorRow: {
    marginBottom: 18,
  },
  sensorInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sensorIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sensorDetails: {
    flex: 1,
  },
  sensorLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
});

export default SoilSensorCard;
