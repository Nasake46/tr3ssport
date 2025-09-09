import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore, serverTimestamp, storage } from '../firebase';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import {
  ref,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
} from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';

export default function EditCoachScreen() {
  const auth = getAuth();
  const insets = useSafeAreaInsets();

  type Location = { lat: number; lng: number } | null;
  type UserProfileData = {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: string;
    companyName: string;
    siretNumber: string;
    diploma: string;
    bio: string;
    profileImageUrl?: string | null;
    pricePerHour?: number | null;
    seniorityYears?: number | null;
    specialties?: string[];
    serviceAreas?: string[];
    videoUrl?: string | null;
    location?: Location;
  };

  const [userData, setUserData] = useState<UserProfileData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
    companyName: '',
    siretNumber: '',
    diploma: '',
    bio: '',
    profileImageUrl: null,
    pricePerHour: null,
    seniorityYears: null,
    specialties: [],
    serviceAreas: [],
    videoUrl: null,
    location: null,
  });

  const [priceInput, setPriceInput] = useState('');
  const [seniorityInput, setSeniorityInput] = useState('');
  const [specialtiesText, setSpecialtiesText] = useState('');
  const [serviceAreasText, setServiceAreasText] = useState('');
  const [videoUrlText, setVideoUrlText] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [localUri, setLocalUri] = useState<string | null>(null);

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo (aligné sur les règles Storage)

  useEffect(() => {
    // Log du bucket effectif
    try { console.log('Storage root =', ref(storage).toString()); } catch {}

    (async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(firestore, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data() as UserProfileData;
          setUserData({
            firstName: d.firstName ?? '',
            lastName: d.lastName ?? '',
            phoneNumber: d.phoneNumber ?? '',
            address: d.address ?? '',
            companyName: d.companyName ?? '',
            siretNumber: d.siretNumber ?? '',
            diploma: d.diploma ?? '',
            bio: d.bio ?? '',
            profileImageUrl: d.profileImageUrl ?? null,
            pricePerHour: d.pricePerHour ?? null,
            seniorityYears: d.seniorityYears ?? null,
            specialties: Array.isArray(d.specialties) ? d.specialties : [],
            serviceAreas: Array.isArray(d.serviceAreas) ? d.serviceAreas : [],
            videoUrl: d.videoUrl ?? null,
            location: d.location ?? null,
          });
          setPriceInput(typeof d.pricePerHour === 'number' ? String(d.pricePerHour) : '');
          setSeniorityInput(typeof d.seniorityYears === 'number' ? String(d.seniorityYears) : '');
          setSpecialtiesText(Array.isArray(d.specialties) ? d.specialties.join(', ') : '');
          setServiceAreasText(Array.isArray(d.serviceAreas) ? d.serviceAreas.join(', ') : '');
          setVideoUrlText(d.videoUrl ?? '');
          setLatInput(d.location?.lat != null ? String(d.location.lat) : '');
          setLngInput(d.location?.lng != null ? String(d.location.lng) : '');
        }
      } catch (e) {
        console.error('Error fetching data:', e);
        Alert.alert('Erreur', 'Impossible de charger le profil.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Autorisation requise', "Autorise l’accès à la galerie."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets?.[0]?.uri) setLocalUri(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Autorisation requise', "Autorise l’accès à la caméra."); return; }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85, aspect: [1, 1] });
    if (!res.canceled && res.assets?.[0]?.uri) setLocalUri(res.assets[0].uri);
  };

  // Recompresse en JPEG si trop lourd / pas JPEG
  const ensureJpegUnder5mb = async (uri: string): Promise<string> => {
    try {
      let info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) return uri;
      if (info.size && info.size <= MAX_IMAGE_BYTES && uri.toLowerCase().endsWith('.jpg')) return uri;

      const actions = [{ resize: { width: 1024, height: 1024 } }];
      let quality = 0.8;
      let out = await ImageManipulator.manipulateAsync(uri, actions as any, {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // Boucle simple pour descendre sous 5 Mo si nécessaire
      for (let i = 0; i < 3; i++) {
        const ii = await FileSystem.getInfoAsync(out.uri, { md5: true });
        if (!ii.exists || (ii.exists && typeof ii.size === 'number' && ii.size <= MAX_IMAGE_BYTES)) break;
        quality = Math.max(0.5, quality - 0.1);
        out = await ImageManipulator.manipulateAsync(out.uri, [], {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        });
      }
      return out.uri;
    } catch {
      return uri; // en cas d’échec, on tente quand même l’original
    }
  };

  // Upload via fetch(localUri).blob() -> uploadBytesResumable (OK Expo Go)
  const uploadImageIfNeeded = async (): Promise<string | null> => {
    if (!localUri) return null;
    const user = auth.currentUser;
    if (!user) throw new Error('Non connecté');

    try {
      setUploading(true);
      setProgress(0);

      const preparedUri = await ensureJpegUnder5mb(localUri);

      let response: Response;
      try {
        response = await fetch(preparedUri);
      } catch (netErr: any) {
        console.log('fetch(localUri) failed', netErr?.message);
        throw netErr;
      }
      const blob = await response.blob();

      if (blob.size && blob.size > MAX_IMAGE_BYTES) {
        throw new Error('IMAGE_TOO_LARGE');
      }

      const fileRef = ref(storage, `users/${user.uid}/profile.jpg`);
      const uploadTask = uploadBytesResumable(fileRef, blob, {
        contentType: (blob as any).type || 'image/jpeg',
      });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => {
            if (snap.totalBytes) {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setProgress(pct);
            }
          },
          (err: any) => reject(err),
          () => resolve()
        );
      });

      const url = await getDownloadURL(fileRef);
      const bust = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, String(Date.now()));
      return `${url}?v=${bust.slice(0, 8)}`;
    } catch (e: any) {
      // Log enrichi pour lire la réponse serveur (souvent XML/JSON lisible)
      const serverResponse = e?.serverResponse || e?.customData?.serverResponse;
      console.log('upload error details ->', JSON.stringify({
        name: e?.name,
        code: e?.code,
        message: e?.message,
        serverResponse,
        stack: e?.stack,
      }, null, 2));

      let msg = 'Upload impossible.';
      if (e?.message === 'IMAGE_TOO_LARGE') msg = 'Image trop lourde (> 5 Mo).';
      else if (e?.code === 'storage/unauthorized') msg = 'Accès refusé par les règles Storage.';
      else if (e?.code === 'storage/retry-limit-exceeded') msg = 'Réseau instable, réessaie.';
      else if (e?.code === 'storage/canceled') msg = 'Upload annulé.';
      else if (serverResponse?.includes('PERMISSION_DENIED')) msg = 'Règles Storage: permission refusée.';
      Alert.alert('Erreur', msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    const user = auth.currentUser; if (!user) return;
    try {
      await deleteObject(ref(storage, `users/${user.uid}/profile.jpg`)).catch(() => {});
      await updateDoc(doc(firestore, 'users', user.uid), { profileImageUrl: null, updatedAt: serverTimestamp() });
      setUserData((d) => ({ ...d, profileImageUrl: null }));
      setLocalUri(null);
      Alert.alert('Photo supprimée');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Suppression impossible.');
    }
  };

  const toNumber = (v: string) => {
    const n = parseFloat((v || '').replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  };
  const toArray = (v: string) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    const user = auth.currentUser; if (!user) { setSaving(false); return; }
    try {
      const newUrl = await uploadImageIfNeeded();
      const price = toNumber(priceInput);
      const seniority = toNumber(seniorityInput);
      const lat = toNumber(latInput);
      const lng = toNumber(lngInput);

      const next: UserProfileData = {
        ...userData,
        pricePerHour: price ?? null,
        seniorityYears: seniority ?? null,
        specialties: toArray(specialtiesText),
        serviceAreas: toArray(serviceAreasText),
        videoUrl: videoUrlText || null,
        location: lat !== undefined && lng !== undefined ? { lat, lng } : null,
        profileImageUrl: newUrl !== null ? newUrl : (userData.profileImageUrl ?? null),
      };

      await updateDoc(doc(firestore, 'users', user.uid), { ...next, updatedAt: serverTimestamp() });
      setUserData(next);
      Alert.alert('Succès', 'Profil mis à jour.');
    } catch (e: any) {
      console.error('update error', e);
      Alert.alert('Erreur', e?.message || 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          <Text style={styles.title}>Modifier mon profil</Text>

          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image
              source={
                localUri
                  ? { uri: localUri }
                  : userData.profileImageUrl
                  ? { uri: userData.profileImageUrl }
                  : require('../assets/images/coachtest.jpg')
              }
              style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee' }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity onPress={pickImage} style={styles.smallBtn} disabled={uploading}>
                <Text style={styles.smallBtnText}>Choisir</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takePhoto} style={styles.smallBtn} disabled={uploading}>
                <Text style={styles.smallBtnText}>Prendre</Text>
              </TouchableOpacity>
              {(userData.profileImageUrl || localUri) ? (
                <TouchableOpacity onPress={removePhoto} style={[styles.smallBtn, { backgroundColor: '#ef4444' }]} disabled={uploading}>
                  <Text style={styles.smallBtnText}>Supprimer</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {uploading ? <Text style={{ marginTop: 6 }}>Téléversement… {progress}%</Text> : null}
          </View>

          <Text style={styles.sectionTitle}>Infos personnelles</Text>
          <Label>Prénom</Label>
          <TextInput style={styles.input} value={userData.firstName} onChangeText={(t) => setUserData({ ...userData, firstName: t })} autoCapitalize="words" />
          <Label>Nom</Label>
          <TextInput style={styles.input} value={userData.lastName} onChangeText={(t) => setUserData({ ...userData, lastName: t })} autoCapitalize="words" />
          <Label>Téléphone</Label>
          <TextInput style={styles.input} value={userData.phoneNumber} onChangeText={(t) => setUserData({ ...userData, phoneNumber: t })} keyboardType="phone-pad" />
          <Label>Adresse</Label>
          <TextInput style={styles.input} value={userData.address} onChangeText={(t) => setUserData({ ...userData, address: t })} />

          <Text style={styles.sectionTitle}>Infos professionnelles</Text>
          <Label>Entreprise</Label>
          <TextInput style={styles.input} value={userData.companyName} onChangeText={(t) => setUserData({ ...userData, companyName: t })} />
          <Label>SIRET</Label>
          <TextInput style={styles.input} value={userData.siretNumber} onChangeText={(t) => setUserData({ ...userData, siretNumber: t })} keyboardType="number-pad" />
          <Label>Diplôme</Label>
          <TextInput style={styles.input} value={userData.diploma} onChangeText={(t) => setUserData({ ...userData, diploma: t })} />

          <Text style={styles.sectionTitle}>Page coach</Text>
          <Label>Bio</Label>
          <TextInput style={[styles.input, { height: 100 }]} value={userData.bio} onChangeText={(t) => setUserData({ ...userData, bio: t })} multiline />

          <Label>Tarif €/h</Label>
          <TextInput style={styles.input} value={priceInput} onChangeText={setPriceInput} keyboardType="decimal-pad" placeholder="ex: 60" />

          <Label>Ancienneté (années)</Label>
          <TextInput style={styles.input} value={seniorityInput} onChangeText={setSeniorityInput} keyboardType="number-pad" />

          <Label>Spécialités (séparées par des virgules)</Label>
          <TextInput style={styles.input} value={specialtiesText} onChangeText={setSpecialtiesText} placeholder="ex: Cardio, Renfo" />

          <Label>Zones d’intervention (séparées par des virgules)</Label>
          <TextInput style={styles.input} value={serviceAreasText} onChangeText={setServiceAreasText} placeholder="ex: Paris, Hauts-de-Seine" />

          <Label>Vidéo (YouTube)</Label>
          <TextInput style={styles.input} value={videoUrlText} onChangeText={setVideoUrlText} placeholder="https://…" />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Label>Latitude</Label>
              <TextInput style={styles.input} value={latInput} onChangeText={setLatInput} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Longitude</Label>
              <TextInput style={styles.input} value={lngInput} onChangeText={setLngInput} keyboardType="decimal-pad" />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footerBar, { paddingBottom: 12 + insets.bottom }]}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={uploading || saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Enregistrement…' : (uploading ? 'Envoi…' : 'Sauvegarder les modifications')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#121631' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 14, marginBottom: 6, color: '#121631' },
  label: { fontSize: 13, color: '#667085', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', padding: 10, borderRadius: 8, color: '#101828' },
  saveButton: { backgroundColor: '#0E6B5A', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  footerBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 12 },
  smallBtn: { backgroundColor: '#0F473C', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  smallBtnText: { color: '#fff', fontWeight: '600' },
});