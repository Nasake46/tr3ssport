import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { auth, firestore } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

type ApptDoc = {
  createdBy: string;
  userEmail?: string;
  sessionType?: string;
  description?: string;
  location?: string;
  date?: any; // Firestore Timestamp
  duration?: number;
  notes?: string;
  status?: 'pending' | 'accepted' | 'refused' | 'proposed';
  coachIds?: string[];
  decisions?: Record<string, { status: 'accepted' | 'refused'; comment?: string; respondedAt?: any }>;
  createdAt?: any;
  proposedBy?: string;
  proposedAt?: any;
};

export default function ManageAppointmentScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apptId, setApptId] = useState<string>('');
  const [appt, setAppt] = useState<ApptDoc | null>(null);

  // Form state
  const [sessionType, setSessionType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');

  // DateTimePicker (Android: séquence date -> heure)
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>(
    Platform.OS === 'ios' ? 'datetime' : 'date'
  );

  const openPicker = () => {
    if (Platform.OS === 'android') {
      setPickerMode('date');
      setShowPicker(true);
    } else {
      setPickerMode('datetime');
      setShowPicker(true);
    }
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      if (pickerMode === 'date') {
        if (event.type === 'set' && selected) {
          const d = new Date(date);
          d.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
          setDate(d);
          setPickerMode('time');
          setShowPicker(true);
        } else {
          setShowPicker(false);
        }
      } else if (pickerMode === 'time') {
        if (event.type === 'set' && selected) {
          const d = new Date(date);
          d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
          setDate(d);
        }
        setShowPicker(false);
      }
    } else if (selected) {
      setDate(selected);
    }
  };

  // Charge le rendez-vous + contrôle d’accès (coach assigné ou admin)
  useEffect(() => {
    const run = async () => {
      try {
        if (!appointmentId || typeof appointmentId !== 'string') {
          Alert.alert('Erreur', 'Rendez-vous introuvable.');
          router.back();
          return;
        }
        const uid = auth.currentUser?.uid;
        if (!uid) {
          Alert.alert('Connexion requise', 'Connectez-vous pour gérer ce rendez-vous.');
          router.replace('/(tabs)');
          return;
        }

        const snap = await getDoc(doc(firestore, 'appointments', appointmentId));
        if (!snap.exists()) {
          Alert.alert('Erreur', 'Rendez-vous introuvable.');
          router.back();
          return;
        }
        const data = snap.data() as ApptDoc;

        // Rôle utilisateur
        const meSnap = await getDoc(doc(firestore, 'users', uid));
        const role = (meSnap.exists() ? (meSnap.data() as any).role : '')?.toLowerCase?.();

        const isAssignedCoach = Array.isArray(data.coachIds) && data.coachIds.includes(uid);
        const isAdmin = role === 'admin';

        if (!isAssignedCoach && !isAdmin) {
          Alert.alert('Accès refusé', "Vous n'êtes pas autorisé à gérer ce rendez-vous.");
          router.back();
          return;
        }

        setApptId(appointmentId);
        setAppt(data);

        // Hydrate le formulaire
        setSessionType(data.sessionType || '');
        setDescription(data.description || '');
        setLocation(data.location || '');
        setDate(data.date?.toDate ? data.date.toDate() : new Date());
        setDuration(data.duration || 60);
        setNotes(data.notes || '');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [appointmentId]);

  /**
   * Enregistre les modifs et, si demandé, met à jour le statut global ET la décision du coach courant
   * - 'accepted'  -> sort des notifs (status != 'pending') et s’affiche comme accepté dans CoachDashboard
   * - 'refused'   -> idem, mais refusé
   * - 'proposed'  -> reste en 'pending', on tagge qui a proposé
   */
  const save = async (statusOverride?: 'pending' | 'proposed' | 'accepted' | 'refused') => {
    if (!appt || !apptId) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    if (!sessionType.trim() || !location.trim()) {
      Alert.alert('Champs requis', 'Type de séance et lieu sont obligatoires.');
      return;
    }

    if (date <= new Date()) {
      Alert.alert('Date invalide', 'Choisissez une date/heure à venir.');
      return;
    }

    setSaving(true);
    try {
      const startTime = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
      const endDate = new Date(date.getTime() + duration * 60 * 1000);
      const endTime = endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });

      const updates: any = {
        sessionType: sessionType.trim(),
        description: description.trim(),
        location: location.trim(),
        date: Timestamp.fromDate(date),
        duration,
        notes: notes.trim(),
        startTime,
        endTime,
        updatedAt: serverTimestamp(),
      };

      if (statusOverride === 'accepted') {
        updates.status = 'accepted'; // <- sort des notifs (homeCoach écoute status=='pending')
        updates[`decisions.${uid}`] = {
          status: 'accepted',
          comment: '',
          respondedAt: serverTimestamp(),
        };
      } else if (statusOverride === 'refused') {
        updates.status = 'refused';
        updates[`decisions.${uid}`] = {
          status: 'refused',
          comment: '',
          respondedAt: serverTimestamp(),
        };
      } else if (statusOverride === 'proposed') {
        // on reste en pending pour que ça reste visible côté notifs
        updates.status = 'pending';
        updates.proposedBy = uid;
        updates.proposedAt = serverTimestamp();
        // pas de décision enregistrée tant que pas validé/refusé
      } // sinon: simple sauvegarde, status inchangé

      await updateDoc(doc(firestore, 'appointments', apptId), updates);

      // UX: message et retour
      Alert.alert('OK', 'Modifications enregistrées.');
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', "Impossible d'enregistrer pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[st.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const requester = appt?.userEmail || 'Demandeur';

  return (
    <SafeAreaView style={st.container}>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.title}>Gérer la demande</Text>
        <Text style={st.meta}>Demandeur : {requester}</Text>
        <Text style={st.meta}>Statut actuel : {appt?.status || '—'}</Text>

        <Text style={st.label}>Type de séance *</Text>
        <TextInput
          style={st.input}
          value={sessionType}
          onChangeText={setSessionType}
          placeholder="ex: Yoga, Cardio, Renfo…"
        />

        <Text style={st.label}>Description</Text>
        <TextInput
          style={[st.input, st.ta]}
          value={description}
          onChangeText={setDescription}
          placeholder="Détails, objectifs…"
          multiline
        />

        <Text style={st.label}>Lieu *</Text>
        <TextInput
          style={st.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Adresse ou nom du lieu"
        />

        <Text style={st.label}>Date & heure *</Text>
        <TouchableOpacity style={st.dateBtn} onPress={openPicker}>
          <Text style={st.dateTxt}>
            {date.toLocaleDateString('fr-FR')} • {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={date}
            mode={pickerMode === 'datetime' ? 'datetime' : pickerMode}
            display="default"
            onChange={onPickerChange}
            {...(pickerMode !== 'time' ? { minimumDate: new Date() } : {})}
          />
        )}

        <Text style={st.label}>Durée *</Text>
        <View style={st.durations}>
          {[30, 45, 60, 90, 120].map((d) => (
            <TouchableOpacity
              key={d}
              style={[st.dBtn, duration === d && st.dBtnA]}
              onPress={() => setDuration(d)}
            >
              <Text style={[st.dTxt, duration === d && st.dTxtA]}>{d} min</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={st.durationInfo}>
          Fin : {new Date(date.getTime() + duration * 60 * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>

        <Text style={st.label}>Notes</Text>
        <TextInput
          style={[st.input, st.ta]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Infos complémentaires (matériel, contraintes…)"
          multiline
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <TouchableOpacity
            style={[st.btn, { backgroundColor: '#0E6B5A' }]}
            onPress={() => save('accepted')}
            disabled={saving}
          >
            <Text style={st.btnTxt}>Accepter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.btn, { backgroundColor: '#E74C3C' }]}
            onPress={() => save('refused')}
            disabled={saving}
          >
            <Text style={st.btnTxt}>Refuser</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[st.btn, { backgroundColor: '#007AFF', marginTop: 10 }]}
          onPress={() => save('proposed')}
          disabled={saving}
        >
          <Text style={st.btnTxt}>Proposer des modifs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.btn, { backgroundColor: '#666', marginTop: 10 }]}
          onPress={() => save()}
          disabled={saving}
        >
          <Text style={st.btnTxt}>Enregistrer sans changer le statut</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '800', color: '#121631', marginBottom: 6 },
  meta: { color: '#667085', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  ta: { minHeight: 80, textAlignVertical: 'top' },
  dateBtn: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  dateTxt: { fontSize: 16, color: '#333' },
  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  dBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f7f7f7' },
  dBtnA: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  dTxt: { color: '#333', fontWeight: '600' },
  dTxtA: { color: '#fff' },
  durationInfo: { fontSize: 12, color: '#666', marginTop: 6, fontStyle: 'italic' },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800' },
});
