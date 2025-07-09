import React, { useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function RegisterCoachScreen() {
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    siret: '',
    diploma: null as string | null,
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
    });

    if (result.assets && result.assets.length > 0) {
      setForm((prev) => ({
        ...prev,
        diploma: result.assets[0].name,
      }));
    }
  };

  const handleSubmit = () => {
    Alert.alert('Succès', 'Compte coach prêt à être créé.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Créer un compte</Text>

        <View style={styles.form}>
          {[
            { label: 'Nom', field: 'lastName' },
            { label: 'Prénom', field: 'firstName' },
            { label: 'Email', field: 'email' },
            { label: 'Portable', field: 'phone' },
            { label: 'Adresse', field: 'address' },
            { label: 'Nom de la société', field: 'company' },
            { label: 'N° de Siret', field: 'siret' },
          ].map(({ label, field }) => (
            <View key={field} style={styles.inputGroup}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={form[field as keyof typeof form] as string}
                onChangeText={(text) => handleChange(field, text)}
                placeholder={label}
                placeholderTextColor="#999"
              />
            </View>
          ))}

          {/* Upload diplôme */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diplôme</Text>
            <TouchableOpacity style={styles.input} onPress={handlePickDocument}>
              <Text style={{ color: form.diploma ? '#000' : '#999' }}>
                {form.diploma || 'Importer un fichier PDF'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Créer mon compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EB', // Fond beige général
  },
  scroll: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0D0C2B',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    backgroundColor: '#0D0C2B', // Bloc formulaire
    borderRadius: 20,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    marginBottom: 4,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 25,
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: {
    color: '#0D0C2B',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
