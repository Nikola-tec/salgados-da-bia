import React, { useEffect, useState } from 'react';
import { getApp } from "firebase/app"; // Importante: Pega o app já existente
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// --- CONFIGURAÇÃO ---
// Pegue esta chave em: Console do Firebase > Cloud Messaging > Web Push Certificates
const VAPID_KEY = "BGZAxnG_iSTgeX0y7s6rEmtFzE41Ns43DXN3gCgN6RJX51xKyDfRdOczX1T7cyQ5U3v6ZNCsJCyp3lESPuQQNKY";
// -------------------

const NotificationSetup = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [messaging, setMessaging] = useState(null);
  const [db, setDb] = useState(null);

  // Efeito para conectar ao Firebase que já foi iniciado no App.js
  useEffect(() => {
    try {
      // Aqui está o segredo: pegamos a instância que o App.js já criou
      const app = getApp(); 
      setMessaging(getMessaging(app));
      setDb(getFirestore(app));
    } catch (error) {
      console.error("Aguardando inicialização do Firebase...", error);
    }
  }, []);

  const requestPermission = async () => {
    if (!messaging || !db) return; // Só roda se o firebase estiver pronto

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === "granted") {
        console.log("Permissão concedida! Gerando token...");

        const currentToken = await getToken(messaging, {
          vapidKey: VAPID_KEY
        });

        if (currentToken) {
          console.log("Token gerado:", currentToken);
          
          // Salva o token na coleção 'admin_tokens'
          await setDoc(doc(db, "admin_tokens", currentToken), {
            token: currentToken,
            device: navigator.userAgent,
            createdAt: new Date()
          });

          alert("Notificações ativadas com sucesso! Você receberá alertas de novos pedidos.");
        } else {
          console.log("Não foi possível obter o token.");
        }
      }
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);
    }
  };

  // Ouve mensagens quando o site está aberto
  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Mensagem recebida:', payload);
        alert(`🔔 NOVO PEDIDO: ${payload.notification.body}`);
      });
      return () => unsubscribe();
    }
  }, [messaging]);

  // Se já tiver permissão, esconde o botão
  if (permission === "granted") return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-6 shadow-2xl rounded-xl border-2 border-orange-500 z-50 max-w-sm">
      <h3 className="font-bold text-lg text-orange-600 mb-2">Administração</h3>
      <p className="mb-4 text-gray-700 text-sm">
        Ative as notificações para saber quando chegar um pedido novo.
      </p>
      <button 
        onClick={requestPermission}
        disabled={!messaging}
        className="w-full bg-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors shadow-md disabled:opacity-50"
      >
        {messaging ? '🔔 Ativar Avisos' : 'Carregando...'}
      </button>
    </div>
  );
};

export default NotificationSetup;