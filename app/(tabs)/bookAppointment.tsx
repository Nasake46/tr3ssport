import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Coach } from '@/models/coach';
import { getAllCoaches, searchCoachesByText, getAllCoachTags } from '@/services/coachService';
import BookingFormModal from '@/components/BookingFormModal';

const BookAppointmentScreen = () => {
  const router = useRouter();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [filteredCoaches, setFilteredCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    searchText: '',
    selectedTags: [] as string[],
    minRating: 0,
    maxRating: 5,
    radiusKm: 25
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // États pour la réservation
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  } | null>(null);  useEffect(() => {
    loadAllCoaches();
    loadAvailableTags();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    performSearch();
  }, [searchText, coaches]);

  const loadCurrentUser = () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUser({
              id: user.uid,
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: userData.email || user.email || '',
              phoneNumber: userData.phoneNumber || ''
            });
          }
        } catch (error) {
          console.error('Erreur lors du chargement de l\'utilisateur:', error);
        }
      } else {
        // Utilisateur non connecté, rediriger vers la page de connexion
        Alert.alert(
          'Connexion requise',
          'Vous devez être connecté pour prendre rendez-vous',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    });

    return unsubscribe;
  };

  const loadAllCoaches = async () => {
    try {
      setLoading(true);
      
      // Charger TOUS les coachs
      const allCoaches = await getAllCoaches();
      setCoaches(allCoaches);
      setFilteredCoaches(allCoaches); // Afficher tous les coachs par défaut
      
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les coachs');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const tags = await getAllCoachTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
    }
  };

  const performSearch = async () => {
    try {
      if (!searchText.trim()) {
        // Si pas de recherche, afficher tous les coachs
        setFilteredCoaches(coaches);
      } else {
        // Effectuer la recherche textuelle
        const searchResults = await searchCoachesByText(searchText);
        setFilteredCoaches(searchResults);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      Alert.alert('Erreur', 'Erreur lors de la recherche');
    }
  };

  const requestUserLocation = async () => {
    // TODO: Implémenter la demande de localisation
    console.log('Demande de localisation');
  };

  const toggleTagFilter = (tagName: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagName)
        ? prev.selectedTags.filter(t => t !== tagName)
        : [...prev.selectedTags, tagName]
    }));
  };
  const clearFilters = () => {
    setFilters({
      searchText: '',
      selectedTags: [],
      minRating: 0,
      maxRating: 5,
      radiusKm: 25
    });
  };
  const handleBookCoach = (coach: Coach) => {
    if (!currentUser) {
      Alert.alert(
        'Connexion requise',
        'Vous devez être connecté pour prendre rendez-vous',
        [{ text: 'OK', onPress: () => router.push('/(tabs)/LoginScreen') }]
      );
      return;
    }

    setSelectedCoach(coach);
    setShowBookingModal(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    setSelectedCoach(null);
    // Optionnel : rafraîchir la liste ou afficher un message de succès
  };

  const renderCoachCard = (coach: Coach) => (
    <TouchableOpacity 
      key={coach.id} 
      style={styles.coachCard}
      onPress={() => {
        // Naviguer vers le profil du coach
        Alert.alert('Coach sélectionné', `Voir le profil de ${coach.firstName} ${coach.lastName}`);
      }}
    >
      <View style={styles.coachHeader}>
        <View style={styles.coachAvatar}>
          {coach.photoURL ? (
            <Image source={{ uri: coach.photoURL }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={32} color="#7667ac" />
          )}
        </View>
        <View style={styles.coachInfo}>
          <Text style={styles.coachName}>
            {coach.firstName} {coach.lastName}
          </Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {coach.rating?.toFixed(1) || 'N/A'}
            </Text>
          </View>
          {coach.address && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.locationText}>{coach.address}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={() => handleBookCoach(coach)}
        >
          <Text style={styles.bookButtonText}>Réserver</Text>
        </TouchableOpacity>
      </View>
      
      {coach.bio && (
        <Text style={styles.coachBio} numberOfLines={2}>
          {coach.bio}
        </Text>
      )}
      
      {coach.tags && coach.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {coach.tags.slice(0, 3).map(tag => (
            <View 
              key={tag.id} 
              style={[styles.tagChip, { backgroundColor: tag.color + '20', borderColor: tag.color }]}
            >
              <Text style={[styles.tagText, { color: tag.color }]}>
                {tag.name}
              </Text>
            </View>
          ))}
          {coach.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{coach.tags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filtres</Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearButton}>Effacer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Filtrage par tags */}
          <Text style={styles.filterSectionTitle}>Spécialités</Text>
          <View style={styles.tagsFilterContainer}>
            {availableTags.map(tagName => (
              <TouchableOpacity
                key={tagName}
                style={[
                  styles.tagFilterButton,
                  filters.selectedTags.includes(tagName) && styles.selectedTagFilter
                ]}
                onPress={() => toggleTagFilter(tagName)}
              >
                <Text style={[
                  styles.tagFilterText,
                  filters.selectedTags.includes(tagName) && styles.selectedTagFilterText
                ]}>
                  {tagName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filtrage par note */}
          <Text style={styles.filterSectionTitle}>Note minimale</Text>
          <View style={styles.ratingFilter}>
            {[1, 2, 3, 4, 5].map(rating => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  filters.minRating >= rating && styles.selectedRating
                ]}
                onPress={() => setFilters(prev => ({ ...prev, minRating: rating }))}
              >
                <Ionicons 
                  name="star" 
                  size={20} 
                  color={filters.minRating >= rating ? '#FFD700' : '#ccc'} 
                />
              </TouchableOpacity>
            ))}
          </View>          {/* Filtrage par distance */}
          <Text style={styles.filterSectionTitle}>Rayon de recherche</Text>
          <View style={styles.locationSection}>
            <View style={styles.locationStatus}>
              <Ionicons 
                name={userLocation ? "location" : "location-outline"} 
                size={16} 
                color={userLocation ? "#4CAF50" : "#666"} 
              />
              <Text style={styles.locationStatusText}>
                {userLocation ? "Position activée" : "Position non disponible"}
              </Text>
              <TouchableOpacity 
                onPress={requestUserLocation}
                style={styles.refreshLocationButton}
              >
                <Ionicons name="refresh" size={16} color="#7667ac" />
              </TouchableOpacity>
            </View>
            <View style={styles.radiusFilter}>
              {[10, 25, 50].map(radius => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.radiusButton,
                    filters.radiusKm === radius && styles.selectedRadius,
                    !userLocation && styles.disabledRadius
                  ]}
                  onPress={() => userLocation && setFilters(prev => ({ ...prev, radiusKm: radius }))}
                  disabled={!userLocation}
                >
                  <Text style={[
                    styles.radiusText,
                    filters.radiusKm === radius && styles.selectedRadiusText,
                    !userLocation && styles.disabledRadiusText
                  ]}>
                    {radius} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7667ac" />
        <Text style={styles.loadingText}>Chargement des coachs...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prendre un RDV</Text>        <TouchableOpacity onPress={() => setShowFilters(true)}>
          <View style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#7667ac" />
            {(filters.selectedTags.length > 0 || filters.minRating > 0) && (
              <View style={styles.filterBadge} />
            )}
          </View>
        </TouchableOpacity>
      </View>      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un coach..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredCoaches.length} coach{filteredCoaches.length > 1 ? 's' : ''} trouvé{filteredCoaches.length > 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView style={styles.coachsList}>
        {filteredCoaches.map(renderCoachCard)}
        {filteredCoaches.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun coach trouvé</Text>
            <Text style={styles.emptyStateText}>
              Essayez de modifier vos critères de recherche
            </Text>
          </View>
        )}      </ScrollView>

      {renderFiltersModal()}
      
      {/* Modal de réservation */}
      {selectedCoach && currentUser && (
        <BookingFormModal
          visible={showBookingModal}
          coach={selectedCoach}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedCoach(null);
          }}
          onSuccess={handleBookingSuccess}
          userInfo={currentUser}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  filterButton: {
    position: 'relative',
    padding: 4,
  },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
  },
  coachsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  coachCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coachAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  bookButton: {
    backgroundColor: '#7667ac',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  coachBio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    color: '#7667ac',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  tagsFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedTagFilter: {
    backgroundColor: '#7667ac',
    borderColor: '#7667ac',
  },
  tagFilterText: {
    fontSize: 14,
    color: '#333',
  },
  selectedTagFilterText: {
    color: '#fff',
  },
  ratingFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    padding: 8,
  },
  selectedRating: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  radiusFilter: {
    flexDirection: 'row',
    gap: 12,
  },
  radiusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedRadius: {
    backgroundColor: '#7667ac',
    borderColor: '#7667ac',
  },
  radiusText: {
    fontSize: 14,
    color: '#333',
  },  selectedRadiusText: {
    color: '#fff',
  },
  locationSection: {
    marginBottom: 16,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  locationStatusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  refreshLocationButton: {
    padding: 4,
  },
  disabledRadius: {
    opacity: 0.5,
  },
  disabledRadiusText: {
    color: '#999',
  },
});

export default BookAppointmentScreen;
