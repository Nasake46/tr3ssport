import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { Coach } from '@/models/coach';
import { auth, firestore } from '@/firebase';
import { collection, addDoc, Timestamp, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

// Fonction pour vérifier qu'un email appartient à un utilisateur inscrit
const verifyUserEmail = async (email: string): Promise<{ exists: boolean; userData?: any }> => {
  try {
    console.log('🔍 VÉRIFICATION EMAIL - Recherche pour:', email);
    
    const usersQuery = query(
      collection(firestore, 'users'),
      where('email', '==', email.toLowerCase().trim())
    );
    
    const snapshot = await getDocs(usersQuery);
    
    if (snapshot.empty) {
      console.log('❌ VÉRIFICATION EMAIL - Aucun utilisateur trouvé pour:', email);
      return { exists: false };
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    console.log('✅ VÉRIFICATION EMAIL - Utilisateur trouvé:', {
      id: userDoc.id,
      email: userData.email,
      name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
    });
    
    return { 
      exists: true, 
      userData: {
        id: userDoc.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      }
    };
  } catch (error) {
    console.error('❌ VÉRIFICATION EMAIL - Erreur:', error);
    return { exists: false };
  }
};

// Fonction pour vérifier tous les emails invités
const verifyAllInvitedEmails = async (emails: string[]): Promise<{ valid: string[]; invalid: string[]; userData: any[] }> => {
  const results = await Promise.all(
    emails.map(email => verifyUserEmail(email))
  );
  
  const valid: string[] = [];
  const invalid: string[] = [];
  const userData: any[] = [];
  
  emails.forEach((email, index) => {
    if (results[index].exists && results[index].userData) {
      valid.push(email);
      userData.push(results[index].userData);
    } else {
      invalid.push(email);
    }
  });
  
  return { valid, invalid, userData };
};
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// Types simples pour les RDV, inspirés des patterns du repository GitHub
interface AppointmentFormData {
  type: 'solo' | 'group';
  sessionType: string;
  description?: string;
  location: string;
  date: Date;
  duration: number; // Durée en minutes
  notes?: string;
  coachIds: string[];
  invitedEmails?: string[];
}

// Fonction de création de RDV basée sur les patterns Firebase du repository GitHub
const createAppointment = async (
  formData: AppointmentFormData,
  userId: string,
  userEmail: string
): Promise<string> => {
  console.log('🏗️ CRÉATION RDV - Début avec données:', {
    ...formData,
    date: formData.date.toISOString(),
    userId,
    userEmail
  });

  try {
    // 1. Vérifier d'abord que tous les emails invités sont valides
    if (formData.invitedEmails && formData.invitedEmails.length > 0) {
      console.log('🔍 CRÉATION RDV - Vérification des emails invités...');
      const emailVerification = await verifyAllInvitedEmails(formData.invitedEmails);
      
      if (emailVerification.invalid.length > 0) {
        throw new Error(`Emails non valides (utilisateurs non inscrits): ${emailVerification.invalid.join(', ')}`);
      }
      
      console.log('✅ CRÉATION RDV - Tous les emails sont valides');
    }

    // 2. Calculer les heures de début et de fin
    const startTime = formData.date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    
    const endDate = new Date(formData.date.getTime() + formData.duration * 60 * 1000);
    const endTime = endDate.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });

    console.log('🕐 CRÉATION RDV - Heures calculées:', {
      startTime,
      endTime,
      duration: formData.duration
    });

    // 3. Créer le rendez-vous principal (comme dans messaging.tsx avec addDoc)
    const appointmentData = {
      createdBy: userId,
      userEmail,
      type: formData.type,
      sessionType: formData.sessionType,
      description: formData.description || '',
      location: formData.location,
      date: Timestamp.fromDate(formData.date),
      startTime: startTime,
      endTime: endTime,
      duration: formData.duration,
      notes: formData.notes || '',
      status: 'pending',
      coachIds: formData.coachIds,
      invitedEmails: formData.invitedEmails || [],
      createdAt: Timestamp.now(),
      decisions: {} // Pour les décisions des coachs
    };

    console.log('📝 CRÉATION RDV - Données préparées:', appointmentData);
    
    const appointmentRef = await addDoc(collection(firestore, 'appointments'), appointmentData);
    const appointmentId = appointmentRef.id;

    // 3. Créer les invitations pour les participants invités
    if (formData.invitedEmails && formData.invitedEmails.length > 0) {
      console.log('📮 CRÉATION RDV - Création des invitations...');
      
      const emailVerification = await verifyAllInvitedEmails(formData.invitedEmails);
      
      for (const userData of emailVerification.userData) {
        const invitationData = {
          appointmentId,
          invitedUserId: userData.id,
          invitedUserEmail: userData.email,
          invitedUserName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
          inviterUserId: userId,
          inviterUserEmail: userEmail,
          status: 'pending', // pending, accepted, refused
          createdAt: Timestamp.now(),
          respondedAt: null,
          comment: ''
        };
        
        await addDoc(collection(firestore, 'invitations'), invitationData);
        console.log('✅ CRÉATION RDV - Invitation créée pour:', userData.email);
      }
    }

    console.log('✅ CRÉATION RDV - Appointment créé avec ID:', appointmentId);
    return appointmentId;

  } catch (error) {
    console.error('❌ CRÉATION RDV - Erreur complète:', error);
    throw error;
  }
};

