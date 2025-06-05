import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Coach } from '@/models/coach';
import { SportLevel, CreateAppointmentRequestData } from '@/models/appointment';
import { createAppointmentRequest } from '@/services/appointmentService';

interface BookingFormModalProps {
  visible: boolean;
  coach: Coach;
  onClose: () => void;
  onSuccess: () => void;
  userInfo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
}

const SPORT_LEVELS: { key: SportLevel; label: string; description: string }[] = [
  { key: 'debutant', label: 'Débutant', description: 'Je commence ou j\'ai peu d\'expérience' },
  { key: 'confirme', label: 'Confirmé', description: 'J\'ai une bonne expérience régulière' },
  { key: 'expert', label: 'Expert', description: 'J\'ai un niveau avancé/compétition' }
];

const BookingFormModal: React.FC<BookingFormModalProps> = ({
  visible,
  coach,
  onClose,
  onSuccess,
  userInfo
}) => {  const [formData, setFormData] = useState({
    objective: '',
    sportLevel: '' as SportLevel,
    preferredLocation: '',
    preferredDate: null as Date | null,
    preferredTime: '',
    additionalNotes: '',
    userPhone: userInfo.phoneNumber || ''
  });
  const [loading, setLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

const handleSubmit = async () => {
  // Validation
  if (!formData.objective.trim()) {
    Alert.alert('Erreur', 'Veuillez préciser votre objectif');
    return;
  }
  if (!formData.sportLevel) {
    Alert.alert('Erreur', 'Veuillez sélectionner votre niveau sportif');
    return;
  }
  if (!formData.preferredLocation.trim()) {
    Alert.alert('Erreur', 'Veuillez indiquer votre lieu de préférence');
    return;
  }
  if (!formData.userPhone.trim()) {
    Alert.alert('Erreur', 'Veuillez renseigner votre numéro de téléphone');
    return;
  }

  try {
    setLoading(true);

    // Créer l'objet de données en excluant les champs undefined
    const requestData: CreateAppointmentRequestData = {
      userId: userInfo.id,
      coachId: coach.id!,
      userFirstName: userInfo.firstName,
      userLastName: userInfo.lastName,
      userPhone: formData.userPhone,
      userEmail: userInfo.email,
      objective: formData.objective,
      sportLevel: formData.sportLevel,
      preferredLocation: formData.preferredLocation,
      status: 'pending'
    };

    // Ajouter les champs optionnels seulement s'ils ont une valeur
    if (formData.preferredDate) {
      requestData.preferredDate = formData.preferredDate;
    }
    
    if (formData.preferredTime && formData.preferredTime.trim()) {
      requestData.preferredTime = formData.preferredTime.trim();
    }
    
    if (formData.additionalNotes && formData.additionalNotes.trim()) {
      requestData.additionalNotes = formData.additionalNotes.trim();
    }

    await createAppointmentRequest(requestData);
    
    Alert.alert(
      'Demande envoyée !', 
      `Votre demande de rendez-vous a été envoyée à ${coach.firstName} ${coach.lastName}. Vous recevrez une réponse prochainement.`,
      [{ text: 'OK', onPress: onSuccess }]
    );
    
    onClose();
  } catch (error) {
    console.error('Erreur lors de l\'envoi:', error);
    Alert.alert('Erreur', 'Impossible d\'envoyer la demande. Veuillez réessayer.');
  } finally {
    setLoading(false);
  }
  };  const resetForm = () => {
    setFormData({
      objective: '',
      sportLevel: '' as SportLevel,
      preferredLocation: '',
      preferredDate: null,
      preferredTime: '',
      additionalNotes: '',
      userPhone: userInfo.phoneNumber || ''
    });
  };
  const handleDateChange = (selectedDate: Date | null) => {
    setShowDateModal(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, preferredDate: selectedDate }));
    }
  };

  const handleWebDateChange = (event: any) => {
    const dateString = event.target.value;
    if (dateString) {
      const selectedDate = new Date(dateString);
      setFormData(prev => ({ ...prev, preferredDate: selectedDate }));
    }
  };

  const formatSelectedDate = (date: Date | null) => {
    if (!date) return 'Aucune date sélectionnée';
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const renderDatePicker = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webDateContainer}>
          <input
            type="date"
            value={formatDateForInput(formData.preferredDate)}
            onChange={handleWebDateChange}
            min={new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 16,
              backgroundColor: '#fff',
              outline: 'none',
            }}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.datePickerButton}
        onPress={() => setShowDateModal(true)}
      >
        <Ionicons name="calendar-outline" size={20} color="#666" />
        <Text style={[
          styles.datePickerText,
          !formData.preferredDate && styles.placeholderText
        ]}>
          {formatSelectedDate(formData.preferredDate)}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />      </TouchableOpacity>
    );
  };

  const generateDateOptions = () => {
    const options = [];
    const today = new Date();
    
    // Ajouter les 30 prochains jours
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      let label = '';
      if (i === 0) {
        label = "Aujourd'hui";
      } else if (i === 1) {
        label = "Demain";
      } else {
        label = date.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
      }
      
      options.push({
        value: date.toISOString(),
        label,
        date
      });
    }
    
    return options;
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Demande de RDV</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Coach Info */}
          <View style={styles.coachInfo}>
            <Text style={styles.coachName}>
              {coach.firstName} {coach.lastName}
            </Text>
            <Text style={styles.coachAddress}>{coach.address}</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Objectif */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Objectif <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Décrivez vos objectifs de coaching (ex: perte de poids, préparation marathon, renforcement musculaire...)"
                value={formData.objective}
                onChangeText={(text) => setFormData(prev => ({ ...prev, objective: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Niveau sportif */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Niveau sportif <Text style={styles.required}>*</Text>
              </Text>
              {SPORT_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.key}
                  style={[
                    styles.levelOption,
                    formData.sportLevel === level.key && styles.selectedLevel
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, sportLevel: level.key }))}
                >
                  <View style={styles.levelHeader}>
                    <Text style={[
                      styles.levelTitle,
                      formData.sportLevel === level.key && styles.selectedLevelText
                    ]}>
                      {level.label}
                    </Text>
                    <Ionicons 
                      name={formData.sportLevel === level.key ? "radio-button-on" : "radio-button-off"} 
                      size={20} 
                      color={formData.sportLevel === level.key ? "#7667ac" : "#ccc"} 
                    />
                  </View>
                  <Text style={[
                    styles.levelDescription,
                    formData.sportLevel === level.key && styles.selectedLevelText
                  ]}>
                    {level.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Lieu de préférence */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Lieu de préférence <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Où souhaitez-vous faire vos séances ? (domicile, salle de sport, parc...)"
                value={formData.preferredLocation}
                onChangeText={(text) => setFormData(prev => ({ ...prev, preferredLocation: text }))}
              />
            </View>

            {/* Numéro de téléphone */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Numéro de téléphone <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="06 12 34 56 78"
                value={formData.userPhone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, userPhone: text }))}
                keyboardType="phone-pad"
              />
            </View>            {/* Date souhaitée (optionnel) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date souhaitée (optionnel)</Text>
              {renderDatePicker()}
              
              {formData.preferredDate && (
                <TouchableOpacity 
                  style={styles.clearDateButton}
                  onPress={() => setFormData(prev => ({ ...prev, preferredDate: null }))}
                >
                  <Ionicons name="close-circle" size={16} color="#999" />
                  <Text style={styles.clearDateText}>Effacer la date</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Heure souhaitée (optionnel) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Heure souhaitée (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: matin, 18h-20h, flexible..."
                value={formData.preferredTime}
                onChangeText={(text) => setFormData(prev => ({ ...prev, preferredTime: text }))}
              />
            </View>

            {/* Notes supplémentaires */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes supplémentaires</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Informations complémentaires, contraintes particulières..."
                value={formData.additionalNotes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, additionalNotes: text }))}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Modal de sélection de date pour mobile */}
          {Platform.OS !== 'web' && (
            <Modal
              visible={showDateModal}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.dateModalOverlay}>
                <View style={styles.dateModalContent}>
                  <View style={styles.dateModalHeader}>
                    <TouchableOpacity onPress={() => setShowDateModal(false)}>
                      <Text style={styles.dateModalCancel}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.dateModalTitle}>Choisir une date</Text>
                    <TouchableOpacity onPress={() => handleDateChange(new Date())}>
                      <Text style={styles.dateModalConfirm}>OK</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.dateScrollView}>
                    {generateDateOptions().map((dateOption) => (
                      <TouchableOpacity
                        key={dateOption.value}
                        style={styles.dateOption}
                        onPress={() => handleDateChange(dateOption.date)}
                      >
                        <Text style={styles.dateOptionText}>{dateOption.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  coachInfo: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  coachAddress: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  levelOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selectedLevel: {
    borderColor: '#7667ac',
    backgroundColor: '#7667ac10',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedLevelText: {
    color: '#7667ac',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    backgroundColor: '#7667ac',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    gap: 8,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  clearDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },  clearDateText: {
    fontSize: 14,
    color: '#999',
  },
  webDateContainer: {
    // Styles spécifiques pour le conteneur web si nécessaire
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dateModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dateModalCancel: {
    fontSize: 16,
    color: '#666',
  },
  dateModalConfirm: {
    fontSize: 16,
    color: '#7667ac',
    fontWeight: 'bold',
  },
  dateScrollView: {
    maxHeight: 300,
  },
  dateOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default BookingFormModal;
