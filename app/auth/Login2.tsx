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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (redirectPath) {
      const timeout = setTimeout(() => {
        router.replace(redirectPath);
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0C2B',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    color: '#fff',
    marginBottom: 16,
  },
  buttonGroup: {
    marginTop: 24, // ⬅️ espace entre inputs et boutons
    gap: 12,
  },
  loginButton: {
    backgroundColor: '#E5E2DA',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#0D0C2B',
    fontWeight: 'bold',
    fontSize: 16,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    backgroundColor: '#E5E2DA',
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerTitle: {
    color: '#0D0C2B',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  footerText: {
    color: '#0D0C2B',
    fontSize: 12,
  },
});
