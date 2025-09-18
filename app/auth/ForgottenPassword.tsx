import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';

const COLORS = {
  bg: '#FFFFFF',
  text: '#0F473C',
  sub: '#3D6B60',
  primary: '#0E6B5A',
  line: '#E5E7EB',
};

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const e = email.trim();
    if (!e) return Alert.alert('Email requis', 'Entre ton adresse email.');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, e);
      Alert.alert('Email envoyé', 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe. (celui-ci peut être dans les spams)');
      router.back();
    } catch (err: any) {
      const msg =
        err?.code === 'auth/user-not-found'
          ? "Aucun compte avec cet email."
          : err?.code === 'auth/invalid-email'
          ? "Email invalide."
          : "Une erreur est survenue.";
      Alert.alert('Oups', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mot de passe oublié</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Form */}
      <View style={styles.card}>
        <Text style={styles.label}>Adresse email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="ton.email@exemple.com"
          placeholderTextColor="#8CA9A1"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Envoyer le lien</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 12, alignSelf: 'center' }} onPress={() => router.back()}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, marginBottom: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 8,
  },
  label: { color: COLORS.sub, marginBottom: 8, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text,
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14,
  },
  btnTxt: { color: '#fff', fontWeight: '800' },
});
