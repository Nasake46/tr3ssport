import React, { useState, useEffect } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { auth, firestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { styles } from '../styles/auth/Login2.styles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (redirectPath) {
      const timeout = setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [redirectPath]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        Alert.alert('Succès', 'Connexion réussie !');
        setRedirectPath(userData.role === 'coach' ? '/(tabs)/homeCoach' : '/(tabs)');
      } else {
        Alert.alert('Erreur', 'Profil utilisateur incomplet');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Portail coach</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#ccc"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#ccc"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.buttonGroup}>
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                  <Text style={styles.loginButtonText}>Se connecter</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>Créer ton compte</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Contact</Text>
        <Text style={styles.footerText}>(01) 45 35 37 83</Text>
        <Text style={styles.footerText}>contact@company.com</Text>
      </View>
    </KeyboardAvoidingView>
  );
}