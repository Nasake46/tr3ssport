import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

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
          bottom: 50,
          left: 20,
          right: 20,
          height: 70,
          backgroundColor: '#fff',
          borderRadius: 30,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 10,
          borderTopWidth: 0,
          overflow: 'hidden',
          justifyContent: 'center',
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
          tabBarIcon: ({ color }) => (
            <IconSymbol name="house.fill" size={28} color={color} />
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
