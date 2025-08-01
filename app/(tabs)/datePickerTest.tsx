import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const DatePickerTestScreen = () => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleWebDateChange = (event: any) => {
    const dateString = event.target.value;
    if (dateString) {
      const selectedDate = new Date(dateString);
      setSelectedDate(selectedDate);
      Alert.alert(
        'Date sélectionnée (Web)',
        `Vous avez choisi: ${selectedDate.toLocaleDateString('fr-FR')}`
      );
    } else {
      setSelectedDate(null);
    }
  };

  const handleMobileDateSelect = () => {
    // Pour ce test, on sélectionne simplement demain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
    Alert.alert(
      'Date sélectionnée (Mobile)',
      `Vous avez choisi: ${tomorrow.toLocaleDateString('fr-FR')}`
    );
  };

  const formatSelectedDate = (date: Date | null) => {
    if (!date) return 'Sélectionner une date';
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const renderWebDatePicker = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>Sélecteur Web (HTML5)</Text>
      <input
        type="date"
        value={formatDateForInput(selectedDate)}
        onChange={handleWebDateChange}
        min={new Date().toISOString().split('T')[0]}
        style={{
          width: '100%',
          padding: 12,
          border: '1px solid #ddd',
          borderRadius: 8,
          fontSize: 16,
          backgroundColor: '#fff',
          outline: 'none',
        }}
      />
    </View>
  );

  const renderMobileDatePicker = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>Sélecteur Mobile (Custom)</Text>
      <TouchableOpacity 
        style={styles.datePickerButton}
        onPress={handleMobileDateSelect}
      >
        <Ionicons name="calendar-outline" size={20} color="#666" />
        <Text style={[
          styles.datePickerText,
          !selectedDate && styles.placeholderText
        ]}>
          {formatSelectedDate(selectedDate)}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test DatePicker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Test du sélecteur de date cross-platform</Text>
        <Text style={styles.subtitle}>
          Plateforme actuelle: <Text style={styles.platform}>{Platform.OS}</Text>
        </Text>
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            Ce test montre comment le sélecteur de date s'adapte automatiquement selon la plateforme.
          </Text>
        </View>

        {Platform.OS === 'web' ? renderWebDatePicker() : renderMobileDatePicker()}
        
        {selectedDate && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Résultat:</Text>
            <View style={styles.resultRow}>
              <Ionicons name="calendar" size={16} color="#666" />
              <Text style={styles.resultText}>
                Date: {selectedDate.toLocaleDateString('fr-FR')}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Ionicons name="code" size={16} color="#666" />
              <Text style={styles.resultText}>
                ISO: {selectedDate.toISOString()}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSelectedDate(null)}
            >
              <Ionicons name="close-circle" size={16} color="#F44336" />
              <Text style={styles.clearText}>Effacer la sélection</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.featuresBox}>
          <Text style={styles.featuresTitle}>Fonctionnalités:</Text>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Compatible Web et Mobile</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Interface native pour chaque plateforme</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Validation de date minimum</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Format français</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  platform: {
    fontWeight: 'bold',
    color: '#7667ac',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    gap: 8,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  clearText: {
    color: '#F44336',
    fontSize: 14,
    marginLeft: 4,
  },
  featuresBox: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C8',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#388E3C',
    marginLeft: 8,
  },
});

export default DatePickerTestScreen;
