import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppointmentRequest } from '@/models/appointment';

interface AcceptAppointmentModalProps {
  visible: boolean;
  request: AppointmentRequest | null;
  onClose: () => void;
  onAccept: (
    requestId: string,
    response: string,
    confirmedDate?: Date,
    confirmedTime?: string,
    confirmedLocation?: string
  ) => void;
}

const AcceptAppointmentModal: React.FC<AcceptAppointmentModalProps> = ({
  visible,
  request,
  onClose,
  onAccept
}) => {
  const [response, setResponse] = useState('');
  const [usePreferredDate, setUsePreferredDate] = useState(true);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [usePreferredLocation, setUsePreferredLocation] = useState(true);
  const [proposedLocation, setProposedLocation] = useState('');

  const resetForm = () => {
    setResponse('');
    setUsePreferredDate(true);
    setProposedDate('');
    setProposedTime('');
    setUsePreferredLocation(true);
    setProposedLocation('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAccept = () => {
    if (!request) return;

    let finalDate: Date | undefined;
    let finalTime: string | undefined;
    let finalLocation: string | undefined;

    // Gérer la date
    if (usePreferredDate && request.preferredDate) {
      finalDate = request.preferredDate;
    } else if (!usePreferredDate && proposedDate) {
      finalDate = new Date(proposedDate);
      if (isNaN(finalDate.getTime())) {
        Alert.alert('Erreur', 'Date proposée invalide');
        return;
      }
    }

    // Gérer l'heure
    if (usePreferredDate && request.preferredTime) {
      finalTime = request.preferredTime;
    } else if (!usePreferredDate && proposedTime) {
      finalTime = proposedTime;
    }

    // Gérer le lieu
    if (usePreferredLocation) {
      finalLocation = request.preferredLocation;
    } else if (!usePreferredLocation && proposedLocation.trim()) {
      finalLocation = proposedLocation.trim();
    }

    // Construire la réponse
    let fullResponse = response || 'Demande acceptée';
    
    if (!usePreferredDate || !usePreferredLocation) {
      fullResponse += '\n\nDétails confirmés:';
      if (!usePreferredDate && finalDate) {
        fullResponse += `\nDate: ${finalDate.toLocaleDateString('fr-FR')}`;
        if (finalTime) {
          fullResponse += ` à ${finalTime}`;
        }
      }
      if (!usePreferredLocation && finalLocation) {
        fullResponse += `\nLieu: ${finalLocation}`;
      }
    }

    onAccept(request.id!, fullResponse, finalDate, finalTime, finalLocation);
    handleClose();
  };

  const formatPreferredDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!request) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Accepter la demande</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Informations du client */}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {request.userFirstName} {request.userLastName}
              </Text>
              <Text style={styles.clientDetails}>
                {request.userEmail} • {request.userPhone}
              </Text>
              <Text style={styles.objective}>{request.objective}</Text>
            </View>

            {/* Réponse personnalisée */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message pour le client (optionnel)</Text>
              <TextInput
                style={styles.responseInput}
                placeholder="Ex: Je confirme votre séance, à bientôt !"
                value={response}
                onChangeText={setResponse}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            {/* Gestion de la date */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date et heure</Text>
              
              {request.preferredDate && (
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    usePreferredDate && styles.selectedCard
                  ]}
                  onPress={() => setUsePreferredDate(true)}
                >
                  <View style={styles.radioContainer}>
                    <View style={[
                      styles.radio,
                      usePreferredDate && styles.radioSelected
                    ]} />
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Confirmer la date souhaitée</Text>
                      <Text style={styles.optionSubtitle}>
                        {formatPreferredDate(request.preferredDate)}
                        {request.preferredTime && ` à ${request.preferredTime}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !usePreferredDate && styles.selectedCard
                ]}
                onPress={() => setUsePreferredDate(false)}
              >
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radio,
                    !usePreferredDate && styles.radioSelected
                  ]} />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Proposer une autre date</Text>
                    <Text style={styles.optionSubtitle}>
                      Vous pouvez suggérer une date alternative
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {!usePreferredDate && (
                <View style={styles.dateInputs}>
                  <View style={styles.inputRow}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Date proposée</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="JJ/MM/AAAA"
                        value={proposedDate}
                        onChangeText={setProposedDate}
                        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Heure proposée</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="HH:MM"
                        value={proposedTime}
                        onChangeText={setProposedTime}
                        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Gestion du lieu */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lieu de rendez-vous</Text>
              
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  usePreferredLocation && styles.selectedCard
                ]}
                onPress={() => setUsePreferredLocation(true)}
              >
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radio,
                    usePreferredLocation && styles.radioSelected
                  ]} />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Confirmer le lieu souhaité</Text>
                    <Text style={styles.optionSubtitle}>{request.preferredLocation}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !usePreferredLocation && styles.selectedCard
                ]}
                onPress={() => setUsePreferredLocation(false)}
              >
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radio,
                    !usePreferredLocation && styles.radioSelected
                  ]} />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Proposer un autre lieu</Text>
                    <Text style={styles.optionSubtitle}>
                      Vous pouvez suggérer un lieu alternatif
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {!usePreferredLocation && (
                <View style={styles.locationInput}>
                  <Text style={styles.inputLabel}>Lieu proposé</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: Gymnase municipal, Parc des sports..."
                    value={proposedLocation}
                    onChangeText={setProposedLocation}
                    maxLength={100}
                  />
                </View>
              )}
            </View>

            {/* Boutons d'action */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.acceptButtonText}>Accepter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  scrollView: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  clientInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clientDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  objective: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF10',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    marginTop: 2,
  },
  radioSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  dateInputs: {
    marginTop: 12,
    paddingLeft: 32,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  locationInput: {
    marginTop: 12,
    paddingLeft: 32,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AcceptAppointmentModal;
