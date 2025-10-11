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
import { Picker } from '@react-native-picker/picker';
import cropDataService from '../services/CropDataService';
import predictionService from '../services/PredictionService';

const HarvestPlannerScreen = ({ navigation }) => {
  const [cropType, setCropType] = useState('tomato');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().split('T')[0]);
  const [plotSize, setPlotSize] = useState('100');
  const [expectedYield, setExpectedYield] = useState('');
  const [harvestHistory, setHarvestHistory] = useState([]);

  const cropDatabase = predictionService.getCropDatabase();
  const cropTypes = Object.keys(cropDatabase).filter(k => k !== 'default');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const crop = await cropDataService.getCropData();
    if (crop) {
      setCropType(crop.cropType || 'tomato');
      setPlantingDate(crop.plantingDate || new Date().toISOString().split('T')[0]);
      setPlotSize(crop.plotSize?.toString() || '100');
      setExpectedYield(crop.expectedYield?.toString() || '');
    }

    const history = await cropDataService.getHarvestHistory();
    setHarvestHistory(history);
  };

  const saveCropData = async () => {
    if (!plotSize || parseFloat(plotSize) <= 0) {
      Alert.alert('Error', 'Please enter a valid plot size');
      return;
    }

    const cropData = {
      cropType,
      plantingDate,
      plotSize: parseFloat(plotSize),
      expectedYield: parseFloat(expectedYield) || 0,
    };

    const success = await cropDataService.saveCropData(cropData);

    if (success) {
      Alert.alert('Success', 'Crop data saved successfully!');
      navigation.navigate('Analytics');
    } else {
      Alert.alert('Error', 'Failed to save crop data');
    }
  };

  const addHarvestRecord = () => {
    navigation.navigate('AddHarvest');
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#51CF66', '#40C057']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🌾 Harvest Planner</Text>
        <Text style={styles.headerSubtitle}>Plan Your Growing Season</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Crop Information</Text>

          <Text style={styles.label}>Crop Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={cropType}
              onValueChange={setCropType}
              style={styles.picker}
            >
              {cropTypes.map(type => (
                <Picker.Item
                  key={type}
                  label={cropDatabase[type].name}
                  value={type}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Planting Date</Text>
          <TextInput
            style={styles.input}
            value={plantingDate}
            onChangeText={setPlantingDate}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>Plot Size (sq meters)</Text>
          <TextInput
            style={styles.input}
            value={plotSize}
            onChangeText={setPlotSize}
            keyboardType="numeric"
            placeholder="100"
          />

          <Text style={styles.label}>Expected Yield (kg) - Optional</Text>
          <TextInput
            style={styles.input}
            value={expectedYield}
            onChangeText={setExpectedYield}
            keyboardType="numeric"
            placeholder="Leave empty to use historical average"
          />

          <TouchableOpacity style={styles.saveButton} onPress={saveCropData}>
            <LinearGradient
              colors={['#51CF66', '#40C057']}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>💾 Save Crop Data</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📜 Harvest History</Text>
            <TouchableOpacity onPress={addHarvestRecord}>
              <Text style={styles.addButton}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {harvestHistory.length === 0 ? (
            <Text style={styles.emptyText}>No harvest records yet</Text>
          ) : (
            harvestHistory.slice(0, 5).map((record, index) => (
              <View key={record.id} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>
                    {cropDatabase[record.cropType]?.name || record.cropType}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(record.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.historyYield}>{record.yield} kg</Text>
              </View>
            ))
          )}

          {harvestHistory.length > 5 && (
            <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ How it works:</Text>
          <Text style={styles.infoText}>
            • Enter your current crop and planting date{'\n'}
            • System tracks growing conditions automatically{'\n'}
            • Get harvest date and yield predictions{'\n'}
            • Add harvest records to improve predictions
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
    elevation: 3,
  },
  saveButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  addButton: {
    fontSize: 16,
    fontWeight: '700',
    color: '#51CF66',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  historyYield: {
    fontSize: 18,
    fontWeight: '700',
    color: '#51CF66',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    textAlign: 'center',
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: '#E8F4FD',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#339AF0',
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

export default HarvestPlannerScreen;