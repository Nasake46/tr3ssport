import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCodeGenerator from '@/components/qr/QRCodeGenerator';

interface AppointmentDetailModalProps {
  visible: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    title: string;
    date: Date;
    duration?: number;
    status?: string;
    coachName?: string;
  };
}

export default function AppointmentDetailModal({
  visible,
  onClose,
  appointment
}: AppointmentDetailModalProps) {
  const [showQRCode, setShowQRCode] = useState(false);

  const getStatusColor = () => {
    switch (appointment.status) {
      case 'confirmed': return '#28a745';
      case 'pending': return '#ff9500';
      case 'started': return '#007AFF';
      case 'completed': return '#6c757d';
      default: return '#999';
    }
  };

  const getStatusText = () => {
    switch (appointment.status) {
      case 'confirmed': return 'Confirmé';
      case 'pending': return 'En attente';
      case 'started': return 'En cours';
      case 'completed': return 'Terminé';
      default: return 'Statut inconnu';
    }
  };

  const canShowQRCode = () => {
    const now = new Date();
    const appointmentTime = new Date(appointment.date);
    const thirtyMinsBefore = new Date(appointmentTime.getTime() - 30 * 60 * 1000);
    const appointmentEnd = new Date(appointmentTime.getTime() + (appointment.duration || 60) * 60 * 1000);
    
    return now >= thirtyMinsBefore && now <= appointmentEnd && 
           ['confirmed', 'started'].includes(appointment.status || '');
  };

  const handleQRGenerated = (token: string) => {
    console.log('QR généré pour RDV:', appointment.id, 'Token:', token);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détails du rendez-vous</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Appointment Info */}
        <View style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <Text style={styles.appointmentTitle}>{appointment.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </View>

          <View style={styles.appointmentDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={20} color="#666" />
              <Text style={styles.detailText}>
                {appointment.date.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color="#666" />
              <Text style={styles.detailText}>
                {appointment.date.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })} ({appointment.duration || 60} minutes)
              </Text>
            </View>

            {appointment.coachName && (
              <View style={styles.detailRow}>
                <Ionicons name="person" size={20} color="#666" />
                <Text style={styles.detailText}>{appointment.coachName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* QR Code Section */}
        {canShowQRCode() && (
          <View style={styles.qrSection}>
            <View style={styles.qrHeader}>
              <Ionicons name="qr-code" size={24} color="#007AFF" />
              <Text style={styles.qrTitle}>QR Code de séance</Text>
            </View>
            
            <Text style={styles.qrDescription}>
              Générez votre QR code pour valider le début de la séance avec votre coach
            </Text>

            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => setShowQRCode(true)}
            >
              <Ionicons name="qr-code-outline" size={20} color="white" />
              <Text style={styles.qrButtonText}>Afficher le QR Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {appointment.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => Alert.alert('Confirmer', 'Fonctionnalité à implémenter')}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.actionButtonText}>Confirmer</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => Alert.alert('Annuler', 'Fonctionnalité à implémenter')}
          >
            <Ionicons name="close-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code Modal */}
        <Modal
          visible={showQRCode}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowQRCode(false)}
        >
          <View style={styles.qrModal}>
            <View style={styles.qrModalHeader}>
              <TouchableOpacity
                onPress={() => setShowQRCode(false)}
                style={styles.qrCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.qrModalTitle}>QR Code de Séance</Text>
              <View style={{ width: 24 }} />
            </View>

            <QRCodeGenerator
              appointmentId={appointment.id}
              appointmentDate={appointment.date}
              duration={appointment.duration}
              onQRGenerated={handleQRGenerated}
            />
          </View>
        </Modal>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentCard: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appointmentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  qrSection: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  qrDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  qrButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  qrButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  qrModal: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrCloseButton: {
    padding: 8,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});
