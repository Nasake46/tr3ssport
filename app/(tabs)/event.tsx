import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { firestore } from '../../firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';

// Define the Participant interface
interface Participant {
  email?: string;
  id: string;
  invitedAt: Timestamp;
  name?: string;
  status: 'invited' | 'accepted' | 'responded';
  type: 'coach' | 'client';
  respondedAt?: Timestamp;
}

// Define the full EventData interface
interface EventData {
  id: string;
  activity: string;
  createdAt: Timestamp;
  createdBy: string;
  date: Timestamp;
  description: string;
  endTime: string;
  location: {
    latitude: number;
    longitude: number;
  };
  maxParticipants: number;
  participants: Participant[];
  startTime: string;
  status: 'pending' | 'active'; // or other possible statuses
  title: string;
  type: 'group_session'; // or other possible types
  updatedAt: Timestamp;
  distance: number;
}

export default function EventScreen() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Console log to confirm component mount
  console.log('EventScreen component mounted.');

  useEffect(() => {
    console.log('useEffect triggered.');
    const fetchData = async () => {
      console.log('fetchData function started.');
      let userLoc = null;

      // 1. Request location permission and get current position
      try {
        console.log('Requesting location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied.');
          setError('Permission de localisation refusée. Certains événements ne peuvent pas être affichés.');
          setLoading(false);
          return;
        }
        console.log('Location permission granted.');
        
        console.log('Getting current position...');
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        userLoc = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(userLoc);
        console.log('User location obtained:', userLoc);
      } catch (locationError) {
        console.error("Erreur de localisation:", locationError);
        setError("Impossible d'obtenir votre position. Veuillez vérifier les services de localisation.");
        setLoading(false);
        return;
      }

      // 2. Fetch events from Firestore
      try {
        console.log('Fetching events from Firestore...');
        const snapshot = await getDocs(collection(firestore, 'groupAppointments'));
        console.log('Events snapshot received. Number of documents:', snapshot.docs.length);
        
        const fetchedEvents = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() as Omit<EventData, 'id' | 'distance'>
        }));

        const withDistance = fetchedEvents
          .filter(e => e.location?.latitude && e.location?.longitude)
          .map(e => ({
            ...e,
            distance: userLoc ? getDistance(userLoc, { latitude: e.location.latitude, longitude: e.location.longitude }) : 0
          }));
        
        if (userLoc) {
            withDistance.sort((a, b) => a.distance - b.distance);
        }

        setEvents(withDistance);
        console.log('Events state updated. Total events:', withDistance.length);
      } catch (firestoreError) {
        console.error("Erreur Firestore:", firestoreError);
        setError("Erreur lors de la récupération des événements. Veuillez réessayer.");
      } finally {
        console.log('Finished all async operations. Setting loading to false.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getDistance = (loc1: { latitude: number, longitude: number }, loc2: { latitude: number, longitude: number }) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(loc2.latitude - loc1.latitude);
    const dLon = toRad(loc2.longitude - loc1.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(loc1.latitude)) * Math.cos(toRad(loc2.latitude)) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  if (error) return <Text style={{ color: 'red', padding: 20, textAlign: 'center' }}>{error}</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Événements proches :</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.activity}>{item.activity}</Text>
            <Text>{item.description}</Text>
            <Text>{new Date(item.date.seconds * 1000).toLocaleString()}</Text>
            <Text>Lieu : {item.location.latitude}, {item.location.longitude}</Text>
            <Text>Distance : {item.distance.toFixed(2)} km</Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: item.location.latitude,
                longitude: item.location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              <Marker
                coordinate={{
                  latitude: item.location.latitude,
                  longitude: item.location.longitude
                }}
                title={item.activity}
              />
            </MapView>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center' }}>Aucun événement trouvé.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  card: { backgroundColor: '#f2f2f2', padding: 10, marginVertical: 5, borderRadius: 8 },
  activity: { fontWeight: 'bold', fontSize: 16 },
  map: { height: 150, marginTop: 10, borderRadius: 8 },
});