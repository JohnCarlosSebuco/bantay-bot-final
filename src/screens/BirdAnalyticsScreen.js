import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DetectionHistoryService from '../services/DetectionHistoryService';
import predictionService from '../services/PredictionService';

const BirdAnalyticsScreen = ({ navigation }) => {
  const [detectionStats, setDetectionStats] = useState(null);
  const [birdPatterns, setBirdPatterns] = useState(null);
  const [recentDetections, setRecentDetections] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const stats = await DetectionHistoryService.getStatistics();
    setDetectionStats(stats);

    const patterns = await predictionService.analyzeBirdPatterns();
    setBirdPatterns(patterns);

    const history = await DetectionHistoryService.getHistory();
    setRecentDetections(history.slice(0, 20));
  };

  const getActivityLevel = (count) => {
    if (count >= 10) return { level: 'High', color: '#FA5252' };
    if (count >= 5) return { level: 'Medium', color: '#FFA94D' };
    if (count >= 1) return { level: 'Low', color: '#FFD43B' };
    return { level: 'None', color: '#51CF66' };
  };

  const getDayName = (dayIndex) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#FA5252', '#E03131']} style={styles.header}>
        <Text style={styles.headerTitle}>🦅 Bird Analytics</Text>
        <Text style={styles.headerSubtitle}>Activity Patterns & Insights</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Overall Statistics */}
        {detectionStats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Overall Statistics</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{detectionStats.totalDetections}</Text>
                <Text style={styles.statLabel}>Total Detections</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{detectionStats.averagePerDay.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Avg Per Day</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{detectionStats.peakHour}:00</Text>
                <Text style={styles.statLabel}>Peak Hour</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{detectionStats.mostActiveDay}</Text>
                <Text style={styles.statLabel}>Most Active Day</Text>
              </View>
            </View>
          </View>
        )}

        {/* Hourly Distribution */}
        {birdPatterns && birdPatterns.hourlyDistribution && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⏰ Hourly Activity Pattern</Text>
            <Text style={styles.cardSubtitle}>Detections by hour of day</Text>

            <View style={styles.chartContainer}>
              {birdPatterns.hourlyDistribution.map((hour) => {
                const maxCount = Math.max(
                  ...birdPatterns.hourlyDistribution.map((h) => h.count)
                );
                const height = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
                const activity = getActivityLevel(hour.count);

                return (
                  <View key={hour.hour} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${height}%`,
                            backgroundColor: activity.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{hour.hour}</Text>
                    <Text style={styles.barCount}>{hour.count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Weekly Trend */}
        {birdPatterns && birdPatterns.weeklyTrend && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Weekly Trend</Text>
            <Text style={styles.cardSubtitle}>Last 7 days comparison</Text>

            {birdPatterns.weeklyTrend.thisWeek !== undefined && (
              <View>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>This Week</Text>
                  <Text style={styles.trendValue}>{birdPatterns.weeklyTrend.thisWeek}</Text>
                </View>

                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Last Week</Text>
                  <Text style={styles.trendValue}>{birdPatterns.weeklyTrend.lastWeek}</Text>
                </View>

                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Change</Text>
                  <Text
                    style={[
                      styles.trendValue,
                      {
                        color:
                          birdPatterns.weeklyTrend.change > 0
                            ? '#FA5252'
                            : birdPatterns.weeklyTrend.change < 0
                            ? '#51CF66'
                            : '#666',
                      },
                    ]}
                  >
                    {birdPatterns.weeklyTrend.change > 0 ? '+' : ''}
                    {birdPatterns.weeklyTrend.change}
                    {birdPatterns.weeklyTrend.percentChange !== undefined &&
                      ` (${birdPatterns.weeklyTrend.percentChange > 0 ? '+' : ''}${birdPatterns.weeklyTrend.percentChange.toFixed(1)}%)`}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Peak Activity Times */}
        {birdPatterns && birdPatterns.peakTimes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚡ Peak Activity Times</Text>

            {birdPatterns.peakTimes.map((peak, index) => (
              <View key={index} style={styles.peakItem}>
                <View style={styles.peakInfo}>
                  <Text style={styles.peakTime}>{peak.hour}:00</Text>
                  <Text style={styles.peakDay}>{peak.day || 'Daily'}</Text>
                </View>
                <View style={styles.peakRight}>
                  <Text style={styles.peakCount}>{peak.count}</Text>
                  <Text style={styles.peakLabel}>detections</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Insights */}
        {birdPatterns && birdPatterns.insights && birdPatterns.insights.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 Insights & Recommendations</Text>

            {birdPatterns.insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Text style={styles.insightBullet}>•</Text>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Detections */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📜 Recent Detections</Text>

          {recentDetections.length === 0 ? (
            <Text style={styles.emptyText}>No bird detections recorded yet</Text>
          ) : (
            recentDetections.map((detection, index) => (
              <View key={index} style={styles.detectionItem}>
                <View style={styles.detectionInfo}>
                  <Text style={styles.detectionDate}>
                    {new Date(detection.timestamp).toLocaleDateString()}
                  </Text>
                  <Text style={styles.detectionTime}>
                    {new Date(detection.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.detectionBadge}>
                  <Text style={styles.detectionBadgeText}>🦅</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Export Data */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={async () => {
            const data = await DetectionHistoryService.exportHistory();
            console.log('Exported detection history:', data);
            alert('Detection history exported to console');
          }}
        >
          <Text style={styles.exportButtonText}>📤 Export Detection Data</Text>
        </TouchableOpacity>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
    color: '#FA5252',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    marginTop: 10,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 5,
  },
  bar: {
    width: 8,
    borderRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  barCount: {
    fontSize: 8,
    color: '#999',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  trendLabel: {
    fontSize: 15,
    color: '#666',
  },
  trendValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  peakItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  peakInfo: {
    flex: 1,
  },
  peakTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  peakDay: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  peakRight: {
    alignItems: 'flex-end',
  },
  peakCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FA5252',
  },
  peakLabel: {
    fontSize: 11,
    color: '#888',
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  insightBullet: {
    fontSize: 16,
    color: '#FA5252',
    marginRight: 10,
    fontWeight: 'bold',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detectionInfo: {
    flex: 1,
  },
  detectionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detectionTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  detectionBadge: {
    backgroundColor: '#FFE8E8',
    padding: 8,
    borderRadius: 8,
  },
  detectionBadgeText: {
    fontSize: 18,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  exportButton: {
    backgroundColor: '#495057',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BirdAnalyticsScreen;