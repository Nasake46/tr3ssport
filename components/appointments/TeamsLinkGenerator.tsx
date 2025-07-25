import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as appointmentService from '@/services/appointmentService';

interface TeamsLinkGeneratorProps {
  appointmentId: string;
  sessionType: string;
  date: Date;
  startTime: string;
  endTime: string;
  participantEmails?: string[];
  description?: string;
  onLinkGenerated?: (link: string) => void;
}

export default function TeamsLinkGenerator({
  appointmentId,
  sessionType,
  date,
  startTime,
  endTime,
  participantEmails = [],
  description = '',
  onLinkGenerated
}: TeamsLinkGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Charger le lien existant au montage du composant
  useEffect(() => {
    loadExistingTeamsLink();
  }, [appointmentId]);

  const loadExistingTeamsLink = async () => {
    try {
      const existingLink = await appointmentService.getTeamsLinkFromAppointment(appointmentId);
      if (existingLink) {
        setGeneratedLink(existingLink);
        onLinkGenerated?.(existingLink);
      }
    } catch (error) {
      console.error('❌ TEAMS LINK - Erreur chargement lien existant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour formater la date en ISO string pour Teams
  const formatDateForTeams = (date: Date, time: string): string => {
    const [hours, minutes] = time.split(':');
    const meetingDate = new Date(date);
    meetingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return meetingDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // Génerer un lien Teams via l'URL scheme
  const generateTeamsLink = async () => {
    setIsGenerating(true);
    
    try {
      // Calculer les dates de début et fin
      const startDateTime = formatDateForTeams(date, startTime);
      const endDateTime = formatDateForTeams(date, endTime);
      
      // Créer le titre de la réunion
      const meetingTitle = `${sessionType} - ${date.toLocaleDateString('fr-FR')}`;
      
      // Créer la description complète
      const meetingDescription = `
Séance de sport programmée via Tr3s Sport

📅 Date: ${date.toLocaleDateString('fr-FR')}
🕐 Heure: ${startTime} - ${endTime}
🏋️ Type: ${sessionType}
${description ? `📝 Description: ${description}` : ''}

ID de rendez-vous: ${appointmentId}
      `.trim();

      // Créer l'URL Teams avec les paramètres
      const teamsUrl = `https://teams.microsoft.com/l/meeting/new?` +
        `subject=${encodeURIComponent(meetingTitle)}&` +
        `content=${encodeURIComponent(meetingDescription)}&` +
        `startTime=${startDateTime}&` +
        `endTime=${endDateTime}`;

      console.log('🔗 TEAMS LINK - URL générée:', teamsUrl);
      
      // Sauvegarder le lien dans Firebase
      await appointmentService.addTeamsLinkToAppointment(appointmentId, teamsUrl);
      
      setGeneratedLink(teamsUrl);
      onLinkGenerated?.(teamsUrl);
      
      Alert.alert(
        'Lien Teams généré !',
        'Le lien de réunion Teams a été créé et sauvegardé. Vous pouvez maintenant le partager ou l\'ouvrir directement.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      
    } catch (error) {
      console.error('❌ TEAMS LINK - Erreur génération:', error);
      Alert.alert(
        'Erreur',
        'Impossible de générer le lien Teams. Veuillez réessayer.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Partager le lien Teams
  const shareTeamsLink = async () => {
    if (generatedLink) {
      try {
        await Share.share({
          message: `Rejoignez la séance de sport via Teams :\n${generatedLink}`,
          title: `Lien Teams - ${sessionType}`,
          url: generatedLink
        });
      } catch (error) {
        console.error('❌ SHARE - Erreur partage:', error);
        Alert.alert('Erreur', 'Impossible de partager le lien.');
      }
    }
  };

  // Ouvrir le lien Teams
  const openTeamsLink = async () => {
    if (generatedLink) {
      try {
        const supported = await Linking.canOpenURL(generatedLink);
        if (supported) {
          await Linking.openURL(generatedLink);
        } else {
          Alert.alert(
            'Teams non disponible',
            'Microsoft Teams n\'est pas installé sur cet appareil.'
          );
        }
      } catch (error) {
        console.error('❌ OPEN TEAMS - Erreur ouverture:', error);
        Alert.alert('Erreur', 'Impossible d\'ouvrir Teams.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="videocam" size={20} color="#6264A7" />
        <Text style={styles.title}>Réunion Teams</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6264A7" />
          <Text style={styles.loadingText}>Vérification du lien existant...</Text>
        </View>
      ) : !generatedLink ? (
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={generateTeamsLink}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Génération...' : 'Générer lien Teams'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.linkContainer}>
          <View style={styles.linkInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text style={styles.linkInfoText}>Lien Teams généré</Text>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={shareTeamsLink}
            >
              <Ionicons name="share" size={16} color="#6264A7" />
              <Text style={styles.actionButtonText}>Partager</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.openButton]}
              onPress={openTeamsLink}
            >
              <Ionicons name="open" size={16} color="#FFFFFF" />
              <Text style={styles.openButtonText}>Ouvrir</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.description}>
        Créez une réunion Teams pour cette séance. Les participants pourront rejoindre la visioconférence.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  generateButton: {
    backgroundColor: '#6264A7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  linkContainer: {
    marginBottom: 12,
  },
  linkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkInfoText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6264A7',
  },
  actionButtonText: {
    color: '#6264A7',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  openButton: {
    backgroundColor: '#6264A7',
    borderColor: '#6264A7',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
});
