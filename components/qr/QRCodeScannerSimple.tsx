import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as appointmentService from '@/services/appointmentService';

interface QRCodeScannerProps {
  coachId: string;
  onSessionStarted?: (appointmentId: string) => void;
  onSessionEnded?: (appointmentId: string) => void;
}

interface ActiveSession {
  appointmentId: string;
  clientName: string;
  startTime: Date;
  expectedDuration: number;
  actualStartTime: Date;
}

export default function QRCodeScannerSimple({ 
  coachId, 
  onSessionStarted, 
  onSessionEnded 
}: QRCodeScannerProps) {
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionTime, setSessionTime] = useState<string>('00:00');
  const [manualToken, setManualToken] = useState('');

  useEffect(() => {
    loadActiveSession();
    
    // Timer pour mettre à jour le temps de session
    const timer = setInterval(() => {
      if (activeSession) {
        updateSessionTime();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  const loadActiveSession = async () => {
    console.log('🔍 QR SCANNER - Chargement session active pour coach:', coachId);
    try {
      const session = await appointmentService.getActiveSessionForCoach(coachId);
      console.log('📊 QR SCANNER - Session active trouvée:', session ? 'Oui' : 'Non');
      setActiveSession(session);
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur chargement session:', error);
    }
  };

  const updateSessionTime = () => {
    if (!activeSession) return;
    
    const now = new Date();
    const startTime = new Date(activeSession.actualStartTime);
    const diff = now.getTime() - startTime.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    setSessionTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  const handleManualScan = async () => {
    if (!manualToken.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code QR');
      return;
    }
    
    console.log('📱 QR SCANNER - Scan manuel du code:', manualToken.substring(0, 20) + '...');
    setLoading(true);

    try {
      const result = await appointmentService.scanQRCode(manualToken, coachId);
      console.log('✅ QR SCANNER - Résultat scan manuel:', result);
      
      if (result.success && result.appointmentId) {
        Alert.alert(
          'Séance commencée !',
          `La séance avec ${result.clientName} a commencé.`,
          [{ text: 'OK', onPress: () => {
            setManualToken('');
            loadActiveSession();
            onSessionStarted?.(result.appointmentId!);
          }}]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Code QR invalide ou expiré');
      }
    } catch (error) {
      console.error('❌ QR SCANNER - Erreur scan manuel:', error);
      Alert.alert('Erreur', `Erreur lors du scan: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    
    Alert.alert(
      'Terminer la séance',
      `Voulez-vous terminer la séance avec ${activeSession.clientName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Terminer', 
          style: 'destructive',
          onPress: async () => {
            console.log('🔚 QR SCANNER - Fin de session manuelle pour:', activeSession.appointmentId);
            setLoading(true);
            try {
              await appointmentService.endSession(activeSession.appointmentId, coachId);
              console.log('✅ QR SCANNER - Session terminée');
              Alert.alert('Terminé', 'La séance a été terminée avec succès');
              setActiveSession(null);
              onSessionEnded?.(activeSession.appointmentId);
            } catch (error) {
              console.error('❌ QR SCANNER - Erreur fin session:', error);
              Alert.alert('Erreur', 'Impossible de terminer la séance');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (activeSession) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="fitness" size={32} color="#28a745" />
          <Text style={styles.title}>Séance en cours</Text>
          <Text style={styles.subtitle}>Avec {activeSession.clientName}</Text>
        </View>

        <View style={styles.sessionCard}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTime}>{sessionTime}</Text>
            <Text style={styles.sessionLabel}>Temps écoulé</Text>
          </View>
          
          <View style={styles.sessionDetails}>
            <Text style={styles.detailText}>
              Durée prévue: {activeSession.expectedDuration} minutes
            </Text>
            <Text style={styles.detailText}>
              Début: {new Date(activeSession.actualStartTime).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.endButton, loading && styles.buttonDisabled]}
          onPress={endSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="stop-circle" size={24} color="white" />
              <Text style={styles.endButtonText}>Terminer la séance</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="scan" size={32} color="#007AFF" />
        <Text style={styles.title}>Scanner QR Code</Text>
        <Text style={styles.subtitle}>Commencer une nouvelle séance</Text>
      </View>

      <View style={styles.scanSection}>
        <Text style={styles.sectionTitle}>Saisie manuelle</Text>
        <Text style={styles.instructions}>
          Demandez au client de vous montrer son QR code et saisissez le code ci-dessous :
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={manualToken}
            onChangeText={setManualToken}
            placeholder="Code QR du client..."
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[
            styles.scanButton,
            !manualToken.trim() && styles.buttonDisabled,
            loading && styles.buttonDisabled
          ]}
          onPress={handleManualScan}
          disabled={!manualToken.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.scanButtonText}>Valider le QR Code</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Instructions</Text>
        <Text style={styles.infoText}>
          1. Le client génère son QR code 30 minutes avant la séance{'\n'}
          2. Copiez et collez le code dans le champ ci-dessus{'\n'}
          3. Appuyez sur "Valider" pour commencer la séance{'\n'}
          4. La séance se termine automatiquement ou manuellement
        </Text>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  sessionCard: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 16,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sessionInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sessionTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#28a745',
    fontFamily: 'monospace',
  },
  sessionLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sessionDetails: {
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
  },
  endButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  endButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
