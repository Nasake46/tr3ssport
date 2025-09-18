// types/navigation.ts
import { StackNavigationProp } from '@react-navigation/stack';

// Define the route names and their expected parameters
// Use 'undefined' for screens that don't take parameters
export type RootStackParamList = {
  Home: undefined;
  CoachScreen: { userId: string };
};

// Create a type for the navigation object to be used with the useNavigation hook
export type AppNavigationProp = StackNavigationProp<RootStackParamList>;