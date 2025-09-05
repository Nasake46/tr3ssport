import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Linking from 'expo-linking';
import { styles } from '../app/styles/coachScreen.styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import CarouselRecommandations from '@/components/CarouselRecommandations';

interface CoachProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  bio?: string;
  pricePerHour?: number;
  seniorityYears?: number;
  specialties?: string[];
  serviceAreas?: string[];
  videoUrl?: string;
  location?: { lat?: number; lng?: number };
}

export default function CoachScreen() {
  const { coachId } = useLocalSearchParams<{ coachId?: string }>();
  const router = useRouter();

  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCoachId, setUserCoachId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const currentUser = auth.currentUser;
        let effectiveCoachId = typeof coachId === 'string' ? coachId : undefined;

        // If no coachId provided, try user's designated coach
        if (!effectiveCoachId && currentUser) {
          const meRef = doc(firestore, 'users', currentUser.uid);
          const meSnap = await getDoc(meRef);
          if (meSnap.exists()) {
            const data = meSnap.data() as any;
            if (data.designatedCoachId) {
              effectiveCoachId = data.designatedCoachId as string;
            }
            setUserCoachId(data.designatedCoachId || null);
          }
        }

        if (effectiveCoachId) {
          const coachRef = doc(firestore, 'users', effectiveCoachId);
          const coachSnap = await getDoc(coachRef);
          if (coachSnap.exists()) {
            setCoach({ id: effectiveCoachId, ...(coachSnap.data() as any) });
          } else {
            setCoach(null);
          }
        } else {
          setCoach(null);
        }
      } catch (e) {
        console.error(e);
        setCoach(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [coachId]);

  const isCurrentCoach = useMemo(() => {
    return coach?.id && userCoachId === coach.id;
  }, [coach?.id, userCoachId]);
  const isOwner = auth.currentUser?.uid && coach?.id
  ? auth.currentUser.uid === coach.id
  : false;

  const defineAsCoach = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Connexion requise', "Vous devez être connecté pour définir un coach.", [
        { text: 'OK' },
      ]);
      return;
    }
    if (!coach?.id) return;

    try {
      const meRef = doc(firestore, 'users', currentUser.uid);
      const meSnap = await getDoc(meRef);
      const current = meSnap.exists() ? (meSnap.data() as any) : {};
      const already = current.designatedCoachId as string | undefined;

      const doUpdate = async () => {
        await updateDoc(meRef, { designatedCoachId: coach.id });
        setUserCoachId(coach.id);
        Alert.alert('Coach défini', `${coach.firstName || 'Ce coach'} est maintenant votre coach désigné.`);
      };

      if (already && already !== coach.id) {
        Alert.alert(
          'Remplacer le coach ?',
          "Vous avez déjà un coach désigné. Voulez-vous le remplacer ?",
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Remplacer', style: 'destructive', onPress: doUpdate },
          ]
        );
      } else if (!already || already !== coach.id) {
        await doUpdate();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', "Impossible de définir ce coach. Réessayez plus tard.");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!coach) {
    return (
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 16 }}>
          Aucun coach sélectionné. Ouvrez un coach depuis le carrousel ou définissez votre coach depuis la liste.
        </Text>
      </View>
    );
  }

  const fullName = `${coach.firstName ?? ''} ${coach.lastName ?? ''}`.trim() || 'Coach';
  const price = coach.pricePerHour ?? 78;
  const seniority = coach.seniorityYears ?? 3;
  const specialties = coach.specialties ?? ['Renforcement musculaire', 'Cardio', 'Souplesse'];
  const areas = coach.serviceAreas ?? ['Hauts-de-Seine', 'Paris'];
  const lat = coach.location?.lat ?? 48.8566;
  const lng = coach.location?.lng ?? 2.3522;
  const videoUrl = coach.videoUrl ?? 'https://youtu.be/wvlztaJYKYI?si=Utv8YbkokleQcaH3';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER COACH */}
      <View style={styles.headerContainer}>
        {/* Colonne gauche : image + infos coach */}
        <View style={styles.leftColumn}>
          <Image
            source={coach.profileImageUrl ? { uri: coach.profileImageUrl } : require('@/assets/images/coachtest.jpg')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.level}>Expert 🏅</Text>
          <Text style={styles.seniority}>{seniority} ans d’ancienneté</Text>
        </View>

        {/* Colonne droite : prix + contact */}
        <View style={styles.rightColumn}>
          <Text style={styles.price}>{price} € / h</Text>
          <View style={styles.reductionBox}>
            <Text style={styles.priceReduction}>{Math.round(price / 2)} €</Text>
            <Text style={styles.reductionNote}>Après déduction d’impôts</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => Linking.openURL('mailto:contact@example.com')}>
            <Text style={styles.primaryButtonText}>Contacter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineButton, isCurrentCoach && { opacity: 0.6 }]}
            onPress={defineAsCoach}
            disabled={!!isCurrentCoach}
          >
            <Text style={styles.outlineButtonText}>
              {isCurrentCoach ? 'Coach actuel' : 'Définir comme coach'}
            </Text>
          </TouchableOpacity>
          {isOwner && (
          <TouchableOpacity
           style={styles.primaryButton}
           onPress={() =>
             router.push({ pathname: '/(tabs)/profilCoach', params: { edit: '1' } } as any)
            }
            >
           <Text style={styles.primaryButtonText}>Modifier ma page</Text>
  </TouchableOpacity>
)}
        </View>
      </View>

      {/* Description */}
      <View style={styles.descriptionBlock}>
        <Text style={styles.descriptionText}>
          {coach.bio || 'Coach Sportif spécialisé en sport-santé, accompagnement sur mesure.'}
        </Text>
        <Text style={styles.sectionTitle}>SPÉCIALITÉS</Text>
        <View style={styles.badgeContainer}>
          {specialties.map((s, idx) => (
            <View key={idx} style={styles.badge}><Text style={styles.badgeText}>{s}</Text></View>
          ))}
        </View>
      </View>

      {/* Expérience (exemple simple) */}
      <View style={styles.experienceBlock}>
        <Text style={styles.sectionTitle}>EXPÉRIENCE</Text>
        <Text style={styles.experienceParagraph}>
          {`Plus de ${seniority} ans d’expérience. Cours à domicile, en extérieur ou à distance selon profil.`}
        </Text>
        <View style={styles.experienceItem}><View style={styles.iconDot} /><Text style={styles.experienceText}>Diplômé APA</Text></View>
        <View style={styles.experienceItem}><View style={styles.iconDot} /><Text style={styles.experienceText}>Cours à domicile / extérieur</Text></View>
        <View style={styles.experienceItem}><View style={styles.iconDot} /><Text style={styles.experienceText}>Première séance de 30 min offerte</Text></View>
      </View>

      {/* Call to Action */}
      <View style={styles.ctaBlock}>
        <TouchableOpacity style={styles.ctaButton} onPress={() => Alert.alert('Réservation', 'Bientôt disponible') }>
          <Text style={styles.ctaButtonText}>Réserver une séance d’essai</Text>
        </TouchableOpacity>
      </View>

      {/* Zone de déplacement */}
      <View style={styles.zoneBlock}>
        <Text style={styles.sectionTitle}>Périmètre de déplacement</Text>
        <View style={styles.badgeContainer}>
          {areas.map((a, idx) => (
            <View key={idx} style={styles.badge}><Text style={styles.badgeText}>{a}</Text></View>
          ))}
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} title="Zone d’intervention" description="Paris et alentours" />
        </MapView>
      </View>

      {/* Démo vidéo */}
      <View style={styles.demoBlock}>
        <Text style={styles.sectionLabel}>SUR MESURE</Text>
        <Text style={styles.demoTitle}>Démo séance type</Text>
        <TouchableOpacity style={styles.demoVideo} onPress={() => Linking.openURL(videoUrl)}>
          <Text style={styles.playIcon}>▶️</Text>
        </TouchableOpacity>
        <Text style={styles.demoDescription}>Aperçu rapide d’une séance type.</Text>
      </View>

      <CarouselRecommandations />
    </ScrollView>
  );
}