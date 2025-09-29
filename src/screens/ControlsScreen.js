import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
  Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CONFIG } from '../config/config';
import WebSocketService from '../services/WebSocketService';

const { width } = Dimensions.get('window');

const ControlsScreen = () => {
  const [isDemoMode] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [lastCommand, setLastCommand] = useState(null);
  
  // Animation refs for each button
  const buttonAnims = useRef({
    MOVE_ARMS: new Animated.Value(1),
    ROTATE_HEAD: new Animated.Value(1),
    STOP_MOVEMENT: new Animated.Value(1),
    SOUND_ALARM: new Animated.Value(1),
    TEST_BUZZER: new Animated.Value(1),
    RESET_SYSTEM: new Animated.Value(1),
    CALIBRATE_SENSORS: new Animated.Value(1),
    START_SPEAKER_ALARM: new Animated.Value(1),
    STOP_SPEAKER_ALARM: new Animated.Value(1),
    ENABLE_SPEAKER_ALARM: new Animated.Value(1),
    DISABLE_SPEAKER_ALARM: new Animated.Value(1),
    NEXT_TRACK: new Animated.Value(1),
  }).current;

  const animateButton = (command) => {
    const anim = buttonAnims[command];
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const setLoading = (command, isLoading) => {
    setLoadingStates(prev => ({ ...prev, [command]: isLoading }));
  };

  const sendCommand = async (command, confirmationMessage = null) => {
    if (confirmationMessage) {
      Alert.alert(
        'Confirm Action',
        confirmationMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            style: 'default',
            onPress: () => executeCommand(command)
          }
        ]
      );
    } else {
      executeCommand(command);
    }
  };

  const executeCommand = async (command) => {
    animateButton(command);
    setLoading(command, true);
    setLastCommand({ command, timestamp: new Date() });

    // Haptic feedback
    Vibration.vibrate(100);

    const service = WebSocketService;
    
    try {
      service.send({ command, timestamp: Date.now() });
      
      // Simulate command execution delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        '✅ Command Executed',
        `${getCommandDisplayName(command)} completed successfully!`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert(
        '❌ Command Failed',
        `Failed to execute ${getCommandDisplayName(command)}. Please try again.`,
        [{ text: 'OK', style: 'destructive' }]
      );
    } finally {
      setLoading(command, false);
    }
  };

  const getCommandDisplayName = (command) => {
    const names = {
      MOVE_ARMS: 'Arm Movement',
      ROTATE_HEAD: 'Head Rotation',
      STOP_MOVEMENT: 'Stop Movement',
      SOUND_ALARM: 'Sound Alarm',
      TEST_BUZZER: 'Buzzer Test',
      RESET_SYSTEM: 'System Reset',
      CALIBRATE_SENSORS: 'Sensor Calibration',
      START_SPEAKER_ALARM: 'Start Speaker Alarm',
      STOP_SPEAKER_ALARM: 'Stop Speaker Alarm',
      ENABLE_SPEAKER_ALARM: 'Enable Speaker Alarm',
      DISABLE_SPEAKER_ALARM: 'Disable Speaker Alarm',
      NEXT_TRACK: 'Next Track',
    };
    return names[command] || command;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const ControlButton = ({ 
    command, 
    title, 
    description, 
    icon, 
    color, 
    gradientColors, 
    confirmationMessage = null,
    style = {} 
  }) => {
    const isLoading = loadingStates[command];
    const buttonAnim = buttonAnims[command];

    return (
      <Animated.View 
        style={[
          styles.buttonContainer, 
          style,
          { transform: [{ scale: buttonAnim }] }
        ]}
      >
        <TouchableOpacity
          onPress={() => sendCommand(command, confirmationMessage)}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={gradientColors}
            style={[styles.button, isLoading && styles.buttonLoading]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>{icon}</Text>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>
                  {isLoading ? 'Processing...' : title}
                </Text>
                <Text style={styles.buttonDescription}>{description}</Text>
              </View>
            </View>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingSpinner} />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#4ECDC4']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>🎮 Remote Controls</Text>
        <Text style={styles.headerSubtitle}>Control your BantayBot</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Last Command Status */}
        {lastCommand && (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>📋 Last Command</Text>
            <Text style={styles.statusCommand}>
              {getCommandDisplayName(lastCommand.command)}
            </Text>
            <Text style={styles.statusTime}>
              Executed at {formatTime(lastCommand.timestamp)}
            </Text>
          </View>
        )}

        {/* Movement Controls Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🦾 Movement Controls</Text>
          <View style={styles.buttonRow}>
            <ControlButton
              command="MOVE_ARMS"
              title="Move Arms"
              description="Activate arm movement sequence"
              icon="🤖"
              gradientColors={['#667eea', '#764ba2']}
              style={styles.halfWidth}
            />
            <ControlButton
              command="ROTATE_HEAD"
              title="Rotate Head"
              description="Perform head rotation"
              icon="🔄"
              gradientColors={['#f093fb', '#f5576c']}
              style={styles.halfWidth}
            />
          </View>
          <ControlButton
            command="STOP_MOVEMENT"
            title="Stop Movement"
            description="Stop all servo movements immediately"
            icon="🛑"
            gradientColors={['#ffecd2', '#fcb69f']}
          />
        </View>

        {/* Alert Controls Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Alert Controls</Text>
          <View style={styles.buttonRow}>
            <ControlButton
              command="SOUND_ALARM"
              title="Sound Alarm"
              description="Trigger security alarm"
              icon="📢"
              gradientColors={['#FF6B6B', '#FF8E8E']}
              style={styles.halfWidth}
            />
            <ControlButton
              command="TEST_BUZZER"
              title="Test Buzzer"
              description="Quick buzzer test"
              icon="🔊"
              gradientColors={['#FFD93D', '#FF8E8E']}
              style={styles.halfWidth}
            />
          </View>
        </View>

        {/* Speaker Alarm Controls Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Speaker Alarm Controls</Text>
          <View style={styles.buttonRow}>
            <ControlButton
              command="START_SPEAKER_ALARM"
              title="Start Speaker"
              description="Activate speaker alarm"
              icon="▶️"
              gradientColors={['#51CF66', '#45B75A']}
              style={styles.halfWidth}
            />
            <ControlButton
              command="STOP_SPEAKER_ALARM"
              title="Stop Speaker"
              description="Stop speaker alarm"
              icon="⏹️"
              gradientColors={['#FF6B6B', '#FF4757']}
              style={styles.halfWidth}
            />
          </View>
          <View style={styles.buttonRow}>
            <ControlButton
              command="ENABLE_SPEAKER_ALARM"
              title="Enable Auto"
              description="Auto-alarm on motion"
              icon="✅"
              gradientColors={['#4ECDC4', '#3ABDB4']}
              style={styles.halfWidth}
            />
            <ControlButton
              command="DISABLE_SPEAKER_ALARM"
              title="Disable Auto"
              description="Manual control only"
              icon="❌"
              gradientColors={['#FFA07A', '#FF8C69']}
              style={styles.halfWidth}
            />
          </View>
          <ControlButton
            command="NEXT_TRACK"
            title="Next Sound Track"
            description="Switch to next alarm sound"
            icon="⏭️"
            gradientColors={['#9B59B6', '#8E44AD']}
          />
        </View>

        {/* System Controls Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ System Controls</Text>
          <ControlButton
            command="CALIBRATE_SENSORS"
            title="Calibrate Sensors"
            description="Recalibrate all sensor readings"
            icon="🎯"
            gradientColors={['#4facfe', '#00f2fe']}
          />
          <ControlButton
            command="RESET_SYSTEM"
            title="Reset System"
            description="Restart the entire system"
            icon="🔄"
            gradientColors={['#fa709a', '#fee140']}
            confirmationMessage="This will restart the entire BantayBot system. Are you sure you want to continue?"
          />
        </View>

        {/* Emergency Section */}
        <View style={[styles.section, styles.emergencySection]}>
          <Text style={styles.emergencyTitle}>🆘 Emergency Controls</Text>
          <Text style={styles.emergencyDescription}>
            Use these controls only in emergency situations
          </Text>
          <ControlButton
            command="STOP_MOVEMENT"
            title="Emergency Stop"
            description="Immediately stop all operations"
            icon="🚨"
            gradientColors={['#FF4757', '#FF3742']}
            confirmationMessage="This will immediately stop all BantayBot operations. Continue?"
          />
        </View>
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    padding: 15,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  statusCommand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 2,
  },
  statusTime: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    color: '#333',
  },
  emergencySection: {
    backgroundColor: '#FFF5F5',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFE0E0',
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#FF4757',
  },
  emergencyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  buttonContainer: {
    marginBottom: 15,
  },
  halfWidth: {
    width: (width - 45) / 2,
  },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  buttonIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    animation: 'spin 1s linear infinite',
  },
});

export default ControlsScreen;