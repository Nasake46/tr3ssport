import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CarouselArticles from '../../components/CarousselArticle';
import CarousselHealthArticle from '../../components/CarousselHealtArticle';
import CarouselCoachs from '../../components/CarousselCoachs';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { useRouter } from 'expo-router';
import { styles } from '../styles/HomeScreen.styles';


const HomeScreen = () => {
  const navigation = useNavigation();
  const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFirstName(data.firstName);
          setLastName(data.lastName);
        }
      }
    });
  
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className='header' style={styles.div_header}>
        <Text style={styles.text_h1}>Mon tableau de bord</Text>
        <TouchableOpacity onPress={() => router.push('/ProfileScreen')}>
          <View className="profil">
            <Ionicons name="person" size={24} color="#333" />
            <Text style={styles.text_base}>{firstName} {lastName}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Top buttons */}
      <View className='top_buttons' style={styles.div_head_button}>
        <TouchableOpacity>
          <View style={styles.top_buttons}>
            <Image source={require('../../assets/images/MyCoach.png')} style={{ width: 40, height: 40 }} />
            <Text style={styles.text_base}>Mon Coach</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity>
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
          <TouchableOpacity style={styles.button} onPress={() => Alert.alert('Consulter pressed')}>
            <Text style={styles.text_base}>Consulter</Text>
          </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.big_session} onPress={() => Alert.alert('Séances pressed')}>
        <Text style={styles.text_h1}>Séances à venir</Text>
        <Text>Lorem ipsum dolor sit, amet consectetur adipisicing elit</Text>
      </TouchableOpacity>

      {/* Other links */}
      <View className="other_links" style={styles.other_links}>
        <TouchableOpacity onPress={() => Alert.alert('Programme pressed')}>
          <View style={styles.programm}>
            <View style={styles.programmLogo}>
              <Image source={require('../../assets/images/Programme2.png')} style={{ width: 40, height: 40 }}></Image>
              <Text style={styles.text_base}>Programme</Text>
            </View>
            <Text>Sur mesure</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.line}></View>
        <TouchableOpacity onPress={() => Alert.alert('Follow pressed')}>
          <View style={styles.programmLogo}>
            <Image source={require('../../assets/images/follow.png')} style={{ width: 40, height: 40 }}></Image>
            <Text style={styles.text_base}>Suivi et Progrès</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.line}></View>
        <TouchableOpacity onPress={() => router.push('/account/BilanScreen')}>
          <View style={styles.programmLogo}>
            <Image source={require('../../assets/images/healthFolder.png')} style={{ width: 40, height: 40 }}></Image>
            <Text style={styles.text_base}>Mon dossier de bilan</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.line}></View>
        <TouchableOpacity onPress={() => Alert.alert('Partenaires pressed')}>
        <View style={styles.programmLogo}>
            <Image source={require('../../assets/images/healthPartner.png')} style={{ width: 40, height: 40 }}></Image>
            <Text style={styles.text_base}>Partenaires de santé</Text>
        </View>
        </TouchableOpacity>
        <View style={styles.line}></View>
      </View>

      {/* Health article */}
      <CarouselArticles />
      <CarousselHealthArticle />
      <View style={styles.line}></View>

      {/* Coachs Carousel */} 
      <CarouselCoachs />

      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
