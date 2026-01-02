import React, { useEffect, useState } from 'react';
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// --- ÁREA DE CONFIGURAÇÃO (PREENCHER COM SEUS DADOS) ---

// 1. Pegue estes dados no Console do Firebase > Configurações do Projeto
const firebaseConfig = {
  apiKey: "AIzaSyBipqWOIlEimNaba7WEYrlhw2VHf4EcgzQ",
  authDomain: "salgados-da-bia-31dc0.firebaseapp.com",
  projectId: "salgados-da-bia-31dc0",
  storageBucket: "salgados-da-bia-31dc0.firebasestorage.app",
  messagingSenderId: "2844533583",
  appId: "1:2844533583:web:0c569024e23ecfbd579b3a"
  measurementId: "G-V9X4CFKKGM"
};

// 2. Pegue esta chave em: Console do Firebase > Cloud Messaging > Web Push Certificates (Gerar par de chaves)
const VAPID_KEY = "BGZAxnG_iSTgeX0y7s6rEmtFzE41Ns43DXN3gCgN6RJX51xKyDfRdOczX1T7cyQ5U3v6ZNCsJCyp3lESPuQQNKY";

// --- FIM DA ÁREA DE CONFIGURAÇÃO ---

// Inicializando o Firebase apenas para este componente
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const db = getFirestore(app);

const NotificationSetup = () => {
  const [permission, setPermission] = useState(Notification.permission);

  // Função chamada quando você clica no botão "Ativar Notificações"
  const requestPermission = async () => {
    try {
      // 1. O navegador pergunta: "Posso te enviar notificações?"
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === "granted") {
        console.log("Permissão concedida! Gerando identidade (token)...");

        // 2. Se você disse "Sim", o Firebase cria um "RG" (token) para este computador/celular
        const currentToken = await getToken(messaging, {
          vapidKey: VAPID_KEY
        });

        if (currentToken) {
          console.log("Token gerado:", currentToken);
          
          // 3. Salvamos esse "RG" no banco de dados para o backend saber para quem enviar
          // Salvamos na coleção "admin_tokens"
          await setDoc(doc(db, "admin_tokens", currentToken), {
            token: currentToken,
            device: navigator.userAgent, // Informação extra sobre qual navegador é
            createdAt: new Date()
          });

          alert("Tudo pronto! Você será avisado quando novos pedidos chegarem.");
        } else {
          console.log("Não foi possível gerar o token. Verifique a VAPID KEY.");
        }
      } else {
        alert("Você precisa clicar em 'Permitir' para receber os avisos.");
      }
    } catch (error) {
      console.error("Erro ao configurar notificações:", error);
      alert("Erro ao ativar. Verifique o console (F12) para detalhes.");
    }
  };

  // Este efeito roda quando o site está aberto na sua tela
  useEffect(() => {
    // Se chegar uma mensagem enquanto você está olhando para o site:
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Mensagem recebida com o site aberto:', payload);
      alert(`🔔 NOVO PEDIDO: ${payload.notification.body}`);
    });

    return () => unsubscribe();
  }, []);

  // Se já tiver permissão, não mostra o botão na tela (fica invisível)
  if (permission === "granted") return null;

  // O desenho do botão que vai aparecer na tela
  return (
    <div className="fixed bottom-4 right-4 bg-white p-6 shadow-2xl rounded-xl border-2 border-orange-500 z-50 max-w-sm">
      <h3 className="font-bold text-lg text-orange-600 mb-2">Administração</h3>
      <p className="mb-4 text-gray-700">
        Para saber quando um cliente fizer um pedido, precisamos ativar as notificações neste dispositivo.
      </p>
      <button 
        onClick={requestPermission}
        className="w-full bg-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors shadow-md"
      >
        🔔 Ativar Avisos de Pedidos
      </button>
    </div>
  );
};

export default NotificationSetup;