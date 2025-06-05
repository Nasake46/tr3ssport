import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppointmentRequest } from '@/models/appointment';
import { createAppointmentFromRequest, updateAppointmentRequestStatus } from '@/services/appointmentService';

interface AppointmentConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  request: AppointmentRequest | null;
  onConfirmed: () => void;
}

const AppointmentConfirmationModal: React.FC<AppointmentConfirmationModalProps> = ({
  visible,
  onClose,
  request,
  onConfirmed
}) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (request && visible) {
      // Pré-remplir avec les données de la demande si disponibles
      if (request.preferredDate) {
        const preferredDate = new Date(request.preferredDate);
        setDate(preferredDate.toISOString().split('T')[0]);
      }
      if (request.preferredTime) {
        setStartTime(request.preferredTime);
        // Calculer l'heure de fin (1h par défaut)
        const [hours, minutes] = request.preferredTime.split(':');
        const endHour = (parseInt(hours) + 1).toString().padStart(2, '0');
        setEndTime(`${endHour}:${minutes}`);
      }
      if (request.preferredLocation) {
        setLocation(request.preferredLocation);
      }
    }
  }, [request, visible]);

  const handleConfirm = async () => {
    if (!request) return;

    // Validation
    if (!date || !startTime || !endTime || !location) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier que l'heure de fin est après l'heure de début
    if (startTime >= endTime) {
      Alert.alert('Erreur', 'L\'heure de fin doit être après l\'heure de début');
      return;
    }

    setLoading(true);
    try {
      // Créer la date complète
      const appointmentDate = new Date(date);
      if (isNaN(appointmentDate.getTime())) {
        throw new Error('Date invalide');
      }

      // Créer le rendez-vous confirmé
      await createAppointmentFromRequest(request.id!, {
        date: appointmentDate,
        startTime,
        endTime,
        location,
        notes: notes.trim() || undefined
      });

      // Mettre à jour le statut de la demande
      await updateAppointmentRequestStatus(
        request.id!,
        'confirmed',
        `Rendez-vous confirmé pour le ${appointmentDate.toLocaleDateString('fr-FR')} de ${startTime} à ${endTime}`
      );

      Alert.alert(
        'Succès',
        'Le rendez-vous a été confirmé et ajouté à votre emploi du temps',
        [{ text: 'OK', onPress: () => {
          onConfirmed();
          onClose();
        }}]
      );
    } catch (error) {
      console.error('Erreur lors de la confirmation:', error);
      Alert.alert('Erreur', 'Impossible de confirmer le rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDate('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!request) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Confirmer le rendez-vous</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Informations du client */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client</Text>
            <Text style={styles.clientInfo}>
              {request.userFirstName} {request.userLastName}
            </Text>
            <Text style={styles.clientDetails}>
              📧 {request.userEmail}
            </Text>
            <Text style={styles.clientDetails}>
              📱 {request.userPhone}
            </Text>
          </View>

          {/* Objectif */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objectif</Text>
            <Text style={styles.objectiveText}>{request.objective}</Text>
          </View>

          {/* Formulaire de confirmation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails du rendez-vous</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    ...styles.input,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 16,
                    padding: 12
                  }}
                />
              ) : (
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                />
              )}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.label}>Heure début *</Text>
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.label}>Heure fin *</Text>
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lieu *</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Adresse ou nom du lieu"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes supplémentaires..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.confirmButton} 
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirmer le rendez-vous</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  clientInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  clientDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  objectiveText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  timeInput: {
    flex: 1,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppointmentConfirmationModal;
