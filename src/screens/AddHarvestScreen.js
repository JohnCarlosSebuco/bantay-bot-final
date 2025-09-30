import React, { useState } from 'react';
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

const AddHarvestScreen = ({ navigation }) => {
  const [cropType, setCropType] = useState('tomato');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [yieldAmount, setYieldAmount] = useState('');
  const [plotSize, setPlotSize] = useState('');
  const [quality, setQuality] = useState('good');
  const [birdDamagePercent, setBirdDamagePercent] = useState('0');
  const [notes, setNotes] = useState('');

  const cropDatabase = predictionService.getCropDatabase();
  const cropTypes = Object.keys(cropDatabase).filter((k) => k !== 'default');

  const saveHarvest = async () => {
    const yield_val = parseFloat(yieldAmount);
    const plot_val = parseFloat(plotSize);
    const damage_val = parseFloat(birdDamagePercent);

    if (!yield_val || yield_val <= 0) {
      Alert.alert('Error', 'Please enter a valid yield amount');
      return;
    }

    if (!plot_val || plot_val <= 0) {
      Alert.alert('Error', 'Please enter a valid plot size');
      return;
    }

    if (damage_val < 0 || damage_val > 100) {
      Alert.alert('Error', 'Bird damage must be between 0 and 100');
      return;
    }

    const harvestData = {
      cropType,
      date: harvestDate,
      yield: yield_val,
      plotSize: plot_val,
      quality,
      birdDamagePercent: damage_val,
      notes,
    };

    const result = await cropDataService.addHarvestRecord(harvestData);

    if (result) {
      Alert.alert('Success', 'Harvest record added successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } else {
      Alert.alert('Error', 'Failed to add harvest record');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#51CF66', '#40C057']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>➕ Add Harvest Record</Text>
        <Text style={styles.headerSubtitle}>Record Your Harvest Data</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Crop Type</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={cropType} onValueChange={setCropType} style={styles.picker}>
              {cropTypes.map((type) => (
                <Picker.Item key={type} label={cropDatabase[type].name} value={type} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Harvest Date</Text>
          <TextInput
            style={styles.input}
            value={harvestDate}
            onChangeText={setHarvestDate}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>Yield Amount (kg)</Text>
          <TextInput
            style={styles.input}
            value={yieldAmount}
            onChangeText={setYieldAmount}
            keyboardType="numeric"
            placeholder="Enter yield in kilograms"
          />

          <Text style={styles.label}>Plot Size (sq meters)</Text>
          <TextInput
            style={styles.input}
            value={plotSize}
            onChangeText={setPlotSize}
            keyboardType="numeric"
            placeholder="Enter plot size"
          />

          <Text style={styles.label}>Quality</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={quality} onValueChange={setQuality} style={styles.picker}>
              <Picker.Item label="Excellent" value="excellent" />
              <Picker.Item label="Good" value="good" />
              <Picker.Item label="Fair" value="fair" />
              <Picker.Item label="Poor" value="poor" />
            </Picker>
          </View>

          <Text style={styles.label}>Bird Damage (%)</Text>
          <TextInput
            style={styles.input}
            value={birdDamagePercent}
            onChangeText={setBirdDamagePercent}
            keyboardType="numeric"
            placeholder="0-100"
          />

          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional notes..."
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity style={styles.saveButton} onPress={saveHarvest}>
            <LinearGradient colors={['#51CF66', '#40C057']} style={styles.saveButtonGradient}>
              <Text style={styles.saveButtonText}>💾 Save Harvest Record</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Why Track Harvest Data?</Text>
          <Text style={styles.infoText}>
            • Builds historical data for better predictions{'\n'}• Helps calculate average yields
            per crop{'\n'}• Identifies which crops perform best{'\n'}• Tracks impact of bird
            protection{'\n'}• Improves future harvest planning
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
  backButton: {
    position: 'absolute',
    left: 20,
    top: 55,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
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

export default AddHarvestScreen;