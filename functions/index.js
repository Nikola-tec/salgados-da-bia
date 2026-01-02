const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

// --- FUNÇÃO 1: Notifica Admin sobre Novos Pedidos ---
exports.notificarNovoPedido = functions.firestore
    .document("artifacts/{appId}/public/data/orders/{pedidoId}")
    .onCreate(async (snap, context) => {
      const pedido = snap.data();
      if (!pedido) return null;

      console.log("Novo pedido recebido:", context.params.pedidoId);

      const nome = pedido.userName || pedido.nomeCliente || "Cliente";
      const valor = pedido.total ? pedido.total.toFixed(2) : "0.00";

      const message = {
        notification: {
          title: "Novo Pedido! 🍔",
          body: `${nome} fez um pedido de R$ ${valor}.`,
        },
        webpush: {
          notification: {
            title: "Novo Pedido! 🍔",
            body: `${nome} fez um pedido de R$ ${valor}.`,
            icon: "/logo192.png",
            click_action: "https://salgadosdabia.com/admin",
          },
          fcmOptions: {
            link: "https://salgadosdabia.com/admin",
          },
        },
        tokens: [],
      };

      const tokensSnapshot = await admin.firestore()
          .collection("admin_tokens")
          .get();

      if (tokensSnapshot.empty) return null;

      const tokens = tokensSnapshot.docs.map((doc) => doc.id);
      message.tokens = tokens;

      const response = await admin.messaging().sendMulticast(message);
      console.log("Notificações enviadas:", response.successCount);
      return null;
    });

// --- FUNÇÃO 2: CRM - Envia campanhas para Clientes ---
exports.enviarCampanhaMarketing = functions.firestore
    .document("artifacts/{appId}/public/data/marketing_campaigns/{campaignId}")
    .onCreate(async (snap, context) => {
      const campanha = snap.data();
      const appId = context.params.appId;

      if (!campanha || !campanha.targetUids ||
          campanha.targetUids.length === 0) {
        return null;
      }

      console.log(`Iniciando campanha: ${campanha.title}`);

      const tokensParaEnviar = [];
      const usersRef = admin.firestore()
          .collection(`artifacts/${appId}/public/data/users`);

      if (campanha.targetUids === "all") {
        const snapshot = await usersRef.get();
        snapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.notificationToken) {
            tokensParaEnviar.push(userData.notificationToken);
          }
        });
      } else {
        for (const uid of campanha.targetUids) {
          const userDoc = await usersRef.doc(uid).get();
          if (userDoc.exists && userDoc.data().notificationToken) {
            tokensParaEnviar.push(userDoc.data().notificationToken);
          }
        }
      }

      if (tokensParaEnviar.length === 0) {
        await snap.ref.update({
          status: "Sem tokens",
          finishedAt: new Date(),
        });
        return null;
      }

      const message = {
        notification: {
          title: campanha.title,
          body: campanha.body,
        },
        webpush: {
          notification: {
            title: campanha.title,
            body: campanha.body,
            icon: "/logo192.png",
            badge: "/favicon.ico",
            click_action: "https://salgadosdabia.com",
          },
          fcmOptions: {
            link: "https://salgadosdabia.com",
          },
        },
        tokens: tokensParaEnviar,
      };

      const response = await admin.messaging().sendMulticast(message);

      await snap.ref.update({
        status: "Enviado",
        sentCount: response.successCount,
        failureCount: response.failureCount,
        finishedAt: new Date(),
      });

      console.log(`Campanha enviada. Sucesso: ${response.successCount}`);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            // FIX: Usar tokensParaEnviar em vez de tokens
            failedTokens.push(tokensParaEnviar[idx]);
          }
        });
        console.log("Tokens que falharam:", failedTokens);
      }

      return null;
    });
