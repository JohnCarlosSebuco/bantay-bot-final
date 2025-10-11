import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const StatusIndicator = ({
  status = 'good',  // 'good', 'warning', 'danger', 'info'
  label,
  value,
  icon,
  lang = 'tl',
  size = 'medium',  // 'small', 'medium', 'large'
  animated = true, // Enable pulsing animation for live status
  style
}) => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: theme.animations.duration.moderate,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pulse animation for live status
  useEffect(() => {
    if (animated && (status === 'good' || status === 'danger')) {
      const pulseAnimation = Animated.loop(
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
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    }
  }, [status, animated]);

  const getStatusConfig = () => {
    switch (status) {
      case 'good':
        return {
          color: theme.colors.success[500],
          bgColor: theme.colors.success[50],
          borderColor: theme.colors.success[500],
          statusIcon: '✅',
          statusText: lang === 'tl' ? 'Mabuti' : 'Good'
        };
      case 'warning':
        return {
          color: theme.colors.warning[500],
          bgColor: theme.colors.warning[50],
          borderColor: theme.colors.warning[500],
          statusIcon: '⚠️',
          statusText: lang === 'tl' ? 'Bantayan' : 'Warning'
        };
      case 'danger':
        return {
          color: theme.colors.error[500],
          bgColor: theme.colors.error[50],
          borderColor: theme.colors.error[500],
          statusIcon: '🔴',
          statusText: lang === 'tl' ? 'Panganib' : 'Danger'
        };
      case 'info':
        return {
          color: theme.colors.info[500],
          bgColor: theme.colors.info[50],
          borderColor: theme.colors.info[500],
          statusIcon: 'ℹ️',
          statusText: lang === 'tl' ? 'Impormasyon' : 'Info'
        };
      default:
        return {
          color: theme.colors.text.secondary,
          bgColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.primary,
          statusIcon: '⭕',
          statusText: lang === 'tl' ? 'Normal' : 'Normal'
        };
    }
  };

  const config = getStatusConfig();

  const sizeConfig = {
    small: {
      padding: theme.spacing[2],
      iconSize: theme.typography.fontSize['2xl'],
      labelSize: theme.typography.fontSize.xs,
      valueSize: theme.typography.fontSize.md,
      statusSize: theme.typography.fontSize.xs,
      borderRadius: theme.borderRadius.md,
    },
    medium: {
      padding: theme.spacing[3],
      iconSize: theme.typography.fontSize['4xl'],
      labelSize: theme.typography.fontSize.sm,
      valueSize: theme.typography.fontSize.xl,
      statusSize: theme.typography.fontSize.sm,
      borderRadius: theme.borderRadius.lg,
    },
    large: {
      padding: theme.spacing[4],
      iconSize: theme.typography.fontSize['5xl'],
      labelSize: theme.typography.fontSize.md,
      valueSize: theme.typography.fontSize['2xl'],
      statusSize: theme.typography.fontSize.md,
      borderRadius: theme.borderRadius.xl,
    },
  };

  const sizeStyle = sizeConfig[size];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderLeftColor: config.borderColor,
          borderLeftWidth: 4,
          borderRadius: sizeStyle.borderRadius,
          padding: sizeStyle.padding,
          ...theme.shadows.sm,
          opacity: fadeAnim,
        },
        style
      ]}
    >
      {icon && (
        <Animated.Text
          style={[
            styles.icon,
            {
              fontSize: sizeStyle.iconSize,
              marginRight: theme.spacing[3],
              transform: [{ scale: pulseAnim }],
            }
          ]}
        >
          {icon}
        </Animated.Text>
      )}

      <View style={styles.content}>
        {label && (
          <Text style={[
            styles.label,
            {
              fontSize: sizeStyle.labelSize,
              color: theme.colors.text.secondary,
              fontWeight: theme.typography.fontWeight.medium,
              marginBottom: theme.spacing[1],
            }
          ]}>
            {label}
          </Text>
        )}

        {value && (
          <Text style={[
            styles.value,
            {
              fontSize: sizeStyle.valueSize,
              color: config.color,
              fontWeight: theme.typography.fontWeight.bold,
              marginBottom: theme.spacing[1],
            }
          ]}>
            {value}
          </Text>
        )}

        <View style={styles.statusBadge}>
          <Animated.Text
            style={[
              styles.statusIcon,
              {
                fontSize: sizeStyle.statusSize,
                marginRight: theme.spacing[1],
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            {config.statusIcon}
          </Animated.Text>
          <Text style={[
            styles.statusText,
            {
              fontSize: sizeStyle.statusSize,
              color: config.color,
              fontWeight: theme.typography.fontWeight.semibold,
            }
          ]}>
            {config.statusText}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    // Styles applied dynamically
  },
  value: {
    // Styles applied dynamically
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    // Styles applied dynamically
  },
  statusText: {
    // Styles applied dynamically
  },
});

export default StatusIndicator;
