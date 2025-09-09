import React, { useState, useEffect } from 'react';
import { View, Text, Image, FlatList, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { useRouter } from 'expo-router';

const ITEM_WIDTH = Dimensions.get('window').width * 0.7;

interface Coach {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: 'coach' | 'admin' | string;
  profileImageUrl?: string;
  coachApplicationStatus?: string;
}

const CarouselCoachs = () => {
  const [people, setPeople] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPeople = async () => {
      try {
        setErrorMsg(null);
        const usersRef = collection(firestore, 'users');

        // 1) coaches approuvés
        const coachesQ = query(
          usersRef,
          where('role', '==', 'coach'),
          where('coachApplicationStatus', '==', 'approved')
        );

        // 2) admins (on filtrera le compte nommé "admin" côté client)
        const adminsQ = query(
          usersRef,
          where('role', '==', 'admin')
        );

        const [coachesSnap, adminsSnap] = await Promise.all([
          getDocs(coachesQ),
          getDocs(adminsQ),
        ]);

        const rows: Coach[] = [
          ...coachesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })),
          ...adminsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })),
        ];

        // filtre: exclure l’utilisateur "admin" (displayName === "admin" ou prénom "admin" sans nom)
        const filtered = rows.filter(u => {
          const dn = (u.displayName || '').trim().toLowerCase();
          const fn = (u.firstName || '').trim().toLowerCase();
          const ln = (u.lastName || '').trim();
          if (u.role === 'admin' && (dn === 'admin' || (fn === 'admin' && !ln))) return false;
          return true;
        });

        // dédoublonnage par id (si jamais un compte est à la fois coach/admin)
        const map = new Map<string, Coach>();
        filtered.forEach(u => map.set(u.id, u));

        const list = Array.from(map.values());

        // tri: coachs d’abord, puis admins, puis par prénom/nom
        const sorted = list.sort((a, b) => {
          const rank = (r: string) => (r === 'coach' ? 0 : r === 'admin' ? 1 : 2);
          const rdiff = rank(a.role) - rank(b.role);
          if (rdiff !== 0) return rdiff;
          const an = `${a.firstName || a.displayName || ''} ${a.lastName || ''}`.trim();
          const bn = `${b.firstName || b.displayName || ''} ${b.lastName || ''}`.trim();
          return an.localeCompare(bn, 'fr', { sensitivity: 'base' });
        });

        setPeople(sorted);
      } catch (err) {
        console.error(err);
        setErrorMsg("Impossible de charger la liste.");
      } finally {
        setLoading(false);
      }
    };

    fetchPeople();
  }, []);

  const fullName = (u: Coach) => {
    const maybe = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return maybe || u.displayName || 'Utilisateur';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Rencontrez nos coachs et admins</Text>
      <FlatList
        data={people}
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
            <Text style={styles.name}>{fullName(item)}</Text>
            <Text style={styles.role}>{item.role === 'admin' ? 'Admin' : 'Coach'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[styles.loadingContainer, { minHeight: 120 }]}>
            <Text>Aucun profil pour le moment.</Text>
          </View>
        }
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
    backgroundColor: '#E6E6E6',
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
