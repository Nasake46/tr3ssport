
import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const DATA = [
  {
    id: '1',
    name: 'Johanna',
    rating: 5,
    comment: 'Lorem ipsum dolor sit amet consectetur adipiscing eli mattis',
  },
  {
    id: '2',
    name: 'Grégoire',
    rating: 4,
    comment: 'Très satisfait, je recommande fortement ce coach.',
  },
  {
    id: '3',
    name: 'Sophie',
    rating: 5,
    comment: 'Coaching très professionnel, à l’écoute, et motivant.',
  },
];

const ITEM_WIDTH = Dimensions.get('window').width * 0.7;

const CarouselRecommandations = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Recommandations</Text>
      <FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.avatar} />
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.stars}>
                {Array.from({ length: item.rating }).map((_, i) => (
                  <FontAwesome key={i} name="star" size={12} color="#5D5A88" />
                ))}
              </View>
            </View>
            <Text style={styles.comment}>{item.comment}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
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
    backgroundColor: '#E6E6E6',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#04403A',
    marginRight: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D5A88',
    flex: 1,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  comment: {
    fontSize: 14,
    color: '#04403A',
    lineHeight: 18,
  },
});

export default CarouselRecommandations;
