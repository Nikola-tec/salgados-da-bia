const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

// --- FUNÇÃO 1: Notifica Admin quando chega pedido novo (JÁ EXISTE) ---
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

      if (tokensSnapshot.empty) return null;

      const tokens = tokensSnapshot.docs.map((doc) => doc.id);
      message.tokens = tokens;

      const response = await admin.messaging().sendMulticast(message);
      console.log("Admin notificado. Sucessos:", response.successCount);
      return null;
    });

// --- FUNÇÃO 2: CRM - Envia notificações em massa para clientes (NOVA) ---
exports.enviarCampanhaMarketing = functions.firestore
    .document("artifacts/{appId}/public/data/marketing_campaigns/{campaignId}")
    .onCreate(async (snap, context) => {
      const campanha = snap.data();
      const appId = context.params.appId;

      if (!campanha || !campanha.targetUids || campanha.targetUids.length === 0) {
        return null;
      }

      console.log(`Iniciando campanha: ${campanha.title}`);

      // 1. Buscar tokens dos usuários alvo
      const tokensParaEnviar = [];
      const usersRef = admin.firestore().collection(`artifacts/${appId}/public/data/users`);

      // Se o alvo for "todos", buscamos todos os usuários com token
      if (campanha.targetUids === "all") {
        const snapshot = await usersRef.get();
        snapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.notificationToken) {
            tokensParaEnviar.push(userData.notificationToken);
          }
        });
      } else {
        // Se for uma lista específica de IDs (selecionados no CRM)
        // Nota: Firestore 'in' query suporta até 10 itens.
        // Para listas grandes, iteramos ou fazemos múltiplas queries.
        // Aqui faremos uma iteração simples para garantir robustez no MVP.
        for (const uid of campanha.targetUids) {
          const userDoc = await usersRef.doc(uid).get();
          if (userDoc.exists && userDoc.data().notificationToken) {
            tokensParaEnviar.push(userDoc.data().notificationToken);
          }
        }
      }

      if (tokensParaEnviar.length === 0) {
        await snap.ref.update({status: "Sem tokens válidos", finishedAt: new Date()});
        return null;
      }

      // 2. Montar a mensagem
      const message = {
        notification: {
          title: campanha.title,
          body: campanha.body,
        },
        data: {
          click_action: "https://salgadosdabia.com", // Pode ser um link para promoção
          icon: "/logo192.png",
        },
        tokens: tokensParaEnviar,
      };

      // 3. Enviar
      const response = await admin.messaging().sendMulticast(message);

      // 4. Atualizar o relatório da campanha
      await snap.ref.update({
        status: "Enviado",
        sentCount: response.successCount,
        failureCount: response.failureCount,
        finishedAt: new Date(),
      });

      console.log(`Campanha finalizada. Enviados: ${response.successCount}`);
      return null;
    });
