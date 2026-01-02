importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 1. Cole aqui as configurações do seu projeto (pegue no Console do Firebase > Configurações do Projeto)
const firebaseConfig = {
  apiKey: "AIzaSyBipqWOIlEimNaba7WEYrlhw2VHf4EcgzQ",
  authDomain: "salgados-da-bia-31dc0.firebaseapp.com",
  projectId: "salgados-da-bia-31dc0",
  storageBucket: "salgados-da-bia-31dc0.firebasestorage.app",
  messagingSenderId: "2844533583",
  appId: "1:2844533583:web:0c569024e23ecfbd579b3a"
  measurementId: "G-V9X4CFKKGM"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Configura o comportamento quando recebe notificação em background
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Notificação recebida em background ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Caminho para seu logo
    badge: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});