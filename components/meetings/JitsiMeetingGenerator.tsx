import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface JitsiMeetingGeneratorProps {
  appointmentId: string;
  appointmentTitle: string;
  onLinkGenerated?: (link: string) => void;
}

export default function JitsiMeetingGenerator({ 
  appointmentId, 
  appointmentTitle, 
  onLinkGenerated 
}: JitsiMeetingGeneratorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Générer un nom de salle unique basé sur l'ID du rendez-vous
  const generateRoomName = (customName?: string): string => {
    if (customName && customName.trim()) {
      // Nettoyer le nom personnalisé (enlever espaces, caractères spéciaux)
      return customName.trim().replace(/[^a-zA-Z0-9]/g, '');
    }
    
    // Nom automatique basé sur l'ID du RDV + timestamp pour l'unicité
    const timestamp = Date.now().toString().slice(-6); // 6 derniers chiffres
    return `tr3ssport-rdv-${appointmentId.slice(-8)}-${timestamp}`;
  };

  // Générer le lien Jitsi Meet
  const generateJitsiLink = (roomName: string): string => {
    // URL de base Jitsi Meet (serveur public)
    const jitsiDomain = 'meet.jit.si';
    return `https://${jitsiDomain}/${roomName}`;
  };

  // Créer une réunion avec nom automatique
  const createMeetingWithAutoName = () => {
    const roomName = generateRoomName();
    const meetingLink = generateJitsiLink(roomName);
    
    setGeneratedLink(meetingLink);
    
    // Notifier le parent
    if (onLinkGenerated) {
      onLinkGenerated(meetingLink);
    }

    Alert.alert(
      'Réunion créée',
      `Lien généré avec succès !\n\nSalle: ${roomName}`,
      [
        { text: 'Partager', onPress: () => shareMeetingLink(meetingLink) },
        { text: 'OK' }
      ]
    );
  };

  // Créer une réunion avec nom personnalisé
  const createMeetingWithCustomName = () => {
    if (!customRoomName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la salle de réunion');
      return;
    }

    const roomName = generateRoomName(customRoomName);
    const meetingLink = generateJitsiLink(roomName);
    
    setGeneratedLink(meetingLink);
    setModalVisible(false);
    setCustomRoomName('');
    
    // Notifier le parent
    if (onLinkGenerated) {
      onLinkGenerated(meetingLink);
    }

    Alert.alert(
      'Réunion créée',
      `Lien généré avec succès !\n\nSalle: ${roomName}`,
      [
        { text: 'Partager', onPress: () => shareMeetingLink(meetingLink) },
        { text: 'OK' }
      ]
    );
  };

  // Partager le lien de réunion
  const shareMeetingLink = async (link: string) => {
    try {
      await Share.share({
        message: `Rejoignez notre réunion ${appointmentTitle}\n\nLien: ${link}\n\nRéunion sécurisée via Jitsi Meet`,
        title: `Réunion ${appointmentTitle}`,
        url: link,
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le lien');
    }
  };

  // Ouvrir le lien existant
  const openExistingLink = () => {
    if (generatedLink) {
      Alert.alert(
        'Lien de réunion',
        generatedLink,
        [
          { text: 'Partager', onPress: () => shareMeetingLink(generatedLink) },
          { text: 'Copier', onPress: () => copyToClipboard(generatedLink) },
          { text: 'Fermer' }
        ]
      );
    }
  };

  // Copier dans le presse-papiers (fonction simple)
  const copyToClipboard = (text: string) => {
    // Pour React Native, on pourrait utiliser @react-native-clipboard/clipboard
    // Pour l'instant, on utilise Share comme alternative
    Share.share({ message: text });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="videocam" size={24} color="#0066cc" />
        <Text style={styles.title}>Réunion Jitsi Meet</Text>
      </View>

      {generatedLink ? (
        // Lien déjà généré
        <View style={styles.linkContainer}>
          <Text style={styles.linkLabel}>Lien de réunion généré:</Text>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={openExistingLink}
          >
            <Ionicons name="link" size={16} color="#0066cc" />
            <Text style={styles.linkText} numberOfLines={1}>
              {generatedLink}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.shareButton]}
              onPress={() => shareMeetingLink(generatedLink)}
            >
              <Ionicons name="share" size={16} color="white" />
              <Text style={styles.buttonText}>Partager</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.newButton]}
              onPress={() => setGeneratedLink(null)}
            >
              <Ionicons name="refresh" size={16} color="white" />
              <Text style={styles.buttonText}>Nouveau</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Pas encore de lien
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={createMeetingWithAutoName}
          >
            <Ionicons name="videocam" size={16} color="white" />
            <Text style={styles.buttonText}>Créer réunion</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="settings" size={16} color="#0066cc" />
            <Text style={[styles.buttonText, { color: '#0066cc' }]}>Nom personnalisé</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal pour nom personnalisé */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nom de la salle</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Donnez un nom personnalisé à votre salle de réunion
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="Ex: Session-Coach-John"
              value={customRoomName}
              onChangeText={setCustomRoomName}
              maxLength={50}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: '#666' }]}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={createMeetingWithCustomName}
              >
                <Text style={styles.buttonText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  linkContainer: {
    gap: 12,
  },
  linkLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#0066cc',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0066cc',
  },
  shareButton: {
    backgroundColor: '#28a745',
  },
  newButton: {
    backgroundColor: '#6c757d',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
