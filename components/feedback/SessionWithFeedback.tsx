import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useFeedbackSession } from '@/hooks/useFeedbackSession';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';

interface SessionWithFeedbackProps {
  coachId: string;
  currentUserId: string;
  isCoach: boolean;
}

export default function SessionWithFeedback({
  coachId,
  currentUserId,
  isCoach
}: SessionWithFeedbackProps) {
  // Hook de feedback
  const {
    currentFeedback,
    showFeedbackModal,
    submittingFeedback,
    triggerFeedback,
    submitCurrentFeedback,
    closeFeedbackModal,
    skipCurrentFeedback,
    checkPendingFeedbacks
  } = useFeedbackSession(currentUserId, isCoach);

  // Hook de session avec callback de feedback
  const {
    activeSession,
    loading,
    loadActiveSession,
    startSession,
    endSession,
    endSessionWithConfirmation
  } = useActiveSession(coachId, triggerFeedback);

  // Vérifier les feedbacks en attente au chargement
  useEffect(() => {
    checkPendingFeedbacks();
  }, [checkPendingFeedbacks]);

  // Charger la session active au montage
  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  const handleStartSession = async () => {
    // Pour la démo, on simule un QR token
    const mockQRToken = `mock_qr_${Date.now()}`;
    
    Alert.prompt(
      'Scanner QR Code',
      'Pour la démo, entrez un token QR:',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'OK',
          onPress: async (token) => {
            if (token) {
              const result = await startSession(token);
              Alert.alert(
                result.success ? 'Succès' : 'Erreur',
                result.message
              );
            }
          }
        }
      ],
      'plain-text',
      mockQRToken
    );
  };

  const handleEndSession = () => {
    endSessionWithConfirmation();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session avec Feedback</Text>
      
      {activeSession ? (
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>Séance en cours</Text>
          <Text style={styles.sessionDetail}>Client: {activeSession.clientName}</Text>
          <Text style={styles.sessionDetail}>ID: {activeSession.appointmentId}</Text>
          
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndSession}
            disabled={loading}
          >
            <Text style={styles.endButtonText}>
              {loading ? 'Finalisation...' : 'Terminer la séance'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noSession}>
          <Text style={styles.noSessionText}>Aucune séance active</Text>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartSession}
            disabled={loading}
          >
            <Text style={styles.startButtonText}>
              {loading ? 'Chargement...' : 'Démarrer une séance'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Informations sur les feedbacks */}
      <View style={styles.feedbackInfo}>
        <Text style={styles.feedbackTitle}>État du feedback</Text>
        <Text style={styles.feedbackDetail}>
          Feedback en attente: {currentFeedback ? 'Oui' : 'Non'}
        </Text>
        <Text style={styles.feedbackDetail}>
          Modal visible: {showFeedbackModal ? 'Oui' : 'Non'}
        </Text>
        
        <TouchableOpacity
          style={styles.checkButton}
          onPress={checkPendingFeedbacks}
        >
          <Text style={styles.checkButtonText}>Vérifier feedbacks en attente</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de feedback */}
      <FeedbackModal
        visible={showFeedbackModal}
        feedback={currentFeedback}
        isSubmitting={submittingFeedback}
        onSubmit={submitCurrentFeedback}
        onClose={closeFeedbackModal}
        onSkip={skipCurrentFeedback}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  sessionInfo: {
    backgroundColor: '#e8f5e8',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5a2d',
    marginBottom: 10,
  },
  sessionDetail: {
    fontSize: 14,
    color: '#4a4a4a',
    marginBottom: 5,
  },
  endButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  endButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  noSession: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  noSessionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  feedbackInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  feedbackDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  checkButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginTop: 10,
  },
  checkButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
});
