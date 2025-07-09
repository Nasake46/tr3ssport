import { Tabs } from 'expo-router';
import React from 'react';
import { Image, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          left: 20,
          right: 20,
          backgroundColor: '#fff',
          borderRadius: 30,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.50,
          shadowRadius: 10,
          elevation: 10,
          overflow: 'hidden',
          alignItems: 'center',
          flexDirection: 'row',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Launch',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="paperplane.fill" size={28} color={color} />
          ),
        }}
      />
<Tabs.Screen
  name="HomeScreen"
  options={{
    title: 'Home',
    tabBarIcon: ({ focused }) => (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {focused && (
          <View
            style={{
              position: 'absolute',
              top: -20,
              width: 60,
              height: 60,
              backgroundColor: '#fff',
              borderRadius: 30,
              zIndex: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 6,
            }}
          />
        )}
        <Image
          source={require('@/assets/images/logoT.png')}
          style={{
            width: 32,
            height: 32,
            resizeMode: 'contain',
            zIndex: 1,
            marginTop: focused ? -5 : 0,
          }}
        />
      </View>
    ),
  }}
/>

      <Tabs.Screen
        name="ProfileScreen"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="person.fill" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
