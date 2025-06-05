import * as ExpoLocation from 'expo-location';
import { Alert } from 'react-native';
import { Location } from '@/models/coach';

/**
 * Demande la permission d'accès à la localisation
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    console.log('🗺️ Demande de permission de géolocalisation...');
    
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('❌ Permission de géolocalisation refusée');
      Alert.alert(
        'Permission requise',
        'L\'accès à votre position est nécessaire pour filtrer les coachs par distance.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    console.log('✅ Permission de géolocalisation accordée');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la demande de permission:', error);
    return false;
  }
};

/**
 * Obtient la position actuelle de l'utilisateur
 */
export const getCurrentLocation = async (): Promise<Location | null> => {
  try {
    console.log('🗺️ Récupération de la position actuelle...');
    
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }
    
    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });
    
    const userLocation: Location = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    
    console.log('✅ Position obtenue:', userLocation);
    return userLocation;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la position:', error);
    Alert.alert(
      'Erreur de géolocalisation',
      'Impossible de récupérer votre position. Vérifiez que la géolocalisation est activée.',
      [{ text: 'OK' }]
    );
    return null;
  }
};

/**
 * Convertit une adresse en coordonnées géographiques
 */
export const geocodeAddress = async (address: string): Promise<Location | null> => {
  try {
    console.log('🗺️ Géocodage de l\'adresse:', address);
    
    const geocodedLocations = await ExpoLocation.geocodeAsync(address);
    
    if (geocodedLocations.length === 0) {
      console.log('❌ Aucune coordonnée trouvée pour cette adresse');
      return null;
    }
    
    const location: Location = {
      latitude: geocodedLocations[0].latitude,
      longitude: geocodedLocations[0].longitude,
    };
    
    console.log('✅ Coordonnées trouvées:', location);
    return location;
  } catch (error) {
    console.error('❌ Erreur lors du géocodage:', error);
    return null;
  }
};

/**
 * Convertit des coordonnées géographiques en adresse
 */
export const reverseGeocode = async (location: Location): Promise<string | null> => {
  try {
    console.log('🗺️ Géocodage inverse:', location);
    
    const addresses = await ExpoLocation.reverseGeocodeAsync(location);
    
    if (addresses.length === 0) {
      console.log('❌ Aucune adresse trouvée pour ces coordonnées');
      return null;
    }
    
    const address = addresses[0];
    const formattedAddress = [
      address.name,
      address.street,
      address.city,
      address.postalCode,
      address.country
    ].filter(Boolean).join(', ');
    
    console.log('✅ Adresse trouvée:', formattedAddress);
    return formattedAddress;
  } catch (error) {
    console.error('❌ Erreur lors du géocodage inverse:', error);
    return null;
  }
};

/**
 * Vérifie si les services de localisation sont activés
 */
export const isLocationServicesEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await ExpoLocation.hasServicesEnabledAsync();
    console.log('🗺️ Services de localisation activés:', enabled);
    return enabled;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des services de localisation:', error);
    return false;
  }
};
