import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { auth, firestore } from '@/firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

type CoachDoc = {
  firstName?: string;
  lastName?: string;
  email?: string;
  specialties?: string[];
};

export default function RequestAppointmentScreen() {
  const router = useRouter();
  const { coachId } = useLocalSearchParams<{ coachId?: string }>();

  const [loadingCoach, setLoadingCoach] = useState(true);
  const [coach, setCoach] = useState<CoachDoc | null>(null);

  // Form state
  const [sessionType, setSessionType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // +1h
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // DateTimePicker (Android: enchaîner date puis heure)
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>(
    Platform.OS === 'ios' ? 'datetime' : 'date'
  );

  const openDateTimePicker = () => {
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

  useEffect(() => {
    const run = async () => {
      try {
        if (!coachId || typeof coachId !== 'string') {
          Alert.alert('Erreur', 'Coach introuvable.');
          router.back();
          return;
        }
        setLoadingCoach(true);
        const snap = await getDoc(doc(firestore, 'users', coachId));
        if (!snap.exists()) {
          Alert.alert('Erreur', 'Coach introuvable.');
          router.back();
          return;
        }
        setCoach(snap.data() as CoachDoc);
      } finally {
        setLoadingCoach(false);
      }
    };
    run();
  }, [coachId]);

  const submit = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Connexion requise', 'Connectez-vous pour envoyer une demande.');
      return;
    }
    if (!coachId || typeof coachId !== 'string') return;

    if (!sessionType.trim() || !location.trim()) {
      Alert.alert('Champs requis', 'Le type de séance et le lieu sont obligatoires.');
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

      const payload = {
        createdBy: user.uid,
        userEmail: user.email || '',
        requestType: 'user_request',           // pour distinguer d’une séance créée par un coach
        type: 'solo',
        sessionType: sessionType.trim(),
        description: description.trim(),
        location: location.trim(),
        date: Timestamp.fromDate(date),
        startTime,
        endTime,
        duration,
        notes: notes.trim(),
        status: 'pending',                     // le coach devra valider/modifier
        coachIds: [coachId],
        coachIdsMap: { [coachId]: true },      // compat éventuelle (where(`coachIds.${id}`,'==',true))
        invitedEmails: [],
        decisions: { [coachId]: 'pending' },   // état par coach ciblé
        targetCoachId: coachId,
        createdAt: Timestamp.now(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'appointments'), payload);

      Alert.alert('Demande envoyée', 'Votre demande a été transmise au coach.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible d’envoyer la demande pour le moment.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingCoach) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const coachName = `${coach?.firstName ?? ''} ${coach?.lastName ?? ''}`.trim() || 'Coach';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Demander une séance avec {coachName}</Text>

        <Text style={s.label}>Activité *</Text>
        <TextInput
          style={s.input}
          value={sessionType}
          onChangeText={setSessionType}
          placeholder="ex: Yoga, Cardio, Renfo…"
        />

        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Objectifs, préférences, niveau…"
          multiline
          numberOfLines={3}
        />

        <Text style={s.label}>Lieu *</Text>
        <TextInput
          style={s.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Adresse ou nom du lieu"
        />

        <Text style={s.label}>Date & heure *</Text>
        <TouchableOpacity style={s.dateBtn} onPress={openDateTimePicker}>
          <Text style={s.dateBtnText}>
            {date.toLocaleDateString('fr-FR')} à{' '}
            {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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

        <Text style={s.label}>Durée *</Text>
        <View style={s.durations}>
          {[30, 45, 60, 90, 120].map((d) => (
            <TouchableOpacity
              key={d}
              style={[s.durationBtn, duration === d && s.durationBtnActive]}
              onPress={() => setDuration(d)}
            >
              <Text style={[s.durationTxt, duration === d && s.durationTxtActive]}>{d} min</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.durationInfo}>
          Fin : {new Date(date.getTime() + duration * 60 * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>

        <Text style={s.label}>Notes</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Infos complémentaires (matériel, contraintes…)"
          multiline
          numberOfLines={2}
        />

        <TouchableOpacity
          style={[s.submit, saving && { opacity: 0.6 }]}
          onPress={submit}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Envoyer la demande</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '800', color: '#121631', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  dateBtn: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  dateBtnText: { fontSize: 16, color: '#333' },
  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  durationBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f7f7f7' },
  durationBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  durationTxt: { color: '#333', fontWeight: '600' },
  durationTxtActive: { color: '#fff' },
  durationInfo: { fontSize: 12, color: '#666', marginTop: 6, fontStyle: 'italic' },
  submit: { backgroundColor: '#0E6B5A', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 14 },
  submitTxt: { color: '#fff', fontWeight: '800' },
});
