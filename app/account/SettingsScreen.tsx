import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [firstName, setFirstName] = useState('Nathalie');
  const [lastName, setLastName] = useState('Marina');
  const [email, setEmail] = useState('nathalie.s@gmail.com');
  const [phone, setPhone] = useState('+33 6 12 34 56 78');
  const [address, setAddress] = useState('123 Rue Exemple, Paris');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Paramètres du compte</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Prénom</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
        </View>
        <View style={styles.line} />

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Nom</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
        </View>
        <View style={styles.line} />

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        </View>
        <View style={styles.line} />

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.line} />

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Adresse</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />
        </View>
        <View style={styles.line} />

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="********"
          />
        </View>

        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveText}>Enregistrer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5D5A88',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldBlock: {
    marginBottom: 10,
  },
  label: {
    fontWeight: 'bold',
    color: '#5D5A88',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D4D2E3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  line: {
    width: '100%',
    height: 1,
    backgroundColor: '#D4D2E3',
    marginVertical: 12,
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: '#5D5A88',
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});
