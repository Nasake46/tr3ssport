// Import the functions you need from the SDKs you need
// firebase.ts
import '@react-native-firebase/app';  // Assurez-vous que Firebase est initialisé
import auth from '@react-native-firebase/auth';  // Authentification Firebase pour React Native



// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBEbmdN9B5vkKybY7apTbtwFWB3C19iDic",
  authDomain: "app-mobile-tr3ssport.firebaseapp.com",
  projectId: "app-mobile-tr3ssport",
  storageBucket: "app-mobile-tr3ssport.firebasestorage.app",
  messagingSenderId: "258941159045",
  appId: "1:258941159045:web:7218cbbaf7b4b915c64bec",
  measurementId: "G-8J9V948BBC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Firebase est automatiquement initialisé lorsqu'on importe @react-native-firebase/app
export const firebaseAuth = auth();