import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import predictionService from '../services/PredictionService';
import cropDataService from '../services/CropDataService';
import { LocaleContext } from '../i18n/i18n';
import { useTheme } from '../theme/ThemeContext';

const AnalyticsScreen = ({ navigation }) => {
  const { lang } = useContext(LocaleContext);
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [harvestPrediction, setHarvestPrediction] = useState(null);
  const [yieldPrediction, setYieldPrediction] = useState(null);
  const [yieldImpact, setYieldImpact] = useState(null);
  const [cropData, setCropData] = useState(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: theme.animations.duration.slow,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async () => {
    try {
      const crop = await cropDataService.getCropData();
      setCropData(crop);

      if (crop && crop.plantingDate) {
        const avgYield = await cropDataService.getAverageYield(crop.cropType);

        const harvestPred = await predictionService.predictHarvestDate(
          crop.plantingDate,
          crop.cropType
        );
        setHarvestPrediction(harvestPred);

        const yieldPred = await predictionService.predictYield(
          crop.plantingDate,
          crop.cropType,
          crop.plotSize || 100,
          avgYield || crop.expectedYield || 100
        );
        setYieldPrediction(yieldPred);

        const impact = await predictionService.calculateYieldImpact(
          crop.plantingDate,
          crop.cropType
        );
        setYieldImpact(impact);

        const insightsData = await predictionService.generateInsights(
          crop.plantingDate,
          crop.cropType,
          crop.plotSize || 100,
          avgYield || crop.expectedYield || 100
        );
        setInsights(insightsData.insights);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return theme.colors.success[500];
    if (confidence === 'medium') return theme.colors.warning[500];
    return theme.colors.error[500];
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return theme.colors.error[500];
    if (priority === 'medium') return theme.colors.warning[500];
    return theme.colors.info[500];
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
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing[10],
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing[4],
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[2],
      textAlign: 'center',
    },
    emptyText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: theme.spacing[6],
      lineHeight: 22,
    },
    setupButton: {
      backgroundColor: theme.colors.primary[500],
      borderRadius: theme.borderRadius.xl,
      paddingVertical: theme.spacing[4],
      paddingHorizontal: theme.spacing[8],
      ...theme.shadows.md,
    },
    setupButtonText: {
      color: 'white',
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    section: {
      marginBottom: theme.spacing[4],
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing[3],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing[2],
    },
    insightCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[3],
      borderLeftWidth: 4,
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    insightIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing[3],
    },
    insightContent: {
      flex: 1,
    },
    insightTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[1],
    },
    insightMessage: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    card: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[5],
      marginBottom: theme.spacing[4],
      ...theme.shadows.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[4],
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    confidenceBadge: {
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
      borderRadius: theme.borderRadius.full,
    },
    confidenceText: {
      color: 'white',
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bigStat: {
      alignItems: 'center',
      marginBottom: theme.spacing[5],
    },
    bigNumber: {
      fontSize: 72,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary[500],
      letterSpacing: -2,
    },
    bigLabel: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing[2],
      fontWeight: theme.typography.fontWeight.medium,
    },
    progressBarContainer: {
      marginBottom: theme.spacing[4],
    },
    progressBar: {
      height: 12,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
      marginBottom: theme.spacing[2],
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.success[500],
      borderRadius: theme.borderRadius.full,
    },
    progressText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      fontWeight: theme.typography.fontWeight.medium,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: theme.spacing[4],
      paddingTop: theme.spacing[4],
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.secondary,
    },
    statItem: {
      alignItems: 'center',
    },
    statLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing[1],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    dateText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary[500],
      textAlign: 'center',
      fontWeight: theme.typography.fontWeight.semibold,
      backgroundColor: theme.colors.primary[50],
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
    },
    yieldComparison: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginBottom: theme.spacing[4],
    },
    yieldBox: {
      alignItems: 'center',
      flex: 1,
    },
    yieldLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing[2],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    yieldValue: {
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    yieldArrow: {
      marginHorizontal: theme.spacing[3],
    },
    changeCard: {
      padding: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing[4],
    },
    changeText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: 'center',
    },
    scoreCircle: {
      alignSelf: 'center',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: theme.colors.background.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing[5],
      borderWidth: 8,
      borderColor: theme.colors.primary[500],
      ...theme.shadows.lg,
    },
    scoreNumber: {
      fontSize: 56,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.primary[500],
      letterSpacing: -2,
    },
    scoreMax: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.text.tertiary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    factorsContainer: {
      marginBottom: theme.spacing[4],
    },
    factorRow: {
      marginBottom: theme.spacing[4],
    },
    factorHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing[2],
    },
    factorLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    factorValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    factorBar: {
      height: 8,
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },
    factorFill: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
    },
    daysInfo: {
      backgroundColor: theme.colors.background.secondary,
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.lg,
    },
    daysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing[2],
    },
    daysLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    daysValue: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    actionsCard: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[6],
      ...theme.shadows.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    actionsTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[3],
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing[2],
    },
    actionButton: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[3],
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing[1],
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary[500],
      marginLeft: theme.spacing[2],
    },
  });

  if (!cropData || !cropData.plantingDate) {
    return (
      <ScrollView style={styles.container}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.brandSection}>
                <View style={styles.brandRow}>
                  <Ionicons
                    name="analytics"
                    size={28}
                    color={theme.colors.primary[500]}
                    style={styles.logoIcon}
                  />
                  <Text style={styles.title}>
                    {lang === 'tl' ? 'Analytics' : 'Analytics'}
                  </Text>
                </View>
                <Text style={styles.subtitle}>
                  {lang === 'tl' ? 'Katalinuhan ng Sakahan' : 'Farm Intelligence'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="leaf-outline" size={60} color={theme.colors.primary[500]} />
            </View>
            <Text style={styles.emptyTitle}>
              {lang === 'tl' ? 'Walang Data ng Pananim' : 'No Crop Data Yet'}
            </Text>
            <Text style={styles.emptyText}>
              {lang === 'tl'
                ? 'I-setup ang impormasyon ng iyong pananim upang makita ang mga hula at insights'
                : 'Set up your crop information to see predictions and insights'}
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('HarvestPlanner');
              }}
            >
              <Text style={styles.setupButtonText}>
                {lang === 'tl' ? 'I-setup ang Data' : 'Setup Crop Data'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    );
  }

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
                  name="analytics"
                  size={28}
                  color={theme.colors.primary[500]}
                  style={styles.logoIcon}
                />
                <Text style={styles.title}>
                  {lang === 'tl' ? 'Analytics' : 'Analytics'}
                </Text>
              </View>
              <Text style={styles.subtitle}>
                {cropData.cropType
                  ? cropData.cropType.charAt(0).toUpperCase() + cropData.cropType.slice(1)
                  : (lang === 'tl' ? 'Insights ng Pananim' : 'Crop Insights')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Key Insights */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb" size={20} color={theme.colors.warning[500]} />
                <Text style={styles.sectionTitle}>
                  {lang === 'tl' ? 'Mahahalagang Insights' : 'Key Insights'}
                </Text>
              </View>
              {insights.map((insight, index) => (
                <View
                  key={index}
                  style={[
                    styles.insightCard,
                    { borderLeftColor: getPriorityColor(insight.priority) },
                  ]}
                >
                  <View style={[styles.insightIconContainer, { backgroundColor: getPriorityColor(insight.priority) + '15' }]}>
                    <Text style={{ fontSize: 24 }}>{insight.icon}</Text>
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightMessage}>{insight.message}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Harvest Prediction Card */}
          {harvestPrediction && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="calendar-outline" size={24} color={theme.colors.primary[500]} style={{ marginRight: theme.spacing[2] }} />
                  <Text style={styles.cardTitle}>
                    {lang === 'tl' ? 'Hula sa Ani' : 'Harvest Prediction'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.confidenceBadge,
                    { backgroundColor: getConfidenceColor(harvestPrediction.confidence) },
                  ]}
                >
                  <Text style={styles.confidenceText}>
                    {harvestPrediction.confidence}
                  </Text>
                </View>
              </View>

              <View style={styles.bigStat}>
                <Text style={styles.bigNumber}>{harvestPrediction.daysRemaining}</Text>
                <Text style={styles.bigLabel}>
                  {lang === 'tl' ? 'Araw Bago ang Ani' : 'Days to Harvest'}
                </Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${harvestPrediction.readinessPercent}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {harvestPrediction.readinessPercent.toFixed(0)}% {lang === 'tl' ? 'Handa' : 'Ready'}
                </Text>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>
                    {lang === 'tl' ? 'GDD Nakolekta' : 'GDD Accumulated'}
                  </Text>
                  <Text style={styles.statValue}>
                    {harvestPrediction.accumulatedGDD.toFixed(0)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>
                    {lang === 'tl' ? 'GDD Kailangan' : 'GDD Required'}
                  </Text>
                  <Text style={styles.statValue}>
                    {harvestPrediction.requiredGDD}
                  </Text>
                </View>
              </View>

              <Text style={styles.dateText}>
                {lang === 'tl' ? 'Tinatayang Ani:' : 'Est. Harvest:'}{' '}
                {new Date(harvestPrediction.harvestDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Yield Prediction Card */}
          {yieldPrediction && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="trending-up-outline" size={24} color={theme.colors.success[500]} style={{ marginRight: theme.spacing[2] }} />
                  <Text style={styles.cardTitle}>
                    {lang === 'tl' ? 'Hula sa Ani' : 'Yield Prediction'}
                  </Text>
                </View>
              </View>

              <View style={styles.yieldComparison}>
                <View style={styles.yieldBox}>
                  <Text style={styles.yieldLabel}>
                    {lang === 'tl' ? 'Hinuha' : 'Predicted'}
                  </Text>
                  <Text style={styles.yieldValue}>
                    {yieldPrediction.predictedYield}
                  </Text>
                  <Text style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary, marginTop: theme.spacing[1] }}>kg</Text>
                </View>
                <Ionicons name="arrow-forward" size={24} color={theme.colors.primary[500]} style={styles.yieldArrow} />
                <View style={styles.yieldBox}>
                  <Text style={styles.yieldLabel}>
                    {lang === 'tl' ? 'Average' : 'Historical Avg'}
                  </Text>
                  <Text style={styles.yieldValue}>
                    {yieldPrediction.historicalAvg.toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary, marginTop: theme.spacing[1] }}>kg</Text>
                </View>
              </View>

              <View
                style={[
                  styles.changeCard,
                  {
                    backgroundColor:
                      parseFloat(yieldPrediction.changePercent) >= 0
                        ? theme.colors.success[50]
                        : theme.colors.error[50],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.changeText,
                    {
                      color:
                        parseFloat(yieldPrediction.changePercent) >= 0
                          ? theme.colors.success[600]
                          : theme.colors.error[600],
                    },
                  ]}
                >
                  <Ionicons
                    name={parseFloat(yieldPrediction.changePercent) >= 0 ? "trending-up" : "trending-down"}
                    size={18}
                  />{' '}
                  {Math.abs(parseFloat(yieldPrediction.changePercent))}% {lang === 'tl' ? 'vs average' : 'vs average'}
                </Text>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>
                    {lang === 'tl' ? 'Bawat Sq Meter' : 'Per Sq Meter'}
                  </Text>
                  <Text style={styles.statValue}>
                    {yieldPrediction.yieldPerSqMeter} kg
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>
                    {lang === 'tl' ? 'Katiyakan' : 'Confidence'}
                  </Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: getConfidenceColor(yieldPrediction.confidence) },
                    ]}
                  >
                    {yieldPrediction.confidence}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Yield Impact Score */}
          {yieldImpact && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="speedometer-outline" size={24} color={theme.colors.warning[500]} style={{ marginRight: theme.spacing[2] }} />
                  <Text style={styles.cardTitle}>
                    {lang === 'tl' ? 'Marka ng Epekto' : 'Yield Impact Score'}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreCircle}>
                <Text style={styles.scoreNumber}>{yieldImpact.score}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>

              <View style={styles.factorsContainer}>
                <View style={styles.factorRow}>
                  <View style={styles.factorHeader}>
                    <Text style={styles.factorLabel}>
                      <Ionicons name="partly-sunny-outline" size={16} /> {lang === 'tl' ? 'Kapaligiran' : 'Environmental'}
                    </Text>
                    <Text style={styles.factorValue}>
                      {yieldImpact.factors.environmental.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.factorBar}>
                    <View
                      style={[
                        styles.factorFill,
                        {
                          width: `${(yieldImpact.factors.environmental / 50) * 100}%`,
                          backgroundColor: theme.colors.primary[500],
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.factorRow}>
                  <View style={styles.factorHeader}>
                    <Text style={styles.factorLabel}>
                      <Ionicons name="alert-circle-outline" size={16} /> {lang === 'tl' ? 'Stress Events' : 'Stress Events'}
                    </Text>
                    <Text style={styles.factorValue}>
                      {yieldImpact.factors.stress.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.factorBar}>
                    <View
                      style={[
                        styles.factorFill,
                        {
                          width: `${(yieldImpact.factors.stress / 30) * 100}%`,
                          backgroundColor: theme.colors.warning[500],
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.factorRow}>
                  <View style={styles.factorHeader}>
                    <Text style={styles.factorLabel}>
                      <Ionicons name="shield-checkmark-outline" size={16} /> {lang === 'tl' ? 'Proteksyon' : 'Bird Protection'}
                    </Text>
                    <Text style={styles.factorValue}>
                      {yieldImpact.factors.birdProtection.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.factorBar}>
                    <View
                      style={[
                        styles.factorFill,
                        {
                          width: `${(yieldImpact.factors.birdProtection / 20) * 100}%`,
                          backgroundColor: theme.colors.success[500],
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.daysInfo}>
                <View style={styles.daysRow}>
                  <Text style={styles.daysLabel}>
                    {lang === 'tl' ? 'Optimal na Araw:' : 'Optimal Days:'}
                  </Text>
                  <Text style={styles.daysValue}>{yieldImpact.optimalDays}</Text>
                </View>
                <View style={styles.daysRow}>
                  <Text style={styles.daysLabel}>
                    {lang === 'tl' ? 'Stress na Araw:' : 'Stress Days:'}
                  </Text>
                  <Text style={[styles.daysValue, { color: theme.colors.error[500] }]}>
                    {yieldImpact.stressDays}
                  </Text>
                </View>
                <View style={styles.daysRow}>
                  <Text style={styles.daysLabel}>
                    {lang === 'tl' ? 'Kabuuang Araw:' : 'Total Days:'}
                  </Text>
                  <Text style={styles.daysValue}>{yieldImpact.totalDays}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>
              <Ionicons name="flash-outline" size={20} color={theme.colors.primary[500]} />{' '}
              {lang === 'tl' ? 'Mabilis na Aksyon' : 'Quick Actions'}
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('HarvestPlanner');
                }}
              >
                <Ionicons name="calendar" size={16} color={theme.colors.primary[500]} />
                <Text style={styles.actionButtonText}>
                  {lang === 'tl' ? 'Plano sa Ani' : 'Harvest Plan'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('CropHealth');
                }}
              >
                <Ionicons name="medical" size={16} color={theme.colors.primary[500]} />
                <Text style={styles.actionButtonText}>
                  {lang === 'tl' ? 'Kalusugan' : 'Crop Health'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('BirdAnalytics');
                }}
              >
                <Ionicons name="analytics" size={16} color={theme.colors.primary[500]} />
                <Text style={styles.actionButtonText}>
                  {lang === 'tl' ? 'Stats ng Ibon' : 'Bird Stats'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Reports');
                }}
              >
                <Ionicons name="document-text" size={16} color={theme.colors.primary[500]} />
                <Text style={styles.actionButtonText}>
                  {lang === 'tl' ? 'Mga Ulat' : 'Reports'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

export default AnalyticsScreen;
