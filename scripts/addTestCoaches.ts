import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';

/**
 * Script pour ajouter des coaches de test dans la base de données
 * À exécuter depuis la console ou un composant de test
 */
export const addTestCoaches = async () => {
  const testCoaches = [
    {
      firstName: 'Marie',
      lastName: 'Dubois',
      email: 'marie.dubois@tr3ssport.com',
      role: 'coach',
      phoneNumber: '+33123456789',
      bio: 'Coach spécialisée en yoga et pilates avec 8 ans d\'expérience.',
      address: '15 Rue de la Paix, 75001 Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      specialties: ['Yoga', 'Pilates', 'Stretching'],
      certifications: ['Diplôme Yoga Alliance 200h', 'Certification Pilates'],
      experience: 8,
      priceRange: { min: 50, max: 70 },
      availability: [
        { day: 'monday', startTime: '09:00', endTime: '18:00' },
        { day: 'tuesday', startTime: '09:00', endTime: '18:00' },
        { day: 'wednesday', startTime: '09:00', endTime: '18:00' },
        { day: 'thursday', startTime: '09:00', endTime: '18:00' },
        { day: 'friday', startTime: '09:00', endTime: '18:00' },
        { day: 'saturday', startTime: '10:00', endTime: '16:00' }
      ],
      rating: 4.8,
      reviewCount: 45,
      isVerified: true,
      tags: ['yoga', 'pilates', 'stretching'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      firstName: 'Thomas',
      lastName: 'Martin',
      email: 'thomas.martin@tr3ssport.com',
      role: 'coach',
      phoneNumber: '+33198765432',
      bio: 'Entraîneur personnel spécialisé en musculation et cardio-training.',
      specialties: ['Musculation', 'Cardio', 'Cross-training'],
      certifications: ['Brevet d\'État', 'Certification CrossFit Level 1'],
      experienceYears: 12,
      pricePerHour: 75,
      location: {
        city: 'Lyon',
        address: '25 Avenue Jean Jaurès, 69007 Lyon',
        latitude: 45.7640,
        longitude: 4.8357
      },
      availability: {
        monday: { start: '06:00', end: '20:00' },
        tuesday: { start: '06:00', end: '20:00' },
        wednesday: { start: '06:00', end: '20:00' },
        thursday: { start: '06:00', end: '20:00' },
        friday: { start: '06:00', end: '20:00' },
        saturday: { start: '08:00', end: '18:00' },
        sunday: { start: '08:00', end: '16:00' }
      },
      rating: 4.9,
      reviewCount: 67,
      isActive: true,
      createdAt: new Date()
    },
    {
      firstName: 'Sophie',
      lastName: 'Leroy',
      email: 'sophie.leroy@tr3ssport.com',
      role: 'coach',
      phoneNumber: '+33156789123',
      bio: 'Coach en course à pied et préparation physique générale.',
      specialties: ['Course à pied', 'Préparation physique', 'Endurance'],
      certifications: ['Brevet d\'État BEES', 'Formation trail running'],
      experienceYears: 6,
      pricePerHour: 55,
      location: {
        city: 'Marseille',
        address: '8 Boulevard Michelet, 13008 Marseille',
        latitude: 43.2965,
        longitude: 5.3698
      },
      availability: {
        monday: { start: '07:00', end: '19:00' },
        tuesday: { start: '07:00', end: '19:00' },
        wednesday: { start: '07:00', end: '19:00' },
        friday: { start: '07:00', end: '19:00' },
        saturday: { start: '07:00', end: '17:00' },
        sunday: { start: '08:00', end: '14:00' }
      },
      rating: 4.6,
      reviewCount: 28,
      isActive: true,
      createdAt: new Date()
    }
  ];

  try {
    console.log('🏃‍♂️ Ajout des coaches de test...');
    
    for (const coach of testCoaches) {
      const docRef = await addDoc(collection(firestore, 'users'), coach);
      console.log(`✅ Coach ${coach.firstName} ${coach.lastName} ajouté avec l'ID:`, docRef.id);
    }
    
    console.log('🎉 Tous les coaches de test ont été ajoutés avec succès !');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des coaches:', error);
    throw error;
  }
};

// Pour exécuter le script depuis la console :
// addTestCoaches().then(() => console.log('Terminé')).catch(console.error);
