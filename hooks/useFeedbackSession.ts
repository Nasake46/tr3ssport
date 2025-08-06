import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { 
  createFeedbackSession, 
  submitFeedback, 
  getPendingFeedbacksForUser 
} from '@/services/feedbackService';
import { FeedbackFormData, SessionFeedback } from '@/models/feedback';

export const useFeedbackSession = (currentUserId: string, isCoach: boolean = false) => {
  const [pendingFeedbacks, setPendingFeedbacks] = useState<SessionFeedback[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<SessionFeedback | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  /**
   * Déclenche le processus de feedback pour une séance terminée
   */
  const triggerFeedback = useCallback(async (
    appointmentId: string,
    coachId: string,
    clientId: string,
    sessionDuration: number = 60
  ) => {
    console.log('📝 FEEDBACK - Déclenchement feedback pour séance:', appointmentId);
    
    try {
      // Créer la session de feedback
      const result = await createFeedbackSession(
        appointmentId,
        coachId,
        clientId,
        sessionDuration
      );

      if (result.success && result.feedbacks.length > 0) {
        console.log('📝 FEEDBACK - Session créée:', result.feedbacks.length, 'feedbacks');
        
        // Chercher les feedbacks en attente pour l'utilisateur actuel
        const userFeedbacks = result.feedbacks.filter(
          (f: SessionFeedback) => f.evaluatorId === currentUserId && f.status === 'pending'
        );

        if (userFeedbacks.length > 0) {
          console.log('📝 FEEDBACK - Feedbacks trouvés pour utilisateur:', userFeedbacks.length);
          
          setPendingFeedbacks(userFeedbacks);
          setCurrentFeedback(userFeedbacks[0]); // Commencer par le premier
          
          // Petit délai pour que l'UI se mette à jour après la fin de séance
          setTimeout(() => {
            setShowFeedbackModal(true);
          }, 1000);
        } else {
          console.log('📝 FEEDBACK - Aucun feedback en attente pour cet utilisateur');
        }
      }
    } catch (error) {
      console.error('❌ FEEDBACK - Erreur création session feedback:', error);
      // Ne pas bloquer l'utilisateur, juste logger l'erreur
    }
  }, [currentUserId]);

  /**
   * Soumet le feedback de l'utilisateur
   */
  const submitCurrentFeedback = useCallback(async (formData: FeedbackFormData) => {
    if (!currentFeedback) {
      console.error('❌ FEEDBACK - Pas de feedback en cours');
      return false;
    }

    console.log('📝 FEEDBACK - Soumission feedback:', currentFeedback.id);
    setSubmittingFeedback(true);

    try {
      await submitFeedback(currentFeedback.id, formData);

      console.log('✅ FEEDBACK - Feedback soumis avec succès');
      
      // Retirer le feedback soumis de la liste
      const remainingFeedbacks = pendingFeedbacks.filter(f => f.id !== currentFeedback.id);
      setPendingFeedbacks(remainingFeedbacks);
      
      // S'il y a d'autres feedbacks en attente, passer au suivant
      if (remainingFeedbacks.length > 0) {
        setCurrentFeedback(remainingFeedbacks[0]);
      } else {
        // Plus de feedbacks, fermer le modal
        setShowFeedbackModal(false);
        setCurrentFeedback(null);
        
        // Afficher une confirmation
        Alert.alert(
          'Merci !',
          'Toutes vos évaluations ont été enregistrées avec succès.',
          [{ text: 'OK' }]
        );
      }

      return true;
    } catch (error) {
      console.error('❌ FEEDBACK - Erreur soumission:', error);
      
      Alert.alert(
        'Erreur',
        'Impossible d\'enregistrer votre évaluation. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
      
      return false;
    } finally {
      setSubmittingFeedback(false);
    }
  }, [currentFeedback, pendingFeedbacks]);

  /**
   * Ferme le modal de feedback (permet à l'utilisateur de l'ignorer)
   */
  const closeFeedbackModal = useCallback(() => {
    setShowFeedbackModal(false);
    // Garde pendingFeedbacks pour éventuellement reproposer plus tard
  }, []);

  /**
   * Ignore définitivement le feedback actuel
   */
  const skipCurrentFeedback = useCallback(() => {
    console.log('📝 FEEDBACK - Utilisateur a ignoré le feedback');
    
    if (!currentFeedback) return;
    
    // Retirer le feedback ignoré de la liste
    const remainingFeedbacks = pendingFeedbacks.filter(f => f.id !== currentFeedback.id);
    setPendingFeedbacks(remainingFeedbacks);
    
    // S'il y a d'autres feedbacks, passer au suivant
    if (remainingFeedbacks.length > 0) {
      setCurrentFeedback(remainingFeedbacks[0]);
    } else {
      // Plus de feedbacks, fermer le modal
      setShowFeedbackModal(false);
      setCurrentFeedback(null);
    }
  }, [currentFeedback, pendingFeedbacks]);

  /**
   * Vérifie s'il y a des feedbacks en attente pour un utilisateur
   */
  const checkPendingFeedbacks = useCallback(async () => {
    try {
      const pending = await getPendingFeedbacksForUser(currentUserId);
      
      if (pending.length > 0) {
        console.log('📝 FEEDBACK - Feedbacks en attente trouvés:', pending.length);
        
        setPendingFeedbacks(pending);
        setCurrentFeedback(pending[0]);
        setShowFeedbackModal(true);
      }
    } catch (error) {
      console.error('❌ FEEDBACK - Erreur vérification feedbacks en attente:', error);
    }
  }, [currentUserId]);

  return {
    // État
    pendingFeedbacks,
    currentFeedback,
    showFeedbackModal,
    submittingFeedback,
    
    // Actions
    triggerFeedback,
    submitCurrentFeedback,
    closeFeedbackModal,
    skipCurrentFeedback,
    checkPendingFeedbacks
  };
};