// Fonction simple pour récupérer les coaches (basée sur les patterns du repository)
const getAllCoaches = async (): Promise<Coach[]> => {
  try {
    console.log('🔍 CHARGEMENT COACHES - Début...');
    
    // Récupérer tous les utilisateurs avec le rôle "coach" (comme dans messaging.tsx)
    const coachesQuery = query(
      collection(firestore, 'users'),
      where('role', '==', 'coach')
    );
    
    const snapshot = await getDocs(coachesQuery);
    
    const coaches: Coach[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        bio: data.bio || 'Coach professionnel',
        specialties: data.specialties || ['Coaching sportif'],
        rating: data.rating || 4.5,
        reviewCount: data.reviewCount || 0,
        isVerified: data.isVerified || true
      };
    });

    console.log(`✅ CHARGEMENT COACHES - ${coaches.length} coaches trouvés`);
    return coaches;

  } catch (error) {
    console.error('❌ CHARGEMENT COACHES - Erreur:', error);
    return [];
  }
};

export default function CreateAppointmentScreen() {
  // États pour le formulaire
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  
  // Fonction utilitaire pour obtenir le nom d'affichage de l'utilisateur
  const getUserDisplayName = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return 'Utilisateur inconnu';
    
    return currentUser.displayName || 
           currentUser.email?.split('@')[0] || 
           'Utilisateur';
  };
  
  // Données du formulaire
  const [formData, setFormData] = useState<AppointmentFormData>({
    type: 'solo',
    sessionType: '',
    description: '',
    location: '',
    date: new Date(Date.now() + 60 * 60 * 1000), // Dans 1 heure par défaut
    duration: 60, // 60 minutes par défaut
    notes: '',
    coachIds: [],
    invitedEmails: []
  });
  
  // États pour les composants UI
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    // Vérifier que l'utilisateur est connecté
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert(
        'Authentification requise',
        'Vous devez être connecté pour créer un rendez-vous',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
      return;
    }

    console.log('👤 CRÉATION RDV - Utilisateur connecté:', {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName
    });

    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    try {
      setLoadingCoaches(true);
      console.log('🔍 CRÉATION RDV - Chargement des coaches...');
      
      // Données de test temporaires pour résoudre le chargement infini
      const testCoaches: Coach[] = [
        {
          id: 'coach-1',
          firstName: 'Marie',
          lastName: 'Dupont',
          email: 'marie.dupont@test.com',
          bio: 'Coach sportif spécialisée en fitness et musculation',
          specialties: ['Fitness', 'Musculation', 'Cardio'],
          rating: 4.8,
          reviewCount: 45,
          isVerified: true
        },
        {
          id: 'coach-2', 
          firstName: 'Thomas',
          lastName: 'Martin',
          email: 'thomas.martin@test.com',
          bio: 'Coach yoga et pilates certifié',
          specialties: ['Yoga', 'Pilates', 'Méditation'],
          rating: 4.9,
          reviewCount: 67,
          isVerified: true
        },
        {
          id: 'coach-3',
          firstName: 'Sophie', 
          lastName: 'Bernard',
          email: 'sophie.bernard@test.com',
          bio: 'Coach running et préparation physique',
          specialties: ['Running', 'Endurance', 'Préparation physique'],
          rating: 4.7,
          reviewCount: 38,
          isVerified: true
        }
      ];

      // Simuler un délai réseau court
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`✅ CRÉATION RDV - ${testCoaches.length} coaches chargés (données de test)`);
      setCoaches(testCoaches);
      
      // Essayer de charger les vrais coaches en arrière-plan
      try {
        const realCoaches = await getAllCoaches();
        if (realCoaches.length > 0) {
          console.log(`✅ CRÉATION RDV - ${realCoaches.length} vrais coaches récupérés, remplacement des données de test`);
          setCoaches(realCoaches);
        }
      } catch (error) {
        console.warn('⚠️ CRÉATION RDV - Impossible de charger les vrais coaches, utilisation des données de test');
      }
      
    } catch (error) {
      console.error('❌ CRÉATION RDV - Erreur chargement coaches:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des coaches');
    } finally {
      setLoadingCoaches(false);
      console.log('🔍 CRÉATION RDV - Chargement terminé');
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      console.log('📅 CRÉATION RDV - Date sélectionnée:', selectedDate.toISOString());
      setFormData({ ...formData, date: selectedDate });
    }
  };

  const toggleCoachSelection = (coachId: string) => {
    const isSelected = formData.coachIds.includes(coachId);
    let newCoachIds: string[];
    
    if (formData.type === 'solo') {
      // Pour solo, on ne peut sélectionner qu'un seul coach
      newCoachIds = isSelected ? [] : [coachId];
    } else {
      // Pour groupe, on peut sélectionner plusieurs coaches
      newCoachIds = isSelected
        ? formData.coachIds.filter((id: string) => id !== coachId)
        : [...formData.coachIds, coachId];
    }
    
    console.log('👨‍⚕️ CRÉATION RDV - Coaches sélectionnés:', newCoachIds);
    setFormData({ ...formData, coachIds: newCoachIds });
  };

  const addInvitedEmail = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    
    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erreur', 'Veuillez saisir un email valide');
      return;
    }
    
    if (formData.invitedEmails?.includes(email)) {
      Alert.alert('Erreur', 'Cet email est déjà dans la liste');
      return;
    }

    // Vérifier que l'email correspond à un utilisateur inscrit
    console.log('🔍 CRÉATION RDV - Vérification email:', email);
    try {
      setLoading(true);
      const emailVerification = await verifyUserEmail(email);
      
      if (!emailVerification.exists) {
        Alert.alert(
          'Utilisateur non trouvé', 
          `L'email "${email}" ne correspond à aucun utilisateur inscrit. Seuls les utilisateurs inscrits peuvent être invités.`
        );
        return;
      }

      // Vérifier que ce n'est pas l'utilisateur actuel
      const currentUser = auth.currentUser;
      if (currentUser && email === currentUser.email?.toLowerCase()) {
        Alert.alert('Erreur', 'Vous ne pouvez pas vous inviter vous-même');
        return;
      }

      const newEmails = [...(formData.invitedEmails || []), email];
      console.log('✅ CRÉATION RDV - Email valide ajouté:', email);
      console.log('📧 CRÉATION RDV - Emails invités:', newEmails);
      
      setFormData({ 
        ...formData, 
        invitedEmails: newEmails
      });
      setEmailInput('');
      
      // Afficher une confirmation avec le nom de l'utilisateur
      if (emailVerification.userData) {
        const userName = `${emailVerification.userData.firstName || ''} ${emailVerification.userData.lastName || ''}`.trim() || emailVerification.userData.email;
        Alert.alert(
          'Utilisateur ajouté', 
          `${userName} a été ajouté à la liste des invités`
        );
      }
      
    } catch (error) {
      console.error('❌ CRÉATION RDV - Erreur vérification email:', error);
      Alert.alert('Erreur', 'Impossible de vérifier l\'email. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const removeInvitedEmail = (emailToRemove: string) => {
    const newEmails = formData.invitedEmails?.filter((email: string) => email !== emailToRemove) || [];
    console.log('🗑️ CRÉATION RDV - Email retiré:', emailToRemove);
    setFormData({ ...formData, invitedEmails: newEmails });
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return true; // Toujours valide car on a des valeurs par défaut
      case 2:
        return formData.sessionType.trim() !== '' && 
               formData.location.trim() !== '' &&
               formData.date > new Date();
      case 3:
        const hasCoaches = formData.coachIds.length > 0;
        const hasValidEmails = formData.type === 'solo' || 
                              Boolean(formData.invitedEmails && formData.invitedEmails.length > 0);
        return hasCoaches && hasValidEmails;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      console.log(`➡️ CRÉATION RDV - Passage à l'étape ${currentStep + 1}`);
      setCurrentStep(currentStep + 1);
    } else {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
    }
  };

  const handleBack = () => {
    console.log(`⬅️ CRÉATION RDV - Retour à l'étape ${currentStep - 1}`);
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    console.log('🚀 CRÉATION RDV - Début de la soumission...');
    console.log('📋 CRÉATION RDV - Données finales:', formData);

    setLoading(true);
    
    try {
      // Vérifier que l'utilisateur est connecté
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Erreur', 'Vous devez être connecté pour créer un rendez-vous');
        return;
      }

      // Récupérer les vraies données utilisateur
      const userId = currentUser.uid;
      const userEmail = currentUser.email || '';
      
      if (!userEmail) {
        Alert.alert(
          'Erreur',
          'Impossible de récupérer votre adresse email. Veuillez vous reconnecter.'
        );
        return;
      }
      
      console.log('👤 CRÉATION RDV - Utilisateur connecté:', {
        userId,
        userEmail,
        displayName: currentUser.displayName || getUserDisplayName()
      });
      
      const appointmentId = await createAppointment(formData, userId, userEmail);
      
      console.log('🎉 CRÉATION RDV - Rendez-vous créé avec succès:', appointmentId);
      
      Alert.alert(
        'Succès !',
        `Votre demande de rendez-vous a été créée avec succès. Les coaches recevront une notification et pourront accepter ou refuser votre demande.`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔄 CRÉATION RDV - Retour au dashboard');
              router.back();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ CRÉATION RDV - Erreur lors de la création:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la création du rendez-vous. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepText,
              currentStep >= step && styles.stepTextActive
            ]}>
              {step}
            </Text>
          </View>
          {step < 3 && <View style={[
            styles.stepLine,
            currentStep > step && styles.stepLineActive
          ]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Type de rendez-vous</Text>
      
      <TouchableOpacity
        style={[
          styles.typeOption,
          formData.type === 'solo' && styles.typeOptionSelected
        ]}
        onPress={() => {
          console.log('🎯 CRÉATION RDV - Type sélectionné: solo');
          setFormData({ ...formData, type: 'solo', invitedEmails: [] });
        }}
      >
        <Text style={[
          styles.typeOptionText,
          formData.type === 'solo' && styles.typeOptionTextSelected
        ]}>
          Rendez-vous Solo
        </Text>
        <Text style={styles.typeOptionDescription}>
          Séance individuelle avec un coach
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeOption,
          formData.type === 'group' && styles.typeOptionSelected
        ]}
        onPress={() => {
          console.log('🎯 CRÉATION RDV - Type sélectionné: group');
          setFormData({ ...formData, type: 'group' });
        }}
      >
        <Text style={[
          styles.typeOptionText,
          formData.type === 'group' && styles.typeOptionTextSelected
        ]}>
          Rendez-vous Groupe
        </Text>
        <Text style={styles.typeOptionDescription}>
          Séance collective avec plusieurs participants
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Détails du rendez-vous</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type de séance *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.sessionType}
          onChangeText={(text) => {
            console.log('📝 CRÉATION RDV - Type de séance:', text);
            setFormData({ ...formData, sessionType: text });
          }}
          placeholder="ex: Yoga, Cardio, Musculation..."
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => {
            console.log('📝 CRÉATION RDV - Description:', text);
            setFormData({ ...formData, description: text });
          }}
          placeholder="Décrivez vos objectifs..."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Lieu *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.location}
          onChangeText={(text) => {
            console.log('📍 CRÉATION RDV - Lieu:', text);
            setFormData({ ...formData, location: text });
          }}
          placeholder="Adresse ou nom du lieu"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date et heure *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {formData.date.toLocaleDateString('fr-FR')} à {formData.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
        
        {showDatePicker && (
          <DateTimePicker
            value={formData.date}
            mode="datetime"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Durée du rendez-vous *</Text>
        <View style={styles.durationContainer}>
          {[30, 45, 60, 90, 120].map((duration) => (
            <TouchableOpacity
              key={duration}
              style={[
                styles.durationButton,
                formData.duration === duration && styles.durationButtonSelected
              ]}
              onPress={() => {
                console.log('⏰ CRÉATION RDV - Durée sélectionnée:', duration);
                setFormData({ ...formData, duration });
              }}
            >
              <Text style={[
                styles.durationButtonText,
                formData.duration === duration && styles.durationButtonTextSelected
              ]}>
                {duration} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.durationInfo}>
          Heure de fin: {new Date(formData.date.getTime() + formData.duration * 60 * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Notes additionnelles</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.notes}
          onChangeText={(text) => {
            console.log('📝 CRÉATION RDV - Notes:', text);
            setFormData({ ...formData, notes: text });
          }}
          placeholder="Informations complémentaires..."
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );

  const renderStep3 = () => {
    console.log('🎯 CRÉATION RDV - Rendu étape 3, état coaches:', {
      loadingCoaches,
      coachesCount: coaches.length,
      coaches: coaches.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))
    });

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Sélection des participants</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {formData.type === 'solo' ? 'Choisir un coach *' : 'Choisir les coaches *'}
          </Text>
          
          {loadingCoaches ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : coaches.length === 0 ? (
            <View style={styles.noCoachesContainer}>
              <Text style={styles.noCoachesText}>
                Aucun coach disponible pour le moment
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={loadCoaches}
              >
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.coachListFull} showsVerticalScrollIndicator={false}>
              {coaches.map((coach) => (
                <TouchableOpacity
                  key={coach.id}
                  style={[
                    styles.coachOption,
                    formData.coachIds.includes(coach.id) && styles.coachOptionSelected
                  ]}
                  onPress={() => toggleCoachSelection(coach.id)}
                >
                  <Text style={[
                    styles.coachName,
                    formData.coachIds.includes(coach.id) && styles.coachNameSelected
                  ]}>
                    {coach.firstName} {coach.lastName}
                  </Text>
                  <Text style={styles.coachSpecialty}>
                    {coach.specialties?.join(', ') || 'Coach sportif'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {formData.type === 'group' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Inviter des clients *</Text>
            
            <View style={styles.emailInputContainer}>
              <TextInput
                style={styles.emailInput}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="email@exemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.addEmailButton, loading && styles.addEmailButtonDisabled]}
                onPress={addInvitedEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addEmailButtonText}>Ajouter</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.emailList} showsVerticalScrollIndicator={false}>
              {formData.invitedEmails?.map((email: string, index: number) => (
                <View key={index} style={styles.emailItem}>
                  <Text style={styles.emailText}>{email}</Text>
                  <TouchableOpacity
                    onPress={() => removeInvitedEmail(email)}
                    style={styles.removeEmailButton}
                  >
                    <Text style={styles.removeEmailText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            
            {(!formData.invitedEmails || formData.invitedEmails.length === 0) && (
              <Text style={styles.helpText}>
                Ajoutez au moins un email pour un rendez-vous de groupe
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderStepIndicator()}
        
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.navigationContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>Précédent</Text>
          </TouchableOpacity>
        )}

        {currentStep < 3 ? (
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              !validateCurrentStep() && styles.disabledButton
            ]}
            onPress={handleNext}
            disabled={!validateCurrentStep()}
          >
            <Text style={styles.nextButtonText}>Suivant</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.submitButton,
              (!validateCurrentStep() || loading) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={!validateCurrentStep() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Créer le rendez-vous</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
  },
  stepText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepTextActive: {
    color: 'white',
  },
  stepLine: {
    width: 50,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  stepLineActive: {
    backgroundColor: '#007AFF',
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  typeOption: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  typeOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  typeOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  typeOptionTextSelected: {
    color: '#007AFF',
  },
  typeOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  coachList: {
    maxHeight: 200,
  },
  coachListFull: {
    flex: 1,
    minHeight: 300,
  },
  coachOption: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  coachOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  coachName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  coachNameSelected: {
    color: '#007AFF',
  },
  coachSpecialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emailInputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  emailInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
  },
  addEmailButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addEmailButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addEmailButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  emailList: {
    maxHeight: 120,
  },
  emailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emailText: {
    fontSize: 14,
    color: '#333',
  },
  removeEmailButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeEmailText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  noCoachesContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noCoachesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  durationButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  durationButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  durationButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  durationButtonTextSelected: {
    color: 'white',
  },
  durationInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
