import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

const ServoArmControl = ({
  leftArmAngle = 90,
  rightArmAngle = 90,
  oscillating = false,
  onLeftChange,
  onRightChange,
  onToggleOscillation,
  lang = 'tl',
  style
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🦾</Text>
        <Text style={styles.headerText}>
          {lang === 'tl' ? 'PAGGALAW NG BRASO' : 'ARM MOVEMENT'}
        </Text>
      </View>

      {/* Left Arm Control */}
      <View style={styles.armControl}>
        <View style={styles.armHeader}>
          <Text style={styles.armIcon}>⬅️</Text>
          <Text style={styles.armLabel}>
            {lang === 'tl' ? 'Kaliwang Braso' : 'Left Arm'}
          </Text>
          <Text style={styles.armValue}>{leftArmAngle}°</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={180}
          step={5}
          value={leftArmAngle}
          onValueChange={onLeftChange}
          minimumTrackTintColor="#667eea"
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor="#667eea"
          disabled={oscillating}
        />
        <View style={styles.angleMarkers}>
          <Text style={styles.markerText}>0°</Text>
          <Text style={styles.markerText}>90°</Text>
          <Text style={styles.markerText}>180°</Text>
        </View>
      </View>

      {/* Right Arm Control */}
      <View style={styles.armControl}>
        <View style={styles.armHeader}>
          <Text style={styles.armIcon}>➡️</Text>
          <Text style={styles.armLabel}>
            {lang === 'tl' ? 'Kanang Braso' : 'Right Arm'}
          </Text>
          <Text style={styles.armValue}>{rightArmAngle}°</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={180}
          step={5}
          value={rightArmAngle}
          onValueChange={onRightChange}
          minimumTrackTintColor="#764ba2"
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor="#764ba2"
          disabled={oscillating}
        />
        <View style={styles.angleMarkers}>
          <Text style={styles.markerText}>0°</Text>
          <Text style={styles.markerText}>90°</Text>
          <Text style={styles.markerText}>180°</Text>
        </View>
      </View>

      {/* Visual Arm Representation */}
      <View style={styles.visualContainer}>
        <View style={styles.armVisual}>
          {/* Left Arm */}
          <View
            style={[
              styles.armBar,
              {
                transform: [
                  { rotate: `${leftArmAngle - 90}deg` },
                ],
                backgroundColor: '#667eea',
              },
            ]}
          />
          {/* Right Arm */}
          <View
            style={[
              styles.armBar,
              {
                transform: [
                  { rotate: `${90 - rightArmAngle}deg` },
                ],
                backgroundColor: '#764ba2',
              },
            ]}
          />
        </View>
        <Text style={styles.visualLabel}>
          {lang === 'tl' ? 'Posisyon ng mga braso' : 'Arm positions'}
        </Text>
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.oscillateButton,
            oscillating && styles.oscillateActive
          ]}
          onPress={onToggleOscillation}
        >
          <Text style={styles.buttonIcon}>
            {oscillating ? '⏸️' : '🔄'}
          </Text>
          <Text style={[
            styles.buttonText,
            oscillating && styles.buttonTextActive
          ]}>
            {oscillating
              ? (lang === 'tl' ? 'Huminto' : 'Stop')
              : (lang === 'tl' ? 'Gumalaw' : 'Oscillate')
            }
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={[styles.statusBadge, oscillating && styles.statusActive]}>
        <View style={[styles.statusDot, oscillating && styles.dotActive]} />
        <Text style={[styles.statusText, oscillating && styles.statusTextActive]}>
          {oscillating
            ? (lang === 'tl' ? 'Gumagalaw ang mga braso' : 'Arms moving')
            : (lang === 'tl' ? 'Nakatigil ang mga braso' : 'Arms stopped')
          }
        </Text>
      </View>

      {/* Preset Positions (Future Enhancement) */}
      <View style={styles.presets}>
        <Text style={styles.presetLabel}>
          {lang === 'tl' ? 'Mga preset:' : 'Presets:'}
        </Text>
        <View style={styles.presetButtons}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              onLeftChange(0);
              onRightChange(0);
            }}
            disabled={oscillating}
          >
            <Text style={styles.presetButtonText}>
              {lang === 'tl' ? '✋ Pahinga' : '✋ Rest'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              onLeftChange(135);
              onRightChange(45);
            }}
            disabled={oscillating}
          >
            <Text style={styles.presetButtonText}>
              {lang === 'tl' ? '⚠️ Alerto' : '⚠️ Alert'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              onLeftChange(90);
              onRightChange(90);
            }}
            disabled={oscillating}
          >
            <Text style={styles.presetButtonText}>
              {lang === 'tl' ? '👋 Kumaway' : '👋 Wave'}
            </Text>
          </TouchableOpacity>
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
    borderBottomColor: '#E3F2FD',
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    letterSpacing: 0.5,
  },
  armControl: {
    marginBottom: 20,
  },
  armHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  armIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  armLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    fontWeight: '500',
  },
  armValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  angleMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  markerText: {
    fontSize: 11,
    color: '#999',
  },
  visualContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  armVisual: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  armBar: {
    position: 'absolute',
    width: 60,
    height: 8,
    borderRadius: 4,
  },
  visualLabel: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  controls: {
    marginBottom: 15,
  },
  oscillateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 2,
  },
  oscillateActive: {
    backgroundColor: '#FF6B6B',
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextActive: {
    color: 'white',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#999',
    marginRight: 10,
  },
  dotActive: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#2E7D32',
  },
  presets: {
    marginTop: 5,
  },
  presetLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    fontWeight: '500',
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
});

export default ServoArmControl;
