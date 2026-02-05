import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getFirestore, provideFirestore } from '@angular/fire/firestore'; // <-- ajouté

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp({
      projectId: "plante2-7da7b",
      appId: "1:406136115874:web:cafda30600d91c496ebdfb",
      databaseURL: "https://plante2-7da7b-default-rtdb.europe-west1.firebasedatabase.app",
      storageBucket: "plante2-7da7b.firebasestorage.app",
      apiKey: "AIzaSyBh1T8pwQeIui1-oZb2Kjfgf9O24TNqdaw",
      authDomain: "plante2-7da7b.firebaseapp.com",
      messagingSenderId: "406136115874"
    })),
    provideAuth(() => getAuth()),
    provideDatabase(() => getDatabase()),
    provideFirestore(() => getFirestore()) // <-- Firestore ajouté
  ]
};
