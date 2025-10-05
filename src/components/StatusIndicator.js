import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatusIndicator = ({
  status = 'good',  // 'good', 'warning', 'danger', 'info'
  label,
  value,
  icon,
  lang = 'tl',
  size = 'medium',  // 'small', 'medium', 'large'
  style
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'good':
        return {
          color: '#51CF66',
          bgColor: '#E8F5E9',
          borderColor: '#51CF66',
          statusIcon: '✅',
          statusText: lang === 'tl' ? 'Mabuti' : 'Good'
        };
      case 'warning':
        return {
          color: '#FFA94D',
          bgColor: '#FFF4E6',
          borderColor: '#FFA94D',
          statusIcon: '⚠️',
          statusText: lang === 'tl' ? 'Bantayan' : 'Warning'
        };
      case 'danger':
        return {
          color: '#FF6B6B',
          bgColor: '#FFE5E5',
          borderColor: '#FF6B6B',
          statusIcon: '🔴',
          statusText: lang === 'tl' ? 'Panganib' : 'Danger'
        };
      case 'info':
        return {
          color: '#339AF0',
          bgColor: '#E3F2FD',
          borderColor: '#339AF0',
          statusIcon: 'ℹ️',
          statusText: lang === 'tl' ? 'Impormasyon' : 'Info'
        };
      default:
        return {
          color: '#666',
          bgColor: '#F5F5F5',
          borderColor: '#E0E0E0',
          statusIcon: '⭕',
          statusText: lang === 'tl' ? 'Normal' : 'Normal'
        };
    }
  };

  const config = getStatusConfig();

  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      icon: styles.iconSmall,
      label: styles.labelSmall,
      value: styles.valueSmall,
      status: styles.statusSmall,
    },
    medium: {
      container: styles.containerMedium,
      icon: styles.iconMedium,
      label: styles.labelMedium,
      value: styles.valueMedium,
      status: styles.statusMedium,
    },
    large: {
      container: styles.containerLarge,
      icon: styles.iconLarge,
      label: styles.labelLarge,
      value: styles.valueLarge,
      status: styles.statusLarge,
    },
  };

  return (
    <View
      style={[
        styles.container,
        sizeStyles[size].container,
        {
          backgroundColor: config.bgColor,
          borderLeftColor: config.borderColor,
        },
        style
      ]}
    >
      {icon && (
        <Text style={[styles.icon, sizeStyles[size].icon]}>
          {icon}
        </Text>
      )}

      <View style={styles.content}>
        {label && (
          <Text style={[styles.label, sizeStyles[size].label]}>
            {label}
          </Text>
        )}

        {value && (
          <Text style={[styles.value, sizeStyles[size].value, { color: config.color }]}>
            {value}
          </Text>
        )}

        <View style={styles.statusBadge}>
          <Text style={[styles.statusIcon, sizeStyles[size].status]}>
            {config.statusIcon}
          </Text>
          <Text style={[styles.statusText, sizeStyles[size].status, { color: config.color }]}>
            {config.statusText}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 12,
    marginVertical: 6,
  },
  containerSmall: {
    padding: 8,
  },
  containerMedium: {
    padding: 12,
  },
  containerLarge: {
    padding: 16,
  },
  icon: {
    marginRight: 12,
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
  content: {
    flex: 1,
  },
  label: {
    color: '#666',
    marginBottom: 4,
  },
  labelSmall: {
    fontSize: 12,
  },
  labelMedium: {
    fontSize: 14,
  },
  labelLarge: {
    fontSize: 16,
  },
  value: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  valueSmall: {
    fontSize: 16,
  },
  valueMedium: {
    fontSize: 20,
  },
  valueLarge: {
    fontSize: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontWeight: '600',
  },
  statusSmall: {
    fontSize: 10,
  },
  statusMedium: {
    fontSize: 12,
  },
  statusLarge: {
    fontSize: 14,
  },
});

export default StatusIndicator;
