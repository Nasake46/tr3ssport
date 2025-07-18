import React, { useState } from 'react';
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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Succès', 'Connexion réussie !');
      router.replace('/(tabs)');
    }, 1000);
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

        <Text style={styles.forgot}>Mot de passe oublié ?</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#F4AF00" />
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

      <View style={styles.bottomSection}>
        <View style={styles.separator}>
          <View style={styles.line} />
          <Text style={styles.or}>Continuer avec</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.socials}>
          <Text style={styles.social}>G</Text>
          <Text style={styles.social}>f</Text>
          <Text style={styles.social}></Text>
        </View>

        <TouchableOpacity>
          <Text style={styles.coachLink}>Vous êtes coach ?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Contact</Text>
        <Text style={styles.footerText}>(01) 45 35 37 83</Text>
        <Text style={styles.footerText}>contact@company.com</Text>
      </View>
    </KeyboardAvoidingView>
  );
}