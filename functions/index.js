const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

// 1. Notifica a Bianca (Admin) quando chega um novo pedido
exports.notificarNovoPedido = functions.firestore
    .document('artifacts/{appId}/public/data/orders/{pedidoId}')
    .onCreate(async (snap, context) => {
        const pedido = snap.data();
        const appId = context.params.appId;
        
        const nomeCliente = pedido.name || 'Um cliente';
        const valor = pedido.total ? pedido.total.toFixed(2) : '0.00';

        const payload = {
            notification: {
                title: '🚨 NOVO PEDIDO RECEBIDO!',
                body: `${nomeCliente} acabou de pedir (${valor}€).`,
                icon: 'https://salgadosdabia.com/favicon.ico',
                clickAction: 'https://salgadosdabia.com'
            }
        };

        try {
            const tokensSnapshot = await admin.firestore().collection(`artifacts/${appId}/public/data/adminTokens`).get();
            if (tokensSnapshot.empty) return null;

            const tokens = [];
            tokensSnapshot.forEach(doc => { if (doc.data().token) tokens.push(doc.data().token); });

            if (tokens.length > 0) await admin.messaging().sendToDevice(tokens, payload);
            return null;
        } catch (error) { return null; }
    });

// 2. Notifica o Cliente quando o status do pedido muda
exports.notificarStatusPedido = functions.firestore
    .document('artifacts/{appId}/public/data/orders/{pedidoId}')
    .onUpdate(async (change, context) => {
        const pedidoAntes = change.before.data();
        const pedidoDepois = change.after.data();
        const appId = context.params.appId;

        // Só dispara se a Bianca tiver mudado o status!
        if (pedidoAntes.status === pedidoDepois.status) return null;

        const userId = pedidoDepois.userId;
        if (!userId) return null;

        let titulo = ''; let corpo = '';

        if (pedidoDepois.status === 'Em Preparo') {
            titulo = '👨‍🍳 Pedido na Cozinha!'; corpo = 'Já começamos a preparar os seus salgados.';
        } else if (pedidoDepois.status === 'Saiu para Entrega') {
            titulo = '🛵 Saiu para Entrega!'; corpo = 'O entregador já está a caminho com o seu pedido.';
        } else if (pedidoDepois.status === 'Pronto para Entrega') {
            titulo = '🛍️ Pronto para Retirada!'; corpo = 'O seu pedido já está embalado e à sua espera!';
        } else {
            return null; // Não notifica outros status
        }

        const payload = {
            notification: { title: titulo, body: corpo, icon: 'https://salgadosdabia.com/favicon.ico', clickAction: 'https://salgadosdabia.com' }
        };

        try {
            const userDoc = await admin.firestore().doc(`artifacts/${appId}/public/data/users/${userId}`).get();
            if (!userDoc.exists) return null;
            
            const tokens = userDoc.data().notificationTokens || [];
            if (tokens.length > 0) await admin.messaging().sendToDevice(tokens, payload);
            return null;
        } catch (error) { return null; }
    });