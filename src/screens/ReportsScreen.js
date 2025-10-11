import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import cropDataService from '../services/CropDataService';
import DetectionHistoryService from '../services/DetectionHistoryService';
import predictionService from '../services/PredictionService';

const ReportsScreen = ({ navigation }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);

    // Gather all data
    const cropData = await cropDataService.getCropData();
    const harvestHistory = await cropDataService.getHarvestHistory();
    const envHistory = await cropDataService.getEnvironmentalHistory();
    const rainfallLog = await cropDataService.getRainfallLog();
    const detectionStats = await DetectionHistoryService.getStatistics();
    const statistics = await cropDataService.getStatisticsSummary();
    const insights = await predictionService.generateInsights();

    setReportData({
      cropData,
      harvestHistory,
      envHistory,
      rainfallLog,
      detectionStats,
      statistics,
      insights,
    });

    setLoading(false);
  };

  const exportAllData = async () => {
    try {
      const exportData = await cropDataService.exportData();
      const detectionData = await DetectionHistoryService.exportHistory();

      const fullExport = {
        ...exportData,
        detectionHistory: detectionData,
        generatedAt: new Date().toISOString(),
      };

      // In a real app, you would save this to a file or share it
      console.log('Full Export:', JSON.stringify(fullExport, null, 2));

      // Share as text
      await Share.share({
        message: JSON.stringify(fullExport, null, 2),
        title: 'BantayBot Data Export',
      });

      Alert.alert('Success', 'Data exported successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
      console.error('Export error:', error);
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete ALL stored data? This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await cropDataService.clearAllData();
            await DetectionHistoryService.clearHistory();
            Alert.alert('Success', 'All data has been cleared');
            loadReportData();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Generating report...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>📊 Reports & Insights</Text>
        <Text style={styles.headerSubtitle}>Comprehensive Data Analysis</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Summary Statistics */}
        {reportData?.statistics && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 Summary Statistics</Text>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Harvests</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Harvests:</Text>
                <Text style={styles.statValue}>{reportData.statistics.harvests.total}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Yield:</Text>
                <Text style={styles.statValue}>{reportData.statistics.harvests.totalYield} kg</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Average Yield:</Text>
                <Text style={styles.statValue}>{reportData.statistics.harvests.avgYield} kg</Text>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Environment</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Days Tracked:</Text>
                <Text style={styles.statValue}>
                  {reportData.statistics.environment.daysTracked}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Avg Temperature:</Text>
                <Text style={styles.statValue}>
                  {reportData.statistics.environment.avgTemp}°C
                </Text>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Rainfall</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Rainfall:</Text>
                <Text style={styles.statValue}>{reportData.statistics.rainfall.total} mm</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Events Logged:</Text>
                <Text style={styles.statValue}>
                  {reportData.statistics.rainfall.eventsLogged}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bird Detection Summary */}
        {reportData?.detectionStats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🦅 Bird Detection Summary</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Detections:</Text>
              <Text style={styles.statValue}>{reportData.detectionStats.totalDetections}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Average Per Day:</Text>
              <Text style={styles.statValue}>
                {reportData.detectionStats.averagePerDay.toFixed(1)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Peak Hour:</Text>
              <Text style={styles.statValue}>{reportData.detectionStats.peakHour}:00</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Most Active Day:</Text>
              <Text style={styles.statValue}>{reportData.detectionStats.mostActiveDay}</Text>
            </View>
          </View>
        )}

        {/* Key Insights */}
        {reportData?.insights && reportData.insights.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 Key Insights</Text>

            {reportData.insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Text style={styles.insightBullet}>•</Text>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Current Crop Status */}
        {reportData?.cropData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌾 Current Crop Status</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Crop Type:</Text>
              <Text style={styles.statValue}>
                {predictionService.getCropDatabase()[reportData.cropData.cropType]?.name ||
                  reportData.cropData.cropType}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Planting Date:</Text>
              <Text style={styles.statValue}>
                {new Date(reportData.cropData.plantingDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Plot Size:</Text>
              <Text style={styles.statValue}>{reportData.cropData.plotSize} sq m</Text>
            </View>
            {reportData.cropData.expectedYield > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Expected Yield:</Text>
                <Text style={styles.statValue}>{reportData.cropData.expectedYield} kg</Text>
              </View>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Text style={styles.actionButtonText}>📊 View Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('HarvestPlanner')}
          >
            <Text style={styles.actionButtonText}>🌾 Manage Crop Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('BirdAnalytics')}
          >
            <Text style={styles.actionButtonText}>🦅 Bird Activity Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('RainfallTracker')}
          >
            <Text style={styles.actionButtonText}>💧 Rainfall Log</Text>
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💾 Data Management</Text>

          <TouchableOpacity style={styles.exportButton} onPress={exportAllData}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.exportButtonGradient}>
              <Text style={styles.exportButtonText}>📤 Export All Data</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <Text style={styles.dangerButtonText}>🗑️ Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ About Reports</Text>
          <Text style={styles.infoText}>
            This report consolidates all data from:{'\n'}• Crop and harvest records{'\n'}•
            Environmental conditions{'\n'}• Rainfall tracking{'\n'}• Bird detection history{'\n'}•
            Predictive analytics{'\n\n'}Export your data regularly to keep backups and track
            long-term trends.
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
  sectionContainer: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  insightBullet: {
    fontSize: 16,
    color: '#667eea',
    marginRight: 10,
    fontWeight: 'bold',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  exportButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 3,
  },
  exportButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: '#FA5252',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#F3E5F5',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#764ba2',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});

export default ReportsScreen;