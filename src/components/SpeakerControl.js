import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';

const SpeakerControl = ({ volume, onVolumeChange, isMuted, onMuteToggle, style }) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [isTestPlaying, setIsTestPlaying] = useState(false);

  useEffect(() => {
    if (!isMuted) {
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
  }, [isMuted]);

  const testSpeaker = async () => {
    if (isTestPlaying) return;

    try {
      setIsTestPlaying(true);
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/Hawk.mp3'),
        { shouldPlay: true, volume: isMuted ? 0 : volume }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsTestPlaying(false);
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Test speaker error:', error);
      setIsTestPlaying(false);
    }
  };

  const getVolumeIcon = () => {
    if (isMuted) return '🔇';
    if (volume < 0.3) return '🔈';
    if (volume < 0.7) return '🔉';
    return '🔊';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>🔊 Speaker Control</Text>
        <TouchableOpacity
          style={[styles.muteButton, isMuted && styles.mutedButton]}
          onPress={onMuteToggle}
        >
          <Animated.Text style={[styles.muteIcon, { transform: [{ scale: pulseAnim }] }]}>
            {getVolumeIcon()}
          </Animated.Text>
        </TouchableOpacity>
      </View>

      <View style={styles.volumeControl}>
        <Text style={styles.label}>Volume</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.volumeText}>0%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={onVolumeChange}
            minimumTrackTintColor="#667eea"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#667eea"
            disabled={isMuted}
          />
          <Text style={styles.volumeText}>100%</Text>
        </View>
        <Text style={styles.volumePercentage}>
          {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.testButton, isTestPlaying && styles.testButtonActive]}
        onPress={testSpeaker}
        disabled={isTestPlaying}
      >
        <Text style={styles.testButtonText}>
          {isTestPlaying ? '▶️ Playing...' : '🎵 Test Speaker'}
        </Text>
      </TouchableOpacity>

      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: isMuted ? '#FF6B6B' : '#51CF66' }]} />
        <Text style={styles.statusText}>
          {isMuted ? 'Audio Muted' : 'Audio Active'}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  muteButton: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  mutedButton: {
    backgroundColor: '#FEE',
  },
  muteIcon: {
    fontSize: 24,
  },
  volumeControl: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  volumeText: {
    fontSize: 12,
    color: '#888',
    width: 35,
    textAlign: 'center',
  },
  volumePercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  testButtonActive: {
    backgroundColor: '#51CF66',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});

export default SpeakerControl;