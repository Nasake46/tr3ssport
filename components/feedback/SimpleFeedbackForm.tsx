import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedbackFormData, SessionFeedback } from '@/models/feedback';

interface SimpleFeedbackFormProps {
  feedback: SessionFeedback;
  onSubmit: (formData: FeedbackFormData) => Promise<boolean>;
  isSubmitting: boolean;
}

export default function SimpleFeedbackForm({
  feedback,
  onSubmit,
  isSubmitting
}: SimpleFeedbackFormProps) {
  const [formData, setFormData] = useState<FeedbackFormData>({
    sessionQualityRating: 0,
    personRating: 0,
    comment: '',
    wouldRepeat: false,
    objectiveAchieved: false
  });

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
              color={star <= rating ? '#FFD700' : '#ccc'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleSubmit = async () => {
    if (formData.sessionQualityRating === 0 || formData.personRating === 0) {
      Alert.alert('Évaluation incomplète', 'Veuillez donner une note pour la séance et la personne.');
      return;
    }

    const success = await onSubmit(formData);
    if (!success) {
      // L'erreur est déjà gérée dans le hook
    }
  };

  const evaluatedRole = feedback.evaluatedRole;
  const evaluatedName = evaluatedRole === 'coach' ? 'le coach' : 'le client';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Note qualité de la séance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Qualité de la séance</Text>
        <Text style={styles.sectionSubtitle}>Comment évaluez-vous cette séance ?</Text>
        {renderStars(formData.sessionQualityRating, (rating) => 
          handleStarPress(rating, 'sessionQualityRating')
        )}
      </View>

      {/* Note de la personne */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Évaluation {evaluatedRole === 'coach' ? 'du coach' : 'du client'}
        </Text>
        <Text style={styles.sectionSubtitle}>
          Comment évaluez-vous {evaluatedName} ?
        </Text>
        {renderStars(formData.personRating, (rating) => 
          handleStarPress(rating, 'personRating')
        )}
      </View>

      {/* Questions oui/non */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Questions</Text>
        
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>
            Souhaitez-vous refaire une séance avec {evaluatedName} ?
          </Text>
          <View style={styles.yesNoContainer}>
            <TouchableOpacity
              style={[styles.yesNoButton, formData.wouldRepeat && styles.yesNoSelected]}
              onPress={() => setFormData(prev => ({ ...prev, wouldRepeat: true }))}
            >
              <Text style={[styles.yesNoText, formData.wouldRepeat && styles.yesNoTextSelected]}>
                Oui
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.yesNoButton, !formData.wouldRepeat && styles.yesNoSelected]}
              onPress={() => setFormData(prev => ({ ...prev, wouldRepeat: false }))}
            >
              <Text style={[styles.yesNoText, !formData.wouldRepeat && styles.yesNoTextSelected]}>
                Non
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>
            L'objectif de la séance a-t-il été accompli ?
          </Text>
          <View style={styles.yesNoContainer}>
            <TouchableOpacity
              style={[styles.yesNoButton, formData.objectiveAchieved && styles.yesNoSelected]}
              onPress={() => setFormData(prev => ({ ...prev, objectiveAchieved: true }))}
            >
              <Text style={[styles.yesNoText, formData.objectiveAchieved && styles.yesNoTextSelected]}>
                Oui
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.yesNoButton, !formData.objectiveAchieved && styles.yesNoSelected]}
              onPress={() => setFormData(prev => ({ ...prev, objectiveAchieved: false }))}
            >
              <Text style={[styles.yesNoText, !formData.objectiveAchieved && styles.yesNoTextSelected]}>
                Non
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Commentaire */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Commentaire (optionnel)</Text>
        <TextInput
          style={styles.commentInput}
          value={formData.comment}
          onChangeText={(text) => setFormData(prev => ({ ...prev, comment: text }))}
          placeholder="Partagez vos impressions sur la séance..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Bouton de soumission */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitText}>
          {isSubmitting ? 'Envoi en cours...' : 'Envoyer l\'évaluation'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 4,
  },
  questionContainer: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  yesNoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  yesNoButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    marginHorizontal: 8,
    backgroundColor: '#fff',
  },
  yesNoSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  yesNoText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  yesNoTextSelected: {
    color: '#fff',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
