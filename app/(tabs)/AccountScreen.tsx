import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Button,
} from "react-native";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

const AccountScreen = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    dateNaissance: "",
    genre: "",
    parc: "",
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
        <Button title="Valider" onPress={handleSubmit} />
      </ScrollView>
    );
  }

  const {
    nom,
    prenom,
    dateNaissance,
    genre,
    parc,
    certifMedicalURL,
    questionnaire,
    qrCodeData,
  } = userData;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Mon compte</Text>
      <Text style={styles.label}>Nom : {nom}</Text>
      <Text style={styles.label}>Prénom : {prenom}</Text>
      <Text style={styles.label}>Date de naissance : {dateNaissance}</Text>
      <Text style={styles.label}>Genre : {genre}</Text>
      <Text style={styles.label}>Parc choisi : {parc}</Text>

      <Text style={styles.subheader}>État du dossier</Text>
      <Text style={styles.label}>Certificat médical : {certifMedicalURL ? "✅" : "❌"}</Text>
      <Text style={styles.label}>Questionnaire rempli : {questionnaire ? "✅" : "❌"}</Text>

      {questionnaire && (
        <>
          <Text style={styles.subheader}>Santé</Text>
          <Text style={styles.label}>Problèmes cardiaques : {questionnaire.cardiaque ? "Oui" : "Non"}</Text>
          <Text style={styles.label}>Malaise à l’effort : {questionnaire.malaise ? "Oui" : "Non"}</Text>
          <Text style={styles.label}>Douleurs thoraciques : {questionnaire.thoracique ? "Oui" : "Non"}</Text>
          <Text style={styles.label}>Asthme : {questionnaire.asthme ? "Oui" : "Non"}</Text>
          <Text style={styles.label}>Diabète : {questionnaire.diabete ? "Oui" : "Non"}</Text>
          <Text style={styles.label}>Enceinte : {questionnaire.enceinte?.flag ? `Oui (${questionnaire.enceinte.mois} mois)` : "Non"}</Text>
          <Text style={styles.label}>Articulations : {renderArticulations(questionnaire.articulations)}</Text>
        </>
      )}
    </ScrollView>
  );
};

const renderArticulations = (art: any) => {
  const keys = ["dos", "genoux", "epaules"];
  const list = keys.filter(k => art[k]).map(k => k);
  if (art.autre) list.push(art.autre);
  return list.length > 0 ? list.join(", ") : "Aucun";
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: "bold",
  },
  subheader: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 10,
    fontWeight: "600",
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});

export default AccountScreen;
