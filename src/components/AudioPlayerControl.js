import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

const AudioPlayerControl = ({
  currentTrack = 1,
  totalTracks = 7,
  volume = 50,
  audioPlaying = false,
  onPlay,
  onStop,
  onNext,
  onVolumeChange,
  lang = 'tl',
  style
}) => {
  const volumePercent = Math.round((volume / 30) * 100);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🎵</Text>
        <Text style={styles.headerText}>
          {lang === 'tl' ? 'TUNOG PANTAKOT' : 'AUDIO SCARER'}
        </Text>
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackLabel}>
          {lang === 'tl' ? 'Kasalukuyang tunog:' : 'Current track:'}
        </Text>
        <Text style={styles.trackNumber}>
          {currentTrack}/{totalTracks}
        </Text>
      </View>

      {/* Playback Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onStop}
          disabled={!audioPlaying}
        >
          <Text style={styles.controlIcon}>⏹️</Text>
          <Text style={styles.controlLabel}>
            {lang === 'tl' ? 'Ihinto' : 'Stop'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.mainButton]}
          onPress={onPlay}
        >
          <Text style={styles.mainIcon}>
            {audioPlaying ? '⏸️' : '▶️'}
          </Text>
          <Text style={styles.mainLabel}>
            {audioPlaying
              ? (lang === 'tl' ? 'I-pause' : 'Pause')
              : (lang === 'tl' ? 'Tumunog' : 'Play')
            }
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={onNext}
        >
          <Text style={styles.controlIcon}>⏭️</Text>
          <Text style={styles.controlLabel}>
            {lang === 'tl' ? 'Susunod' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Volume Control */}
      <View style={styles.volumeContainer}>
        <View style={styles.volumeHeader}>
          <Text style={styles.volumeIcon}>🔊</Text>
          <Text style={styles.volumeLabel}>
            {lang === 'tl' ? 'Lakas ng tunog:' : 'Volume:'}
          </Text>
          <Text style={styles.volumeValue}>{volumePercent}%</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={30}
          step={1}
          value={volume}
          onValueChange={onVolumeChange}
          minimumTrackTintColor="#667eea"
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor="#667eea"
        />
        <View style={styles.volumeMarkers}>
          <Text style={styles.markerText}>
            {lang === 'tl' ? 'Mahina' : 'Low'}
          </Text>
          <Text style={styles.markerText}>
            {lang === 'tl' ? 'Malakas' : 'High'}
          </Text>
        </View>
      </View>

      {/* Status Indicator */}
      <View style={[styles.statusBadge, audioPlaying && styles.statusActive]}>
        <View style={[styles.statusDot, audioPlaying && styles.dotActive]} />
        <Text style={[styles.statusText, audioPlaying && styles.statusTextActive]}>
          {audioPlaying
            ? (lang === 'tl' ? 'Tumutunog ngayon' : 'Playing now')
            : (lang === 'tl' ? 'Walang tunog' : 'Stopped')
          }
        </Text>
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
    borderBottomColor: '#F3E5F5',
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6A1B9A',
    letterSpacing: 0.5,
  },
  trackInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  trackLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  trackNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 25,
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
  },
  mainButton: {
    backgroundColor: '#667eea',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  controlIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  mainIcon: {
    fontSize: 36,
  },
  controlLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  mainLabel: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    marginTop: 4,
  },
  volumeContainer: {
    marginBottom: 15,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  volumeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  volumeLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  volumeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  volumeMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  markerText: {
    fontSize: 11,
    color: '#999',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
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
});

export default AudioPlayerControl;
