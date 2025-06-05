import { 
  doc, 
  getDoc,
  updateDoc, 
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { firestore, auth } from '@/firebase';
import { CoachTag, TagCreateData, AVAILABLE_COLORS } from '@/models/tag';

/**
 * Génère un ID unique pour un tag
 */
const generateTagId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

/**
 * Vérifie si l'utilisateur est un coach authentifié
 */
const checkCoachAuthentication = async (coachId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Utilisateur non authentifié');
  }

  if (currentUser.uid !== coachId) {
    throw new Error('Vous ne pouvez modifier que votre propre profil');
  }

  // Vérifier que l'utilisateur est bien un coach
  const userDoc = await getDoc(doc(firestore, 'users', coachId));
  if (!userDoc.exists()) {
    throw new Error('Utilisateur non trouvé');
  }

  const userData = userDoc.data();
  if (userData.role !== 'coach') {
    throw new Error('Seuls les coachs peuvent créer des tags');
  }

  return userData;
};

/**
 * Récupère les tags d'un coach
 */
export const getCoachTags = async (coachId: string): Promise<CoachTag[]> => {
  try {
    console.log('🔍 Récupération des tags pour le coach:', coachId);
    
    const userDoc = await getDoc(doc(firestore, 'users', coachId));
    if (!userDoc.exists()) {
      console.log('❌ Document utilisateur non trouvé');
      return [];
    }

    const userData = userDoc.data();
    const tags = userData.tags || [];
    
    console.log('✅ Tags récupérés:', tags);
    return tags;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des tags:', error);
    throw error;
  }
};

/**
 * Ajoute un nouveau tag au profil du coach
 */
export const createCoachTag = async (
  coachId: string, 
  tagData: TagCreateData
): Promise<string> => {
  try {
    console.log('🔍 Création d\'un tag pour le coach:', coachId);
    console.log('🔍 Données du tag:', tagData);

    // Vérifier l'authentification et le rôle
    await checkCoachAuthentication(coachId);

    // Vérifier les données du tag
    if (!tagData.name || tagData.name.trim().length === 0) {
      throw new Error('Le nom du tag est obligatoire');
    }

    // Récupérer les tags existants pour vérifier les doublons
    const existingTags = await getCoachTags(coachId);
    const tagExists = existingTags.some(
      tag => tag.name.toLowerCase() === tagData.name.trim().toLowerCase()
    );

    if (tagExists) {
      throw new Error('Un tag avec ce nom existe déjà');
    }

    // Créer le nouveau tag
    const newTag: CoachTag = {
      id: generateTagId(),
      name: tagData.name.trim(),
      color: tagData.color || AVAILABLE_COLORS[0],
      createdAt: Timestamp.now()
    };

    console.log('🔍 Nouveau tag à ajouter:', newTag);

    // Ajouter le tag au document utilisateur
    await updateDoc(doc(firestore, 'users', coachId), {
      tags: arrayUnion(newTag)
    });

    console.log('✅ Tag créé avec succès');
    return newTag.id;
  } catch (error) {
    console.error('❌ Erreur lors de la création du tag:', error);
    throw error;
  }
};

/**
 * Met à jour un tag existant
 */
export const updateCoachTag = async (
  coachId: string,
  tagId: string, 
  updates: { name?: string; color?: string }
): Promise<void> => {
  try {
    console.log('🔍 Mise à jour du tag:', tagId);

    // Vérifier l'authentification et le rôle
    await checkCoachAuthentication(coachId);

    // Récupérer les tags existants
    const existingTags = await getCoachTags(coachId);
    const tagIndex = existingTags.findIndex(tag => tag.id === tagId);

    if (tagIndex === -1) {
      throw new Error('Tag non trouvé');
    }

    // Vérifier les doublons si le nom change
    if (updates.name) {
      const duplicateExists = existingTags.some(
        (tag, index) => 
          index !== tagIndex && 
          tag.name.toLowerCase() === updates.name!.trim().toLowerCase()
      );

      if (duplicateExists) {
        throw new Error('Un tag avec ce nom existe déjà');
      }
    }

    // Créer le tag mis à jour
    const updatedTag = {
      ...existingTags[tagIndex],
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.color && { color: updates.color })
    };

    // Remplacer le tag dans le tableau
    const updatedTags = [...existingTags];
    updatedTags[tagIndex] = updatedTag;

    // Mettre à jour le document
    await updateDoc(doc(firestore, 'users', coachId), {
      tags: updatedTags
    });

    console.log('✅ Tag mis à jour avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du tag:', error);
    throw error;
  }
};

/**
 * Supprime un tag
 */
export const deleteCoachTag = async (coachId: string, tagId: string): Promise<void> => {
  try {
    console.log('🔍 Suppression du tag:', tagId);

    // Vérifier l'authentification et le rôle
    await checkCoachAuthentication(coachId);

    // Récupérer les tags existants
    const existingTags = await getCoachTags(coachId);
    const tagToDelete = existingTags.find(tag => tag.id === tagId);

    if (!tagToDelete) {
      throw new Error('Tag non trouvé');
    }

    // Supprimer le tag du document
    await updateDoc(doc(firestore, 'users', coachId), {
      tags: arrayRemove(tagToDelete)
    });

    console.log('✅ Tag supprimé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du tag:', error);
    throw error;
  }
};