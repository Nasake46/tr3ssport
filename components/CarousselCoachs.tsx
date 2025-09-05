import React, { useState, useEffect } from 'react';
import { View, Text, Image, FlatList, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { useRouter } from 'expo-router';

const ITEM_WIDTH = Dimensions.get('window').width * 0.7;

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  profileImageUrl?: string;
}

const CarouselCoachs = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const usersCollectionRef = collection(firestore, 'users');
        const q = query(
          usersCollectionRef,
          where('role', '==', 'coach'),
          where('coachApplicationStatus', '==', 'approved')
        );
        const querySnapshot = await getDocs(q);
        const coachesList: Coach[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        setCoaches(coachesList);
      } catch (error) {
        console.error('Erreur lors de la récupération des coachs: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Rencontrez nos coachs</Text>
      <FlatList
        data={coaches}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/coachScreen', params: { coachId: item.id } })}
            activeOpacity={0.85}
          >
            <Image
              source={item.profileImageUrl ? { uri: item.profileImageUrl } : require('../assets/images/coachtest.jpg')}
              style={styles.image}
            />
            <Text style={styles.name}>{`${item.firstName} ${item.lastName}`}</Text>
            <Text style={styles.role}>Coach</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#04403A',
    marginLeft: 20,
    marginBottom: 12,
  },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: '#F2F2F2',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#04403A',
    textAlign: 'center',
  },
  role: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default CarouselCoachs;
