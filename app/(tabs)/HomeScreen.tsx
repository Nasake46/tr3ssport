import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
    <View style={{ flex: 1 }}>
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
      </View>      {/* Top buttons */}
      <View className='top_buttons' style={styles.div_head_button}>
        <TouchableOpacity onPress={() => router.push('/coachScreen')}>
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
            <Text style={styles.text_base}>Découvrez vos programmes d'entraînement.</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => Alert.alert('Programmes disponibles')}>
            <Text style={styles.text_base}>Consulter</Text>
          </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.big_session} onPress={() => Alert.alert('Programmes disponibles')}>
        <Text style={styles.text_h1}>Programmes à venir</Text>
        <Text>Consultez vos programmes d'entraînement personnalisés</Text>
      </TouchableOpacity>

      {/* Rendez-vous Section */}
      <View className="appointments_section" style={styles.appointmentsSection}>
        <Text style={styles.text_h1}>Mes Rendez-vous</Text>
        <Text style={styles.text_base}>Gérez vos séances avec vos coaches</Text>
        
        <View style={styles.appointmentButtons}>
          <TouchableOpacity 
            style={styles.appointmentButton} 
            onPress={() => router.push('/appointments/create')}
          >
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.appointmentButtonText}>Nouveau RDV</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.appointmentButton} 
            onPress={() => router.push('/appointments/client-dashboard')}
          >
            <Ionicons name="calendar" size={24} color="#007AFF" />
            <Text style={styles.appointmentButtonText}>Mes RDV</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.appointmentButton} 
            onPress={() => router.push('/invitations')}
          >
            <Ionicons name="mail" size={24} color="#007AFF" />
            <Text style={styles.appointmentButtonText}>Invitations</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.appointmentButton} 
            onPress={() => router.push('/calendar')}
          >
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            <Text style={styles.appointmentButtonText}>Calendrier</Text>
          </TouchableOpacity>
        </View>
      </View>

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
      </View>      {/* Health article */}
      <CarouselArticles />
      <CarousselHealthArticle />
      <View style={styles.line}></View>

      {/* Coachs Carousel */} 
      <CarouselCoachs />

      </ScrollView>
      </SafeAreaView>
      
      {/* Bouton flottant pour créer un RDV */}
      <FloatingActionButton />
    </View>
  );
};

const styles = StyleSheet.create({
  text_h1: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D5A88',
  },
  text_base: {
    color: '#5D5A88',
  },
  div_header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    padding: "3%",
  },
  div_head_button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: "3%",
    marginBottom: "3%",
  },
  top_buttons: {
    borderWidth: 1,
    borderRadius: 10,
    width: 120,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: "3%",
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    width: 70,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big_session: {
    borderWidth: 1,
    borderRadius: 10,
    width: '90%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  other_links: {
    padding: '2%',
    marginTop: 10,
  },
  programm : {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 10,
    width: '90%',
  },
  programmLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    marginTop: 10,
  },
  line: {
    width: '90%',
    height: 1,
    backgroundColor: '#D4D2E3',
    marginTop: 10,
    alignSelf: 'center',
  },
  appointmentsSection: {
    padding: 20,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  appointmentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  appointmentButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  appointmentButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default HomeScreen;
