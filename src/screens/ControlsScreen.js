import React, { useState, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CONFIG } from '../config/config';
import WebSocketService from '../services/WebSocketService';
import { LocaleContext } from '../i18n/i18n';
import { useTheme } from '../theme/ThemeContext';

const ControlsScreen = () => {
  const { lang } = useContext(LocaleContext);
  const { theme, isDark } = useTheme();
  const [loadingStates, setLoadingStates] = useState({});
  const [lastCommand, setLastCommand] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: theme.animations.duration.slow,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const setLoading = (command, isLoading) => {
    setLoadingStates(prev => ({ ...prev, [command]: isLoading }));
  };

  const sendCommand = async (command, confirmationMessage = null) => {
    if (confirmationMessage) {
      Alert.alert(
        lang === 'tl' ? 'Kumpirmahin ang Aksyon' : 'Confirm Action',
        confirmationMessage,
        [
          { text: lang === 'tl' ? 'Kanselahin' : 'Cancel', style: 'cancel' },
          {
            text: lang === 'tl' ? 'Kumpirmahin' : 'Confirm',
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
    setLoading(command, true);
    setLastCommand({ command, timestamp: new Date() });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const service = WebSocketService;

    try {
      service.send({ command, timestamp: Date.now() });

      await new Promise(resolve => setTimeout(resolve, 800));

      Alert.alert(
        lang === 'tl' ? 'Tagumpay' : 'Success',
        `${getCommandDisplayName(command)} ${lang === 'tl' ? 'matagumpay na naisakatuparan!' : 'completed successfully!'}`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert(
        lang === 'tl' ? 'Nabigo' : 'Failed',
        `${lang === 'tl' ? 'Nabigong isagawa ang' : 'Failed to execute'} ${getCommandDisplayName(command)}. ${lang === 'tl' ? 'Subukan muli.' : 'Please try again.'}`,
        [{ text: 'OK', style: 'destructive' }]
      );
    } finally {
      setLoading(command, false);
    }
  };

  const getCommandDisplayName = (command) => {
    if (lang === 'tl') {
      const namesTl = {
        MOVE_ARMS: 'Galaw ng Braso',
        ROTATE_HEAD: 'Ikot ng Ulo',
        STOP_MOVEMENT: 'Ihinto ang Galaw',
        SOUND_ALARM: 'Tugtog ng Alarm',
        TEST_BUZZER: 'Test ng Buzzer',
        RESET_SYSTEM: 'I-reset ang Sistema',
        CALIBRATE_SENSORS: 'Calibrate ng Sensor'
      };
      return namesTl[command] || command;
    }
    const names = {
      MOVE_ARMS: 'Arm Movement',
      ROTATE_HEAD: 'Head Rotation',
      STOP_MOVEMENT: 'Stop Movement',
      SOUND_ALARM: 'Sound Alarm',
      TEST_BUZZER: 'Buzzer Test',
      RESET_SYSTEM: 'System Reset',
      CALIBRATE_SENSORS: 'Sensor Calibration'
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
    iconColor,
    confirmationMessage = null,
    style = {}
  }) => {
    const isLoading = loadingStates[command];
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={[styles.buttonContainer, style, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={() => sendCommand(command, confirmationMessage)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <View style={[styles.button, isLoading && styles.buttonLoading]}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
              <Ionicons name={icon} size={24} color={iconColor} />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>
                {isLoading ? (lang === 'tl' ? 'Pinoproseso...' : 'Processing...') : title}
              </Text>
              <Text style={styles.buttonDescription}>{description}</Text>
            </View>
            <Ionicons
              name={isLoading ? "hourglass-outline" : "chevron-forward"}
              size={20}
              color={theme.colors.text.tertiary}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    header: {
      paddingTop: 60,
      paddingBottom: theme.spacing[6],
      paddingHorizontal: theme.spacing[4],
      backgroundColor: theme.colors.background.primary,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    brandSection: {
      flex: 1,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[1],
    },
    logoIcon: {
      marginRight: theme.spacing[2],
    },
    title: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    content: {
      padding: theme.spacing[4],
    },
    lastCommandCard: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[4],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary[500],
    },
    lastCommandHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    lastCommandTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginLeft: theme.spacing[2],
    },
    lastCommandName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[1],
    },
    lastCommandTime: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      fontFamily: theme.typography.fonts.mono,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
      marginTop: theme.spacing[2],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing[2],
    },
    buttonContainer: {
      marginBottom: theme.spacing[3],
    },
    button: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      flexDirection: 'row',
      alignItems: 'center',
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    buttonLoading: {
      opacity: 0.6,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    buttonTextContainer: {
      flex: 1,
    },
    buttonTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[1],
    },
    buttonDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    emergencySection: {
      backgroundColor: theme.colors.error[50],
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginTop: theme.spacing[4],
      marginBottom: theme.spacing[6],
      borderWidth: 2,
      borderColor: theme.colors.error[200],
    },
    emergencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    emergencyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.error[700],
      marginLeft: theme.spacing[2],
    },
    emergencyDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error[600],
      marginBottom: theme.spacing[3],
      fontStyle: 'italic',
    },
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary[500]}
          colors={[theme.colors.primary[500]]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandSection}>
              <View style={styles.brandRow}>
                <Ionicons
                  name="game-controller"
                  size={28}
                  color={theme.colors.primary[500]}
                  style={styles.logoIcon}
                />
                <Text style={styles.title}>
                  {lang === 'tl' ? 'Mga Kontrol' : 'Remote Controls'}
                </Text>
              </View>
              <Text style={styles.subtitle}>
                {lang === 'tl' ? 'Kontrolin ang iyong BantayBot' : 'Control your BantayBot'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Last Command Status */}
          {lastCommand && (
            <View style={styles.lastCommandCard}>
              <View style={styles.lastCommandHeader}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary[500]} />
                <Text style={styles.lastCommandTitle}>
                  {lang === 'tl' ? 'Huling Utos' : 'Last Command'}
                </Text>
              </View>
              <Text style={styles.lastCommandName}>
                {getCommandDisplayName(lastCommand.command)}
              </Text>
              <Text style={styles.lastCommandTime}>
                {lang === 'tl' ? 'Isinagawa noong' : 'Executed at'} {formatTime(lastCommand.timestamp)}
              </Text>
            </View>
          )}

          {/* Movement Controls Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="move" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.sectionTitle}>
              {lang === 'tl' ? 'Mga Kontrol ng Galaw' : 'Movement Controls'}
            </Text>
          </View>

          <ControlButton
            command="MOVE_ARMS"
            title={lang === 'tl' ? 'Galawin ang Braso' : 'Move Arms'}
            description={lang === 'tl' ? 'Simulan ang paggalaw ng braso' : 'Activate arm movement sequence'}
            icon="hand-left-outline"
            iconColor={theme.colors.primary[500]}
          />

          <ControlButton
            command="ROTATE_HEAD"
            title={lang === 'tl' ? 'Ikutin ang Ulo' : 'Rotate Head'}
            description={lang === 'tl' ? 'Isagawa ang pag-ikot ng ulo' : 'Perform head rotation'}
            icon="reload-circle-outline"
            iconColor={theme.colors.info[500]}
          />

          <ControlButton
            command="STOP_MOVEMENT"
            title={lang === 'tl' ? 'Ihinto ang Galaw' : 'Stop Movement'}
            description={lang === 'tl' ? 'Ihinto kaagad ang lahat ng galaw' : 'Stop all servo movements immediately'}
            icon="stop-circle-outline"
            iconColor={theme.colors.warning[500]}
          />

          {/* Alert Controls Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={20} color={theme.colors.error[500]} />
            <Text style={styles.sectionTitle}>
              {lang === 'tl' ? 'Mga Kontrol ng Alarm' : 'Alert Controls'}
            </Text>
          </View>

          <ControlButton
            command="SOUND_ALARM"
            title={lang === 'tl' ? 'Tumugtog ng Alarm' : 'Sound Alarm'}
            description={lang === 'tl' ? 'I-trigger ang alarm ng seguridad' : 'Trigger security alarm'}
            icon="megaphone-outline"
            iconColor={theme.colors.error[500]}
          />

          <ControlButton
            command="TEST_BUZZER"
            title={lang === 'tl' ? 'Test ng Buzzer' : 'Test Buzzer'}
            description={lang === 'tl' ? 'Mabilis na pagsubok ng buzzer' : 'Quick buzzer test'}
            icon="volume-high-outline"
            iconColor={theme.colors.warning[500]}
          />

          {/* System Controls Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={20} color={theme.colors.success[500]} />
            <Text style={styles.sectionTitle}>
              {lang === 'tl' ? 'Mga Kontrol ng Sistema' : 'System Controls'}
            </Text>
          </View>

          <ControlButton
            command="CALIBRATE_SENSORS"
            title={lang === 'tl' ? 'I-calibrate ang Sensor' : 'Calibrate Sensors'}
            description={lang === 'tl' ? 'I-calibrate muli ang lahat ng sensor' : 'Recalibrate all sensor readings'}
            icon="construct-outline"
            iconColor={theme.colors.success[500]}
          />

          <ControlButton
            command="RESET_SYSTEM"
            title={lang === 'tl' ? 'I-reset ang Sistema' : 'Reset System'}
            description={lang === 'tl' ? 'I-restart ang buong sistema' : 'Restart the entire system'}
            icon="refresh-circle-outline"
            iconColor={theme.colors.info[500]}
            confirmationMessage={lang === 'tl'
              ? 'Ire-restart nito ang buong BantayBot system. Sigurado ka ba na magpatuloy?'
              : 'This will restart the entire BantayBot system. Are you sure you want to continue?'}
          />

          {/* Emergency Section */}
          <View style={styles.emergencySection}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="warning" size={24} color={theme.colors.error[600]} />
              <Text style={styles.emergencyTitle}>
                {lang === 'tl' ? 'Emergency na Kontrol' : 'Emergency Controls'}
              </Text>
            </View>
            <Text style={styles.emergencyDescription}>
              {lang === 'tl'
                ? 'Gamitin lamang ang mga kontrol na ito sa emergency na sitwasyon'
                : 'Use these controls only in emergency situations'}
            </Text>
            <ControlButton
              command="STOP_MOVEMENT"
              title={lang === 'tl' ? 'Emergency Stop' : 'Emergency Stop'}
              description={lang === 'tl' ? 'Ihinto kaagad ang lahat ng operasyon' : 'Immediately stop all operations'}
              icon="alert-circle-outline"
              iconColor={theme.colors.error[600]}
              confirmationMessage={lang === 'tl'
                ? 'Ihihinto kaagad nito ang lahat ng BantayBot operations. Magpatuloy?'
                : 'This will immediately stop all BantayBot operations. Continue?'}
            />
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

export default ControlsScreen;
