import { useState, useCallback } from 'react';
import * as appointmentService from '@/services/appointmentService';
import { Alert } from 'react-native';

interface ActiveSession {
  appointmentId: string;
  clientName: string;
  startTime: Date;
  expectedDuration: number;
  actualStartTime: Date;
  clientId?: string; // Ajouter pour le feedback
}

export const useActiveSession = (coachId: string, onSessionEnd?: (appointmentId: string, coachId: string, clientId: string) => void) => {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(false);

  const loadActiveSession = useCallback(async () => {
    if (!coachId) return null;
    
    try {
      const session = await appointmentService.getActiveSessionForCoach(coachId);
      
      setActiveSession(session);
      return session;
    } catch (error) {
      console.error('❌ SESSION HOOK - Erreur chargement session:', error);
      setActiveSession(null);
      return null;
    }
  }, [coachId]); // Retirer activeSession de la dépendance

  const startSession = useCallback(async (qrToken: string) => {
    if (loading) return { success: false, message: 'Opération en cours...' };
    
    console.log('🎯 SESSION HOOK - Démarrage session avec token:', qrToken.substring(0, 20) + '...');
    setLoading(true);

    try {
      const result = await appointmentService.scanQRCode(qrToken, coachId);
      console.log('✅ SESSION HOOK - Résultat scan:', result);
      
      if (result.success && result.appointmentId) {
        // Recharger la session active
        await loadActiveSession();
        
        return {
          success: true,
          message: 'Séance commencée avec succès !',
          appointmentId: result.appointmentId,
          clientName: result.clientName,
          duration: result.duration
        };
      } else {
        return {
          success: false,
          message: result.message || 'Erreur lors du scan du QR code'
        };
      }
    } catch (error) {
      console.error('❌ SESSION HOOK - Erreur démarrage session:', error);
      return {
        success: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    } finally {
      setLoading(false);
    }
  }, [coachId, loading, loadActiveSession]);

  const endSession = useCallback(async () => {
    console.log('🔚 SESSION HOOK - DÉBUT endSession - activeSession:', !!activeSession);
    console.log('🔚 SESSION HOOK - DÉBUT endSession - loading:', loading);
    console.log('🔚 SESSION HOOK - DÉBUT endSession - coachId:', coachId);
    console.log('🔚 SESSION HOOK - DÉBUT endSession - appointmentService:', !!appointmentService);
    console.log('🔚 SESSION HOOK - DÉBUT endSession - appointmentService.endSession:', typeof appointmentService.endSession);
    
    if (!activeSession) {
      console.log('❌ SESSION HOOK - Pas de session active');
      return { success: false, message: 'Aucune session active' };
    }
    
    if (loading) {
      console.log('❌ SESSION HOOK - Déjà en cours de traitement');
      return { success: false, message: 'Opération en cours...' };
    }
    
    console.log('🔚 SESSION HOOK - Fin de session manuelle pour:', activeSession.appointmentId);
    console.log('🔚 SESSION HOOK - Détails session:', {
      appointmentId: activeSession.appointmentId,
      clientName: activeSession.clientName,
      coachId: coachId,
      typeAppointmentId: typeof activeSession.appointmentId,
      typeCoachId: typeof coachId
    });
    
    console.log('🔚 SESSION HOOK - setLoading(true)...');
    setLoading(true);

    try {
      console.log('🔚 SESSION HOOK - Appel appointmentService.endSession...');
      console.log('🔚 SESSION HOOK - Paramètres appel:', {
        appointmentId: activeSession.appointmentId,
        coachId: coachId
      });
      
      // Vérifier que les paramètres ne sont pas undefined/null
      if (!activeSession.appointmentId) {
        console.error('❌ SESSION HOOK - appointmentId manquant!');
        return { success: false, message: 'ID de session manquant' };
      }
      
      if (!coachId) {
        console.error('❌ SESSION HOOK - coachId manquant!');
        return { success: false, message: 'ID coach manquant' };
      }
      
      console.log('🔚 SESSION HOOK - Exécution appointmentService.endSession...');
      const result = await appointmentService.endSession(activeSession.appointmentId, coachId);
      console.log('✅ SESSION HOOK - Résultat appointmentService.endSession reçu:', result);
      console.log('✅ SESSION HOOK - Type résultat:', typeof result);
      console.log('✅ SESSION HOOK - Résultat.success:', result ? result.success : 'PAS DE RÉSULTAT');
      console.log('✅ SESSION HOOK - Résultat.message:', result ? result.message : 'PAS DE MESSAGE');
      
      if (result && result.success) {
        console.log('✅ SESSION HOOK - Succès, suppression session active');
        
        // Déclencher le feedback si un callback est fourni et qu'on a les informations nécessaires
        if (onSessionEnd && activeSession.clientId) {
          console.log('📝 SESSION HOOK - Déclenchement feedback pour fin de séance');
          try {
            onSessionEnd(activeSession.appointmentId, coachId, activeSession.clientId);
          } catch (feedbackError) {
            console.error('❌ SESSION HOOK - Erreur déclenchement feedback:', feedbackError);
            // Ne pas faire échouer la fin de séance pour autant
          }
        }
        
        setActiveSession(null);
        return {
          success: true,
          message: 'Séance terminée avec succès !',
          appointmentId: activeSession.appointmentId
        };
      } else {
        console.log('❌ SESSION HOOK - Échec service:', result ? result.message : 'Pas de résultat');
        return {
          success: false,
          message: result ? result.message : 'Erreur lors de la fin de session - pas de résultat'
        };
      }
    } catch (error) {
      console.error('❌ SESSION HOOK - Erreur lors de endSession:', error);
      console.error('❌ SESSION HOOK - Type erreur:', typeof error);
      console.error('❌ SESSION HOOK - Erreur détails:', {
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : undefined,
        appointmentId: activeSession.appointmentId,
        coachId: coachId
      });
      return {
        success: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    } finally {
      console.log('🔚 SESSION HOOK - Fin finally, setLoading(false)');
      setLoading(false);
    }
  }, [activeSession, coachId, loading]);

  const endSessionWithConfirmation = useCallback(() => {
    console.log('🔔 SESSION HOOK - DÉBUT endSessionWithConfirmation');
    console.log('🔔 SESSION HOOK - activeSession existe:', !!activeSession);
    
    if (!activeSession) {
      console.log('❌ SESSION HOOK - Pas de session active pour confirmation');
      return;
    }

    console.log('🔔 SESSION HOOK - Affichage dialogue confirmation pour:', activeSession.clientName);

    Alert.alert(
      'Terminer la séance',
      `Voulez-vous terminer la séance avec ${activeSession.clientName} ?`,
      [
        { 
          text: 'Annuler', 
          style: 'cancel',
          onPress: () => console.log('🔔 SESSION HOOK - Annulation par utilisateur')
        },
        { 
          text: 'Terminer', 
          style: 'destructive',
          onPress: async () => {
            console.log('🔔 SESSION HOOK - Confirmation par utilisateur, appel endSession...');
            const result = await endSession();
            console.log('🔔 SESSION HOOK - Résultat après confirmation:', result);
            
            if (result.success) {
              console.log('🔔 SESSION HOOK - Succès, affichage alert succès');
              Alert.alert('Séance terminée', result.message);
            } else {
              console.log('🔔 SESSION HOOK - Échec, affichage alert erreur');
              Alert.alert('Erreur', result.message);
            }
          }
        }
      ]
    );
  }, [activeSession, endSession]);

  return {
    activeSession,
    loading,
    loadActiveSession,
    startSession,
    endSession,
    endSessionWithConfirmation
  };
};
