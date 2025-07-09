import React, { useState } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  Alert,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
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
        <View style={styles.logoContainer}>
      <Image
        source={require('@/assets/images/logoT.png')}
        style={styles.logo}
      />
  </View>
        <Text style={styles.title}>Créer un compte</Text>

        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Nom"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Prénom"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Numéro de téléphone"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>S'inscrire</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EB', // fond beige clair de la maquette
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 25,
    height: 48,
    paddingHorizontal: 16,
    color: '#000',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  button: {
    backgroundColor: '#0D0C2B',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  logoContainer: {
  alignItems: 'center',
  marginBottom: 12,
},
    logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 12,
  },
});
