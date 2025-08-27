import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedbackFormData, SessionParticipant, FeedbackSession } from '@/models/feedback';

interface SessionFeedbackFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackFormData) => Promise<void>;
  session: FeedbackSession;
  currentUser: SessionParticipant;
  evaluatedPerson: SessionParticipant;
}

export default function SessionFeedbackForm({
  visible,
  onClose,
  onSubmit,
  session,
  currentUser,
  evaluatedPerson
}: SessionFeedbackFormProps) {
  const [formData, setFormData] = useState<FeedbackFormData>({
    sessionQualityRating: 0,
    personRating: 0,
    comment: '',
    wouldRepeat: false,
    objectiveAchieved: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarPress = (rating: number, field: 'sessionQualityRating' | 'personRating') => {
    setFormData(prev => ({ ...prev, [field]: rating }));
  };

  const renderStars = (rating: number, onPress: (rating: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? '#FFD700' : '#DDD'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleToggle = (field: 'wouldRepeat' | 'objectiveAchieved') => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async () => {
    // Validation
    if (formData.sessionQualityRating === 0) {
      Alert.alert('Erreur', 'Veuillez noter la qualité de la séance');
      return;
    }
    if (formData.personRating === 0) {
      Alert.alert('Erreur', `Veuillez noter ${evaluatedPerson.role === 'coach' ? 'le coach' : 'le client'}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      Alert.alert(
        'Merci !', 
        'Votre évaluation a été envoyée avec succès',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Erreur soumission feedback:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'évaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.sessionQualityRating > 0 && formData.personRating > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Évaluation de séance</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info séance */}
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>Séance terminée</Text>
            <Text style={styles.sessionDetails}>
              Durée: {Math.floor(session.duration / 60)}min {session.duration % 60}s
            </Text>
            <Text style={styles.sessionDetails}>
              Avec: {evaluatedPerson.name} ({evaluatedPerson.role === 'coach' ? 'Coach' : 'Client'})
            </Text>
          </View>

          {/* Note qualité séance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="fitness" size={20} color="#007AFF" /> Qualité de la séance
            </Text>
            <Text style={styles.sectionSubtitle}>Comment évaluez-vous cette séance ?</Text>
            {renderStars(formData.sessionQualityRating, (rating) => 
              handleStarPress(rating, 'sessionQualityRating')
            )}
          </View>

          {/* Note personne */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="person" size={20} color="#007AFF" /> 
              {evaluatedPerson.role === 'coach' ? ' Votre coach' : ' Votre client'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Comment évaluez-vous {evaluatedPerson.name} ?
            </Text>
            {renderStars(formData.personRating, (rating) => 
              handleStarPress(rating, 'personRating')
            )}
          </View>

          {/* Questions oui/non */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="help-circle" size={20} color="#007AFF" /> Questions
            </Text>
            
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>
                Souhaitez-vous refaire une séance avec {evaluatedPerson.name} ?
              </Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, formData.wouldRepeat && styles.toggleButtonActive]}
                  onPress={() => handleToggle('wouldRepeat')}
                >
                  <Text style={[styles.toggleText, formData.wouldRepeat && styles.toggleTextActive]}>
                    {formData.wouldRepeat ? 'Oui' : 'Non'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>
                Votre objectif de séance a-t-il été accompli ?
              </Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, formData.objectiveAchieved && styles.toggleButtonActive]}
                  onPress={() => handleToggle('objectiveAchieved')}
                >
                  <Text style={[styles.toggleText, formData.objectiveAchieved && styles.toggleTextActive]}>
                    {formData.objectiveAchieved ? 'Oui' : 'Non'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Commentaire */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="chatbubble" size={20} color="#007AFF" /> Commentaire (optionnel)
            </Text>
            <TextInput
              style={styles.commentInput}
              value={formData.comment}
              onChangeText={(text) => setFormData(prev => ({ ...prev, comment: text }))}
              placeholder="Partagez vos impressions sur cette séance..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Bouton submit */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            <Text style={[styles.submitButtonText, !isFormValid && styles.submitButtonTextDisabled]}>
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer l\'évaluation'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sessionInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 8,
  },
  sessionDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  starButton: {
    padding: 5,
    marginHorizontal: 5,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
    lineHeight: 20,
  },
  toggleContainer: {
    alignItems: 'flex-start',
  },
  toggleButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  toggleText: {
    color: '#666',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: 'white',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    backgroundColor: '#f8f9fa',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
});
