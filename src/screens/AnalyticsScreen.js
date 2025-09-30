import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import predictionService from '../services/PredictionService';
import cropDataService from '../services/CropDataService';

const AnalyticsScreen = ({ navigation }) => {
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
      duration: 800,
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
    await loadData();
    setRefreshing(false);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return '#51CF66';
    if (confidence === 'medium') return '#FFB800';
    return '#FF6B6B';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return '#FF6B6B';
    if (priority === 'medium') return '#FFB800';
    return '#339AF0';
  };

  if (!cropData || !cropData.plantingDate) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>📊 Analytics</Text>
          <Text style={styles.headerSubtitle}>Farm Intelligence</Text>
        </LinearGradient>

        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyTitle}>No Crop Data Yet</Text>
          <Text style={styles.emptyText}>
            Set up your crop information to see predictions and insights
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => navigation.navigate('HarvestPlanner')}
          >
            <LinearGradient
              colors={['#51CF66', '#40C057']}
              style={styles.setupButtonGradient}
            >
              <Text style={styles.setupButtonText}>Setup Crop Data</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>📊 Analytics</Text>
        <Text style={styles.headerSubtitle}>
          {cropData.cropType ? cropData.cropType.charAt(0).toUpperCase() + cropData.cropType.slice(1) : 'Crop'} Insights
        </Text>
      </LinearGradient>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Key Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>💡 Key Insights</Text>
            {insights.map((insight, index) => (
              <View
                key={index}
                style={[
                  styles.insightCard,
                  { borderLeftColor: getPriorityColor(insight.priority) },
                ]}
              >
                <Text style={styles.insightIcon}>{insight.icon}</Text>
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
              <Text style={styles.cardTitle}>🌾 Harvest Prediction</Text>
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
              <Text style={styles.bigLabel}>Days to Harvest</Text>
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
                {harvestPrediction.readinessPercent.toFixed(0)}% Ready
              </Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>GDD Accumulated</Text>
                <Text style={styles.statValue}>
                  {harvestPrediction.accumulatedGDD.toFixed(0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>GDD Required</Text>
                <Text style={styles.statValue}>
                  {harvestPrediction.requiredGDD}
                </Text>
              </View>
            </View>

            <Text style={styles.dateText}>
              Est. Harvest: {new Date(harvestPrediction.harvestDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Yield Prediction Card */}
        {yieldPrediction && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 Yield Prediction</Text>

            <View style={styles.yieldComparison}>
              <View style={styles.yieldBox}>
                <Text style={styles.yieldLabel}>Predicted</Text>
                <Text style={styles.yieldValue}>
                  {yieldPrediction.predictedYield} kg
                </Text>
              </View>
              <Text style={styles.yieldArrow}>→</Text>
              <View style={styles.yieldBox}>
                <Text style={styles.yieldLabel}>Historical Avg</Text>
                <Text style={styles.yieldValue}>
                  {yieldPrediction.historicalAvg.toFixed(1)} kg
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.changeCard,
                {
                  backgroundColor:
                    parseFloat(yieldPrediction.changePercent) >= 0
                      ? '#E8F9F0'
                      : '#FFE8E8',
                },
              ]}
            >
              <Text
                style={[
                  styles.changeText,
                  {
                    color:
                      parseFloat(yieldPrediction.changePercent) >= 0
                        ? '#51CF66'
                        : '#FF6B6B',
                  },
                ]}
              >
                {parseFloat(yieldPrediction.changePercent) >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(parseFloat(yieldPrediction.changePercent))}% vs average
              </Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Per Sq Meter</Text>
                <Text style={styles.statValue}>
                  {yieldPrediction.yieldPerSqMeter} kg
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Confidence</Text>
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
            <Text style={styles.cardTitle}>🎯 Yield Impact Score</Text>

            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{yieldImpact.score}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>

            <View style={styles.factorsContainer}>
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>🌡️ Environmental</Text>
                <View style={styles.factorBar}>
                  <View
                    style={[
                      styles.factorFill,
                      {
                        width: `${(yieldImpact.factors.environmental / 50) * 100}%`,
                        backgroundColor: '#667eea',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.factorValue}>
                  {yieldImpact.factors.environmental.toFixed(0)}
                </Text>
              </View>

              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>⚠️ Stress Events</Text>
                <View style={styles.factorBar}>
                  <View
                    style={[
                      styles.factorFill,
                      {
                        width: `${(yieldImpact.factors.stress / 30) * 100}%`,
                        backgroundColor: '#FFB800',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.factorValue}>
                  {yieldImpact.factors.stress.toFixed(0)}
                </Text>
              </View>

              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>🐦 Bird Protection</Text>
                <View style={styles.factorBar}>
                  <View
                    style={[
                      styles.factorFill,
                      {
                        width: `${(yieldImpact.factors.birdProtection / 20) * 100}%`,
                        backgroundColor: '#51CF66',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.factorValue}>
                  {yieldImpact.factors.birdProtection.toFixed(0)}
                </Text>
              </View>
            </View>

            <View style={styles.daysInfo}>
              <View style={styles.daysRow}>
                <Text style={styles.daysLabel}>Optimal Days:</Text>
                <Text style={styles.daysValue}>{yieldImpact.optimalDays}</Text>
              </View>
              <View style={styles.daysRow}>
                <Text style={styles.daysLabel}>Stress Days:</Text>
                <Text style={[styles.daysValue, { color: '#FF6B6B' }]}>
                  {yieldImpact.stressDays}
                </Text>
              </View>
              <View style={styles.daysRow}>
                <Text style={styles.daysLabel}>Total Days:</Text>
                <Text style={styles.daysValue}>{yieldImpact.totalDays}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>📱 Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('HarvestPlanner')}
            >
              <Text style={styles.actionButtonText}>🌾 Harvest Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('CropHealth')}
            >
              <Text style={styles.actionButtonText}>🏥 Crop Health</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('BirdAnalytics')}
            >
              <Text style={styles.actionButtonText}>🐦 Bird Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Reports')}
            >
              <Text style={styles.actionButtonText}>📄 Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  setupButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  setupButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 40,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  insightsSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 2,
  },
  insightIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bigStat: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bigNumber: {
    fontSize: 60,
    fontWeight: '700',
    color: '#667eea',
  },
  bigLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#51CF66',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  dateText: {
    fontSize: 14,
    color: '#667eea',
    textAlign: 'center',
    fontWeight: '600',
  },
  yieldComparison: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 15,
  },
  yieldBox: {
    alignItems: 'center',
  },
  yieldLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  yieldValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  yieldArrow: {
    fontSize: 30,
    color: '#667eea',
  },
  changeCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  scoreCircle: {
    alignSelf: 'center',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 8,
    borderColor: '#667eea',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#667eea',
  },
  scoreMax: {
    fontSize: 18,
    color: '#888',
  },
  factorsContainer: {
    marginBottom: 20,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  factorLabel: {
    width: 140,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  factorBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  factorFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorValue: {
    width: 30,
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'right',
  },
  daysInfo: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  daysLabel: {
    fontSize: 14,
    color: '#666',
  },
  daysValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
});

export default AnalyticsScreen;