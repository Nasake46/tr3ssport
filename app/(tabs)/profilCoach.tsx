// profilCoach.tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, ActivityIndicator, TextInput, Alert, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  oxford: '#121631',   // bleu foncé
  line:   '#E5E7EB',   // séparateurs
  textSub:'#667085',
  white:  '#FFFFFF',
};

export default function ProfileCoachScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(edit === '1');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
    companyName: '',
    siretNumber: '',
    diploma: '',
    bio: '',
    profileImageUrl: '',
    pricePerHour: '',
    seniorityYears: '',
    specialtiesText: '',
    serviceAreasText: '',
    videoUrl: '',
    locationLat: '',
    locationLng: '',
  });

  useEffect(() => {
    const run = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace('/(tabs)');
          return;
        }
        const ref = doc(firestore, 'users', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d: any = snap.data();
          setForm({
            firstName: d.firstName || '',
            lastName: d.lastName || '',
            phoneNumber: d.phoneNumber || '',
            address: d.address || '',
            companyName: d.companyName || '',
            siretNumber: d.siretNumber || '',
            diploma: d.diploma || '',
            bio: d.bio || '',
            profileImageUrl: d.profileImageUrl || '',
            pricePerHour: d.pricePerHour?.toString?.() || '',
            seniorityYears: d.seniorityYears?.toString?.() || '',
            specialtiesText: Array.isArray(d.specialties) ? d.specialties.join(', ') : '',
            serviceAreasText: Array.isArray(d.serviceAreas) ? d.serviceAreas.join(', ') : '',
            videoUrl: d.videoUrl || '',
            locationLat: d.location?.lat?.toString?.() || '',
            locationLng: d.location?.lng?.toString?.() || '',
          });
        }
      } catch (e) {
        Alert.alert('Erreur', "Impossible de charger votre profil");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const toNumber = (v: string) => {
    const n = parseFloat((v || '').replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  };
  const toArray = (v: string) => (v || '').split(',').map(s => s.trim()).filter(Boolean);

  const save = async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }
      await updateDoc(doc(firestore, 'users', user.uid), {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        address: form.address,
        companyName: form.companyName,
        siretNumber: form.siretNumber,
        diploma: form.diploma,
        bio: form.bio,
        profileImageUrl: form.profileImageUrl || null,
        pricePerHour: toNumber(form.pricePerHour),
        seniorityYears: toNumber(form.seniorityYears),
        specialties: toArray(form.specialtiesText),
        serviceAreas: toArray(form.serviceAreasText),
        videoUrl: form.videoUrl || null,
        location:
          toNumber(form.locationLat) !== undefined && toNumber(form.locationLng) !== undefined
            ? { lat: toNumber(form.locationLat)!, lng: toNumber(form.locationLng)! }
            : null,
        updatedAt: new Date(),
      });
      setIsEditing(false);
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'enregistrer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll}>
      <View style={styles.container}>
        {/* Titre */}
        <View style={styles.headerRow}>
  <TouchableOpacity
    style={styles.backBtn}
    onPress={() => (router.replace('/homeCoach'))}
  >
    <Ionicons name="chevron-back" size={20} color={COLORS.oxford} />
  </TouchableOpacity>

  <Text style={styles.h1}>Mon profil coach</Text>

  {/* espaceur pour équilibrer la ligne */}
  <View style={{ width: 36 }} />
</View>


        {/* Actions sous le titre */}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.secondary} onPress={() => setIsEditing(e => !e)}>
            <Ionicons name={isEditing ? 'eye' : 'create'} size={18} color={COLORS.oxford} />
            <Text style={styles.secondaryTxt}>{isEditing ? 'Prévisualiser' : 'Modifier'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primary, { opacity: isEditing ? 1 : 0.6 }]}
            disabled={!isEditing || saving}
            onPress={save}
          >
            <Text style={styles.primaryTxt}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>

        {/* Infos personnelles */}
        <View style={styles.section}>
          <Text style={styles.h2}>Informations personnelles</Text>
          {isEditing ? (
            <>
              <Field label="Prénom" value={form.firstName} onChange={v => setForm({ ...form, firstName: v })} />
              <Field label="Nom" value={form.lastName} onChange={v => setForm({ ...form, lastName: v })} />
              <Field label="Téléphone" value={form.phoneNumber} onChange={v => setForm({ ...form, phoneNumber: v })} />
              <Field label="Adresse" value={form.address} onChange={v => setForm({ ...form, address: v })} />
            </>
          ) : (
            <>
              <Row label="Nom" value={`${form.firstName} ${form.lastName}`.trim() || '—'} />
              <Row label="Téléphone" value={form.phoneNumber || '—'} />
              <Row label="Adresse" value={form.address || '—'} />
            </>
          )}
        </View>

        {/* Infos pro */}
        <View style={styles.section}>
          <Text style={styles.h2}>Informations professionnelles</Text>
          {isEditing ? (
            <>
              <Field label="Entreprise" value={form.companyName} onChange={v => setForm({ ...form, companyName: v })} />
              <Field label="SIRET" value={form.siretNumber} onChange={v => setForm({ ...form, siretNumber: v })} />
              <Field label="Diplôme" value={form.diploma} onChange={v => setForm({ ...form, diploma: v })} />
            </>
          ) : (
            <>
              <Row label="Entreprise" value={form.companyName || '—'} />
              <Row label="SIRET" value={form.siretNumber || '—'} />
              <Row label="Diplôme" value={form.diploma || '—'} />
            </>
          )}
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.h2}>À propos de moi</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.bio}
              onChangeText={v => setForm({ ...form, bio: v })}
              placeholder="Présentez-vous..."
              multiline
            />
          ) : (
            <Text style={styles.p}>{form.bio || '—'}</Text>
          )}
        </View>

        {/* Page coach (public) */}
        <View style={styles.section}>
          <Text style={styles.h2}>Page coach (public)</Text>

          {isEditing ? (
            <>
              <Field label="Photo (URL)" value={form.profileImageUrl} onChange={v => setForm({ ...form, profileImageUrl: v })} />
              <Field label="Tarif €/h" value={form.pricePerHour} onChange={v => setForm({ ...form, pricePerHour: v })} keyboardType="decimal-pad" />
              <Field label="Ancienneté (années)" value={form.seniorityYears} onChange={v => setForm({ ...form, seniorityYears: v })} keyboardType="number-pad" />
              <Field label="Spécialités (séparées par des virgules)" value={form.specialtiesText} onChange={v => setForm({ ...form, specialtiesText: v })} />
              <Field label="Zones d’intervention (séparées par des virgules)" value={form.serviceAreasText} onChange={v => setForm({ ...form, serviceAreasText: v })} />
              <Field label="Vidéo (YouTube)" value={form.videoUrl} onChange={v => setForm({ ...form, videoUrl: v })} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Latitude" value={form.locationLat} onChange={v => setForm({ ...form, locationLat: v })} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Longitude" value={form.locationLng} onChange={v => setForm({ ...form, locationLng: v })} keyboardType="decimal-pad" />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.secondary, { marginTop: 8, alignSelf: 'flex-start' }]}
                onPress={() => router.push({ pathname: '/coachScreen', params: { coachId: auth.currentUser?.uid || '' } })}
              >
                <Ionicons name="eye" size={18} color={COLORS.oxford} />
                <Text style={styles.secondaryTxt}>Prévisualiser ma page coach</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Row label="Tarif" value={form.pricePerHour ? `${form.pricePerHour} €/h` : '—'} />
              <Row label="Ancienneté" value={form.seniorityYears ? `${form.seniorityYears} ans` : '—'} />
              <Row label="Spécialités" value={form.specialtiesText || '—'} />
              <Row label="Zones" value={form.serviceAreasText || '—'} />
              <TouchableOpacity
                style={[styles.secondary, { marginTop: 8, alignSelf: 'flex-start' }]}
                onPress={() => router.push({ pathname: '/coachScreen', params: { coachId: auth.currentUser?.uid || '' } })}
              >
                <Ionicons name="eye" size={18} color={COLORS.oxford} />
                <Text style={styles.secondaryTxt}>Voir ma page coach</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 13, color: COLORS.textSub, marginBottom: 6 }}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType={keyboardType} placeholder="" />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ color: COLORS.textSub }}>{label}</Text>
      <Text style={{ color: '#101828', fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: COLORS.white },
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  h1: { fontSize: 22, fontWeight: '700', color: COLORS.oxford },

  // Actions sous le titre (alignées et clean)
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
    flexWrap: 'wrap',
  },

  primary: {
    backgroundColor: COLORS.oxford,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTxt: { color: '#fff', fontWeight: '700' },

  secondary: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.oxford,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryTxt: { color: COLORS.oxford, fontWeight: '700' },

  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  backBtn: {
  width: 36,
  height: 36,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: COLORS.line,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: COLORS.white,
},

  h2: { fontSize: 16, fontWeight: '700', color: COLORS.oxford, marginBottom: 10 },

  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#101828',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  p: { color: '#475467' },
});
