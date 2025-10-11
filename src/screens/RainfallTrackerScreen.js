import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import cropDataService from '../services/CropDataService';
import predictionService from '../services/PredictionService';

const RainfallTrackerScreen = ({ navigation }) => {
  const [rainfallAmount, setRainfallAmount] = useState('');
  const [rainfallLog, setRainfallLog] = useState([]);
  const [rainfallAnalysis, setRainfallAnalysis] = useState(null);
  const [waterStressInfo, setWaterStressInfo] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const log = await cropDataService.getRainfallLog();
    setRainfallLog(log);

    const analysis = await predictionService.analyzeRainfall();
    setRainfallAnalysis(analysis);

    // Get current crop data for water stress check
    const cropData = await cropDataService.getCropData();
    if (cropData) {
      // Get latest environmental data
      const envHistory = await cropDataService.getEnvironmentalHistory();
      if (envHistory.length > 0) {
        const latestEnv = envHistory[0];
        const stressCheck = predictionService.checkWaterStress(
          latestEnv.avgSoilMoisture,
          cropData.cropType
        );
        setWaterStressInfo(stressCheck);
      }
    }
  };

  const addRainfallRecord = async () => {
    const amount = parseFloat(rainfallAmount);

    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid rainfall amount');
      return;
    }

    const result = await cropDataService.addRainfallRecord(amount);

    if (result) {
      Alert.alert('Success', 'Rainfall record added successfully!');
      setRainfallAmount('');
      loadData();
    } else {
      Alert.alert('Error', 'Failed to add rainfall record');
    }
  };

  const deleteRecord = async (id) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this rainfall record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await cropDataService.deleteRainfallRecord(id);
            if (success) {
              Alert.alert('Success', 'Record deleted');
              loadData();
            }
          },
        },
      ]
    );
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

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#1E88E5', '#1976D2']} style={styles.header}>
        <Text style={styles.headerTitle}>💧 Rainfall Tracker</Text>
        <Text style={styles.headerSubtitle}>Monitor Water Availability</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Water Stress Alert */}
        {waterStressInfo && waterStressInfo.status !== 'optimal' && (
          <View
            style={[
              styles.alertCard,
              { borderLeftColor: getStressColor(waterStressInfo.status) },
            ]}
          >
            <Text style={styles.alertTitle}>⚠️ Water Stress Alert</Text>
            <Text style={styles.alertStatus}>
              Status:{' '}
              <Text
                style={{ color: getStressColor(waterStressInfo.status), fontWeight: 'bold' }}
              >
                {waterStressInfo.status.toUpperCase()}
              </Text>
            </Text>
            <Text style={styles.alertMessage}>{waterStressInfo.message}</Text>
            <Text style={styles.alertRecommendation}>{waterStressInfo.recommendation}</Text>
          </View>
        )}

        {/* Add Rainfall Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log Rainfall Event</Text>

          <Text style={styles.label}>Rainfall Amount (mm)</Text>
          <TextInput
            style={styles.input}
            value={rainfallAmount}
            onChangeText={setRainfallAmount}
            keyboardType="numeric"
            placeholder="Enter amount in millimeters"
          />

          <TouchableOpacity style={styles.addButton} onPress={addRainfallRecord}>
            <LinearGradient colors={['#1E88E5', '#1976D2']} style={styles.addButtonGradient}>
              <Text style={styles.addButtonText}>➕ Add Rainfall Record</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Rainfall Analysis */}
        {rainfallAnalysis && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Rainfall Analysis (Last 30 Days)</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{rainfallAnalysis.totalRainfall.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Total (mm)</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{rainfallAnalysis.averagePerEvent.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Avg/Event (mm)</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{rainfallAnalysis.eventCount}</Text>
                <Text style={styles.statLabel}>Rain Events</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{rainfallAnalysis.daysSinceLastRain}</Text>
                <Text style={styles.statLabel}>Days Dry</Text>
              </View>
            </View>

            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Water Availability Status:</Text>
              <Text
                style={[
                  styles.statusValue,
                  {
                    color:
                      rainfallAnalysis.status === 'sufficient'
                        ? '#51CF66'
                        : rainfallAnalysis.status === 'low'
                        ? '#FFA94D'
                        : '#FA5252',
                  },
                ]}
              >
                {rainfallAnalysis.status.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.analysisMessage}>{rainfallAnalysis.message}</Text>
          </View>
        )}

        {/* Rainfall Log */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📜 Recent Rainfall Events</Text>

          {rainfallLog.length === 0 ? (
            <Text style={styles.emptyText}>No rainfall records yet</Text>
          ) : (
            rainfallLog.slice(0, 10).map((record) => (
              <View key={record.id} style={styles.logItem}>
                <View style={styles.logInfo}>
                  <Text style={styles.logDate}>
                    {new Date(record.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.logTime}>
                    {new Date(record.date).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.logRight}>
                  <Text style={styles.logAmount}>{record.amount} mm</Text>
                  <TouchableOpacity onPress={() => deleteRecord(record.id)}>
                    <Text style={styles.deleteButton}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Why Track Rainfall?</Text>
          <Text style={styles.infoText}>
            • No irrigation available on the farm{'\n'}• Rainfall is the only water source for
            crops{'\n'}• Tracking helps predict water stress{'\n'}• Better harvest planning based
            on water availability{'\n'}• Historical data improves future predictions
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    marginBottom: 15,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  addButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  analysisMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 5,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logInfo: {
    flex: 1,
  },
  logDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  logTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginRight: 10,
  },
  deleteButton: {
    fontSize: 20,
    padding: 5,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
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

export default RainfallTrackerScreen;