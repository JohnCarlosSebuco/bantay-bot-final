import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SpeakerService {
  constructor() {
    this.sound = null;
    this.volume = 1.0;
    this.isMuted = false;
    this.isInitialized = false;
    this.listeners = [];
  }

  /**
   * Initialize the audio system
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Load saved settings
      await this.loadSettings();

      // Load the sound file
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/Hawk.mp3'),
        {
          shouldPlay: false,
          volume: this.isMuted ? 0 : this.volume,
          isLooping: false,
        }
      );

      this.sound = sound;
      this.isInitialized = true;

      console.log('✅ SpeakerService initialized');
    } catch (error) {
      console.error('❌ SpeakerService initialization failed:', error);
    }
  }

  /**
   * Load audio settings from storage
   */
  async loadSettings() {
    try {
      const savedVolume = await AsyncStorage.getItem('volume');
      const savedMuted = await AsyncStorage.getItem('is_muted');

      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
      }
      if (savedMuted !== null) {
        this.isMuted = JSON.parse(savedMuted);
      }
    } catch (error) {
      console.log('Error loading audio settings:', error);
    }
  }

  /**
   * Set volume level (0.0 to 1.0)
   */
  async setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));

    if (this.sound && !this.isMuted) {
      await this.sound.setVolumeAsync(this.volume);
    }

    await AsyncStorage.setItem('volume', this.volume.toString());
    this.notifyListeners();
  }

  /**
   * Get current volume level
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Toggle mute status
   */
  async toggleMute() {
    this.isMuted = !this.isMuted;

    if (this.sound) {
      await this.sound.setVolumeAsync(this.isMuted ? 0 : this.volume);
    }

    await AsyncStorage.setItem('is_muted', JSON.stringify(this.isMuted));
    this.notifyListeners();
  }

  /**
   * Set mute status
   */
  async setMuted(muted) {
    this.isMuted = muted;

    if (this.sound) {
      await this.sound.setVolumeAsync(this.isMuted ? 0 : this.volume);
    }

    await AsyncStorage.setItem('is_muted', JSON.stringify(this.isMuted));
    this.notifyListeners();
  }

  /**
   * Get mute status
   */
  isMutedStatus() {
    return this.isMuted;
  }

  /**
   * Play the alert sound
   * @param {number} duration - Optional duration in milliseconds to play
   */
  async playAlert(duration = null) {
    if (!this.sound || this.isMuted) {
      console.log('🔇 Sound is muted or not initialized');
      return;
    }

    try {
      await this.sound.setVolumeAsync(this.volume);
      await this.sound.setPositionAsync(0);
      await this.sound.playAsync();

      if (duration) {
        setTimeout(async () => {
          try {
            await this.sound.pauseAsync();
          } catch (error) {
            console.log('Error pausing sound:', error);
          }
        }, duration);
      }

      console.log(`🔊 Playing alert at volume ${this.volume}`);
    } catch (error) {
      console.error('Error playing alert:', error);
    }
  }

  /**
   * Stop the currently playing sound
   */
  async stopAlert() {
    if (!this.sound) return;

    try {
      await this.sound.stopAsync();
      await this.sound.setPositionAsync(0);
    } catch (error) {
      console.error('Error stopping alert:', error);
    }
  }

  /**
   * Pause the currently playing sound
   */
  async pauseAlert() {
    if (!this.sound) return;

    try {
      await this.sound.pauseAsync();
    } catch (error) {
      console.error('Error pausing alert:', error);
    }
  }

  /**
   * Test the speaker by playing the sound
   */
  async testSpeaker() {
    console.log('🎵 Testing speaker...');
    await this.playAlert();
  }

  /**
   * Register a listener for audio setting changes
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      listener({
        volume: this.volume,
        isMuted: this.isMuted,
      });
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (error) {
        console.log('Error unloading sound:', error);
      }
      this.sound = null;
    }
    this.isInitialized = false;
    this.listeners = [];
  }

  /**
   * Get current audio state
   */
  getState() {
    return {
      volume: this.volume,
      isMuted: this.isMuted,
      isInitialized: this.isInitialized,
    };
  }
}

// Create singleton instance
const speakerService = new SpeakerService();

export default speakerService;