import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Coach, CoachFilters, Location } from '@/models/coach';

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
    console.log('🔍 Récupération de tous les coachs...');
    
    const coachesRef = collection(firestore, 'users');
    const q = query(
      coachesRef, 
      where('role', '==', 'coach')
    );
    
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
        tags: data.tags || [], // Tags directement depuis le document
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
    
    console.log(`✅ ${coaches.length} coachs récupérés`);
    return coaches;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des coachs:', error);
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
