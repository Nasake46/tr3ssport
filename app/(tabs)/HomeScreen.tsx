import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CarouselArticles from '../../components/CarousselArticle';
import CarousselHealthArticle from '../../components/CarousselHealtArticle';
import CarouselCoachs from '../../components/CarousselCoachs';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { useRouter } from 'expo-router';

const COLORS = {
  bg: '#FFFFFF',
  text: '#0F473C',
  sub: '#3D6B60',
  primary: '#0E6B5A',
  line: '#E5E7EB',
  chip: '#F4AF00',
  card: '#F2F4F5',
};

const HomeScreen = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [designatedCoachId, setDesignatedCoachId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data: any = docSnap.data();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setDesignatedCoachId(data.designatedCoachId || null);
        }
      } else {
        setDesignatedCoachId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className='header' style={styles.div_header}>
          <Text style={styles.text_h1}>Mon tableau de bord</Text>
          <TouchableOpacity onPress={() => router.push('/ProfileScreen')}>
            <View className="profil" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="person" size={24} color={COLORS.text} />
              <Text style={styles.text_base}>{firstName} {lastName}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Top buttons */}
        <View className='top_buttons' style={styles.div_head_button}>
          <TouchableOpacity
            onPress={() => {
              if (designatedCoachId) {
                router.push({ pathname: '/coachScreen', params: { coachId: designatedCoachId } });
              } else {
                router.push('/coachScreen');
              }
            }}
          >
            <View style={styles.top_buttons}>
              <Image source={require('../../assets/images/MyCoach.png')} style={{ width: 40, height: 40 }} />
              <Text style={styles.text_base}>Mon Coach</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('../calendar')}>
            <View style={styles.top_buttons}>
              <Image source={require('../../assets/images/Programm.png')} style={{ width: 40, height: 40 }}/>
              <Text style={styles.text_base}>Programme</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity>
            <View style={styles.top_buttons}>
              <Image source={require('../../assets/images/follow.png')} style={{ width: 40, height: 40 }}/>
              <Text style={styles.text_base}>Suivi</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sessions */}
        <View className="sessions" style={styles.sessions}>
          <View>
            <Text style={styles.text_h1}>Séances</Text>
            <Text style={styles.text_base}>Lorem ipsum dolor sit, amet culpa.</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/appointments/client-dashboard')}>
            <Text style={styles.buttonText}>Consulter</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Sessions */}
        <TouchableOpacity style={styles.big_session} onPress={() => router.push('../invitations')}>
          <Text style={styles.text_h1}>Séances à venir</Text>
          <Text style={styles.paragraph}>Lorem ipsum dolor sit, amet consectetur adipisicing elit</Text>
          <View style={styles.chips}>
            <View style={styles.chip}><Text style={styles.chipTxt}>Renforcement</Text></View>
            <View style={styles.chip}><Text style={styles.chipTxt}>Cardio</Text></View>
            <View style={styles.chip}><Text style={styles.chipTxt}>Souplesse</Text></View>
          </View>
        </TouchableOpacity>

        {/* Other links */}
        <View className="other_links" style={styles.other_links}>
          <TouchableOpacity onPress={() => router.push('/subscriptions')}>
            <View style={styles.programmLogo}>
              <Image source={require('../../assets/images/Programme2.png')} style={{ width: 40, height: 40 }} />
              <Text style={styles.text_base}>Abonnements</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.line} />

          <TouchableOpacity onPress={() => Alert.alert('Follow pressed')}>
            <View style={styles.programmLogo}>
              <Image source={require('../../assets/images/follow.png')} style={{ width: 40, height: 40 }} />
              <Text style={styles.text_base}>Suivi et Progrès</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.line} />

          <TouchableOpacity onPress={() => router.push('/account/BilanScreen')}>
            <View style={styles.programmLogo}>
              <Image source={require('../../assets/images/healthFolder.png')} style={{ width: 40, height: 40 }} />
              <Text style={styles.text_base}>Mon dossier de bilan</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.line} />

          <TouchableOpacity onPress={() => Alert.alert('Partenaires pressed')}>
            <View style={styles.programmLogo}>
              <Image source={require('../../assets/images/healthPartner.png')} style={{ width: 40, height: 40 }} />
              <Text style={styles.text_base}>Partenaires de santé</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.line} />
        </View>

        {/* Carrousels */}
        <CarouselArticles />
        <CarousselHealthArticle />
        <View style={styles.line} />
        <CarouselCoachs />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // header
  div_header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text_h1: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  text_base: { fontSize: 14, color: COLORS.sub },

  // top shortcuts
  div_head_button: {
    paddingHorizontal: 20,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  top_buttons: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  // sessions block
  sessions: {
    marginTop: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
  },
  buttonText: { color: '#fff', fontWeight: '700' },

  // big session card
  big_session: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    gap: 8,
  },
  paragraph: { color: COLORS.sub },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { backgroundColor: COLORS.chip, borderRadius: 22, paddingVertical: 6, paddingHorizontal: 12 },
  chipTxt: { color: '#2B2B2B', fontWeight: '700' },

  // links
  other_links: { marginTop: 8, paddingHorizontal: 20 },
  programm: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programmLogo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkSub: { color: COLORS.sub },
  line: { height: 1, backgroundColor: COLORS.line, marginHorizontal: 0, opacity: 0.9 },
});

export default HomeScreen;