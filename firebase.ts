import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBEbmdN9B5vkKybY7apTbtwFWB3C19iDic",
  authDomain: "app-mobile-tr3ssport.firebaseapp.com",
  projectId: "app-mobile-tr3ssport",
  storageBucket: "app-mobile-tr3ssport.firebasestorage.app",
  messagingSenderId: "258941159045",
  appId: "1:258941159045:web:7218cbbaf7b4b915c64bec",
  measurementId: "G-8J9V948BBC"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };