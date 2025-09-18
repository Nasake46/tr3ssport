import React, { useState } from 'react';
import {
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { styles } from '../styles/auth/registerScreen.styles';

import { auth, firestore } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';

export default function RegisterCoachScreen() {
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    siret: '',
    diplomaTitle: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validate = () => {
    const required: (keyof typeof form)[] = [
      'lastName',
      'firstName',
      'email',
      'phone',
      'address',
      'company',
      'siret',
      'diplomaTitle',
    ];

    for (const k of required) {
      if (!String(form[k]).trim()) {
        Alert.alert('Champ manquant', `Le champ "${k}" est requis.`);
        return false;
      }
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!emailOk) {
      Alert.alert('Email invalide', 'Entrez une adresse email valide.');
      return false;
    }

    if (!auth.currentUser) {
      if (form.password.length < 6) {
        Alert.alert('Mot de passe', 'Minimum 6 caractères.');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        Alert.alert('Mot de passe', 'Les mots de passe ne correspondent pas.');
        return false;
      }
    }

    return true;
  };

  const translateAuthError = (code?: string) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return "Cette adresse email est déjà utilisée.";
      case 'auth/invalid-email':
        return "Adresse email invalide.";
      case 'auth/weak-password':
        return "Mot de passe trop faible (6 caractères minimum).";
      case 'auth/network-request-failed':
        return "Problème réseau. Vérifiez votre connexion internet et réessayez.";
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const emailLower = form.email.trim().toLowerCase();
      let uid = auth.currentUser?.uid ?? null;

      if (!uid) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, emailLower, form.password);
          uid = cred.user.uid;
          const displayName = `${form.firstName.trim()} ${form.lastName.trim()}`;
          try { await updateProfile(cred.user, { displayName }); } catch {}
        } catch (authErr: any) {
          const msg = translateAuthError(authErr?.code) || authErr?.message;
          Alert.alert('Inscription', msg);
          setSubmitting(false);
          return;
        }
      }

      // 1) Créer/mettre à jour le doc user
      await setDoc(
        doc(firestore, 'users', uid!),
        {
          email: emailLower,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phoneNumber: form.phone.trim(),
          address: form.address.trim(),
          companyName: form.company.trim(),
          siretNumber: form.siret.trim(),
          diploma: form.diplomaTitle.trim(),
          coachApplicationStatus: 'pending',
          coachApprovedAt: null,
          roleRequest: 'coach',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2) Créer la demande côté admin
      await addDoc(collection(firestore, 'coachApplications'), {
        userId: uid!,
        email: emailLower,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: form.phone.trim(),
        address: form.address.trim(),
        companyName: form.company.trim(),
        siretNumber: form.siret.trim(),
        diploma: form.diplomaTitle.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Demande envoyée',
        'Votre demande de compte coach a bien été transmise. Un administrateur va la traiter.'
      );
    } catch (err: any) {
      const msg = translateAuthError(err?.code) || err?.message || 'Une erreur est survenue.';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Créer un compte coach</Text>

        <View style={styles.form}>
          {[
            { label: 'Nom', field: 'lastName' },
            { label: 'Prénom', field: 'firstName' },
            { label: 'Email', field: 'email' },
            { label: 'Portable', field: 'phone' },
            { label: 'Adresse', field: 'address' },
            { label: 'Nom de la société', field: 'company' },
            { label: 'N° de Siret', field: 'siret' },
            { label: 'Diplôme (intitulé)', field: 'diplomaTitle' },
          ].map(({ label, field }) => (
            <View key={field} style={styles.inputGroup}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={(form as any)[field]}
                onChangeText={t => handleChange(field as any, t)}
                placeholder={label}
                placeholderTextColor="#999"
                autoCapitalize={field === 'email' ? 'none' : 'sentences'}
              />
            </View>
          ))}

          {!auth.currentUser && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mot de passe</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={form.password}
                  onChangeText={t => handleChange('password', t)}
                  placeholder="••••••"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmer le mot de passe</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={form.confirmPassword}
                  onChangeText={t => handleChange('confirmPassword', t)}
                  placeholder="••••••"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Envoyer la demande</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
