import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { getAuth }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { getFirestore }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";



const firebaseConfig = {
  apiKey: "AIzaSyDNl-pNk7v0z9uoC4OSJAkeaj2y2gSn-Tg",
  authDomain: "obdense-62a34.firebaseapp.com",
  projectId: "obdense-62a34",
  storageBucket: "obdense-62a34.firebasestorage.app",
  messagingSenderId: "1013275310490",
  appId: "1:1013275310490:web:0fa800325ad159bfc2e223",
};

const app = initializeApp(firebaseConfig);

// 👇 AGORA SIM EXPORTANDO
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
