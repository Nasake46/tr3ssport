import React, { useState, useEffect } from 'react';
import {
  TextInput,
  View,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { styles } from '../styles/auth/LoginScreen.styles';

// Firebase
import { auth, firestore } from '@/firebase';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Google sign-in (Expo)
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
  const router = useRouter();

  // Google auth request
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_IDS.expo,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    webClientId: GOOGLE_CLIENT_IDS.web,
    responseType: 'id_token',
  });

  // Handle Google response
  useEffect(() => {
    const run = async () => {
      if (response?.type !== 'success') return;
      const idToken = response.authentication?.idToken;
      if (!idToken) {
        Alert.alert('Erreur', 'Token Google manquant.');
        return;
      }
      try {
        setLoading(true);
        const credential = GoogleAuthProvider.credential(idToken);
        const userCred = await signInWithCredential(auth, credential);
        const snap = await getDoc(doc(firestore, 'users', userCred.user.uid));
        if (!snap.exists()) {
          Alert.alert('Erreur', 'Profil utilisateur incomplet');
          return;
        }
        const data = snap.data() as { role?: string };
        Alert.alert('Succès', 'Connexion réussie avec Google !');
        if (data.role === 'coach') router.replace('/(tabs)/homeCoach');
        else router.replace('/(tabs)/HomeScreen');
      } catch (e) {
        console.error(e);
        Alert.alert('Erreur', 'Échec de connexion Google.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    try {
      setLoading(true);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(firestore, 'users', userCred.user.uid));
      if (!snap.exists()) {
        Alert.alert('Erreur', 'Profil utilisateur incomplet');
        return;
      }
      const data = snap.data() as { role?: string };
      Alert.alert('Succès', 'Connexion réussie !');
      if (data.role === 'coach' || data.role === 'admin') router.replace('/(tabs)/homeCoach');
      else router.replace('/(tabs)/HomeScreen');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de se connecter. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Image source={require('@/assets/images/logoT.png')} style={styles.logo} />

      <View style={styles.formContainer}>
        <Text style={styles.title}>Connexion</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#555"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#555"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.forgot} onPress={() => router.push('/auth/ForgottenPassword')}>Mot de passe oublié ?</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#F4AF00" />
        ) : (
          <>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Se connecter</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineButton} onPress={() => router.push('/auth/RegisterClient')}>
              <Text style={styles.outlineButtonText}>Créer ton compte</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.separator}>
          <View style={styles.line} />
          <Text style={styles.or}>Continuer avec</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.socials}>
          <TouchableOpacity
            onPress={() => promptAsync()}
            disabled={!request || loading}
            style={{ opacity: !request || loading ? 0.5 : 1 }}
          >
            <Text style={styles.social}>G</Text>
          </TouchableOpacity>

          <Text style={styles.social}>f</Text>
          <Text style={styles.social}></Text>
        </View>

        <TouchableOpacity onPress={() => router.push('/auth/Login2')}>
          <Text style={styles.coachLink}>Vous êtes coach ?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Contact</Text>
        <Text style={styles.footerText}>06 79 41 14 38</Text>
        <Text style={styles.footerText}>direction@tressport.fr</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
