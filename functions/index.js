const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

// --- FUNÇÃO 1: Notifica Admin sobre Novos Pedidos ---
exports.notificarNovoPedido = functions.firestore
    .document("artifacts/{appId}/public/data/orders/{pedidoId}")
    .onCreate(async (snap, context) => {
      const pedido = snap.data();
      if (!pedido) return null;

      const nome = pedido.userName || pedido.nomeCliente || "Cliente";
      const valor = pedido.total ? pedido.total.toFixed(2) : "0.00";

      const message = {
        notification: {
          title: "Novo Pedido! 🍔",
          body: `${nome} fez um pedido de R$ ${valor}.`,
        },
        webpush: {
          headers: {Urgency: "high"},
          notification: {
            title: "Novo Pedido! 🍔",
            body: `${nome} fez um pedido de R$ ${valor}.`,
            icon: "/logo192.png",
            badge: "/favicon.ico",
            click_action: "https://salgadosdabia.com/admin",
            requireInteraction: true,
          },
          fcmOptions: {link: "https://salgadosdabia.com/admin"},
        },
        tokens: [],
      };

      const tokensSnapshot = await admin.firestore()
          .collection("admin_tokens").get();

      if (tokensSnapshot.empty) return null;

      const tokens = tokensSnapshot.docs.map((doc) => doc.id);
      message.tokens = tokens;

      await admin.messaging().sendMulticast(message);
      return null;
    });

// --- FUNÇÃO 2: CRM - Envia campanhas ---
exports.enviarCampanhaMarketing = functions.firestore
    .document("artifacts/{appId}/public/data/marketing_campaigns/{campaignId}")
    .onCreate(async (snap, context) => {
      const campanha = snap.data();
      const appId = context.params.appId;

      // TRAVA DE SEGURANÇA: Só envia se o status for 'Pendente'
      if (!campanha || campanha.status !== "Pendente") {
        return null;
      }

      if (!campanha.targetUids || campanha.targetUids.length === 0) {
        await snap.ref.update({status: "Cancelado: Sem alvos"});
        return null;
      }

      const tokensParaEnviar = [];
      const usersRef = admin.firestore()
          .collection(`artifacts/${appId}/public/data/users`);

      if (campanha.targetUids === "all") {
        const snapshot = await usersRef.get();
        snapshot.forEach((doc) => {
          const d = doc.data();
          if (d.notificationToken) tokensParaEnviar.push(d.notificationToken);
        });
      } else {
        // Para listas grandes, idealmente usaríamos batch ou chunks
        for (const uid of campanha.targetUids) {
          const userDoc = await usersRef.doc(uid).get();
          if (userDoc.exists) {
            const d = userDoc.data();
            if (d.notificationToken) tokensParaEnviar.push(d.notificationToken);
          }
        }
      }

      if (tokensParaEnviar.length === 0) {
        await snap.ref.update({status: "Falha: Sem tokens válidos"});
        return null;
      }

      const message = {
        notification: {
          title: campanha.title,
          body: campanha.body,
        },
        webpush: {
          headers: {Urgency: "high"},
          notification: {
            title: campanha.title,
            body: campanha.body,
            icon: "/logo192.png",
            badge: "/favicon.ico",
            click_action: "https://salgadosdabia.com",
          },
          fcmOptions: {link: "https://salgadosdabia.com"},
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

      return null;
    });
