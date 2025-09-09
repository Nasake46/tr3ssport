// CoachScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Linking from 'expo-linking';
import { styles } from '../app/styles/coachScreen.styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import CarouselRecommandations from '@/components/CarouselRecommandations';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  limit,
  updateDoc as fbUpdateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/* ========= Types ========= */
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

type Review = {
  id: string;
  rating: number;
  comment: string;
  authorName: string;
  userId: string;
  createdAt?: any;
};

/* ====== Helper nom affiché ====== */
async function getDisplayNameFor(uid: string) {
  try {
    const uDoc = await getDoc(doc(firestore, 'users', uid));
    if (uDoc.exists()) {
      const d = uDoc.data() as any;
      const full = `${d.firstName || ''} ${d.lastName || ''}`.trim();
      if (full) return full;
    }
  } catch {}
  const u = auth.currentUser;
  if (u?.displayName) return u.displayName;
  if (u?.email) return u.email.split('@')[0];
  return 'Utilisateur';
}

/* ========= Component ========= */
export default function CoachScreen() {
  const { coachId } = useLocalSearchParams<{ coachId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Coach
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCoachId, setUserCoachId] = useState<string | null>(null);

  // Mon avis uniquement
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [loadingMyReview, setLoadingMyReview] = useState(true);

  // Création d’avis
  const [myRating, setMyRating] = useState<number>(0);
  const [myComment, setMyComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Édition de mon avis
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');

  const currentUser = auth.currentUser;
  const uid = currentUser?.uid || null;

  /* ====== Charger le coach ====== */
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const current = auth.currentUser;
        let effectiveCoachId = typeof coachId === 'string' ? coachId : undefined;

        if (!effectiveCoachId && current) {
          const meRef = doc(firestore, 'users', current.uid);
          const meSnap = await getDoc(meRef);
          if (meSnap.exists()) {
            const data = meSnap.data() as any;
            if (data.designatedCoachId) effectiveCoachId = data.designatedCoachId as string;
            setUserCoachId(data.designatedCoachId || null);
          }
        }

        if (effectiveCoachId) {
          const coachRef = doc(firestore, 'users', effectiveCoachId);
          const coachSnap = await getDoc(coachRef);
          setCoach(coachSnap.exists() ? { id: effectiveCoachId, ...(coachSnap.data() as any) } : null);
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

  /* ====== Charger uniquement MON avis (pas tous) ====== */
  const loadMyReview = async () => {
    if (!coach?.id || !uid) {
      setMyReview(null);
      setLoadingMyReview(false);
      return;
    }
    setLoadingMyReview(true);
    try {
      const qRef = query(
        collection(firestore, 'coachReviews'),
        where('coachId', '==', coach.id),
        where('userId', '==', uid),
        limit(1)
      );
      const snap = await getDocs(qRef);
      const row = snap.docs[0] ? ({ id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as Review) : null;
      setMyReview(row);
      // si on entre en édition à partir d’un avis existant
      if (row) {
        setEditRating(row.rating);
        setEditComment(row.comment);
      } else {
        setEditRating(0);
        setEditComment('');
      }
    } catch (e) {
      console.log('myReview error', e);
    } finally {
      setLoadingMyReview(false);
    }
  };

  useEffect(() => {
    loadMyReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id, uid]);

  /* ====== États dérivés / droits ====== */
  const isCurrentCoach = useMemo(() => coach?.id && userCoachId === coach.id, [coach?.id, userCoachId]);
  const isOwner = !!(uid && coach?.id && uid === coach.id);
  const canCreateReview = !!uid && !!coach?.id && uid !== coach.id && !myReview;

  /* ====== Actions avis ====== */
  const submitReview = async () => {
    if (!canCreateReview) {
      Alert.alert('Info', myReview ? 'Vous avez déjà laissé un avis.' : 'Action non autorisée.');
      return;
    }
    if (!myRating || !myComment.trim()) {
      Alert.alert('Champ manquant', 'Note et commentaire sont requis.');
      return;
    }

    try {
      setSubmitting(true);

      // par sécurité, revérifie qu’il n’en existe pas déjà un
      const existsQ = query(
        collection(firestore, 'coachReviews'),
        where('coachId', '==', coach!.id),
        where('userId', '==', uid!),
        limit(1)
      );
      const existsSnap = await getDocs(existsQ);
      if (!existsSnap.empty) {
        Alert.alert('Info', 'Vous avez déjà laissé un avis.');
        await loadMyReview();
        return;
      }

      const authorName = await getDisplayNameFor(uid!);

      await addDoc(collection(firestore, 'coachReviews'), {
        coachId: coach!.id,
        userId: uid!,
        authorName,
        rating: myRating,
        comment: myComment.trim(),
        createdAt: serverTimestamp(),
      });

      setMyRating(0);
      setMyComment('');
      await loadMyReview();
      Alert.alert('Merci !', 'Votre avis a été publié.');
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Impossible d'envoyer l’avis.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = () => {
    if (!myReview) return;
    setEditRating(myReview.rating);
    setEditComment(myReview.comment);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!myReview) return;
    if (!editRating || !editComment.trim()) {
      Alert.alert('Champ manquant', 'Note et commentaire sont requis.');
      return;
    }
    try {
      setSubmitting(true);
      await fbUpdateDoc(doc(firestore, 'coachReviews', myReview.id), {
        rating: editRating,
        comment: editComment.trim(),
        updatedAt: serverTimestamp(),
      });
      setIsEditing(false);
      await loadMyReview();
      Alert.alert('Mis à jour', 'Votre avis a été modifié.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Impossible de modifier l’avis.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMyReview = async () => {
    if (!myReview) return;
    Alert.alert('Supprimer votre avis ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmitting(true);
            await deleteDoc(doc(firestore, 'coachReviews', myReview.id));
            setIsEditing(false);
            await loadMyReview();
            Alert.alert('Supprimé', 'Votre avis a été supprimé.');
          } catch (e: any) {
            Alert.alert('Erreur', e?.message || "Impossible de supprimer l’avis.");
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  /* ====== Définir comme coach ====== */
  const defineAsCoach = async () => {
    const current = auth.currentUser;
    if (!current) {
      Alert.alert('Connexion requise', "Vous devez être connecté pour définir un coach.", [{ text: 'OK' }]);
      return;
    }
    if (!coach?.id) return;

    try {
      const meRef = doc(firestore, 'users', current.uid);
      const meSnap = await getDoc(meRef);
      const data = meSnap.exists() ? (meSnap.data() as any) : {};
      const already = data.designatedCoachId as string | undefined;

      const doUpdate = async () => {
        await updateDoc(meRef, { designatedCoachId: coach.id });
        setUserCoachId(coach.id);
        Alert.alert('Coach défini', `${coach.firstName || 'Ce coach'} est maintenant votre coach désigné.`);
      };

      if (already && already !== coach.id) {
        Alert.alert('Remplacer le coach ?', 'Vous avez déjà un coach désigné. Voulez-vous le remplacer ?', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Remplacer', style: 'destructive', onPress: doUpdate },
        ]);
      } else if (!already || already !== coach.id) {
        await doUpdate();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de définir ce coach. Réessayez plus tard.');
    }
  };

  /* ====== Rendu ====== */
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.container, { paddingBottom: (insets.bottom || 12) + 4 }]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="interactive"
        >
          {/* HEADER COACH */}
          <View style={styles.headerContainer}>
            {/* Colonne gauche */}
            <View style={styles.leftColumn}>
              <Image
                source={
                  coach.profileImageUrl ? { uri: coach.profileImageUrl } : require('@/assets/images/coachtest.jpg')
                }
                style={styles.avatar}
              />
              <Text style={styles.name}>{fullName}</Text>
              <Text style={styles.level}>Expert 🏅</Text>
              <Text style={styles.seniority}>{seniority} ans d’ancienneté</Text>
            </View>

            {/* Colonne droite */}
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
                  onPress={() => router.push({ pathname: '/(tabs)/profilCoach', params: { edit: '1' } } as any)}
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
                <View key={idx} style={styles.badge}>
                  <Text style={styles.badgeText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Expérience */}
          <View style={styles.experienceBlock}>
            <Text style={styles.sectionTitle}>EXPÉRIENCE</Text>
            <Text style={styles.experienceParagraph}>
              {`Plus de ${seniority} ans d’expérience. Cours à domicile, en extérieur ou à distance selon profil.`}
            </Text>
            <View style={styles.experienceItem}>
              <View style={styles.iconDot} />
              <Text style={styles.experienceText}>Diplômé APA</Text>
            </View>
            <View style={styles.experienceItem}>
              <View style={styles.iconDot} />
              <Text style={styles.experienceText}>Cours à domicile / extérieur</Text>
            </View>
            <View style={styles.experienceItem}>
              <View style={styles.iconDot} />
              <Text style={styles.experienceText}>Première séance de 30 min offerte</Text>
            </View>
          </View>

          {/* CTA */}
          <View style={styles.ctaBlock}>
            <TouchableOpacity style={styles.ctaButton} onPress={() => Alert.alert('Réservation', 'Bientôt disponible')}>
              <Text style={styles.ctaButtonText}>Réserver une séance d’essai</Text>
            </TouchableOpacity>
          </View>

          {/* Zone de déplacement */}
          <View style={styles.zoneBlock}>
            <Text style={styles.sectionTitle}>Périmètre de déplacement</Text>
            <View style={styles.badgeContainer}>
              {areas.map((a, idx) => (
                <View key={idx} style={styles.badge}>
                  <Text style={styles.badgeText}>{a}</Text>
                </View>
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

          {/* ======= Mon avis (seulement moi) ======= */}
          <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>MON AVIS</Text>

            {loadingMyReview ? (
              <ActivityIndicator />
            ) : myReview ? (
              isEditing ? (
                // Édition de mon avis
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ fontWeight: '700', marginBottom: 8, color: '#0F473C' }}>Modifier mon avis</Text>

                  <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setEditRating(n)} style={{ marginRight: 6 }}>
                        <FontAwesome name={n <= editRating ? 'star' : 'star-o'} size={20} color="#f5a623" />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      color: '#0F473C',
                      minHeight: 44,
                    }}
                    placeholder="Votre commentaire…"
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={editComment}
                    onChangeText={setEditComment}
                    onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                    returnKeyType="send"
                    onSubmitEditing={() => {
                      if (editComment.trim() && editRating) saveEdit();
                    }}
                  />

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      onPress={saveEdit}
                      disabled={submitting}
                      style={{ flex: 1, backgroundColor: '#0E6B5A', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{submitting ? 'Envoi…' : 'Enregistrer'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setIsEditing(false);
                        setEditRating(myReview.rating);
                        setEditComment(myReview.comment);
                      }}
                      style={{ flex: 1, backgroundColor: '#E5E7EB', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#0F473C', fontWeight: '700' }}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // Affichage de mon avis
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <FontAwesome
                        key={n}
                        name={n <= (myReview.rating || 0) ? 'star' : 'star-o'}
                        size={14}
                        color="#f5a623"
                        style={{ marginRight: 2 }}
                      />
                    ))}
                    <Text style={{ marginLeft: 8, fontWeight: '600' }}>{myReview.authorName || 'Moi'}</Text>
                  </View>
                  <Text style={{ color: '#0F473C' }}>{myReview.comment}</Text>

                  {!isOwner && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        onPress={startEdit}
                        style={{ flex: 1, backgroundColor: '#0E6B5A', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={deleteMyReview}
                        style={{ flex: 1, backgroundColor: '#E74C3C', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Supprimer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            ) : !isOwner && uid ? (
              // Formulaire création si pas encore d’avis
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ fontWeight: '700', marginBottom: 8, color: '#0F473C' }}>Laisser un avis</Text>

                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity key={n} onPress={() => setMyRating(n)} style={{ marginRight: 6 }}>
                      <FontAwesome name={n <= myRating ? 'star' : 'star-o'} size={20} color="#f5a623" />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    color: '#0F473C',
                    minHeight: 44,
                  }}
                  placeholder="Votre commentaire…"
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={myComment}
                  onChangeText={setMyComment}
                  onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (myComment.trim() && myRating) submitReview();
                  }}
                />

                <TouchableOpacity
                  onPress={submitReview}
                  disabled={submitting}
                  style={{
                    marginTop: 10,
                    backgroundColor: '#0E6B5A',
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {submitting ? 'Envoi…' : 'Publier'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ color: '#667085' }}>Connectez-vous pour laisser un avis.</Text>
            )}
          </View>

          {/* ======= Tous les avis (carrousel) ======= */}
          <CarouselRecommandations coachId={coach.id} heading="Avis & recommandations" limitCount={50} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
