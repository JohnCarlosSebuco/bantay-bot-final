import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HistoryService from '../services/HistoryService';
import { LocaleContext } from '../i18n/i18n';
import { useTheme } from '../theme/ThemeContext';

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return '';
  }
};

const formatDate = (ts) => {
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return '';
  }
};

const HistoryScreen = () => {
  const { lang } = useContext(LocaleContext);
  const { theme, isDark } = useTheme();
  const [motion, setMotion] = useState([]);
  const [env, setEnv] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const refresh = async () => {
    const [m, e] = await Promise.all([
      HistoryService.getMotionHistory(),
      HistoryService.getEnvHistory(),
    ]);
    setMotion(m);
    setEnv(e);
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: theme.animations.duration.slow,
      useNativeDriver: true,
    }).start();

    HistoryService.start();
    refresh();
    const onUpdate = () => refresh();
    HistoryService.on('update', onUpdate);
    return () => {
      HistoryService.off('update', onUpdate);
      HistoryService.stop();
    };
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refresh();
    setRefreshing(false);
  }, []);

  const clearAll = async () => {
    Alert.alert(
      lang === 'tl' ? 'Burahin ang Lahat' : 'Clear All',
      lang === 'tl'
        ? 'Sigurado ka bang gusto mong burahin ang lahat ng history? Hindi na ito maibabalik.'
        : 'Are you sure you want to clear all history? This cannot be undone.',
      [
        { text: lang === 'tl' ? 'Kanselahin' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'tl' ? 'Burahin' : 'Clear',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await HistoryService.clearAll();
            refresh();
          },
        },
      ]
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
    clearButton: {
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.error[50],
      borderWidth: 1,
      borderColor: theme.colors.error[200],
    },
    clearButtonText: {
      color: theme.colors.error[600],
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    content: {
      padding: theme.spacing[4],
    },
    section: {
      marginBottom: theme.spacing[4],
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing[2],
    },
    sectionBadge: {
      backgroundColor: theme.colors.primary[50],
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.full,
      marginLeft: theme.spacing[2],
    },
    sectionBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary[600],
    },
    card: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing[10],
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.background.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[3],
    },
    emptyText: {
      color: theme.colors.text.tertiary,
      fontStyle: 'italic',
      fontSize: theme.typography.fontSize.md,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.secondary,
    },
    itemIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    itemContent: {
      flex: 1,
    },
    itemLabel: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[1],
    },
    itemTime: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      fontFamily: theme.typography.fonts.mono,
    },
    itemValue: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginLeft: theme.spacing[1],
    },
    itemValues: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.spacing[1],
    },
    valueChip: {
      backgroundColor: theme.colors.background.secondary,
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.borderRadius.md,
      marginRight: theme.spacing[1],
      marginTop: theme.spacing[1],
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    valueChipText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      fontFamily: theme.typography.fonts.mono,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: theme.spacing[4],
      marginBottom: theme.spacing[4],
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.borderRadius.xl,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[1],
    },
    statLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandSection}>
              <View style={styles.brandRow}>
                <Ionicons
                  name="time"
                  size={28}
                  color={theme.colors.primary[500]}
                  style={styles.logoIcon}
                />
                <Text style={styles.title}>
                  {lang === 'tl' ? 'Kasaysayan' : 'History'}
                </Text>
              </View>
              <Text style={styles.subtitle}>
                {lang === 'tl'
                  ? 'Mga motion events at sensor logs'
                  : 'Motion events and sensor logs'}
              </Text>
            </View>
            {(motion.length > 0 || env.length > 0) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearAll}
              >
                <Text style={styles.clearButtonText}>
                  {lang === 'tl' ? 'Burahin' : 'Clear'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {/* Statistics Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{motion.length}</Text>
              <Text style={styles.statLabel}>
                {lang === 'tl' ? 'Motion' : 'Motion'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{env.length}</Text>
              <Text style={styles.statLabel}>
                {lang === 'tl' ? 'Sensor' : 'Sensor'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{motion.length + env.length}</Text>
              <Text style={styles.statLabel}>
                {lang === 'tl' ? 'Kabuuan' : 'Total'}
              </Text>
            </View>
          </View>

          {/* Motion Events Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="walk" size={20} color={theme.colors.error[500]} />
                <Text style={styles.sectionTitle}>
                  {lang === 'tl' ? 'Motion Events' : 'Motion Events'}
                </Text>
                {motion.length > 0 && (
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{motion.length}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.card}>
              {motion.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons
                      name="eye-off-outline"
                      size={32}
                      color={theme.colors.text.disabled}
                    />
                  </View>
                  <Text style={styles.emptyText}>
                    {lang === 'tl' ? 'Walang motion events pa' : 'No motion events yet'}
                  </Text>
                </View>
              ) : (
                motion.map((item, idx) => (
                  <View
                    key={`m-${idx}`}
                    style={[
                      styles.itemRow,
                      idx === motion.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View
                      style={[
                        styles.itemIconContainer,
                        { backgroundColor: theme.colors.error[50] },
                      ]}
                    >
                      <Ionicons
                        name="warning"
                        size={20}
                        color={theme.colors.error[500]}
                      />
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemLabel}>
                        {lang === 'tl' ? 'Motion nadetect' : 'Motion detected'}
                      </Text>
                      <View style={styles.itemValues}>
                        <View style={styles.valueChip}>
                          <Text style={styles.valueChipText}>
                            <Ionicons name="time-outline" size={12} />{' '}
                            {formatTime(item.timestamp)}
                          </Text>
                        </View>
                        {item.distance && (
                          <View style={styles.valueChip}>
                            <Text style={styles.valueChipText}>
                              <Ionicons name="expand-outline" size={12} />{' '}
                              {item.distance} cm
                            </Text>
                          </View>
                        )}
                        <View style={styles.valueChip}>
                          <Text style={styles.valueChipText}>
                            <Ionicons name="calendar-outline" size={12} />{' '}
                            {formatDate(item.timestamp)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Environmental Logs Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="thermometer" size={20} color={theme.colors.success[500]} />
                <Text style={styles.sectionTitle}>
                  {lang === 'tl' ? 'Sensor Logs' : 'Environmental'}
                </Text>
                {env.length > 0 && (
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{env.length}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.card}>
              {env.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons
                      name="flask-outline"
                      size={32}
                      color={theme.colors.text.disabled}
                    />
                  </View>
                  <Text style={styles.emptyText}>
                    {lang === 'tl' ? 'Walang samples pa' : 'No samples yet'}
                  </Text>
                </View>
              ) : (
                env.map((item, idx) => (
                  <View
                    key={`e-${idx}`}
                    style={[
                      styles.itemRow,
                      idx === env.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View
                      style={[
                        styles.itemIconContainer,
                        { backgroundColor: theme.colors.success[50] },
                      ]}
                    >
                      <Ionicons
                        name="analytics"
                        size={20}
                        color={theme.colors.success[500]}
                      />
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemLabel}>
                        {lang === 'tl' ? 'Sensor Reading' : 'Sensor Reading'}
                      </Text>
                      <View style={styles.itemValues}>
                        <View style={styles.valueChip}>
                          <Text style={styles.valueChipText}>
                            <Ionicons name="time-outline" size={12} />{' '}
                            {formatTime(item.timestamp)}
                          </Text>
                        </View>
                        {item.temperature !== undefined && (
                          <View style={styles.valueChip}>
                            <Text style={styles.valueChipText}>
                              <Ionicons name="thermometer-outline" size={12} />{' '}
                              {item.temperature}°C
                            </Text>
                          </View>
                        )}
                        {item.humidity !== undefined && (
                          <View style={styles.valueChip}>
                            <Text style={styles.valueChipText}>
                              <Ionicons name="water-outline" size={12} />{' '}
                              {item.humidity}%
                            </Text>
                          </View>
                        )}
                        {item.soilMoisture !== undefined && (
                          <View style={styles.valueChip}>
                            <Text style={styles.valueChipText}>
                              <Ionicons name="leaf-outline" size={12} />{' '}
                              {item.soilMoisture}
                            </Text>
                          </View>
                        )}
                        <View style={styles.valueChip}>
                          <Text style={styles.valueChipText}>
                            <Ionicons name="calendar-outline" size={12} />{' '}
                            {formatDate(item.timestamp)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

export default HistoryScreen;
