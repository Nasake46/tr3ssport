import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

const fakeContacts = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
];

export default function MessagingScreen() {
  const openChat = (id: string) => {
    router.push({
      pathname: '/messaging/[id]',
      params: { id },
    });
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Messages</Text>
      <FlatList
        data={fakeContacts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openChat(item.id)}
            style={{ padding: 15, borderBottomWidth: 1, borderColor: '#ccc' }}
          >
            <Text style={{ fontSize: 18 }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
