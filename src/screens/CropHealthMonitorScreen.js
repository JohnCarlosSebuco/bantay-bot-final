import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import cropDataService from '../services/CropDataService';
import predictionService from '../services/PredictionService';

const CropHealthMonitorScreen = ({ navigation, sensorData }) => {
  const [cropData, setCropData] = useState(null);
  const [healthAssessment, setHealthAssessment] = useState(null);
  const [waterStress, setWaterStress] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [sensorData]);

  const loadData = async () => {
    const crop = await cropDataService.getCropData();
    setCropData(crop);

    if (crop && sensorData) {
      // Assess crop health
      const assessment = predictionService.assessCropHealth(
        sensorData.temperature,
        sensorData.humidity,
        sensorData.soilMoisture,
        crop.cropType
      );
      setHealthAssessment(assessment);

      // Check water stress
      const stress = predictionService.checkWaterStress(sensorData.soilMoisture, crop.cropType);
      setWaterStress(stress);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#51CF66';
    if (score >= 60) return '#94D82D';
    if (score >= 40) return '#FFA94D';
    return '#FA5252';
  };

  const getStressColor = (level) => {
    switch (level) {
      case 'severe':
        return '#FA5252';
      case 'moderate':
        return '#FFA94D';
      case 'mild':
        return '#FFD43B';
      default:
        return '#51CF66';
    }
  };

  if (!cropData) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#40C057', '#37B24D']} style={styles.header}>
          <Text style={styles.headerTitle}>🌱 Crop Health Monitor</Text>
          <Text style={styles.headerSubtitle}>Real-time Health Assessment</Text>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌾</Text>
          <Text style={styles.emptyTitle}>No Crop Data</Text>
          <Text style={styles.emptyText}>
            Set up your crop information in the Harvest Planner to start monitoring health
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => navigation.navigate('HarvestPlanner')}
          >
            <Text style={styles.setupButtonText}>Set Up Crop</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#40C057', '#37B24D']} style={styles.header}>
        <Text style={styles.headerTitle}>🌱 Crop Health Monitor</Text>
        <Text style={styles.headerSubtitle}>Real-time Health Assessment</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Overall Health Score */}
        {healthAssessment && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Overall Health Score</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(healthAssessment.score) }]}>
              {healthAssessment.score}
            </Text>
            <Text style={styles.scoreStatus}>{healthAssessment.status.toUpperCase()}</Text>
            <View style={styles.scoreBar}>
              <View
                style={[
                  styles.scoreBarFill,
                  {
                    width: `${healthAssessment.score}%`,
                    backgroundColor: getScoreColor(healthAssessment.score),
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Current Conditions */}
        {sensorData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Current Conditions</Text>

            <View style={styles.conditionItem}>
              <View style={styles.conditionLeft}>
                <Text style={styles.conditionIcon}>🌡️</Text>
                <Text style={styles.conditionLabel}>Temperature</Text>
              </View>
              <Text style={styles.conditionValue}>{sensorData.temperature}°C</Text>
            </View>

            <View style={styles.conditionItem}>
              <View style={styles.conditionLeft}>
                <Text style={styles.conditionIcon}>💧</Text>
                <Text style={styles.conditionLabel}>Humidity</Text>
              </View>
              <Text style={styles.conditionValue}>{sensorData.humidity}%</Text>
            </View>

            <View style={styles.conditionItem}>
              <View style={styles.conditionLeft}>
                <Text style={styles.conditionIcon}>🌱</Text>
                <Text style={styles.conditionLabel}>Soil Moisture</Text>
              </View>
              <Text style={styles.conditionValue}>{sensorData.soilMoisture}%</Text>
            </View>
          </View>
        )}

        {/* Water Stress Alert */}
        {waterStress && waterStress.status !== 'optimal' && (
          <View style={[styles.alertCard, { borderLeftColor: getStressColor(waterStress.status) }]}>
            <Text style={styles.alertTitle}>⚠️ Water Stress Alert</Text>
            <Text style={styles.alertStatus}>
              Status:{' '}
              <Text style={{ color: getStressColor(waterStress.status), fontWeight: 'bold' }}>
                {waterStress.status.toUpperCase()}
              </Text>
            </Text>
            <Text style={styles.alertMessage}>{waterStress.message}</Text>
            <Text style={styles.alertRecommendation}>{waterStress.recommendation}</Text>
          </View>
        )}

        {/* Health Factors */}
        {healthAssessment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔍 Health Factors</Text>

            {healthAssessment.factors.map((factor, index) => (
              <View key={index} style={styles.factorItem}>
                <View style={styles.factorHeader}>
                  <Text style={styles.factorName}>{factor.factor}</Text>
                  <Text
                    style={[
                      styles.factorStatus,
                      {
                        color:
                          factor.status === 'good'
                            ? '#51CF66'
                            : factor.status === 'moderate'
                            ? '#FFA94D'
                            : '#FA5252',
                      },
                    ]}
                  >
                    {factor.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.factorMessage}>{factor.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {healthAssessment && healthAssessment.recommendations.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 Recommendations</Text>
            {healthAssessment.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationBullet}>•</Text>
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Optimal Ranges */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Optimal Ranges for {cropData.cropType}</Text>
          {predictionService.getCropDatabase()[cropData.cropType] && (
            <View>
              <Text style={styles.infoText}>
                Temperature: {predictionService.getCropDatabase()[cropData.cropType].optimalTempMin}
                °C - {predictionService.getCropDatabase()[cropData.cropType].optimalTempMax}°C
              </Text>
              <Text style={styles.infoText}>
                Humidity: {predictionService.getCropDatabase()[cropData.cropType].optimalHumidityMin}
                % - {predictionService.getCropDatabase()[cropData.cropType].optimalHumidityMax}%
              </Text>
              <Text style={styles.infoText}>
                Soil Moisture:{' '}
                {predictionService.getCropDatabase()[cropData.cropType].optimalMoistureMin}% -{' '}
                {predictionService.getCropDatabase()[cropData.cropType].optimalMoistureMax}%
              </Text>
            </View>
          )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
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
    marginBottom: 20,
    lineHeight: 22,
  },
  setupButton: {
    backgroundColor: '#40C057',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 5,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scoreStatus: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
    marginBottom: 15,
  },
  scoreBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#E9ECEF',
    borderRadius: 5,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  conditionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  conditionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  conditionLabel: {
    fontSize: 16,
    color: '#666',
  },
  conditionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  alertCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  alertStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  alertRecommendation: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
  },
  factorItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  factorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  factorStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  factorMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  recommendationBullet: {
    fontSize: 16,
    color: '#40C057',
    marginRight: 10,
    fontWeight: 'bold',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#E7F5FF',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#40C057',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
  },
});

export default CropHealthMonitorScreen;