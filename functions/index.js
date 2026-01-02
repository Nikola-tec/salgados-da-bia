const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notificarNovoPedido = functions.firestore
    .document("artifacts/{appId}/public/data/orders/{pedidoId}")
    .onCreate(async (snap, context) => {
      const pedido = snap.data();

      if (!pedido) {
        return null;
      }

      console.log("Novo pedido recebido:", context.params.pedidoId);

      const nome = pedido.userName || pedido.nomeCliente || "Cliente";
      const valor = pedido.total ? pedido.total.toFixed(2) : "0.00";

      const message = {
        notification: {
          title: "Novo Pedido Recebido! 🍔",
          body: `Cliente: ${nome} - Total: ${valor}€`,
        },
        data: {
          click_action: "https://salgadosdabia.com",
          icon: "/logo192.png",
        },
        tokens: [],
      };

      const tokensSnapshot = await admin.firestore()
          .collection("admin_tokens")
          .get();

      if (tokensSnapshot.empty) {
        console.log("Nenhum token de admin encontrado para notificar.");
        return null;
      }

      const tokens = tokensSnapshot.docs.map((doc) => doc.id);
      message.tokens = tokens;

      const response = await admin.messaging().sendMulticast(message);

      console.log("Notificações enviadas:", response.successCount);
      console.log("Falhas:", response.failureCount);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        console.log("Tokens que falharam:", failedTokens);
      }

      return null;
    });