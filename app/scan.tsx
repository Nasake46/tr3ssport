import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { auth } from '@/firebase';
import QRCodeScannerOptimized from '@/components/qr/QRCodeScannerOptimized';

export default function ScanOnlyScreen() {
	const userId = auth.currentUser?.uid || '';

	const goToSession = (appointmentId?: string) => {
		if (!appointmentId) return;
		router.replace({ pathname: '/sessionAttendance/[appointmentId]', params: { appointmentId } });
	};

	return (
		<View style={{ flex: 1 }}>
			<QRCodeScannerOptimized
				coachId={userId}
			mode="scanOnly"
			autoOpenCamera
				onParticipantScanned={(res: any) => {
					if (res?.appointmentId) goToSession(res.appointmentId);
				}}
				onSessionStarted={(appointmentId: string) => goToSession(appointmentId)}
			/>
		</View>
	);
}

