import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const CarousselHealthArticle = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/healthTest.jpg')}
        style={styles.image}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Article santé</Text>
        <Text style={styles.subtitle}>Lorem ipsum dolor sit amet</Text>
        <View style={styles.author}>
          <Image
            source={require('../assets/images/healthTest.jpg')}
            style={styles.avatar}
          />
          <Text style={styles.authorName}>Dr. Health</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 24,
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#04403A',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  authorName: {
    fontSize: 13,
    color: '#333',
  },
});

export default CarousselHealthArticle;
