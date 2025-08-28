import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HistoryService from '../services/HistoryService';

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  } catch (_) {
    return '';
  }
};

const HistoryScreen = () => {
  const [motion, setMotion] = useState([]);
  const [env, setEnv] = useState([]);

  const refresh = async () => {
    const [m, e] = await Promise.all([
      HistoryService.getMotionHistory(),
      HistoryService.getEnvHistory(),
    ]);
    setMotion(m);
    setEnv(e);
  };

  useEffect(() => {
    HistoryService.start();
    refresh();
    const onUpdate = () => refresh();
    HistoryService.on('update', onUpdate);
    return () => {
      HistoryService.off('update', onUpdate);
      HistoryService.stop();
    };
  }, []);

  const clearAll = async () => {
    await HistoryService.clearAll();
    refresh();
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#00c6ff', '#0072ff']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.headerTitle}>📜 History</Text>
        <Text style={styles.headerSubtitle}>Motion events and periodic sensor logs</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🚨 Motion Events</Text>
            <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          {motion.length === 0 ? (
            <Text style={styles.emptyText}>No motion events yet</Text>
          ) : (
            motion.map((item, idx) => (
              <View key={`m-${idx}`} style={styles.itemRow}>
                <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
                <Text style={styles.itemLabel}>Motion detected</Text>
                <Text style={styles.itemValue}>Dist: {item.distance ?? 'N/A'} cm</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌡️ Environmental (every 1 min)</Text>
          {env.length === 0 ? (
            <Text style={styles.emptyText}>No samples yet</Text>
          ) : (
            env.map((item, idx) => (
              <View key={`e-${idx}`} style={styles.itemRow}>
                <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
                <Text style={styles.itemValue}>T: {item.temperature ?? 'N/A'}°C</Text>
                <Text style={styles.itemValue}>H: {item.humidity ?? 'N/A'}%</Text>
                <Text style={styles.itemValue}>Soil: {item.soilMoisture ?? 'N/A'}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { paddingTop: 50, paddingBottom: 30, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 5 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  content: { padding: 15 },
  section: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  clearButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ffe3e3' },
  clearText: { color: '#ff6b6b', fontWeight: '700' },
  emptyText: { color: '#666', fontStyle: 'italic' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemTime: { color: '#666', width: 90 },
  itemLabel: { color: '#333', flex: 1, marginLeft: 10 },
  itemValue: { color: '#333', marginLeft: 10 },
});

export default HistoryScreen;


