import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '@/firebase';
import QRCodeScannerOptimized from '@/components/qr/QRCodeScannerOptimized';

export default function SessionAttendanceIndex() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aucune session en cours</Text>
      <Text style={styles.subtitle}>Scannez un QR code pour ouvrir une séance</Text>

      <TouchableOpacity style={styles.scanButton} onPress={() => setShowScanner(true)}>
        <Text style={styles.scanButtonText}>Scanner un QR code</Text>
      </TouchableOpacity>

      <Modal
        visible={showScanner}
        animationType="none"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <QRCodeScannerOptimized
            coachId={auth.currentUser?.uid || ''}
            mode="scanOnly"
            autoOpenCamera
            onClose={() => setShowScanner(false)}
            onParticipantScanned={(res: any) => {
              if (res?.appointmentId) {
                setShowScanner(false);
                router.replace({ pathname: '/sessionAttendance/[appointmentId]', params: { appointmentId: res.appointmentId } } as any);
              }
            }}
            onSessionStarted={(appointmentId: string) => {
              setShowScanner(false);
              router.replace({ pathname: '/sessionAttendance/[appointmentId]', params: { appointmentId } } as any);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F5F8',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  scanButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
