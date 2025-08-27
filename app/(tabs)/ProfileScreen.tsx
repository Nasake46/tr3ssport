import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { auth, firestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { styles } from '../styles/account/ProfileScreen.styles';

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const router = useRouter();

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      const docRef = doc(firestore, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setEmail(data.email);
      }
    }
  });

  return () => unsubscribe();
}, []);


  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Text style={styles.title}>Mon Compte</Text>
        <View style={styles.userInfo}>
          <Ionicons name="person-circle" size={60} color="#04403A" />
          <View>
            <Text style={styles.name}>{firstName} {lastName}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>

        {/* Options */}
        <TouchableOpacity style={styles.option} onPress={() => router.push('/account/SettingsScreen')}>
          <Feather name="settings" size={20} color="#04403A" />
          <Text style={styles.optionText}>Paramètres du compte</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <TouchableOpacity style={styles.option}>
          <FontAwesome5 name="cc-visa" size={20} color="#04403A" />
          <Text style={styles.optionText}>Facturation</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <TouchableOpacity style={styles.option}>
          <Feather name="mail" size={20} color="#04403A" />
          <Text style={styles.optionText}>Contact</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <TouchableOpacity style={styles.option}>
          <Feather name="star" size={20} color="#04403A" />
          <Text style={styles.optionText}>Avis et recommandations</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <TouchableOpacity style={styles.option}>
          <Feather name="help-circle" size={20} color="#04403A" />
          <Text style={styles.optionText}>FAQ</Text>
        </TouchableOpacity>
        <View style={styles.line} />

        <View style={styles.option}>
          <Feather name="bell" size={20} color="#04403A" />
          <Text style={styles.optionText}>Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#ccc', true: '#04403A' }}
          />
        </View>
        <View style={styles.line} />

        {/* Logout */}
        <TouchableOpacity style={styles.logout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
          <Feather name="log-out" size={18} color="white" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <Text style={styles.footerText}>À propos</Text>
          <Text style={styles.footerText}>Mentions légales</Text>
          <Text style={styles.footerText}>Politique de confidentialité</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}