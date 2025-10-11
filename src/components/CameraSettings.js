import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';

const CameraSettings = ({
  brightness,
  contrast,
  onBrightnessChange,
  onContrastChange,
  onResolutionChange,
  grayscaleMode,
  onGrayscaleModeToggle,
  style
}) => {
  const [selectedResolution, setSelectedResolution] = useState(1); // 0=96x96, 1=QVGA, 2=VGA, 3=SVGA

  const resolutions = [
    { label: '96x96', value: 0 },
    { label: 'QVGA (320x240)', value: 1 },
    { label: 'VGA (640x480)', value: 2 },
    { label: 'SVGA (800x600)', value: 3 },
  ];

  const handleResolutionSelect = (value) => {
    setSelectedResolution(value);
    onResolutionChange(value);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>📹 Camera Settings</Text>

      {/* Brightness Control */}
      <View style={styles.settingGroup}>
        <Text style={styles.label}>☀️ Brightness</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderValue}>-2</Text>
          <Slider
            style={styles.slider}
            minimumValue={-2}
            maximumValue={2}
            step={1}
            value={brightness}
            onValueChange={onBrightnessChange}
            minimumTrackTintColor="#667eea"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#667eea"
          />
          <Text style={styles.sliderValue}>+2</Text>
        </View>
        <Text style={styles.currentValue}>Current: {brightness}</Text>
      </View>

      {/* Contrast Control */}
      <View style={styles.settingGroup}>
        <Text style={styles.label}>🎨 Contrast</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderValue}>-2</Text>
          <Slider
            style={styles.slider}
            minimumValue={-2}
            maximumValue={2}
            step={1}
            value={contrast}
            onValueChange={onContrastChange}
            minimumTrackTintColor="#667eea"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#667eea"
          />
          <Text style={styles.sliderValue}>+2</Text>
        </View>
        <Text style={styles.currentValue}>Current: {contrast}</Text>
      </View>

      {/* Resolution Selector */}
      <View style={styles.settingGroup}>
        <Text style={styles.label}>📐 Resolution</Text>
        <View style={styles.resolutionGrid}>
          {resolutions.map((res) => (
            <TouchableOpacity
              key={res.value}
              style={[
                styles.resolutionButton,
                selectedResolution === res.value && styles.resolutionButtonActive,
              ]}
              onPress={() => handleResolutionSelect(res.value)}
            >
              <Text
                style={[
                  styles.resolutionText,
                  selectedResolution === res.value && styles.resolutionTextActive,
                ]}
              >
                {res.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Grayscale Mode Toggle */}
      <View style={styles.settingGroup}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.label}>⚫ Grayscale Mode</Text>
            <Text style={styles.description}>Save bandwidth & processing power</Text>
          </View>
          <Switch
            value={grayscaleMode}
            onValueChange={onGrayscaleModeToggle}
            trackColor={{ false: '#E0E0E0', true: '#667eea' }}
            thumbColor={grayscaleMode ? '#ffffff' : '#ffffff'}
          />
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          💡 <Text style={styles.infoBold}>Tip:</Text> Lower resolution saves battery. Use QVGA for detection.
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  settingGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
  sliderValue: {
    fontSize: 12,
    color: '#888',
    width: 25,
    textAlign: 'center',
  },
  currentValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
    textAlign: 'center',
    marginTop: 5,
  },
  resolutionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resolutionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  resolutionButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#667eea',
  },
  resolutionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  resolutionTextActive: {
    color: '#667eea',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '700',
    color: '#333',
  },
});

export default CameraSettings;