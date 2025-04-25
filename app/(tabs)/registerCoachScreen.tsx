import React, { useState } from 'react';
import { TextInput, Text, TouchableOpacity, StyleSheet, View, Alert } from 'react-native';

export default function RegisterCoachScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [siretNumber, setSiretNumber] = useState('');
  const [diploma, setDiploma] = useState('');

  const handleRegister = () => {
    console.log('Prénom:', firstName);
    console.log('Nom:', lastName);
    console.log('Email:', email);
    console.log('Téléphone:', phone);
    console.log('Adresse:', address);
    console.log('Nom de la société:', companyName);
    console.log('Numéro de SIRET:', siretNumber);
    console.log('Diplôme:', diploma);
    Alert.alert('Succès', 'Inscription réussie');
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Inscription Coach</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Prénom</Text>
        <TextInput
          style={styles.input}
          placeholder="Prénom"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Nom</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="example@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Téléphone</Text>
        <TextInput
          style={styles.input}
          placeholder="(+33) 06 -- -- -- --"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Adresse</Text>
        <TextInput
          style={styles.input}
          placeholder="Adresse"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Nom de la société</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom de la société"
          value={companyName}
          onChangeText={setCompanyName}
        />

        <Text style={styles.label}>Numéro de SIRET</Text>
        <TextInput
          style={styles.input}
          placeholder="Numéro de SIRET"
          value={siretNumber}
          onChangeText={setSiretNumber}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Diplôme</Text>
        <TextInput
          style={styles.input}
          placeholder="Diplôme"
          value={diploma}
          onChangeText={setDiploma}
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Créer mon compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3F3D56',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    backgroundColor: '#F5F3FE',
    borderRadius: 20,
    padding: 20,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#3F3D56',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#5C4D91',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});