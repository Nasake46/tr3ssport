import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { doc, getDoc, updateDoc, DocumentData } from 'firebase/firestore'; // Import DocumentData
import { firestore } from '../firebase';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function EditCoachScreen() {
  const navigation = useNavigation();
  const auth = getAuth();
  
  // Define the type for your state to make it reusable
  type UserProfileData = {
    firstName: string;
    lastName: string;
    bio: string;
    address: string;
    phoneNumber: string;
    companyName: string;
    siretNumber: string;
    diploma: string;
    price: string;
    // Add other fields from your document here
  };

  const [userData, setUserData] = useState<UserProfileData | DocumentData>({
    firstName: '',
    lastName: '',
    bio: '',
    address: '',
    phoneNumber: '',
    companyName: '',
    siretNumber: '',
    diploma: '',
    price: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExistingData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(firestore, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            // Type assertion: Cast the data to your desired type
            setUserData(docSnap.data() as UserProfileData);
          }
        } catch (e) {
          console.error('Error fetching data:', e);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchExistingData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(firestore, 'users', user.uid), userData);
        Alert.alert('Succès', 'Votre profil a été mis à jour.');
        navigation.goBack();
      } catch (e) {
        console.error('Erreur lors de la mise à jour:', e);
        Alert.alert('Erreur', 'Impossible de sauvegarder les modifications.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <ScrollView style={editStyles.container}>
      <Text style={editStyles.title}>Modifier mon profil</Text>

      <Text style={editStyles.label}>Prénom</Text>
      <TextInput
        style={editStyles.input}
        value={userData.firstName}
        onChangeText={(text) => setUserData({ ...userData, firstName: text })}
      />
      
      <Text style={editStyles.label}>Nom</Text>
      <TextInput
        style={editStyles.input}
        value={userData.lastName}
        onChangeText={(text) => setUserData({ ...userData, lastName: text })}
      />

      <Text style={editStyles.label}>Bio</Text>
      <TextInput
        style={[editStyles.input, { height: 100 }]}
        value={userData.bio}
        onChangeText={(text) => setUserData({ ...userData, bio: text })}
        multiline
      />

      <Text style={editStyles.label}>Prix par heure</Text>
      <TextInput
        style={editStyles.input}
        value={userData.price}
        onChangeText={(text) => setUserData({ ...userData, price: text })}
        keyboardType="numeric"
      />
      {/* Add more TextInput components for other fields based on your document structure */}
      
      <TouchableOpacity style={editStyles.saveButton} onPress={handleSave}>
        <Text style={editStyles.saveButtonText}>Sauvegarder les modifications</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const editStyles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: 'blue',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});