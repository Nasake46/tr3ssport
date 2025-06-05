export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  photoURL?: string;
  tags?: CoachTag[];
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  availability?: string[];
  specialties?: string[];
  experience?: number; // années d'expérience
  certifications?: string[];
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CoachTag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface CoachFilters {
  searchText: string;
  selectedTags: string[];
  minRating: number;
  maxRating: number;
  radiusKm: number;
  priceRange?: string;
  availability?: string[];
  isVerified?: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface SearchFilters {
  tags: string[];
  rating: number;
  radius: number;
  location?: Location;
  priceRange?: string;
  availability?: string[];
}
