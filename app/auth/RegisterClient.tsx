import React, { useState } from 'react';
import {
  TextInput,
  View,
  Alert,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { useRouter } from 'expo-router';
import { styles } from '../styles/auth/RegisterClient.styles';

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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(firestore, 'users', user.uid), {
        firstName,
        lastName,
        email,
        phoneNumber,
        role: 'user',
        createdAt: new Date(),
      });

      Alert.alert('Succès', 'Votre compte a été créé avec succès !');
      router.push('/(tabs)/HomeScreen');

      setEmail('');
      setPassword('');
      setPhoneNumber('');
      setFirstName('');
      setLastName('');
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage(error.message);
      Alert.alert('Erreur', `L'inscription a échoué : ${error.message}`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Créer un compte</Text>
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <View style={styles.formCard}>
          <Text style={styles.label}>Prénom</Text>
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Numéro de téléphone</Text>
          <TextInput
            style={styles.input}
            placeholder="Numéro de téléphone"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Créer mon compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
