import React, { useState } from 'react';
import { TextInput, Button, StyleSheet, View, Alert, Text, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../../firebase';
import { useRouter } from 'expo-router';

export default function RegisterCoachScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [siretNumber, setSiretNumber] = useState('');
  const [diploma, setDiploma] = useState('');

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
