import React, { useState } from 'react';
import { TextInput, Button, StyleSheet, View, Alert, Text } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password) {
      setErrorMessage('Veuillez entrer votre email et votre mot de passe.');
      return;
    }

    try {
      // 1. Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Ajouter les informations supplémentaires dans Firestore avec le rôle "user"
      await setDoc(doc(firestore, "users", user.uid), {
        firstName,
        lastName,
        email,
        phoneNumber,
        role: "user", // Définir le rôle comme "user"
        createdAt: new Date()
      });
      
      console.log('Utilisateur enregistré:', user);
      Alert.alert('Succès', 'Votre compte a été créé avec succès !');
      router.push('/(tabs)/LoginScreen');
      
      // Réinitialiser les champs après l'inscription
      setEmail('');
      setPassword('');
      setPhoneNumber('');
      setFirstName('');
      setLastName('');
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error);
      setErrorMessage(error.message);
      Alert.alert('Erreur', `L'inscription a échoué : ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Nom"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Prénom"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
      />
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
        placeholder="Numéro de téléphone"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="S'inscrire" onPress={handleRegister} />
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
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});