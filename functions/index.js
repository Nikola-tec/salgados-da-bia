const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Inicializa o admin apenas se ainda não tiver sido inicializado
if (!admin.apps.length) {
    admin.initializeApp();
}

exports.notificarNovoPedido = functions.firestore
    .document('artifacts/{appId}/public/data/orders/{pedidoId}')
    .onCreate(async (snap, context) => {
        const pedido = snap.data();
        const appId = context.params.appId; // Será 'salgados-da-bia'
        
        // Formata os dados para a notificação
        const nomeCliente = pedido.name || 'Um cliente';
        const valor = pedido.total ? pedido.total.toFixed(2) : '0.00';

        const payload = {
            notification: {
                title: '🚨 NOVO PEDIDO RECEBIDO!',
                body: `${nomeCliente} acabou de pedir (${valor}€). Abra o painel para preparar!`,
                icon: 'https://salgadosdabia.com/favicon.ico', // Ajuste para o link do seu favicon/logo
                clickAction: 'https://salgadosdabia.com'
            }
        };

        try {
            // A MAGIA ACONTECE AQUI: Vai procurar na pasta nova e correta!
            const tokensSnapshot = await admin.firestore()
                .collection(`artifacts/${appId}/public/data/adminTokens`)
                .get();

            if (tokensSnapshot.empty) {
                console.log('Nenhum token de administrador encontrado. A notificação não foi enviada.');
                return null;
            }

            const tokens = [];
            tokensSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.token) {
                    tokens.push(data.token);
                }
            });

            if (tokens.length > 0) {
                // Dispara o Push para todos os telemóveis logados como Admin
                const response = await admin.messaging().sendToDevice(tokens, payload);
                console.log(`Notificações enviadas: ${response.successCount} sucesso(s) e ${response.failureCount} falha(s).`);
            }
            
            return null;
        } catch (error) {
            console.error('Erro fatal ao tentar enviar a notificação:', error);
            return null;
        }
    });