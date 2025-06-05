import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerTestProps {
  onDateSelect: (date: Date | null) => void;
  selectedDate: Date | null;
}

const DatePickerTest: React.FC<DatePickerTestProps> = ({ onDateSelect, selectedDate }) => {
  const [showDateModal, setShowDateModal] = useState(false);

  const handleWebDateChange = (event: any) => {
    const dateString = event.target.value;
    if (dateString) {
      const selectedDate = new Date(dateString);
      onDateSelect(selectedDate);
    } else {
      onDateSelect(null);
    }
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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Test DatePicker Web</Text>
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
        {selectedDate && (
          <Text style={styles.selectedText}>
            Date sélectionnée: {formatSelectedDate(selectedDate)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Test DatePicker Mobile</Text>
      <TouchableOpacity 
        style={styles.datePickerButton}
        onPress={() => {
          // Pour ce test, on sélectionne simplement demain
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          onDateSelect(tomorrow);
        }}
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
      {selectedDate && (
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={() => onDateSelect(null)}
        >
          <Text style={styles.clearText}>Effacer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
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
  selectedText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  clearButton: {
    marginTop: 8,
    padding: 8,
  },
  clearText: {
    color: '#7667ac',
    fontSize: 14,
  },
});

export default DatePickerTest;
