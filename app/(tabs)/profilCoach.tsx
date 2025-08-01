import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Collapsible } from '@/components/Collapsible';
import { auth, firestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ProfileHeader } from '@/components/ProfileHeader';
import { InfoItem } from '@/components/InfoItem';
import { SectionTitle } from '@/components/SectionTitle';
import { SkillTag } from '@/components/SkillTag';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileCoachScreen() {
  const router = useRouter();
  const [coachData, setCoachData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
    companyName: '',
    siretNumber: '',
    diploma: '',
    bio: ''
  });

  useEffect(() => {
    const fetchCoachData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace('/(tabs)');
          return;
        }

        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== 'coach') {
            router.replace('/(tabs)');
            return;
          }
          setCoachData(userData);
          // Initialiser le formulaire avec les données existantes
          setFormData({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            phoneNumber: userData.phoneNumber || '',
            address: userData.address || '',
            companyName: userData.companyName || '',
            siretNumber: userData.siretNumber || '',
            diploma: userData.diploma || '',
            bio: userData.bio || ''
          });
        } else {
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoachData();
  }, [router]);

  const handleEditPress = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Erreur", "Utilisateur non connecté");
        return;
      }

      // Validation des données
      if (!formData.firstName || !formData.lastName) {
        Alert.alert("Erreur", "Le nom et le prénom sont obligatoires");
        setSaving(false);
        return;
      }

      // Mettre à jour les données dans Firestore
      await updateDoc(doc(firestore, "users", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        companyName: formData.companyName,
        siretNumber: formData.siretNumber,
        diploma: formData.diploma,
        bio: formData.bio,
        updatedAt: new Date()
      });

      // Mettre à jour les données affichées
      setCoachData({
        ...coachData,
        ...formData
      });

      setIsEditing(false);
      Alert.alert("Succès", "Votre profil a été mis à jour avec succès");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour votre profil");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Réinitialiser le formulaire avec les données existantes
    setFormData({
      firstName: coachData.firstName || '',
      lastName: coachData.lastName || '',
      phoneNumber: coachData.phoneNumber || '',
      address: coachData.address || '',
      companyName: coachData.companyName || '',
      siretNumber: coachData.siretNumber || '',
      diploma: coachData.diploma || '',
      bio: coachData.bio || ''
    });
    setIsEditing(false);
  };

  // Exemple de compétences (à remplacer par les données réelles)
  const skills = [
    "Remise en forme", "Nutrition", "Perte de poids", 
    "Musculation", "Réhabilitation", "Coaching sportif"
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7667ac" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <ThemedView style={styles.container}>
        {/* En-tête du profil */}
        <ProfileHeader 
          name={`${formData.firstName || ''} ${formData.lastName || ''}`}
          specialty={formData.diploma || 'Coach sportif'}
          onEditPress={isEditing ? undefined : handleEditPress}
        />

        {/* Informations de contact */}
        <View style={styles.section}>
          <SectionTitle title="Informations de contact" />
          
          {isEditing ? (
            <>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Prénom</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({...formData, firstName: text})}
                  placeholder="Votre prénom"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Nom</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({...formData, lastName: text})}
                  placeholder="Votre nom"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Email</ThemedText>
                <ThemedText style={styles.disabledText}>{coachData?.email || 'Non renseigné'}</ThemedText>
                <ThemedText style={styles.helperText}>L'email ne peut pas être modifié</ThemedText>
              </View>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Téléphone</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.phoneNumber}
                  onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
                  placeholder="Votre numéro de téléphone"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Adresse</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.address}
                  onChangeText={(text) => setFormData({...formData, address: text})}
                  placeholder="Votre adresse"
                />
              </View>
            </>
          ) : (
            <>
              <InfoItem 
                icon="mail" 
                label="Email" 
                value={coachData?.email || 'Non renseigné'} 
              />
              
              <InfoItem 
                icon="call" 
                label="Téléphone" 
                value={coachData?.phoneNumber || 'Non renseigné'} 
              />
              
              <InfoItem 
                icon="location" 
                label="Adresse" 
                value={coachData?.address || 'Non renseignée'} 
              />
            </>
          )}
        </View>

        {/* Informations professionnelles */}
        <View style={styles.section}>
          <SectionTitle title="Informations professionnelles" />
          
          {isEditing ? (
            <>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Nom de la société</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.companyName}
                  onChangeText={(text) => setFormData({...formData, companyName: text})}
                  placeholder="Nom de votre société"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Numéro SIRET</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.siretNumber}
                  onChangeText={(text) => setFormData({...formData, siretNumber: text})}
                  placeholder="Votre numéro SIRET"
                  keyboardType="number-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Diplôme</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.diploma}
                  onChangeText={(text) => setFormData({...formData, diploma: text})}
                  placeholder="Vos diplômes"
                />
              </View>
            </>
          ) : (
            <>
              <InfoItem 
                icon="business" 
                label="Entreprise" 
                value={coachData?.companyName || 'Non renseignée'} 
              />
              
              <InfoItem 
                icon="document-text" 
                label="SIRET" 
                value={coachData?.siretNumber || 'Non renseigné'} 
              />
              
              <InfoItem 
                icon="school" 
                label="Diplôme" 
                value={coachData?.diploma || 'Non renseigné'} 
              />
            </>
          )}
        </View>

        {/* Bio et description */}
        <View style={styles.section}>
          <SectionTitle title="À propos de moi" />
          
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData({...formData, bio: text})}
              placeholder="Présentez-vous à vos clients"
              multiline
              numberOfLines={4}
            />
          ) : (
            <ThemedText style={styles.bio}>
              {coachData?.bio || 
                "Aucune biographie n'a été ajoutée. Complétez votre profil pour vous présenter à vos clients potentiels."}
            </ThemedText>
          )}
        </View>

        {/* Compétences */}
        <View style={styles.section}>
          <SectionTitle title="Compétences" />
          <View style={styles.skillsContainer}>
            {skills.map((skill, index) => (
              <SkillTag key={index} label={skill} />
            ))}
          </View>
        </View>

        {/* Tarifs et prestations */}
        <Collapsible title="Tarifs et prestations">
          <ThemedText style={styles.emptyState}>
            Aucun tarif n'a été configuré. Ajoutez vos prestations pour que vos clients puissent les consulter.
          </ThemedText>
        </Collapsible>

        {/* Disponibilités */}
        <Collapsible title="Disponibilités">
          <ThemedText style={styles.emptyState}>
            Aucune disponibilité n'a été configurée. Configurez votre calendrier pour que vos clients puissent prendre rendez-vous.
          </ThemedText>
        </Collapsible>

        {/* Boutons d'action */}
        {isEditing ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={saving}
            >
              <ThemedText style={styles.cancelButtonText}>Annuler</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ThemedText style={styles.actionButtonText}>Enregistrer</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleEditPress}
          >
            <ThemedText style={styles.actionButtonText}>Modifier mon profil</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#F5F5F8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bio: {
    lineHeight: 22,
    fontSize: 15,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyState: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginVertical: 8,
  },
  actionButton: {
    backgroundColor: '#7667ac',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
    flex: 1,
    marginLeft: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#666',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E1E1E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  disabledText: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#888',
    backgroundColor: '#F0F0F5',
    borderRadius: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#F0F0F5',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
});