import React from 'react';
import { View, Text, Image, FlatList, StyleSheet, Dimensions } from 'react-native';

const DATA = [
  {
    id: '1',
    name: 'Coach Clara',
    role: 'Fitness & Bien-être',
    image: require('../assets/images/coachtest.jpg'),
  },
  {
    id: '2',
    name: 'Coach Max',
    role: 'Nutrition & Sport',
    image: require('../assets/images/coachtest.jpg'),
  },
  {
    id: '3',
    name: 'Coach Léo',
    role: 'Santé & Forme',
    image: require('../assets/images/coachtest.jpg'),
  },
];

const ITEM_WIDTH = Dimensions.get('window').width * 0.7;

const CarouselCoachs = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Rencontrez nos coachs</Text>
      <FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={item.image} style={styles.image} />
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.role}>{item.role}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    marginBottom: 40,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#04403A',
    marginLeft: 20,
    marginBottom: 12,
  },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: '#F2F2F2',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#04403A',
  },
  role: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default CarouselCoachs;
