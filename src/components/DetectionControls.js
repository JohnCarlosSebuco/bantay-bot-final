import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';

const DetectionControls = ({
  detectionEnabled,
  onDetectionToggle,
  sensitivity,
  onSensitivityChange,
  birdsDetectedToday,
  onResetCount,
  style,
}) => {
  const [pulseAnim] = React.useState(new Animated.Value(1));

  React.useEffect(() => {
    if (detectionEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [detectionEnabled]);

  const getSensitivityLabel = (value) => {
    if (value === 1) return 'Low';
    if (value === 2) return 'Medium';
    return 'High';
  };

  const getSensitivityColor = (value) => {
    if (value === 1) return '#51CF66';
    if (value === 2) return '#FFB800';
    return '#FF6B6B';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>🐦 Bird Detection</Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: detectionEnabled ? '#51CF66' : '#FF6B6B' },
            ]}
          />
        </Animated.View>
      </View>

      {/* Detection Toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleContent}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Detection System</Text>
            <Text style={styles.toggleDescription}>
              {detectionEnabled ? 'Actively monitoring' : 'Currently disabled'}
            </Text>
          </View>
          <Switch
            value={detectionEnabled}
            onValueChange={onDetectionToggle}
            trackColor={{ false: '#E0E0E0', true: '#667eea' }}
            thumbColor={detectionEnabled ? '#ffffff' : '#ffffff'}
            style={styles.switch}
          />
        </View>
      </View>

      {/* Detection Statistics */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{birdsDetectedToday}</Text>
            <Text style={styles.statLabel}>Birds Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: getSensitivityColor(sensitivity) }]}>
              {getSensitivityLabel(sensitivity)}
            </Text>
            <Text style={styles.statLabel}>Sensitivity</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={onResetCount}>
          <Text style={styles.resetButtonText}>🔄 Reset Count</Text>
        </TouchableOpacity>
      </View>

      {/* Sensitivity Slider */}
      <View style={styles.sensitivityCard}>
        <Text style={styles.label}>🎯 Detection Sensitivity</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Low</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={3}
            step={1}
            value={sensitivity}
            onValueChange={onSensitivityChange}
            minimumTrackTintColor={getSensitivityColor(sensitivity)}
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor={getSensitivityColor(sensitivity)}
            disabled={!detectionEnabled}
          />
          <Text style={styles.sliderLabel}>High</Text>
        </View>
        <Text style={[styles.sensitivityLevel, { color: getSensitivityColor(sensitivity) }]}>
          {getSensitivityLabel(sensitivity)} Sensitivity
        </Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ How it works:</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Low:</Text> Fewer false alarms, may miss small birds{'\n'}
          • <Text style={styles.infoBold}>Medium:</Text> Balanced detection (recommended){'\n'}
          • <Text style={styles.infoBold}>High:</Text> Maximum detection, more false positives
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  toggleCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  toggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#666',
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  statsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 15,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  resetButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sensitivityCard: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#888',
    width: 40,
    textAlign: 'center',
  },
  sensitivityLevel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },
  infoCard: {
    backgroundColor: '#E8F4FD',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#339AF0',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
    color: '#333',
  },
});

export default DetectionControls;