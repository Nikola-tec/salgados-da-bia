// Arquivo: functionsindex.js (Exemplo simplificado)

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// 1. Inicialização do Admin SDK (necessário para interagir com o Firestore e FCM)
// A função usará as credenciais do seu projeto automaticamente.
admin.initializeApp();
const db = admin.firestore();

exports.sendNotificationToUser = functions.https.onCall(async (data, context) => {
    // 2. Autenticação e Segurança: Verifica se o usuário que chama é um Admin
    if (context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem enviar notificações.');
    }

    const { targetUid, messageBody, messageTitle } = data;
    const appId = 'salgados-da-bia'; // Substitua pelo seu appId real se for dinâmico

    try {
        // 3. Busca os Tokens do Usuário Alvo no Firestore
        const userRef = db.doc(`artifacts/${appId}/public/data/users/${targetUid}`);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return { success: false, message: 'Usuário não encontrado.' };
        }

        const tokens = userSnap.data().notificationTokens || [];

        if (tokens.length === 0) {
            return { success: false, message: 'Usuário sem tokens de notificação ativos.' };
        }

        // 4. Monta a Mensagem FCM
        const payload = {
            notification: {
                title: messageTitle || 'Salgados da Bia - Oferta!',
                body: messageBody,
                icon: 'default', // Ícone do app
            },
            data: {
                view: 'menu', // Opcional: Define a view para onde o app deve ir
            }
        };

        // 5. Envia para todos os tokens do cliente
        const response = await admin.messaging().sendToDevice(tokens, payload);

        // 6. Retorno de sucesso (pode ser útil para logs)
        return { success: true, message: 'Notificações enviadas com sucesso.', results: response.results.length };

    } catch (error) {
        console.error("Erro ao enviar notificação:", error);
        throw new functions.https.HttpsError('internal', 'Falha no envio da notificação.');
    }
});