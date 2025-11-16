// Importações principais
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");

// Inicializa o Admin SDK (apenas uma vez)
initializeApp();

/**
 * FUNÇÃO 1: Envia notificação para o ADMIN quando um NOVO pedido é criado.
 * (Atualizado para a sintaxe v2 do Firebase Functions)
 */
exports.sendNotificationOnNewOrder = onDocumentCreated(
    "artifacts/{appId}/public/data/orders/{orderId}",
    async (event) => {
      // Na v2, os parâmetros de rota estão em event.params
      const {appId} = event.params;
      // Na v2, os dados do documento estão em event.data.data()
      const newOrder = event.data.data();

      if (!newOrder) {
        console.log("Nenhum dado encontrado no novo pedido.");
        return;
      }

      console.log(`Novo pedido recebido no app ${appId}:`, newOrder.name);

      // 1. Buscar os tokens de notificação dos admins
      const tokensSnapshot = await getFirestore()
          .collection(`artifacts/${appId}/public/data/adminTokens`)
          .get();

      const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

      if (tokens.length === 0) {
        console.log("Nenhum token de admin encontrado.");
        return;
      }

      // 2. Montar a notificação
      const payload = {
        notification: {
          title: "🎉 Novo Pedido Recebido!",
          body:
          `Pedido de ${newOrder.name} no valor de ${newOrder.total.toFixed(
              2,
          )}€.`,
          icon: "https://placehold.co/100x100/FBBF24/FFFFFF?text=SB",
          // !! Lembre-se de mudar este link para o seu site/app
          click_action: "https://salgadosdabia.com/",
        },
      };

      // 3. Enviar a notificação
      try {
        await getMessaging().sendToDevice(tokens, payload);
      } catch (error) {
        console.error("Erro ao enviar notificação de admin:", error);
      }
    },
);

/**
 * FUNÇÃO 2: Envia notificação para o CLIENTE
 * quando o STATUS de um pedido é atualizado.
 * (Atualizado para a sintaxe v2 do Firebase Functions)
 */
exports.sendNotificationOnOrderStatusUpdate = onDocumentUpdated(
    "artifacts/{appId}/public/data/orders/{orderId}",
    async (event) => {
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();

      // 1. Só continuar se o status mudou
      if (beforeData.status === afterData.status) {
        return;
      }

      const newStatus = afterData.status;
      const userId = afterData.userId;
      // Na v2, os parâmetros de rota estão em event.params
      const {appId} = event.params;

      // 2. Definir mensagem com base no novo status
      let notificationPayload;
      switch (newStatus) {
        case "Em Preparo":
          notificationPayload = {
            title: "Seu pedido está sendo preparado! 👨‍🍳",
            body: "Sua encomenda entrou na nossa cozinha.",
          };
          break;
        case "Pronto para Entrega":
          notificationPayload = {
            title: "Pronto para Retirada/Entrega! 📦",
            body: "Seu pedido está pronto! Nosso motoboy está á cominho.",
          };
          break;
        case "Saiu para Entrega":
          notificationPayload = {
            title: "Seu pedido saiu para entrega! 🚲",
            body: "O entregador está a caminho. Fique atento!",
          };
          break;
        case "Concluído":
          notificationPayload = {
            title: "Seu pedido foi entregue! 🎉",
            body: "Obrigado por escolher a Salgados da Bia! Bom apetite!",
          };
          break;
        case "Rejeitado":
          notificationPayload = {
            title: "Problema com seu pedido 😕",
            body: "Houve um problema ao processar seu pedido.",
          };
          break;
        default:
          return; // Nenhum outro status envia notificação
      }

      // 3. Buscar os tokens do cliente específico
      const userDocRef = getFirestore()
          .doc(`artifacts/${appId}/public/data/users/${userId}`);

      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        return;
      }

      const tokens = userDoc.data().notificationTokens; // Espera um array
      if (!tokens || tokens.length === 0) {
        console.log(`Cliente ${userId} não possui tokens.`);
        return;
      }

      // 4. Enviar a notificação para o cliente
      const payload = {
        notification: {
          ...notificationPayload,
          icon: "https://placehold.co/100x100/FBBF24/FFFFFF?text=SB",
          // !! Lembre-se de mudar este link para o seu site/app
          click_action: "https://salgadosdabia.com/",
        },
      };

      try {
        const response = await getMessaging().sendToDevice(tokens, payload);
        // Limpeza de tokens inválidos (boa prática)
        response.results.forEach((result, index) => {
          const error = result.error;
          if (
            error &&
            [
              "invalid-registration-token",
              "registration-token-not-registered",
            ].includes(error.code)
          ) {
            userDocRef.update({
              notificationTokens: FieldValue.arrayRemove(tokens[index]),
            });
          }
        });
      } catch (error) {
        console.error("Erro ao enviar notificação para cliente:", error);
      }
    },
);
