import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { auth } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import QRCodeScannerOptimized from '@/components/qr/QRCodeScannerOptimized';
import { backOrRoleHome } from '@/services/navigationService';
import PerformanceTestForm from '@/components/performance/PerformanceTestForm';
import * as performanceTestService from '@/services/performanceTestService';

export default function QRScannerScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showEmergencyStop, setShowEmergencyStop] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [lastEndedInfo, setLastEndedInfo] = useState<{ appointmentId: string; clientId: string } | null>(null);
  
  // Gérer l'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  // Vérifier s'il y a une session en cours pour ce coach
  const {
    activeSession,
    loading,
    loadActiveSession,
    endSession,
    endSessionWithConfirmation
  } = useActiveSession(currentUser?.uid || '', (appointmentId, coachId, clientId) => {
    // Callback appelé après fin de séance réussie → ouvrir le formulaire
    setLastEndedInfo({ appointmentId, clientId });
    setShowTestForm(true);
  });
  
  const { sessionTime, totalSeconds } = useSessionTimer(activeSession);

  useEffect(() => {
    // Charger la session active au montage
    if (currentUser?.uid) {
      loadActiveSession();
    }
  }, [currentUser?.uid, loadActiveSession]);

  useEffect(() => {
    // Afficher le bouton d'arrêt d'urgence s'il y a une session active
    setShowEmergencyStop(!!activeSession);
  }, [activeSession]);

  const handleEmergencyStop = () => {
    console.log('🚨 QR SCREEN - DÉBUT handleEmergencyStop');
    console.log('🚨 QR SCREEN - activeSession:', !!activeSession);
    console.log('🚨 QR SCREEN - loading:', loading);
    
    if (!activeSession) {
      console.log('❌ QR SCREEN - Pas de session active pour arrêt d\'urgence');
      return;
    }
    
    console.log('🚨 QR SCREEN - Session active trouvée:', {
      appointmentId: activeSession.appointmentId,
      clientName: activeSession.clientName
    });
    
    Alert.alert(
      '🚨 Arrêt d\'urgence',
      `Voulez-vous arrêter immédiatement la séance avec ${activeSession.clientName} ?`,
      [
        { 
          text: 'Annuler', 
          style: 'cancel',
          onPress: () => console.log('🚨 QR SCREEN - Annulation arrêt d\'urgence')
        },
        { 
          text: 'Arrêter maintenant', 
          style: 'destructive',
          onPress: async () => {
            console.log('🚨 QR SCREEN - Confirmation arrêt d\'urgence, appel endSession...');
            
            try {
              const result = await endSession();
              console.log('🚨 QR SCREEN - Résultat endSession:', result);
              
              if (result && result.success) {
                console.log('🚨 QR SCREEN - Succès arrêt d\'urgence');
                Alert.alert('Session arrêtée', 'La session a été arrêtée avec succès');
              } else if (result) {
                console.log('🚨 QR SCREEN - Échec arrêt d\'urgence:', result.message);
                Alert.alert('Erreur', result.message);
              } else {
                console.log('🚨 QR SCREEN - Pas de résultat retourné');
                Alert.alert('Erreur', 'Aucun résultat retourné');
              }
            } catch (error) {
              console.error('🚨 QR SCREEN - Erreur arrêt d\'urgence:', error);
              Alert.alert('Erreur', `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
            }
          }
        }
      ]
    );
  };

  const handleSessionStarted = (appointmentId: string) => {
    console.log('🎉 QR SCREEN - Session démarrée:', appointmentId);
    Alert.alert(
      'Séance commencée !', 
      'Le chronomètre a démarré. Vous pouvez maintenant superviser la séance.',
      [{ text: 'OK' }]
    );
  };

  const handleSessionEnded = (appointmentId: string) => {
    console.log('🏁 QR SCREEN - Session terminée:', appointmentId);
    setShowEmergencyStop(false);
    Alert.alert(
      'Séance terminée', 
      'La session a été arrêtée avec succès. Vous pouvez maintenant scanner un nouveau QR code.',
      [{ text: 'OK' }]
    );
  };

  const handleSubmitPerformanceTest = async (input: any) => {
    if (!currentUser || !lastEndedInfo) return;
    try {
      await performanceTestService.createPerformanceTest(input);
      setShowTestForm(false);
      Alert.alert('Test enregistré', 'Le test de performance a été enregistré avec succès.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d\'enregistrer le test');
    }
  };

  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.errorText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => backOrRoleHome('coach')}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Scanner QR Code</Text>
        </View>
        
        <View style={styles.centerContainer}>
          <Ionicons name="log-in-outline" size={64} color="#e74c3c" />
          <Text style={styles.errorTitle}>Connexion requise</Text>
          <Text style={styles.errorText}>
            Vous devez être connecté pour scanner des QR codes
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/auth/LoginScreen')}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec navigation */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => backOrRoleHome('coach')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Scanner QR Code</Text>
        
        {/* Bouton d'arrêt d'urgence */}
        {showEmergencyStop && (
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={handleEmergencyStop}
          >
            <Ionicons name="stop-circle" size={24} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>

      {/* Alerte session en cours */}
      {activeSession && (
        <View style={styles.sessionAlert}>
          <View style={styles.sessionAlertContent}>
            <Ionicons name="play-circle" size={20} color="#28a745" />
            <View style={styles.sessionAlertText}>
              <Text style={styles.sessionAlertTitle}>
                Session en cours avec {activeSession.clientName}
              </Text>
              <Text style={styles.sessionAlertTime}>
                Durée: {sessionTime} ({totalSeconds}s)
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.stopSessionButton}
              onPress={() => {
                console.log('🔴 QR SCREEN - Clic bouton stop dans alert session');
                console.log('🔴 QR SCREEN - activeSession:', !!activeSession);
                console.log('🔴 QR SCREEN - loading:', loading);
                
                if (!activeSession || loading) {
                  console.log('❌ QR SCREEN - Conditions non remplies pour arrêt');
                  return;
                }
                
                console.log('🔴 QR SCREEN - Affichage dialogue confirmation stop');
                Alert.alert(
                  'Terminer la séance',
                  `Voulez-vous terminer la séance avec ${activeSession.clientName} ?`,
                  [
                    { 
                      text: 'Annuler', 
                      style: 'cancel',
                      onPress: () => console.log('🔴 QR SCREEN - Annulation stop')
                    },
                    { 
                      text: 'Terminer', 
                      style: 'destructive',
                      onPress: async () => {
                        console.log('🔴 QR SCREEN - Confirmation stop, appel endSession...');
                        
                        try {
                          const result = await endSession();
                          console.log('🔴 QR SCREEN - Résultat endSession:', result);
                          
                          if (result && result.success) {
                            console.log('🔴 QR SCREEN - Succès stop');
                            Alert.alert('Séance terminée', 'La séance a été terminée avec succès');
                          } else if (result) {
                            console.log('🔴 QR SCREEN - Échec stop:', result.message);
                            Alert.alert('Erreur', result.message);
                          } else {
                            console.log('🔴 QR SCREEN - Pas de résultat retourné');
                            Alert.alert('Erreur', 'Aucun résultat retourné');
                          }
                        } catch (error) {
                          console.error('🔴 QR SCREEN - Erreur stop:', error);
                          Alert.alert('Erreur', `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
                        }
                      }
                    }
                  ]
                );
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="stop" size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Contenu principal */}
      <ScrollView style={styles.content}>
        {/* Scanner QR tant que pas de formulaire */}
        {!showTestForm && (
          <QRCodeScannerOptimized
            coachId={currentUser.uid}
            onSessionStarted={handleSessionStarted}
            onSessionEnded={handleSessionEnded}
          />
        )}

        {/* Formulaire de test de performance après fin de séance */}
        {showTestForm && lastEndedInfo && (
          <PerformanceTestForm
            appointmentId={lastEndedInfo.appointmentId}
            userId={lastEndedInfo.clientId}
            coachId={currentUser.uid}
            onSubmit={handleSubmitPerformanceTest}
          />
        )}
      </ScrollView>

      {/* Footer avec instructions d'urgence */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>🆘 En cas de problème :</Text>
        <Text style={styles.footerText}>
          • Utilisez le bouton d'arrêt d'urgence (🛑) en haut à droite{'\n'}
          • Ou utilisez le bouton "Terminer la séance" dans l'interface{'\n'}
          • Contactez le support si le problème persiste
        </Text>
      </View>
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50, // Pour éviter la barre de statut
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  emergencyButton: {
    padding: 8,
    backgroundColor: '#fee',
    borderRadius: 20,
  },
  sessionAlert: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
  },
  sessionAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  sessionAlertText: {
    flex: 1,
    marginLeft: 10,
  },
  sessionAlertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#155724',
  },
  sessionAlertTime: {
    fontSize: 12,
    color: '#155724',
    marginTop: 2,
  },
  stopSessionButton: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  footer: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
