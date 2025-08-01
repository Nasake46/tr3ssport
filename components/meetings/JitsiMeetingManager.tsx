import React, { useState, useEffect } from 'react';
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
import * as appointmentService from '@/services/appointmentService';

interface JitsiMeetingManagerProps {
  appointmentId: string;
  appointmentTitle: string;
  isCreator?: boolean; // Seul le créateur peut générer/modifier le lien
}

export default function JitsiMeetingManager({ 
  appointmentId, 
  appointmentTitle, 
  isCreator = false 
}: JitsiMeetingManagerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [currentLink, setCurrentLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger le lien existant au démarrage
  useEffect(() => {
    loadExistingLink();
  }, [appointmentId]);

  const loadExistingLink = async () => {
    try {
      const existingLink = await appointmentService.getJitsiLinkFromAppointment(appointmentId);
      setCurrentLink(existingLink);
    } catch (error) {
      console.error('Erreur lors du chargement du lien Jitsi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Générer un nom de salle unique
  const generateRoomName = (customName?: string): string => {
    if (customName && customName.trim()) {
      return customName.trim().replace(/[^a-zA-Z0-9]/g, '');
    }
    
    const timestamp = Date.now().toString().slice(-6);
    return `tr3ssport-rdv-${appointmentId.slice(-8)}-${timestamp}`;
  };

  // Générer le lien Jitsi Meet
  const generateJitsiLink = (roomName: string): string => {
    return `https://meet.jit.si/${roomName}`;
  };

  // Créer une réunion avec nom automatique
  const createMeetingWithAutoName = async () => {
    try {
      const roomName = generateRoomName();
      const meetingLink = generateJitsiLink(roomName);
      
      // Sauvegarder dans Firebase
      await appointmentService.addJitsiLinkToAppointment(appointmentId, meetingLink);
      
      setCurrentLink(meetingLink);

      Alert.alert(
        'Réunion créée',
        `Lien généré et sauvegardé !\n\nSalle: ${roomName}`,
        [
          { text: 'Partager', onPress: () => shareMeetingLink(meetingLink) },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la création de la réunion:', error);
      Alert.alert('Erreur', 'Impossible de créer la réunion');
    }
  };

  // Créer une réunion avec nom personnalisé
  const createMeetingWithCustomName = async () => {
    if (!customRoomName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la salle de réunion');
      return;
    }

    try {
      const roomName = generateRoomName(customRoomName);
      const meetingLink = generateJitsiLink(roomName);
      
      // Sauvegarder dans Firebase
      await appointmentService.addJitsiLinkToAppointment(appointmentId, meetingLink);
      
      setCurrentLink(meetingLink);
      setModalVisible(false);
      setCustomRoomName('');

      Alert.alert(
        'Réunion créée',
        `Lien généré et sauvegardé !\n\nSalle: ${roomName}`,
        [
          { text: 'Partager', onPress: () => shareMeetingLink(meetingLink) },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la création de la réunion:', error);
      Alert.alert('Erreur', 'Impossible de créer la réunion');
    }
  };

  // Partager le lien de réunion
  const shareMeetingLink = async (link: string) => {
    try {
      await Share.share({
        message: `Rejoignez notre réunion ${appointmentTitle}\n\nLien: ${link}\n\nRéunion sécurisée via Jitsi Meet\n\n💡 Conseil: Rejoignez la réunion depuis votre navigateur ou téléchargez l'app Jitsi Meet`,
        title: `Réunion ${appointmentTitle}`,
        url: link,
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le lien');
    }
  };

  // Rejoindre la réunion (ouvre dans le navigateur)
  const joinMeeting = (link: string) => {
    Alert.alert(
      'Rejoindre la réunion',
      'Comment souhaitez-vous rejoindre la réunion ?',
      [
        { text: 'Partager le lien', onPress: () => shareMeetingLink(link) },
        { text: 'Copier le lien', onPress: () => copyLinkToShare(link) },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  // Copier le lien (via Share)
  const copyLinkToShare = (link: string) => {
    Share.share({ message: link });
  };

  // Supprimer le lien existant (créateur seulement)
  const removeMeeting = () => {
    Alert.alert(
      'Supprimer la réunion',
      'Êtes-vous sûr de vouloir supprimer le lien de réunion ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentService.addJitsiLinkToAppointment(appointmentId, '');
              setCurrentLink(null);
              Alert.alert('Succès', 'Lien de réunion supprimé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le lien');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="videocam" size={24} color="#0066cc" />
          <Text style={styles.title}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="videocam" size={24} color="#0066cc" />
        <Text style={styles.title}>Réunion en ligne</Text>
        {currentLink && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Jitsi</Text>
          </View>
        )}
      </View>

      {currentLink ? (
        // Lien existant
        <View style={styles.linkContainer}>
          <Text style={styles.linkLabel}>Lien de réunion:</Text>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => joinMeeting(currentLink)}
          >
            <Ionicons name="videocam" size={16} color="#0066cc" />
            <Text style={styles.linkText} numberOfLines={1}>
              Rejoindre la réunion
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#0066cc" />
          </TouchableOpacity>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.shareButton]}
              onPress={() => shareMeetingLink(currentLink)}
            >
              <Ionicons name="share" size={16} color="white" />
              <Text style={styles.buttonText}>Partager</Text>
            </TouchableOpacity>
            
            {isCreator && (
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={removeMeeting}
              >
                <Ionicons name="trash" size={16} color="white" />
                <Text style={styles.buttonText}>Supprimer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        // Pas de lien - actions pour créer
        isCreator ? (
          <View style={styles.actionsContainer}>
            <Text style={styles.description}>
              Créez une salle de réunion sécurisée pour votre rendez-vous
            </Text>
            
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
        ) : (
          <View style={styles.noMeetingContainer}>
            <Ionicons name="videocam-off" size={32} color="#ccc" />
            <Text style={styles.noMeetingText}>
              Aucune réunion programmée
            </Text>
            <Text style={styles.noMeetingSubtext}>
              Le lien de réunion sera ajouté par l'organisateur
            </Text>
          </View>
        )
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
              Donnez un nom personnalisé à votre salle de réunion Jitsi
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
    flex: 1,
  },
  badge: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
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
  noMeetingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noMeetingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  noMeetingSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
  deleteButton: {
    backgroundColor: '#dc3545',
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
