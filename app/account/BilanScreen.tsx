import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function BilanScreen() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleUploadPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setSelectedFile(result.assets[0].name);
        Alert.alert('PDF importé', `Fichier sélectionné : ${result.assets[0].name}`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner un document.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mon dossier de bilan</Text>

        {/* Section de résumé santé */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Résumé santé</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Poids :</Text>
            <Text style={styles.value}>68 kg</Text>
          </View>
          <View style={styles.line} />

          <View style={styles.row}>
            <Text style={styles.label}>Tension artérielle :</Text>
            <Text style={styles.value}>12/8</Text>
          </View>
          <View style={styles.line} />

          <View style={styles.row}>
            <Text style={styles.label}>Objectif :</Text>
            <Text style={styles.value}>Tonifier</Text>
          </View>
          <View style={styles.line} />

          <View style={styles.row}>
            <Text style={styles.label}>Dernier bilan :</Text>
            <Text style={styles.value}>15 avril 2025</Text>
          </View>
        </View>

        {/* Dossier médical */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dossier médical</Text>
          <Text style={styles.paragraph}>
            Vous pouvez importer un document PDF contenant vos antécédents médicaux ou résultats d’analyses.
          </Text>

          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPDF}>
            <Feather name="upload" size={20} color="#fff" />
            <Text style={styles.uploadText}>Importer un PDF</Text>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.fileBox}>
              <MaterialCommunityIcons name="file-pdf-box" size={24} color="#5D5A88" />
              <Text style={styles.fileName}>{selectedFile}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5D5A88',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D5A88',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
  },
  value: {
    color: '#5D5A88',
  },
  line: {
    height: 1,
    backgroundColor: '#D4D2E3',
    marginVertical: 8,
  },
  uploadButton: {
    backgroundColor: '#5D5A88',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  uploadText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  fileName: {
    color: '#5D5A88',
  },
});
