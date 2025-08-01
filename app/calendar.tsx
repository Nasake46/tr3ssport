import { View } from 'react-native';
import ClientCalendar from '@/components/appointments/ClientCalendar';

export default function CalendarScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ClientCalendar />
    </View>
  );
}
