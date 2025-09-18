import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

interface ClientItem {
  id: string;
  name?: string;
  email?: string;
  attendanceStatus?: string;
  attendanceOrder?: number;
}

interface AttendanceSnapshot {
  present: number;
  total: number;
  absent: number;
  clients: ClientItem[];
}

export default function CoachActiveSessionRedirect() {
  useEffect(() => {
    // Redirection immédiate vers la nouvelle route
    router.replace('/sessionAttendance' as any);
  }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
