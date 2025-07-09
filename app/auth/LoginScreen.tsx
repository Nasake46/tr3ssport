import React, { useState } from 'react';
import {
  TextInput,
  StyleSheet,
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
      <View style={styles.content}>
        <Image source={require('@/assets/images/logoT.png')} style={styles.logo} />

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
          <ActivityIndicator size="large" color="#0D0C2B" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F3',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    color: '#0D0C2B',
    fontWeight: '600',
    marginBottom: 24,
  },
  input: {
    height: 48,
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 25,
    paddingHorizontal: 16,
    color: '#000',
    marginBottom: 16,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    color: '#444',
    fontSize: 12,
  },
  loginButton: {
    backgroundColor: '#0D0C2B',
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#aaa',
  },
  or: {
    marginHorizontal: 8,
    color: '#555',
    fontSize: 12,
  },
  socials: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  social: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D0C2B',
  },
  coachLink: {
    fontSize: 14,
    color: '#0D0C2B',
    textDecorationLine: 'underline',
  },
  footer: {
    backgroundColor: '#0D0C2B',
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  footerText: {
    color: '#fff',
    fontSize: 12,
  },
});
