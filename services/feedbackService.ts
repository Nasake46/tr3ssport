import { 
  collection, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { SessionFeedback, FeedbackFormData, FeedbackSession, SessionParticipant } from '@/models/feedback';

const FEEDBACK_COLLECTION = 'sessionFeedbacks';

/**
 * Crée les feedbacks pour tous les participants d'une séance
 */
export const createSessionFeedbacks = async (
  appointmentId: string,
  sessionId: string,
  participants: SessionParticipant[],
  sessionDuration: number
): Promise<void> => {
  console.log('🔄 FEEDBACK - Création feedbacks pour session:', sessionId);
  
  try {
    const feedbacks: Omit<SessionFeedback, 'id'>[] = [];
    
    // Créer un feedback pour chaque paire évaluateur/évalué
    for (const evaluator of participants) {
      for (const evaluated of participants) {
        if (evaluator.id !== evaluated.id) { // Ne pas s'auto-évaluer
          feedbacks.push({
            appointmentId,
            sessionId,
            evaluatorId: evaluator.userId,
            evaluatorRole: evaluator.role,
            evaluatedId: evaluated.userId,
            evaluatedRole: evaluated.role,
            sessionQualityRating: 0,
            personRating: 0,
            comment: '',
            wouldRepeat: false,
            objectiveAchieved: false,
            createdAt: new Date(),
            status: 'pending'
          });
        }
      }
    }
    
    // Sauvegarder tous les feedbacks
    for (const feedback of feedbacks) {
      await addDoc(collection(firestore, FEEDBACK_COLLECTION), {
        ...feedback,
        createdAt: Timestamp.fromDate(feedback.createdAt)
      });
    }
    
    console.log('✅ FEEDBACK - Feedbacks créés:', feedbacks.length);
  } catch (error) {
    console.error('❌ FEEDBACK - Erreur création:', error);
    throw error;
  }
};

/**
 * Récupère les feedbacks en attente pour un utilisateur
 */
export const getPendingFeedbacksForUser = async (userId: string): Promise<SessionFeedback[]> => {
  try {
    const q = query(
      collection(firestore, FEEDBACK_COLLECTION),
      where('evaluatorId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const feedbacks: SessionFeedback[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      feedbacks.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        submittedAt: data.submittedAt ? data.submittedAt.toDate() : undefined,
      } as SessionFeedback);
    });
    
    console.log('📋 FEEDBACK - Feedbacks en attente trouvés:', feedbacks.length);
    return feedbacks;
  } catch (error) {
    console.error('❌ FEEDBACK - Erreur récupération:', error);
    return [];
  }
};

/**
 * Soumet un feedback rempli
 */
export const submitFeedback = async (
  feedbackId: string,
  formData: FeedbackFormData
): Promise<void> => {
  console.log('📤 FEEDBACK - Soumission feedback:', feedbackId);
  
  try {
    const feedbackRef = doc(firestore, FEEDBACK_COLLECTION, feedbackId);
    
    await updateDoc(feedbackRef, {
      sessionQualityRating: formData.sessionQualityRating,
      personRating: formData.personRating,
      comment: formData.comment,
      wouldRepeat: formData.wouldRepeat,
      objectiveAchieved: formData.objectiveAchieved,
      submittedAt: Timestamp.now(),
      status: 'submitted'
    });
    
    console.log('✅ FEEDBACK - Feedback soumis avec succès');
  } catch (error) {
    console.error('❌ FEEDBACK - Erreur soumission:', error);
    throw error;
  }
};

/**
 * Récupère les feedbacks d'une séance
 */
export const getSessionFeedbacks = async (sessionId: string): Promise<SessionFeedback[]> => {
  try {
    const q = query(
      collection(firestore, FEEDBACK_COLLECTION),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const feedbacks: SessionFeedback[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      feedbacks.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        submittedAt: data.submittedAt ? data.submittedAt.toDate() : undefined,
      } as SessionFeedback);
    });
    
    return feedbacks;
  } catch (error) {
    console.error('❌ FEEDBACK - Erreur récupération feedbacks session:', error);
    return [];
  }
};

/**
 * Récupère les statistiques de feedback pour un utilisateur
 */
export const getFeedbackStats = async (userId: string): Promise<{
  totalReceived: number;
  averageSessionRating: number;
  averagePersonRating: number;
  wouldRepeatPercentage: number;
}> => {
  try {
    const q = query(
      collection(firestore, FEEDBACK_COLLECTION),
      where('evaluatedId', '==', userId),
      where('status', '==', 'submitted')
    );
    
    const querySnapshot = await getDocs(q);
    const feedbacks: SessionFeedback[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      feedbacks.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        submittedAt: data.submittedAt ? data.submittedAt.toDate() : undefined,
      } as SessionFeedback);
    });
    
    if (feedbacks.length === 0) {
      return {
        totalReceived: 0,
        averageSessionRating: 0,
        averagePersonRating: 0,
        wouldRepeatPercentage: 0
      };
    }
    
    const avgSessionRating = feedbacks.reduce((sum, f) => sum + f.sessionQualityRating, 0) / feedbacks.length;
    const avgPersonRating = feedbacks.reduce((sum, f) => sum + f.personRating, 0) / feedbacks.length;
    const wouldRepeatCount = feedbacks.filter(f => f.wouldRepeat).length;
    
    return {
      totalReceived: feedbacks.length,
      averageSessionRating: Number(avgSessionRating.toFixed(1)),
      averagePersonRating: Number(avgPersonRating.toFixed(1)),
      wouldRepeatPercentage: Number(((wouldRepeatCount / feedbacks.length) * 100).toFixed(1))
    };
  } catch (error) {
    console.error('❌ FEEDBACK - Erreur statistiques:', error);
    return {
      totalReceived: 0,
      averageSessionRating: 0,
      averagePersonRating: 0,
      wouldRepeatPercentage: 0
    };
  }
};

/**
 * Crée une session de feedback pour une séance terminée
 */
export const createFeedbackSession = async (
  appointmentId: string,
  coachId: string,
  clientId: string,
  sessionDuration: number = 60
): Promise<{ success: boolean; feedbacks: SessionFeedback[] }> => {
  console.log('🔄 FEEDBACK SESSION - Création session feedback pour:', appointmentId);
  
  try {
    const sessionId = `session_${appointmentId}_${Date.now()}`;
    
    // Définir les participants
    const participants: SessionParticipant[] = [
      { id: coachId, name: 'Coach', role: 'coach', userId: coachId },
      { id: clientId, name: 'Client', role: 'client', userId: clientId }
    ];
    
    // Créer les feedbacks pour chaque participant
    await createSessionFeedbacks(appointmentId, sessionId, participants, sessionDuration);
    
    // Récupérer les feedbacks créés
    const feedbacks = await getSessionFeedbacks(sessionId);
    
    console.log('✅ FEEDBACK SESSION - Session créée avec succès:', feedbacks.length, 'feedbacks');
    return { success: true, feedbacks };
  } catch (error) {
    console.error('❌ FEEDBACK SESSION - Erreur création session:', error);
    return { success: false, feedbacks: [] };
  }
};
