import { collection, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Coach, CoachFilters, Location } from '@/models/coach';

/**
 * Crée des coaches par défaut dans la base de données
 */
const createDefaultCoaches = async (): Promise<void> => {
  try {
    console.log('🏃‍♂️ Création des coaches par défaut...');
    
    const defaultCoaches = [
      {
        firstName: 'Marie',
        lastName: 'Dupont',
        email: 'marie.dupont@coach.com',
        role: 'coach',
        phoneNumber: '+33123456789',
        bio: 'Coach sportif spécialisée en fitness et musculation. 10 ans d\'expérience.',
        address: 'Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
        photoURL: 'https://images.unsplash.com/photo-1494790108755-2616b612b829?w=150',
        tags: ['fitness', 'musculation', 'cardio'],
        rating: 4.8,
        reviewCount: 45,
        priceRange: {
          min: 50,
          max: 80,
          currency: 'EUR'
        },
        specialties: ['Fitness', 'Musculation', 'Cardio'],
        experience: '10 ans',
        certifications: ['BPJEPS', 'Formation premiers secours'],
        isVerified: true,
        availability: [
          { day: 'lundi', timeSlots: [{ start: '09:00', end: '18:00' }] },
          { day: 'mardi', timeSlots: [{ start: '09:00', end: '18:00' }] },
          { day: 'mercredi', timeSlots: [{ start: '09:00', end: '18:00' }] },
          { day: 'jeudi', timeSlots: [{ start: '09:00', end: '18:00' }] },
          { day: 'vendredi', timeSlots: [{ start: '09:00', end: '18:00' }] }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        firstName: 'Thomas',
        lastName: 'Martin',
        email: 'thomas.martin@coach.com',
        role: 'coach',
        phoneNumber: '+33123456790',
        bio: 'Coach yoga et pilates certifié. Spécialiste en récupération et bien-être.',
        address: 'Lyon, France',
        latitude: 45.7640,
        longitude: 4.8357,
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        tags: ['yoga', 'pilates', 'bien-être'],
        rating: 4.9,
        reviewCount: 67,
        priceRange: {
          min: 40,
          max: 70,
          currency: 'EUR'
        },
        specialties: ['Yoga', 'Pilates', 'Méditation'],
        experience: '8 ans',
        certifications: ['Certification Yoga Alliance', 'Formation Pilates'],
        isVerified: true,
        availability: [
          { day: 'lundi', timeSlots: [{ start: '08:00', end: '19:00' }] },
          { day: 'mardi', timeSlots: [{ start: '08:00', end: '19:00' }] },
          { day: 'mercredi', timeSlots: [{ start: '08:00', end: '19:00' }] },
          { day: 'jeudi', timeSlots: [{ start: '08:00', end: '19:00' }] },
          { day: 'vendredi', timeSlots: [{ start: '08:00', end: '19:00' }] },
          { day: 'samedi', timeSlots: [{ start: '09:00', end: '16:00' }] }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        firstName: 'Sophie',
        lastName: 'Bernard',
        email: 'sophie.bernard@coach.com',
        role: 'coach',
        phoneNumber: '+33123456791',
        bio: 'Coach running et préparation physique. Spécialisée dans l\'endurance.',
        address: 'Marseille, France',
        latitude: 43.2965,
        longitude: 5.3698,
        photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        tags: ['running', 'endurance', 'préparation physique'],
        rating: 4.7,
        reviewCount: 38,
        priceRange: {
          min: 45,
          max: 75,
          currency: 'EUR'
        },
        specialties: ['Running', 'Endurance', 'Préparation physique'],
        experience: '6 ans',
        certifications: ['BEES', 'Formation trail running'],
        isVerified: true,
        availability: [
          { day: 'lundi', timeSlots: [{ start: '06:00', end: '20:00' }] },
          { day: 'mardi', timeSlots: [{ start: '06:00', end: '20:00' }] },
          { day: 'mercredi', timeSlots: [{ start: '06:00', end: '20:00' }] },
          { day: 'jeudi', timeSlots: [{ start: '06:00', end: '20:00' }] },
          { day: 'vendredi', timeSlots: [{ start: '06:00', end: '20:00' }] },
          { day: 'samedi', timeSlots: [{ start: '07:00', end: '18:00' }] },
          { day: 'dimanche', timeSlots: [{ start: '08:00', end: '16:00' }] }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    const usersRef = collection(firestore, 'users');
    
    for (const coach of defaultCoaches) {
      await addDoc(usersRef, coach);
      console.log(`✅ Coach ${coach.firstName} ${coach.lastName} créé`);
    }
    
    console.log('🎉 Tous les coaches par défaut ont été créés');
  } catch (error) {
    console.error('❌ Erreur lors de la création des coaches par défaut:', error);
    throw error;
  }
};

/**
 * Calcule la distance entre deux points géographiques en kilomètres
 * Utilise la formule de Haversine
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Récupère tous les coachs de la base de données
 */
export const getAllCoaches = async (): Promise<Coach[]> => {
  try {
    console.log('🔍 SERVICE - Récupération de tous les coachs...');
    
    const coachesRef = collection(firestore, 'users');
    const q = query(
      coachesRef, 
      where('role', '==', 'coach')
    );
    
    console.log('📡 SERVICE - Tentative de connexion à Firebase...');
    const querySnapshot = await getDocs(q);
    const coaches: Coach[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const coach: Coach = {
        id: doc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber,
        bio: data.bio,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        photoURL: data.photoURL,
        tags: data.tags || [],
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        priceRange: data.priceRange,
        availability: data.availability || [],
        specialties: data.specialties || [],
        experience: data.experience,
        certifications: data.certifications || [],
        isVerified: data.isVerified || false,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
      coaches.push(coach);
    });
    
    console.log(`✅ SERVICE - Firebase: ${coaches.length} coachs récupérés`);
    
    // Si aucun coach n'est trouvé, créer les coaches par défaut
    if (coaches.length === 0) {
      console.log('⚠️ SERVICE - Aucun coach trouvé dans Firebase, création des coaches par défaut...');
      await createDefaultCoaches();
      
      // Récupérer à nouveau les coaches après création
      const newQuerySnapshot = await getDocs(q);
      const newCoaches: Coach[] = [];
      
      newQuerySnapshot.forEach((doc) => {
        const data = doc.data();
        const coach: Coach = {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber,
          bio: data.bio,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          photoURL: data.photoURL,
          tags: data.tags || [],
          rating: data.rating || 0,
          reviewCount: data.reviewCount || 0,
          priceRange: data.priceRange,
          availability: data.availability || [],
          specialties: data.specialties || [],
          experience: data.experience,
          certifications: data.certifications || [],
          isVerified: data.isVerified || false,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
        newCoaches.push(coach);
      });
      
      console.log(`✅ SERVICE - Firebase: ${newCoaches.length} nouveaux coachs récupérés après création`);
      return newCoaches;
    }
    
    return coaches;
    
  } catch (error) {
    console.error('❌ SERVICE - Erreur lors de la récupération des coachs:', error);
    throw error;
  }
};

/**
 * Recherche simple des coachs par nom/prénom
 */
export const searchCoachesByText = async (searchText: string): Promise<Coach[]> => {
  try {
    console.log('🔍 Recherche de coachs avec le texte:', searchText);
    
    // Récupérer tous les coachs
    const coaches = await getAllCoaches();
    
    // Si pas de texte de recherche, retourner tous les coachs
    if (!searchText.trim()) {
      return coaches;
    }
    
    // Filtrer par texte de recherche (nom/prénom/bio)
    const searchTextLower = searchText.toLowerCase().trim();
    const filteredCoaches = coaches.filter(coach => 
      `${coach.firstName} ${coach.lastName}`.toLowerCase().includes(searchTextLower) ||
      coach.bio?.toLowerCase().includes(searchTextLower) ||
      coach.address?.toLowerCase().includes(searchTextLower)
    );
    
    console.log(`✅ ${filteredCoaches.length} coachs trouvés`);
    return filteredCoaches;
  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error);
    throw error;
  }
};

/**
 * Récupère tous les tags uniques utilisés par les coachs
 */
export const getAllCoachTags = async (): Promise<string[]> => {
  try {
    console.log('🔍 Récupération de tous les tags des coachs...');
    
    const coaches = await getAllCoaches();
    const allTags = new Set<string>();
    
    coaches.forEach(coach => {
      if (coach.tags) {
        coach.tags.forEach(tag => allTags.add(tag.name));
      }
    });
    
    const uniqueTags = Array.from(allTags).sort();
    console.log(`✅ ${uniqueTags.length} tags uniques trouvés`);
    return uniqueTags;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des tags:', error);
    throw error;
  }
};

/**
 * Récupère les coachs recommandés basés sur les préférences de l'utilisateur
 */
export const getRecommendedCoaches = async (
  userPreferences?: string[],
  limit_count: number = 10
): Promise<Coach[]> => {
  try {
    console.log('🔍 Récupération des coachs recommandés...');
    
    let coaches = await getAllCoaches();
    
    // Si l'utilisateur a des préférences, prioriser les coachs avec des tags correspondants
    if (userPreferences && userPreferences.length > 0) {
      coaches.sort((a, b) => {
        const aMatches = a.tags?.filter(tag => 
          userPreferences.includes(tag.name)
        ).length || 0;
        
        const bMatches = b.tags?.filter(tag => 
          userPreferences.includes(tag.name)
        ).length || 0;
        
        if (aMatches !== bMatches) {
          return bMatches - aMatches; // Plus de correspondances d'abord
        }
        
        // En cas d'égalité, trier par note
        return (b.rating || 0) - (a.rating || 0);
      });
    }
    
    // Prioriser les coachs vérifiés
    coaches.sort((a, b) => {
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;
      return 0;
    });
    
    return coaches.slice(0, limit_count);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des coachs recommandés:', error);
    throw error;
  }
};

/**
 * Récupère un coach spécifique par son ID
 */
export const getCoachById = async (coachId: string): Promise<Coach | null> => {
  try {
    console.log('🔍 Récupération du coach:', coachId);
    
    const coaches = await getAllCoaches();
    const coach = coaches.find(c => c.id === coachId);
    
    if (coach) {
      console.log('✅ Coach trouvé:', coach.firstName, coach.lastName);
    } else {
      console.log('❌ Coach non trouvé');
    }
    
    return coach || null;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du coach:', error);
    throw error;
  }
};
