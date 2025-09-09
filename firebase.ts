import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore, serverTimestamp } from 'firebase/firestore';


const firebaseConfig = {
apiKey: 'AIzaSyBEbmdN9B5vkKybY7apTbtwFWB3C19iDic',
authDomain: 'app-mobile-tr3ssport.firebaseapp.com',
projectId: 'app-mobile-tr3ssport',
storageBucket: 'app-mobile-tr3ssport.appspot.com', // important
messagingSenderId: '258941159045',
appId: '1:258941159045:web:7218cbbaf7b4b915c64bec',
measurementId: 'G-8J9V948BBC',
};


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();


export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app); // utilise le bucket du config


export { serverTimestamp };