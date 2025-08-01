import { Timestamp } from 'firebase/firestore';

export interface CoachTag {
  id: string;           // ID unique généré côté client
  name: string;         // Nom du tag personnalisé
  color: string;        // Couleur choisie par le coach
  createdAt: Timestamp | Date;
}

export interface TagCreateData {
  name: string;
  color?: string;
}

// Couleurs prédéfinies que le coach peut choisir
export const AVAILABLE_COLORS = [
  '#FF6B6B', // Rouge corail
  '#4ECDC4', // Turquoise  
  '#45B7D1', // Bleu ciel
  '#96CEB4', // Vert menthe
  '#FFEAA7', // Jaune doux
  '#DDA0DD', // Violet clair
  '#95A5A6', // Gris
  '#FF8A80', // Rouge clair
  '#81C784', // Vert clair
  '#64B5F6', // Bleu clair
  '#FFB74D', // Orange clair
  '#F06292'  // Rose
];