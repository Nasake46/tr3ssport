import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Stub web pour remplacer react-native-maps sur le web et éviter l'import de modules natifs.
// Usage minimal: même API de base: <MapView>{children}</MapView>

interface MapViewProps {
  children?: React.ReactNode;
  style?: any;
  region?: any;
  initialRegion?: any;
  onPress?: (...args: any[]) => void;
}

const MapView: React.FC<MapViewProps> = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Map (stub web)</Text>
      <View style={styles.inner}>{children}</View>
    </View>
  );
};

export const Marker: React.FC<any> = ({ coordinate, children }) => (
  <View style={styles.marker}>
    <Text style={styles.markerText}>📍</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { backgroundColor: '#eef2f7', borderWidth: 1, borderColor: '#c3d0dd', borderRadius: 8, overflow: 'hidden', minHeight: 120, justifyContent: 'center', alignItems: 'center' },
  label: { position: 'absolute', top: 4, left: 6, fontSize: 10, color: '#517189' },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  marker: { padding: 4 },
  markerText: { fontSize: 18 },
});

export default MapView;
