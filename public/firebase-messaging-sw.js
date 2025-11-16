// public/firebase-messaging-sw.js

// Importar scripts do Firebase (versão 8, compatível com service workers)
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

// !! ATENÇÃO !!
// Cole sua configuração do Firebase (a mesma do App.js)
// Não use "process.env" aqui, deve ser o valor real.
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

// Manipulador de mensagens em background
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Recebida mensagem em background: ",
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon,
  };

  // Exibe a notificação
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});