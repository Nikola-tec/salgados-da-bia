const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// MUDANÇA AQUI: Trocamos "pedidos" por "orders"
exports.notificarNovoPedido = functions.firestore
  .document("orders/{pedidoId}")
  .onCreate(async (snap, context) => {
    const pedido = snap.data();

    // Monta a mensagem
    const payload = {
      notification: {
        title: "Novo Pedido Realizado!",
        body: `Cliente: ${pedido.nomeCliente || "Anônimo"} - ` +
              `Total: R$ ${pedido.total || "0,00"}`,
        // O link para abrir o admin continua o mesmo (ajuste se sua rota mudar)
        clickAction: "https://seu-site-salgados.web.app/admin/pedidos",
      },
    };

    // Busca todos os tokens de administradores salvos
    const tokensSnapshot = await admin.firestore()
      .collection("admin_tokens")
      .get();

    if (tokensSnapshot.empty) {
      console.log("Nenhum token de admin encontrado para notificar.");
      return null;
    }

    const tokens = tokensSnapshot.docs.map((doc) => doc.id);

    // Envia a notificação para todos os admins
    const response = await admin.messaging().sendToDevice(tokens, payload);

    console.log("Notificações enviadas:", response.successCount);
    return null;
  });