import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';

type ProfileHeaderProps = {
  name: string;
  specialty: string;
  imageUrl?: string;
  onEditPress?: () => void;
};

export function ProfileHeader({ name, specialty, imageUrl, onEditPress }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <ThemedText style={styles.placeholderText}>
              {name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <ThemedText type="title" style={styles.name}>{name}</ThemedText>
        <ThemedText style={styles.specialty}>{specialty}</ThemedText>
      </View>
      
      {onEditPress && (
        <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
          <Ionicons name="pencil" size={20} color="#7667ac" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  imageContainer: {
    marginRight: 16,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    color: '#7667ac',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    marginBottom: 4,
    color: '#7667ac',
  },
  specialty: {
    fontSize: 16,
    color: '#666',
  },
  editButton: {
    padding: 8,
  },
});