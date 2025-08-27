import React, { useState } from 'react';
import { TextInput, Button, StyleSheet, View, Alert, Text, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../../firebase';
import { useRouter } from 'expo-router';

export default function RegisterCoachScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [siretNumber, setSiretNumber] = useState('');
  const [diploma, setDiploma] = useState('');
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
      
      // 1) Créer / mettre à jour le document utilisateur avec rôle par défaut 'user'
      await setDoc(doc(firestore, "users", user.uid), {
        firstName,
        lastName,
        email,
        phoneNumber,
        address,
        companyName,
        siretNumber,
        diploma,
        role: "user",
        createdAt: serverTimestamp(),
        coachApplicationStatus: 'pending',
      }, { merge: true });

      // 2) Créer une demande d'approbation coach
      await addDoc(collection(firestore, 'coachApplications'), {
        userId: user.uid,
        email,
        firstName,
        lastName,
        phoneNumber,
        address,
        companyName,
        siretNumber,
        diploma,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      console.log('Demande coach créée pour:', user.uid);
      Alert.alert('Demande envoyée', "Votre demande d'inscription coach a été transmise. Un administrateur va l'examiner.", [
        { 
          text: 'OK', 
          onPress: () => router.push('/(tabs)/LoginScreen')
        }
      ]);
      
      setEmail('');
      setPassword('');
      setPhoneNumber('');
      setFirstName('');
      setLastName('');
      setAddress('');
      setCompanyName('');
      setSiretNumber('');
      setDiploma('');
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error);
      setErrorMessage(error.message);
      Alert.alert('Erreur', `L'inscription a échoué : ${error.message}`);
    }
  };

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>Inscription Coach</Text>
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        
        <TextInput
          style={styles.input}
          placeholder="Nom"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Prénom"
          value={firstName}
          onChangeText={setFirstName}
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
        />
        
        <TextInput
          style={styles.input}
          placeholder="Adresse"
          value={address}
          onChangeText={setAddress}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Nom de la société"
          value={companyName}
          onChangeText={setCompanyName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Numéro de SIRET"
          value={siretNumber}
          onChangeText={setSiretNumber}
          keyboardType="number-pad"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Diplôme"
          value={diploma}
          onChangeText={setDiploma}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <Button title="S'inscrire comme coach" onPress={handleRegister} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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