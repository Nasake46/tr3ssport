import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { CreatePerformanceTestInput, TestFamily, UnitType } from '@/models/performanceTest';

const families: { key: TestFamily; label: string }[] = [
  { key: 'cardio', label: 'Cardio-vasculaire' },
  { key: 'mobilite_souplesse', label: 'Mobilité et Souplesse' },
  { key: 'force_tonicite', label: 'Force & Tonicité' },
  { key: 'fonctionnels', label: 'Fonctionnels' },
  { key: 'posture_stabilite', label: 'Posture et Stabilité' },
];

const units: { key: UnitType; label: string }[] = [
  { key: 'none', label: 'Sans unité (valeur brute)' },
  { key: 'distance', label: 'Longueurs (km, m...)' },
  { key: 'mass', label: 'Masses (kg, g...)' },
  { key: 'capacity', label: 'Capacités / volumes' },
  { key: 'time', label: 'Temps (h, min, s)' },
  { key: 'area', label: 'Aires' },
  { key: 'percent', label: 'Pourcentage (%)' },
  { key: 'degree', label: 'Degrés (°)' },
  { key: 'frequency', label: 'Fréquence' },
  { key: 'speed', label: 'Vitesse' },
  { key: 'power', label: 'Puissance (Watt)' },
];

export interface PerformanceTestFormProps {
  appointmentId: string;
  userId: string;  // client
  coachId: string;
  onSubmit: (input: CreatePerformanceTestInput) => Promise<void>;
}

export default function PerformanceTestForm({ appointmentId, userId, coachId, onSubmit }: PerformanceTestFormProps) {
  const [family, setFamily] = useState<TestFamily>('cardio');
  const [testName, setTestName] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('none');
  const [unitLabel, setUnitLabel] = useState('');
  const [valueNumber, setValueNumber] = useState<string>('');
  const [valueText, setValueText] = useState('');
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    if (!testName.trim()) return false;
    if (unitType === 'none') {
      return valueText.trim().length > 0 || (!!valueNumber && !isNaN(Number(valueNumber)));
    }
    // si unité, au moins l'un des deux
    return valueText.trim().length > 0 || (!!valueNumber && !isNaN(Number(valueNumber)));
  }, [testName, unitType, valueNumber, valueText]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const input: CreatePerformanceTestInput = {
        appointmentId,
        userId,
        coachId,
        family,
        testName: testName.trim(),
        unitType,
        unitLabel: unitLabel.trim() || undefined,
        valueNumber: valueNumber ? Number(valueNumber) : undefined,
        valueText: valueText.trim() || undefined,
        testDate: new Date(testDate),
      };
      await onSubmit(input);
      setTestName('');
      setUnitLabel('');
      setValueNumber('');
      setValueText('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un test de performance</Text>

      <Text style={styles.label}>Famille</Text>
      <View style={styles.rowWrap}>
        {families.map(f => (
          <TouchableOpacity key={f.key} style={[styles.chip, family === f.key && styles.chipSelected]} onPress={() => setFamily(f.key)}>
            <Text style={[styles.chipText, family === f.key && styles.chipTextSelected]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Nom du test</Text>
      <TextInput style={styles.input} value={testName} onChangeText={setTestName} placeholder="Ex: VMA demi-cooper" />

      <Text style={styles.label}>Unité de mesure</Text>
      <View style={styles.rowWrap}>
        {units.map(u => (
          <TouchableOpacity key={u.key} style={[styles.chip, unitType === u.key && styles.chipSelected]} onPress={() => setUnitType(u.key)}>
            <Text style={[styles.chipText, unitType === u.key && styles.chipTextSelected]}>{u.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Libellé d'unité (optionnel)</Text>
      <TextInput style={styles.input} value={unitLabel} onChangeText={setUnitLabel} placeholder="Ex: kg, km/h, %" />

      <Text style={styles.label}>Valeur numérique (optionnel)</Text>
      <TextInput style={styles.input} value={valueNumber} onChangeText={setValueNumber} placeholder="Ex: 12.5" keyboardType="numeric" />

      <Text style={styles.label}>Valeur texte (optionnel)</Text>
      <TextInput style={styles.input} value={valueText} onChangeText={setValueText} placeholder={'Ex: 12:30 (mm:ss)'} />

      <Text style={styles.label}>Date</Text>
      <TextInput style={styles.input} value={testDate} onChangeText={setTestDate} placeholder="YYYY-MM-DD" />

      <TouchableOpacity style={[styles.submitBtn, !canSubmit || saving ? styles.submitDisabled : undefined]} disabled={!canSubmit || saving} onPress={handleSubmit}>
        <Text style={styles.submitText}>{saving ? 'Enregistrement...' : 'Enregistrer le test'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', borderRadius: 8, padding: 16, margin: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 14, color: '#444', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 16, marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#333' },
  chipTextSelected: { color: 'white' },
  submitBtn: { marginTop: 16, backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  submitDisabled: { backgroundColor: '#aac9ff' },
  submitText: { color: 'white', fontWeight: 'bold' },
});
