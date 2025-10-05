import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

const QuickActionButton = ({
  icon,
  label,
  sublabel,
  color = '#667eea',
  onPress,
  disabled = false,
  size = 'medium',  // 'small', 'medium', 'large'
  style
}) => {
  const sizeStyles = {
    small: {
      button: styles.buttonSmall,
      icon: styles.iconSmall,
      label: styles.labelSmall,
      sublabel: styles.sublabelSmall,
    },
    medium: {
      button: styles.buttonMedium,
      icon: styles.iconMedium,
      label: styles.labelMedium,
      sublabel: styles.sublabelMedium,
    },
    large: {
      button: styles.buttonLarge,
      icon: styles.iconLarge,
      label: styles.labelLarge,
      sublabel: styles.sublabelLarge,
    },
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyles[size].button,
        { backgroundColor: disabled ? '#E0E0E0' : color },
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {icon && (
        <Text style={[styles.icon, sizeStyles[size].icon]}>
          {icon}
        </Text>
      )}

      <View style={styles.textContainer}>
        <Text style={[styles.label, sizeStyles[size].label]}>
          {label}
        </Text>

        {sublabel && (
          <Text style={[styles.sublabel, sizeStyles[size].sublabel]}>
            {sublabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonSmall: {
    padding: 10,
    minHeight: 50,
  },
  buttonMedium: {
    padding: 15,
    minHeight: 60,
  },
  buttonLarge: {
    padding: 20,
    minHeight: 80,
  },
  icon: {
    marginRight: 10,
  },
  iconSmall: {
    fontSize: 24,
  },
  iconMedium: {
    fontSize: 32,
  },
  iconLarge: {
    fontSize: 40,
  },
  textContainer: {
    alignItems: 'center',
  },
  label: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  labelSmall: {
    fontSize: 12,
  },
  labelMedium: {
    fontSize: 16,
  },
  labelLarge: {
    fontSize: 20,
  },
  sublabel: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    textAlign: 'center',
  },
  sublabelSmall: {
    fontSize: 10,
  },
  sublabelMedium: {
    fontSize: 12,
  },
  sublabelLarge: {
    fontSize: 14,
  },
});

export default QuickActionButton;
