import React, { useState, useEffect } from 'react';
import { TextInput, Button, StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import { auth, firestore } from '@/firebase';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  expo: 'TON_CLIENT_ID_EXPO_APPS',
  ios: 'TON_CLIENT_ID_IOS',
  android: 'TON_CLIENT_ID_ANDROID',
  web: 'TON_CLIENT_ID_WEB',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState<'/(tabs)/homeCoach' | '/(tabs)' | null>(null);
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_IDS.expo,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    webClientId: GOOGLE_CLIENT_IDS.web,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (!idToken) {
        Alert.alert('Erreur', 'Token Google manquant.');
        return;
      }

      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          const userDoc = await getDoc(doc(firestore, "users", userCredential.user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            Alert.alert('Succès', 'Connexion réussie avec Google !');
            setRedirectPath(userData.role === 'coach' ? '/(tabs)/homeCoach' : '/(tabs)');
          } else {
            Alert.alert('Erreur', 'Profil utilisateur incomplet');
          }
        })
        .catch((error) => {
          console.error(error);
          Alert.alert('Erreur', 'Échec de connexion Google.');
        });
    }
  }, [response]);

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
      const userDoc = await getDoc(doc(firestore, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        Alert.alert('Succès', 'Connexion réussie !');
        setRedirectPath(userData.role === 'coach' ? '/(tabs)/homeCoach' : '/(tabs)');
      } else {
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

      <View style={{ marginTop: 20 }}>
        <Button
          title="Connexion avec Google"
          onPress={() => promptAsync()}
          disabled={!request}
        />
      </View>
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
