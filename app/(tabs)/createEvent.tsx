import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { firestore } from '../../firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import * as Location from 'expo-location';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';

type LocationType = {
  name: string;
  latitude: number;
  longitude: number;
  distance?: number;
};

const predefinedLocations: LocationType[] = [
  { name: 'Parc de Sceaux', latitude: 48.7745, longitude: 2.2991 },
  { name: 'Bois de Vincennes', latitude: 48.8282, longitude: 2.4355 },
  { name: 'Parc Monceau', latitude: 48.8792, longitude: 2.3094 },
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (val: number) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CreateEventScreen() {
  const [activity, setActivity] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [endTime, setEndTime] = useState('');

  const [location, setLocation] = useState<LocationType | null>(null);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [customLocations, setCustomLocations] = useState<LocationType[]>([]);
  const [sortedLocations, setSortedLocations] = useState<LocationType[]>([]);

  // Modal état
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLat, setNewLat] = useState<string>('');
  const [newLng, setNewLng] = useState<string>('');
  const [markerCoord, setMarkerCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const defaultRegion: Region = {
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  };

  useEffect(() => {
    const getPosition = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const currentPos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserPos(currentPos);
    };
    getPosition();
  }, []);

  // Recalcule la liste triée dès que position ou lieux changent
  useEffect(() => {
    const all = [...predefinedLocations, ...customLocations].map((l) => {
      const dist = userPos ? getDistance(userPos.latitude, userPos.longitude, l.latitude, l.longitude) : undefined;
      return { ...l, distance: dist };
    });
    setSortedLocations(all.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9)));
  }, [userPos, customLocations]);

  const handleCreate = async () => {
    if (!activity || !description || !date || !endTime || !location) {
      Alert.alert('Erreur', 'Tous les champs doivent être remplis.');
      return;
    }

    await addDoc(collection(firestore, 'groupAppointments'), {
      activity,
      description,
      date: Timestamp.fromDate(new Date(date)),
      endTime,
      location: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      participants: [],
    });

    Alert.alert('Succès', 'Événement créé !');
    setActivity('');
    setDescription('');
    setDate('');
    setEndTime('');
    setLocation(null);
  };

  const openAddModal = () => {
    setNewName('');
    setNewLat(userPos ? String(userPos.latitude) : '');
    setNewLng(userPos ? String(userPos.longitude) : '');
    setMarkerCoord(userPos ?? null);
    setShowAddModal(true);
  };

  const onMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoord({ latitude, longitude });
    setNewLat(String(latitude));
    setNewLng(String(longitude));
  };

  const useMyPosition = async () => {
    const loc = await Location.getCurrentPositionAsync({});
    setMarkerCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    setNewLat(String(loc.coords.latitude));
    setNewLng(String(loc.coords.longitude));
  };

  const saveNewPlace = () => {
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    if (!newName.trim() || isNaN(lat) || isNaN(lng)) {
      Alert.alert('Erreur', 'Nom, latitude et longitude sont requis.');
      return;
    }
    const newPlace: LocationType = { name: newName.trim(), latitude: lat, longitude: lng };
    setCustomLocations((prev) => [...prev, newPlace]);
    setLocation(newPlace);
    setShowAddModal(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Créer une activité</Text>

      <Text style={styles.label}>Activité :</Text>
      <TextInput value={activity} onChangeText={setActivity} style={styles.input} placeholder="Ex : Renforcement musculaire" />

      <Text style={styles.label}>Description :</Text>
      <TextInput value={description} onChangeText={setDescription} style={styles.input} placeholder="Détails..." />

      <Text style={styles.label}>Date (AAAA-MM-JJ) :</Text>
      <TextInput value={date} onChangeText={setDate} style={styles.input} placeholder="2025-08-31" />

      <Text style={styles.label}>Heure de fin :</Text>
      <TextInput value={endTime} onChangeText={setEndTime} style={styles.input} placeholder="18:30" />

      <Text style={styles.label}>Lieu :</Text>

      {/* Bouton pour ajouter un lieu perso */}
      <TouchableOpacity style={styles.btnOutline} onPress={openAddModal}>
        <Text style={styles.btnOutlineTxt}>➕ Ajouter un lieu</Text>
      </TouchableOpacity>

      {/* Liste des lieux */}
      <View style={{ marginTop: 8, gap: 8 }}>
        {sortedLocations.map((loc, i) => (
          <TouchableOpacity
            key={`${loc.name}-${i}`}
            onPress={() => setLocation(loc)}
            style={[
              styles.placeBtn,
              location?.name === loc.name ? styles.placeBtnActive : null,
            ]}
          >
            <Text style={[styles.placeTxt, location?.name === loc.name ? styles.placeTxtActive : null]}>
              {loc.name} {typeof loc.distance === 'number' ? `(${loc.distance.toFixed(1)} km)` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.btnPrimary, { marginTop: 20 }]} onPress={handleCreate}>
        <Text style={styles.btnPrimaryTxt}>Créer l’événement</Text>
      </TouchableOpacity>

      {/* MODAL D'AJOUT DE LIEU */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={[styles.container, { paddingTop: 20 }]}>
          <Text style={styles.h1}>Nouveau lieu</Text>

          <Text style={styles.label}>Nom du lieu</Text>
          <TextInput value={newName} onChangeText={setNewName} style={styles.input} placeholder="Ex : Parc des Buttes-Chaumont" />

          <Text style={styles.label}>Choisir sur la carte</Text>
          <View style={styles.mapWrap}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={
                userPos
                  ? { latitude: userPos.latitude, longitude: userPos.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
                  : defaultRegion
              }
              onPress={onMapPress}
            >
              {markerCoord && <Marker coordinate={markerCoord} />}
            </MapView>
          </View>

          <TouchableOpacity style={styles.smallBtn} onPress={useMyPosition}>
            <Text style={styles.smallBtnTxt}>Utiliser ma position</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput value={newLat} onChangeText={setNewLat} keyboardType="decimal-pad" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput value={newLng} onChangeText={setNewLng} keyboardType="decimal-pad" style={styles.input} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]} onPress={() => setShowAddModal(false)}>
              <Text style={styles.btnOutlineTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={saveNewPlace}>
              <Text style={styles.btnPrimaryTxt}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const COLORS = {
  text: '#0F473C',
  sub: '#3D6B60',
  primary: '#0E6B5A',
  line: '#E5E7EB',
  card: '#F2F4F5',
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  h1: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  label: { marginTop: 12, marginBottom: 6, color: COLORS.sub, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: COLORS.line, padding: 12, borderRadius: 10, backgroundColor: '#fff',
  },

  // Boutons principaux (DA verde)
  btnPrimary: {
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 28, alignItems: 'center',
  },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700' },

  btnOutline: {
    borderWidth: 2, borderColor: COLORS.primary, borderRadius: 28,
    paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff',
  },
  btnOutlineTxt: { color: COLORS.primary, fontWeight: '700' },

  smallBtn: {
    alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 22, marginTop: 10, marginBottom: 6,
  },
  smallBtnTxt: { color: '#fff', fontWeight: '700' },

  // Liste de lieux
  placeBtn: {
    backgroundColor: COLORS.card, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
  },
  placeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  placeTxt: { color: COLORS.text, fontWeight: '600' },
  placeTxtActive: { color: '#fff' },

  // Carte
  mapWrap: {
    height: 250, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line, backgroundColor: '#eee',
  },
});
