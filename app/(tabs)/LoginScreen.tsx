import React, { useState, useEffect } from 'react';
import { TextInput, Button, StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import { auth, firestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false); // Nouvel état pour suivre l'authentification
  const router = useRouter();

  // Redirection automatique après authentification réussie
  useEffect(() => {
    if (authenticated) {
      // Utilisation de setTimeout pour laisser le temps à React de se mettre à jour
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 300);
    }
  }, [authenticated, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Connexion réussie:', userCredential.user);
      
      // Récupérer le rôle de l'utilisateur depuis Firestore
      const userDoc = await getDoc(doc(firestore, "users", userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("Rôle de l'utilisateur:", userData.role);
        
        // Afficher un message de succès SANS redirection dans l'alerte
        Alert.alert('Succès', 'Connexion réussie !');
        
        // Marquer l'authentification comme réussie (déclenchera useEffect)
        setAuthenticated(true);
      } else {
        // L'utilisateur n'a pas de document dans Firestore
        Alert.alert('Erreur', 'Profil utilisateur incomplet');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      Alert.alert('Erreur', 'Impossible de se connecter. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
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
      
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Se connecter" onPress={handleLogin} />
      )}
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