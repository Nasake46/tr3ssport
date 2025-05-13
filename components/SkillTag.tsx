import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

type SkillTagProps = {
  label: string;
  color?: string;
};

export function SkillTag({ label, color = '#7667ac' }: SkillTagProps) {
  return (
    <View style={[styles.container, { backgroundColor: color + '15' }]}>
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});