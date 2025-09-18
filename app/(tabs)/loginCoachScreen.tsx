import React, { useState } from 'react';
import { TextInput, Button, StyleSheet, View, Alert } from 'react-native';
import { auth, firestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function loginCoachScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Connexion coach réussie:', userCredential.user);
      Alert.alert('Succès', 'Connexion réussie');
      Alert.alert('Succès', 'Connexion réussie');
    } catch (error) {
      console.error('Erreur de connexion:', error);
      Alert.alert('Erreur', 'Impossible de se connecter. Vérifiez vos identifiants.');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Se connecter" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
});