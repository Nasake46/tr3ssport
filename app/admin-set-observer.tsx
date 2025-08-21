import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as userService from '../services/userService';
import { router } from 'expo-router';

export default function AdminSetObserverScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  const setObserver = async () => {
    const target = email.trim().toLowerCase();
    if (!target) { setMessage('Email requis'); setSuccess(false); return; }
    setLoading(true); setMessage(null); setSuccess(null);
    try {
      const all = await userService.getAllUsers();
      const found = all.find((u: userService.User) => (u.email || '').toLowerCase() === target);
      if (!found) {
        setMessage('Utilisateur introuvable');
        setSuccess(false);
        return;
      }
      await userService.updateUserRole(found.id, 'observer' as any);
      setMessage('Rôle défini sur Observateur ✅');
      setSuccess(true);
    } catch (e: any) {
      console.error('Erreur set observer:', e);
      const raw = e?.message || '';
      if (raw.includes('Missing or insufficient permissions')) {
        setMessage('Permissions insuffisantes ou règles non déployées.');
      } else {
        setMessage(raw || 'Erreur');
      }
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#333" />
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Donner le rôle Observateur</Text>
      <Text style={styles.subtitle}>Accès lecture seule au dashboard admin. Action réservée aux administrateurs.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="user@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity style={[styles.button, loading && {opacity:0.6}]} onPress={setObserver} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Définir Observateur</Text>}
        </TouchableOpacity>
        {message && (
          <Text style={[styles.message, success === true ? styles.success : success === false ? styles.error : null]}>
            {message}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  backText: { fontSize: 14, color: '#333' },
  title: { fontSize: 22, fontWeight: '700', color: '#222' },
  subtitle: { fontSize: 13, color: '#555', marginTop: 4, marginBottom: 18 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  label: { fontSize: 12, fontWeight: '600', color: '#444' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#6c757d', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  message: { fontSize: 12, marginTop: 6 },
  success: { color: '#1b7f3b' },
  error: { color: '#c62828' },
});
