import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { firestore } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function EventScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission de localisation refusée.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(userLoc);

      const snapshot = await getDocs(collection(firestore, 'groupAppointments'));
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const filtered = fetchedEvents.filter(e => e.location?.latitude && e.location?.longitude);

      const withDistance = filtered.map(e => ({
        ...e,
        distance: getDistance(userLoc, { latitude: e.location.latitude, longitude: e.location.longitude })
      }));

      withDistance.sort((a, b) => a.distance - b.distance);
      setEvents(withDistance);
      setLoading(false);
    })();
  }, []);

  const getDistance = (loc1: any, loc2: any) => {
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
  if (error) return <Text style={{ color: 'red', padding: 20 }}>{error}</Text>;

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
              scrollEnabled={false}
              zoomEnabled={false}
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
        ListEmptyComponent={<Text>Aucun événement trouvé.</Text>}
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
