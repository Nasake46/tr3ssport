import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Linking,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function JitsiTestScreen() {
  const [roomName, setRoomName] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [savedLinks, setSavedLinks] = useState<Array<{name: string, link: string, date: string}>>([]);

  // Générer un nom de salle aléatoire
  const generateRandomRoomName = () => {
    const adjectives = ['Super', 'Mega', 'Ultra', 'Cool', 'Smart', 'Fast', 'Pro'];
    const nouns = ['Coach', 'Workout', 'Training', 'Session', 'Meeting', 'Class'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 1000);
    
    return `${randomAdj}${randomNoun}${randomNum}`;
  };

  // Générer le lien Jitsi
  const generateJitsiLink = () => {
    const finalRoomName = roomName.trim() || generateRandomRoomName();
    // Nettoyer le nom de la salle (enlever espaces et caractères spéciaux)
    const cleanRoomName = finalRoomName.replace(/[^a-zA-Z0-9]/g, '');
    const link = `https://meet.jit.si/${cleanRoomName}`;
    
    setGeneratedLink(link);
    setRoomName(cleanRoomName);
    
    Alert.alert('Succès !', `Lien Jitsi généré :\n${link}`);
  };

  // Copier le lien dans le presse-papier (simulation)
  const copyToClipboard = async () => {
    if (!generatedLink) {
      Alert.alert('Erreur', 'Aucun lien à copier');
      return;
    }
    
    try {
      // Pour le test, on va juste afficher une alerte
      Alert.alert('Copié !', `Lien copié dans le presse-papier :\n${generatedLink}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le lien');
    }
  };

  // Partager le lien
  const shareLink = async () => {
    if (!generatedLink) {
      Alert.alert('Erreur', 'Aucun lien à partager');
      return;
    }

    try {
      await Share.share({
        message: `Rejoignez-moi pour notre séance de coaching sur Jitsi Meet :\n${generatedLink}`,
        title: 'Invitation Jitsi Meet',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager le lien');
    }
  };

  // Ouvrir le lien
  const openLink = async () => {
    if (!generatedLink) {
      Alert.alert('Erreur', 'Aucun lien à ouvrir');
      return;
    }

    try {
      await Linking.openURL(generatedLink);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
    }
  };

  // Sauvegarder le lien
  const saveLink = () => {
    if (!generatedLink) {
      Alert.alert('Erreur', 'Aucun lien à sauvegarder');
      return;
    }

    const newLink = {
      name: roomName,
      link: generatedLink,
      date: new Date().toLocaleString('fr-FR')
    };

    setSavedLinks([newLink, ...savedLinks]);
    Alert.alert('Sauvegardé !', 'Le lien a été ajouté à vos liens sauvegardés');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="videocam" size={48} color="#007AFF" />
        <Text style={styles.title}>Test Jitsi Meet</Text>
        <Text style={styles.subtitle}>Générateur de liens de réunion</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nom de la salle (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={roomName}
          onChangeText={setRoomName}
          placeholder="Ex: CoachingSession2024"
          placeholderTextColor="#999"
        />
        <Text style={styles.hint}>
          Laissez vide pour générer un nom aléatoire
        </Text>
      </View>

      <TouchableOpacity style={styles.generateButton} onPress={generateJitsiLink}>
        <Ionicons name="add-circle" size={24} color="white" />
        <Text style={styles.generateButtonText}>Générer le lien Jitsi</Text>
      </TouchableOpacity>

      {generatedLink && (
        <View style={styles.resultSection}>
          <Text style={styles.sectionTitle}>Lien généré :</Text>
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>{generatedLink}</Text>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}>
              <Ionicons name="copy" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Copier</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={shareLink}>
              <Ionicons name="share" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Partager</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={openLink}>
              <Ionicons name="open" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Ouvrir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={saveLink}>
              <Ionicons name="bookmark" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Sauver</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {savedLinks.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={styles.sectionTitle}>Liens sauvegardés</Text>
          {savedLinks.map((savedLink, index) => (
            <View key={index} style={styles.savedLinkCard}>
              <View style={styles.savedLinkHeader}>
                <Text style={styles.savedLinkName}>{savedLink.name}</Text>
                <Text style={styles.savedLinkDate}>{savedLink.date}</Text>
              </View>
              <Text style={styles.savedLinkUrl}>{savedLink.link}</Text>
              <TouchableOpacity 
                style={styles.openSavedButton}
                onPress={() => Linking.openURL(savedLink.link)}
              >
                <Ionicons name="videocam" size={16} color="white" />
                <Text style={styles.openSavedButtonText}>Rejoindre</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>À propos de Jitsi Meet</Text>
        <Text style={styles.infoText}>
          • Gratuit et open source{'\n'}
          • Pas d'inscription requise{'\n'}
          • Fonctionne dans le navigateur{'\n'}
          • Partage d'écran disponible{'\n'}
          • Chiffrement des communications
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultSection: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  linkContainer: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  linkText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 12,
    marginTop: 4,
  },
  savedSection: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  savedLinkCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  savedLinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  savedLinkName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  savedLinkDate: {
    fontSize: 12,
    color: '#666',
  },
  savedLinkUrl: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  openSavedButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
  },
  openSavedButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
