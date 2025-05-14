import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, Button, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const pickDocument = async () => {
  const result = await DocumentPicker.getDocumentAsync({});
  if (result.type === 'success') {
    console.log(result.uri);
  }
};

const AccountScreen = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    dateNaissance: "",
    genre: "",
    parc: "",
    pathologies: "",
    articulations: "",
    certifMedicalURL: "",
  });
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setUid(user.uid);
      try {
        const db = getFirestore();
        const ref = doc(db, "participants", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setUserData(snap.data());
        }
      } catch (e) {
        console.error("Erreur récupération utilisateur:", e);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleFileUpload = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });

      // Récupérer le fichier choisi
      const fileUri = res[0].uri;
      const fileName = res[0].name;

      const storage = getStorage();
      const storageRef = ref(storage, 'certificats/' + fileName);

      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Upload du fichier
      await uploadBytes(storageRef, blob);

      // Récupérer l'URL du fichier téléchargé
      const certifUrl = await getDownloadURL(storageRef);

      setForm({ ...form, certifMedicalURL: certifUrl });
      alert('Certificat médical téléchargé avec succès');
    } catch (e) {
      console.error("Erreur téléchargement certificat médical", e);
      alert('Erreur lors du téléchargement');
    }
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: '#fff',
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 5,
      padding: 10,
      marginBottom: 15,
    },
    label: {
      fontSize: 16,
      marginBottom: 10,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  const handleSubmit = async () => {
    if (!uid) return;
    try {
      const db = getFirestore();
      const ref = doc(db, "participants", uid);
      const date = new Date(form.dateNaissance);
      if (isNaN(date.getTime())) {
        alert("Veuillez entrer une date valide au format YYYY-MM-DD");
        return;
      }
      await setDoc(ref, {
        nom: form.nom,
        prenom: form.prenom,
        genre: form.genre,
        parc: form.parc,
        dateNaissance: Timestamp.fromDate(date),
        pathologies: form.pathologies.split(","),
        articulations: form.articulations.split(","),
        certifMedicalURL: form.certifMedicalURL,
      });

      setUserData({ ...form, dateNaissance: form.dateNaissance });
    } catch (e) {
      console.error("Erreur lors de l'enregistrement :", e);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!userData) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Compléter votre profil</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom"
          value={form.nom}
          onChangeText={(text) => setForm({ ...form, nom: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Prénom"
          value={form.prenom}
          onChangeText={(text) => setForm({ ...form, prenom: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Date de naissance (YYYY-MM-DD)"
          value={form.dateNaissance}
          onChangeText={(text) => setForm({ ...form, dateNaissance: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Genre"
          value={form.genre}
          onChangeText={(text) => setForm({ ...form, genre: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Parc choisi"
          value={form.parc}
          onChangeText={(text) => setForm({ ...form, parc: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Pathologies (séparées par des virgules)"
          value={form.pathologies}
          onChangeText={(text) => setForm({ ...form, pathologies: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Articulations (séparées par des virgules)"
          value={form.articulations}
          onChangeText={(text) => setForm({ ...form, articulations: text })}
        />
        <Button title="Télécharger Certificat Médical" onPress={handleFileUpload} />
        <Button title="Valider" onPress={handleSubmit} />
      </ScrollView>
    );
  }

  const { nom, prenom, dateNaissance, genre, parc, pathologies, articulations, certifMedicalURL } = userData;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Mon compte</Text>
      <Text style={styles.label}>Nom : {nom}</Text>
      <Text style={styles.label}>Prénom : {prenom}</Text>
      <Text style={styles.label}>Date de naissance : {dateNaissance?.toDate().toLocaleDateString()}</Text>
      <Text style={styles.label}>Genre : {genre}</Text>
      <Text style={styles.label}>Parc choisi : {parc}</Text>
      <Text style={styles.label}>Pathologies : {pathologies ? pathologies.join(", ") : "Aucune"}</Text>
      <Text style={styles.label}>Articulations : {articulations ? articulations.join(", ") : "Aucune"}</Text>
      <Text style={styles.label}>Certificat médical : {certifMedicalURL ? "✅" : "❌"}</Text>
    </ScrollView>
  );
};
export default AccountScreen;