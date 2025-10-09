import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const QuickActionButton = ({
  icon,
  label,
  sublabel,
  color,
  gradient,
  onPress,
  disabled = false,
  size = 'medium',  // 'small', 'medium', 'large'
  variant = 'solid', // 'solid', 'outline', 'ghost'
  loading = false,
  style
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Determine button color
  const buttonColor = color || theme.colors.primary[500];
  const buttonGradient = gradient || [buttonColor, buttonColor];

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.96,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress?.();
    }
  };

  const sizeConfig = {
    small: {
      padding: theme.spacing[3],
      minHeight: 50,
      iconSize: theme.typography.fontSize['3xl'],
      labelSize: theme.typography.fontSize.sm,
      sublabelSize: theme.typography.fontSize.xs,
      borderRadius: theme.borderRadius.components.button.sm,
    },
    medium: {
      padding: theme.spacing[4],
      minHeight: 60,
      iconSize: theme.typography.fontSize['4xl'],
      labelSize: theme.typography.fontSize.md,
      sublabelSize: theme.typography.fontSize.sm,
      borderRadius: theme.borderRadius.components.button.md,
    },
    large: {
      padding: theme.spacing[5],
      minHeight: 80,
      iconSize: theme.typography.fontSize['5xl'],
      labelSize: theme.typography.fontSize.lg,
      sublabelSize: theme.typography.fontSize.md,
      borderRadius: theme.borderRadius.components.button.lg,
    },
  };

  const config = sizeConfig[size];

  const buttonStyles = [
    styles.button,
    {
      padding: config.padding,
      minHeight: config.minHeight,
      borderRadius: config.borderRadius,
      ...theme.shadows.md,
    },
    disabled && { opacity: 0.5 },
    style
  ];

  const renderContent = () => (
    <>
      {icon && (
        <Text style={[styles.icon, { fontSize: config.iconSize }]}>
          {icon}
        </Text>
      )}

      <View style={styles.textContainer}>
        <Text style={[
          styles.label,
          {
            fontSize: config.labelSize,
            fontWeight: theme.typography.fontWeight.bold,
            color: variant === 'outline' || variant === 'ghost' ? buttonColor : theme.colors.neutral[0],
          }
        ]}>
          {loading ? 'Loading...' : label}
        </Text>

        {sublabel && !loading && (
          <Text style={[
            styles.sublabel,
            {
              fontSize: config.sublabelSize,
              color: variant === 'outline' || variant === 'ghost'
                ? theme.colors.text.secondary
                : theme.colors.neutral[0],
              opacity: 0.9,
              marginTop: theme.spacing[1],
            }
          ]}>
            {sublabel}
          </Text>
        )}
      </View>
    </>
  );

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        style
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {variant === 'solid' ? (
          <LinearGradient
            colors={buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={buttonStyles}
          >
            <Animated.View style={[
              styles.content,
              { opacity: opacityAnim }
            ]}>
              {renderContent()}
            </Animated.View>
          </LinearGradient>
        ) : (
          <Animated.View
            style={[
              buttonStyles,
              { opacity: opacityAnim },
              variant === 'outline' && {
                borderWidth: 2,
                borderColor: buttonColor,
                backgroundColor: 'transparent',
              },
              variant === 'ghost' && {
                backgroundColor: theme.colors.neutral[100],
              },
            ]}
          >
            {renderContent()}
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  sublabel: {
    textAlign: 'center',
  },
});

export default QuickActionButton;
