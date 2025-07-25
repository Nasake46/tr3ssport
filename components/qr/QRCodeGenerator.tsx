import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import * as appointmentService from '@/services/appointmentService';

interface QRCodeGeneratorProps {
  appointmentId: string;
  appointmentDate: Date;
  duration?: number;
  onQRGenerated?: (token: string) => void;
}

export default function QRCodeGenerator({ 
  appointmentId, 
  appointmentDate, 
  duration = 60,
  onQRGenerated 
}: QRCodeGeneratorProps) {
  const [qrToken, setQrToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    canGenerate: boolean;
    isGenerated: boolean;
    isScanned: boolean;
    timeUntilGeneration?: number;
    timeUntilExpiration?: number;
  }>({
    canGenerate: false,
    isGenerated: false,
    isScanned: false
  });
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    console.log('🔄 QR GENERATOR - Initialisation avec:', {
      appointmentId,
      appointmentDate: appointmentDate.toISOString(),
      duration
    });
    checkQRStatus();
    const interval = setInterval(checkQRStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [appointmentId]);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      updateCountdown();
    }, 1000);
    
    return () => clearInterval(timer);
  }, [status]);

  const checkQRStatus = async () => {
    console.log('🔍 QR GENERATOR - Vérification du statut pour:', appointmentId);
    try {
      const qrStatus = await appointmentService.getQRCodeStatus(appointmentId);
      console.log('📊 QR GENERATOR - Statut reçu:', qrStatus);
      setStatus(qrStatus);
      
      // Si un QR code existe déjà, le récupérer
      if (qrStatus.isGenerated) {
        console.log('🔄 QR GENERATOR - QR code déjà généré, récupération...');
        const appointment = await appointmentService.getAppointmentById(appointmentId);
        console.log('📋 QR GENERATOR - Appointment récupéré:', appointment ? 'Trouvé' : 'Non trouvé');
        if (appointment && (appointment as any).qrToken) {
          console.log('✅ QR GENERATOR - Token récupéré:', (appointment as any).qrToken.substring(0, 20) + '...');
          setQrToken((appointment as any).qrToken);
        }
      }
      
      // Auto-génération si possible et pas encore généré
      if (qrStatus.canGenerate && !qrStatus.isGenerated && !loading) {
        console.log('🔄 QR GENERATOR - Auto-génération du QR code...');
        autoGenerateQRCode();
      } else {
        console.log('⏸️ QR GENERATOR - Auto-génération non déclenchée:', {
          canGenerate: qrStatus.canGenerate,
          isGenerated: qrStatus.isGenerated,
          loading: loading
        });
      }
    } catch (error) {
      console.error('❌ QR GENERATOR - Erreur vérification status QR:', error);
    }
  };

  const autoGenerateQRCode = async () => {
    console.log('⚡ QR GENERATOR - Début auto-génération');
    setLoading(true);
    try {
      const token = await appointmentService.generateQRCodeForAppointment(appointmentId);
      console.log('✅ QR GENERATOR - Token auto-généré:', token.substring(0, 20) + '...');
      setQrToken(token);
      onQRGenerated?.(token);
      console.log('✅ QR GENERATOR - Auto-génération réussie');
    } catch (error) {
      console.error('❌ QR GENERATOR - Erreur auto-génération:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCountdown = () => {
    const now = new Date();
    const appointmentTime = new Date(appointmentDate);
    const thirtyMinsBefore = new Date(appointmentTime.getTime() - 30 * 60 * 1000);
    const appointmentEnd = new Date(appointmentTime.getTime() + duration * 60 * 1000);

    console.log('⏰ QR GENERATOR - Mise à jour countdown:', {
      now: now.toISOString(),
      appointmentTime: appointmentTime.toISOString(),
      thirtyMinsBefore: thirtyMinsBefore.toISOString(),
      appointmentEnd: appointmentEnd.toISOString(),
      canGenerate: now >= thirtyMinsBefore,
      inWindow: now >= thirtyMinsBefore && now <= appointmentEnd,
      statusIsScanned: status.isScanned,
      statusIsGenerated: status.isGenerated
    });

    if (status.isScanned) {
      setCountdown('Séance en cours...');
    } else if (now < thirtyMinsBefore) {
      const timeLeft = thirtyMinsBefore.getTime() - now.getTime();
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      setCountdown(`QR disponible dans ${minutes}:${seconds.toString().padStart(2, '0')}`);
    } else if (now >= thirtyMinsBefore && now <= appointmentEnd) {
      // Dans la fenêtre de génération (30 min avant jusqu'à la fin du RDV)
      if (status.isGenerated) {
        const timeLeft = appointmentEnd.getTime() - now.getTime();
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        setCountdown(`Temps restant: ${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setCountdown('QR Code disponible - Générez maintenant !');
      }
    } else {
      setCountdown('Créneau expiré');
    }
  };

  const generateQRCode = async () => {
    console.log('🎯 QR GENERATOR - Génération manuelle déclenchée');
    console.log('🎯 QR GENERATOR - Status actuel:', status);
    
    if (!status.canGenerate) {
      console.log('❌ QR GENERATOR - Génération refusée - trop tôt');
      Alert.alert('Trop tôt', 'Le QR code sera disponible 30 minutes avant votre séance');
      return;
    }

    console.log('⚡ QR GENERATOR - Début génération manuelle');
    setLoading(true);
    try {
      const token = await appointmentService.generateQRCodeForAppointment(appointmentId);
      console.log('✅ QR GENERATOR - Token généré manuellement:', token.substring(0, 20) + '...');
      setQrToken(token);
      onQRGenerated?.(token);
      
      Alert.alert(
        'QR Code généré !', 
        'Votre QR code est prêt. Montrez-le à votre coach pour commencer la séance.'
      );
      
      // Recheck status
      console.log('🔄 QR GENERATOR - Revérification du statut après génération');
      await checkQRStatus();
    } catch (error) {
      console.error('❌ QR GENERATOR - Erreur génération manuelle:', error);
      Alert.alert('Erreur', `Impossible de générer le QR code: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (status.isScanned) return '#28a745'; // Vert - scanné
    if (status.isGenerated) return '#007AFF'; // Bleu - généré
    if (status.canGenerate) return '#ff9500'; // Orange - peut générer
    return '#6c757d'; // Gris - pas encore disponible
  };

  const getStatusText = () => {
    if (status.isScanned) return 'Séance commencée ✓';
    if (status.isGenerated) return 'QR Code prêt';
    if (status.canGenerate) return 'Générer QR Code';
    return 'QR Code non disponible';
  };

  const getStatusIcon = () => {
    if (status.isScanned) return 'checkmark-circle';
    if (status.isGenerated) return 'qr-code';
    if (status.canGenerate) return 'add-circle';
    return 'time';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="qr-code" size={32} color={getStatusColor()} />
        <Text style={styles.title}>QR Code de Séance</Text>
        <Text style={styles.subtitle}>{getStatusText()}</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.countdown}>{countdown}</Text>
        <Text style={styles.info}>
          Durée prévue: {duration} minutes
        </Text>
      </View>

      {status.isGenerated && qrToken ? (
        <View style={styles.qrContainer}>
          <View style={styles.qrCodeWrapper}>
            <QRCode
              value={qrToken}
              size={200}
              backgroundColor="white"
              color="black"
              logo={{ uri: undefined }}
            />
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Ionicons name={getStatusIcon()} size={16} color="white" />
            <Text style={styles.statusBadgeText}>
              {status.isScanned ? 'Scanné' : 'Prêt à scanner'}
            </Text>
          </View>

          <Text style={styles.instructions}>
            {status.isScanned 
              ? 'Votre séance a commencé ! 🎉'
              : 'Montrez ce QR code à votre coach pour commencer la séance'
            }
          </Text>
        </View>
      ) : (
        <View style={styles.generateContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Génération du QR code...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  { 
                    backgroundColor: status.canGenerate ? '#007AFF' : '#6c757d',
                    opacity: status.canGenerate ? 1 : 0.6
                  }
                ]}
                onPress={generateQRCode}
                disabled={!status.canGenerate || loading}
              >
                <Ionicons name={getStatusIcon()} size={24} color="white" />
                <Text style={styles.generateButtonText}>
                  {getStatusText()}
                </Text>
              </TouchableOpacity>

              <Text style={styles.waitingText}>
                {!status.canGenerate 
                  ? 'Le QR code sera disponible 30 minutes avant votre séance'
                  : 'Appuyez pour générer votre QR code ou attendez la génération automatique'
                }
              </Text>
            </>
          )}
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Comment ça marche ?</Text>
        <Text style={styles.infoText}>
          • Le QR code est généré 30 minutes avant votre séance{'\n'}
          • Montrez-le à votre coach pour valider le début{'\n'}
          • La séance se termine automatiquement après {duration} minutes{'\n'}
          • Le coach peut aussi arrêter manuellement
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
    marginBottom: 20,
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
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countdown: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: '#666',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
  },
  statusBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
  },
  instructions: {
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    maxWidth: width - 60,
  },
  generateContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    marginBottom: 15,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  waitingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    maxWidth: width - 60,
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
