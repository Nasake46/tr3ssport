// hooks/useAppNavigation.ts
import { useNavigation as useGenericNavigation } from '@react-navigation/native';
import { AppNavigationProp } from './navigation'; // Adjust path as needed

export const useAppNavigation = () => {
  return useGenericNavigation<AppNavigationProp>();
};