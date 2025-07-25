import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Test Screen</Text>
        <Text style={styles.subtitle}>Cette page est disponible pour vos tests</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5D5A88',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
//   const [coachId, setCoachId] = useState('');
//   const [date, setDate] = useState(new Date());
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [startTime, setStartTime] = useState('14:00');
//   const [endTime, setEndTime] = useState('15:00');
//   const [location, setLocation] = useState('');
//   const [notes, setNotes] = useState('');
//   const [status, setStatus] = useState<AppointmentStatus>('pending');

//   const onDateChange = (event: any, selectedDate?: Date) => {
//     setShowDatePicker(false);
//     if (selectedDate) {
//       setDate(selectedDate);
//     }
//   };

//   const handleCreateAppointment = async () => {
//     try {
//       const user = auth.currentUser;
//       if (!user) {
//         Alert.alert('Erreur', 'Vous devez être connecté pour prendre un rendez-vous');
//         return;
//       }

//       if (!coachId || !location) {
//         Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
//         return;
//       }

//       const appointmentData = {
//         userId: user.uid,
//         coachId,
//         date,
//         startTime,
//         endTime,
//         location,
//         status,
//         notes
//       };

//       const appointmentId = await createAppointment(appointmentData);
      
//       Alert.alert(
//         'Succès', 
//         `Rendez-vous créé avec l'ID: ${appointmentId}`,
//         [{ text: 'OK', onPress: () => {
//           setCoachId('');
//           setDate(new Date());
//           setLocation('');
//           setNotes('');
//         }}]
//       );
//     } catch (error) {
//       console.error('Erreur:', error);
//       Alert.alert('Erreur', 'Impossible de créer le rendez-vous');
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView>
//         <Text style={styles.title}>Test de prise de rendez-vous</Text>
        
//         <View style={styles.formGroup}>
//           <Text style={styles.label}>ID du Coach</Text>
//           <TextInput
//             style={styles.input}
//             value={coachId}
//             onChangeText={setCoachId}
//             placeholder="Entrez l'ID du coach"
//           />
//         </View>
        
//         <View style={styles.formGroup}>
//           <Text style={styles.label}>Date</Text>
//           <TouchableOpacity 
//             style={styles.datePicker} 
//             onPress={() => setShowDatePicker(true)}
//           >
//             <Text>
//               {date.toLocaleDateString('fr-FR', {
//                 weekday: 'long',
//                 year: 'numeric',
//                 month: 'long',
//                 day: 'numeric'
//               })}
//             </Text>
//           </TouchableOpacity>
          
//           {showDatePicker && (
//             <DateTimePicker
//               value={date}
//               mode="date"
//               display="default"
//               onChange={onDateChange}
//               minimumDate={new Date()}
//             />
//           )}
//         </View>
        
//         <View style={styles.formRow}>
//           <View style={[styles.formGroup, {flex: 1, marginRight: 8}]}>
//             <Text style={styles.label}>Heure de début</Text>
//             <TextInput
//               style={styles.input}
//               value={startTime}
//               onChangeText={setStartTime}
//               placeholder="HH:MM"
//             />
//           </View>
          
//           <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
//             <Text style={styles.label}>Heure de fin</Text>
//             <TextInput
//               style={styles.input}
//               value={endTime}
//               onChangeText={setEndTime}
//               placeholder="HH:MM"
//             />
//           </View>
//         </View>
        
//         <View style={styles.formGroup}>
//           <Text style={styles.label}>Lieu</Text>
//           <TextInput
//             style={styles.input}
//             value={location}
//             onChangeText={setLocation}
//             placeholder="Entrez le lieu du rendez-vous"
//           />
//         </View>
        
//         <View style={styles.formGroup}>
//           <Text style={styles.label}>Notes (optionnel)</Text>
//           <TextInput
//             style={[styles.input, styles.textArea]}
//             value={notes}
//             onChangeText={setNotes}
//             placeholder="Ajoutez des notes supplémentaires"
//             multiline
//             numberOfLines={4}
//           />
//         </View>
        
//         <TouchableOpacity 
//           style={styles.button}
//           onPress={handleCreateAppointment}
//         >
//           <Text style={styles.buttonText}>Créer Rendez-vous</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 16,
//     backgroundColor: '#F8F8FC',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 24,
//     color: '#5D5A88',
//     textAlign: 'center',
//   },
//   formGroup: {
//     marginBottom: 16,
//   },
//   formRow: {
//     flexDirection: 'row',
//     marginBottom: 16,
//   },
//   label: {
//     fontSize: 16,
//     marginBottom: 8,
//     color: '#5D5A88',
//   },
//   input: {
//     backgroundColor: 'white',
//     borderWidth: 1,
//     borderColor: '#E1E1E8',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//   },
//   textArea: {
//     height: 100,
//     textAlignVertical: 'top',
//   },
//   datePicker: {
//     backgroundColor: 'white',
//     borderWidth: 1,
//     borderColor: '#E1E1E8',
//     borderRadius: 8,
//     padding: 12,
//   },
//   button: {
//     backgroundColor: '#7667ac',
//     borderRadius: 8,
//     padding: 16,
//     alignItems: 'center',
//     marginTop: 24,
//     marginBottom: 40,
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });