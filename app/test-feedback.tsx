import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView
} from 'react-native';
import SessionWithFeedback from '@/components/feedback/SessionWithFeedback';

export default function FeedbackTestScreen() {
  // Pour la démo, utilisons des IDs fictifs
  const coachId = 'coach_demo_123';
  const currentUserId = 'coach_demo_123'; // L'utilisateur actuel est le coach
  const isCoach = true;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Test du Système de Feedback</Text>
        <Text style={styles.subtitle}>
          Démonstration du feedback automatique en fin de séance
        </Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Instructions :</Text>
        <Text style={styles.instructionText}>
          1. Démarrez une séance avec le bouton "Démarrer une séance"
        </Text>
        <Text style={styles.instructionText}>
          2. Terminez la séance avec "Terminer la séance"
        </Text>
        <Text style={styles.instructionText}>
          3. Le formulaire de feedback s'affichera automatiquement
        </Text>
        <Text style={styles.instructionText}>
          4. Remplissez l'évaluation et soumettez
        </Text>
      </View>

      <SessionWithFeedback
        coachId={coachId}
        currentUserId={currentUserId}
        isCoach={isCoach}
      />

      <View style={styles.features}>
        <Text style={styles.featuresTitle}>Fonctionnalités du Feedback :</Text>
        <Text style={styles.featureItem}>✅ Note 1-5 étoiles sur la qualité de la séance</Text>
        <Text style={styles.featureItem}>✅ Note 1-5 étoiles sur le coach/client</Text>
        <Text style={styles.featureItem}>✅ Commentaire libre optionnel</Text>
        <Text style={styles.featureItem}>✅ Question "Souhaitez-vous refaire une séance ?"</Text>
        <Text style={styles.featureItem}>✅ Question "Objectif de séance accompli ?"</Text>
        <Text style={styles.featureItem}>✅ Déclenchement automatique en fin de séance</Text>
        <Text style={styles.featureItem}>✅ Support des feedbacks multiples (coach + clients)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f4ff',
    textAlign: 'center',
  },
  instructions: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  features: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 10,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 6,
    lineHeight: 20,
  },
});
