import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { firestore } from '../../firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import * as Location from 'expo-location';

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
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CreateEventScreen() {
  const [activity, setActivity] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState<LocationType | null>(null);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sortedLocations, setSortedLocations] = useState<LocationType[]>([]);

  useEffect(() => {
    const getPosition = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const currentPos = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserPos(currentPos);

      const locationsWithDistance = predefinedLocations.map(loc => ({
        ...loc,
        distance: getDistance(
          currentPos.latitude,
          currentPos.longitude,
          loc.latitude,
          loc.longitude
        ),
      }));

      setSortedLocations(locationsWithDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)));
    };

    getPosition();
  }, []);

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

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Activité :</Text>
      <TextInput value={activity} onChangeText={setActivity} style={styles.input} />

      <Text style={styles.label}>Description :</Text>
      <TextInput value={description} onChangeText={setDescription} style={styles.input} />

      <Text style={styles.label}>Date (AAAA-MM-JJ) :</Text>
      <TextInput value={date} onChangeText={setDate} style={styles.input} />

      <Text style={styles.label}>Heure de fin :</Text>
      <TextInput value={endTime} onChangeText={setEndTime} style={styles.input} />

      <Text style={styles.label}>Lieu :</Text>
      {sortedLocations.map((loc, i) => (
        <Button
          key={i}
          title={`${loc.name} (${loc.distance?.toFixed(1) ?? '?'} km)`}
          color={location?.name === loc.name ? 'green' : undefined}
          onPress={() => setLocation(loc)}
        />
      ))}

      <View style={{ marginTop: 20 }}>
        <Button title="Créer l’événement" onPress={handleCreate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { marginTop: 10, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5 },
});
