import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

interface FloatingActionButtonProps {
  onPress?: () => void;
}

export default function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      console.log('🎯 FAB - Navigation vers création de RDV');
      router.push('/appointments/create');
    }
  };

  return (
    <TouchableOpacity style={styles.fab} onPress={handlePress}>
      <View style={styles.fabContent}>
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>RDV</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000,
  },
  fabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  fabText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
