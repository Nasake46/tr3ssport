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
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const router = useRouter();

  // Effet pour gérer la redirection
  useEffect(() => {
    if (redirectPath) {
      const timeout = setTimeout(() => {
        router.replace(redirectPath);
      }, 500); // Petit délai pour laisser l'alerte s'afficher
      
      return () => clearTimeout(timeout);
    }
  }, [redirectPath, router]);

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
        
        // Afficher l'alerte de succès
        Alert.alert('Succès', 'Connexion réussie !');
        
        // Définir le chemin de redirection en fonction du rôle
        if (userData.role === 'coach') {
          setRedirectPath('/(tabs)/homeCoach');
        } else {
          setRedirectPath('/(tabs)');
        }
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