import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Collapsible } from '@/components/Collapsible';
import { auth, firestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ProfileHeader } from '@/components/ProfileHeader';
import { InfoItem } from '@/components/InfoItem';
import { SectionTitle } from '@/components/SectionTitle';
import { SkillTag } from '@/components/SkillTag';

export default function ProfileCoachScreen() {
  const router = useRouter();
  const [coachData, setCoachData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    // Navigation vers une page d'édition du profil
    console.log("Éditer le profil");
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
          name={`${coachData?.firstName || ''} ${coachData?.lastName || ''}`}
          specialty={coachData?.diploma || 'Coach sportif'}
          onEditPress={handleEditPress}
        />

        {/* Informations de contact */}
        <View style={styles.section}>
          <SectionTitle title="Informations de contact" />
          
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
        </View>

        {/* Informations professionnelles */}
        <View style={styles.section}>
          <SectionTitle title="Informations professionnelles" />
          
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
        </View>

        {/* Bio et description */}
        <View style={styles.section}>
          <SectionTitle title="À propos de moi" />
          <ThemedText style={styles.bio}>
            {coachData?.bio || 
              "Aucune biographie n'a été ajoutée. Complétez votre profil pour vous présenter à vos clients potentiels."}
          </ThemedText>
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

        {/* Bouton d'action */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleEditPress}
        >
          <ThemedText style={styles.actionButtonText}>Modifier mon profil</ThemedText>
        </TouchableOpacity>
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
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});