import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SimpleFeedbackForm from './SimpleFeedbackForm';
import { SessionFeedback, FeedbackFormData } from '@/models/feedback';

interface FeedbackModalProps {
  visible: boolean;
  feedback: SessionFeedback | null;
  isSubmitting: boolean;
  onSubmit: (formData: FeedbackFormData) => Promise<boolean>;
  onClose: () => void;
  onSkip: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  feedback,
  isSubmitting,
  onSubmit,
  onClose,
  onSkip
}) => {
  if (!feedback) return null;

  const evaluatedName = feedback.evaluatedRole === 'coach' ? 'le coach' : 'le client';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Évaluation de la séance</Text>
          <Text style={styles.subtitle}>
            Donnez votre avis sur la séance et {evaluatedName}
          </Text>
        </View>

        <View style={styles.content}>
          <SimpleFeedbackForm
            feedback={feedback}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={isSubmitting}
          >
            <Text style={styles.skipText}>Ignorer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.closeText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  closeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});
