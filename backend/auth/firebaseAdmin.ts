import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(), // ou utilise un fichier serviceAccount.json
});

export default admin;
