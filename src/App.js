/* eslint-disable no-undef */
import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    onAuthStateChanged, 
    signOut,
    signInAnonymously,
    signInWithCustomToken,
    updateProfile,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    getDocs,
    writeBatch,
    setDoc,
    getDoc
} from 'firebase/firestore';
import { ChefHat, ShoppingCart, User, LogOut, PlusCircle, MinusCircle, Trash2, Edit, XCircle, CheckCircle, Package, DollarSign, Clock, Settings, Plus, Star, AlertTriangle, UserCheck, KeyRound, Loader2, ChevronsLeft, MapPin, Bike, TrendingUp, Percent, Calendar, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';


// --- CONFIGURAÇÃO DO FIREBASE ---
let firebaseConfig;
try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    firebaseConfig = JSON.parse(__firebase_config);
  } else {
    firebaseConfig = {
      apiKey: process.env.REACT_APP_API_KEY,
      authDomain: process.env.REACT_APP_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_PROJECT_ID,
      storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_APP_ID,
    };
  }
} catch (error) {
    console.error("Falha ao analisar a configuração do Firebase:", error);
    firebaseConfig = {};
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'salgados-da-bia';

// --- INICIALIZAÇÃO SEGURA DO FIREBASE ---
let app, auth, db;
let firebaseInitialized = false;

if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence); 
    db = getFirestore(app);
    firebaseInitialized = true;
  } catch (error) {
    console.error("A inicialização do Firebase falhou:", error);
  }
}

// --- DADOS INICIAIS ---
const INITIAL_MENU_DATA = [
    { name: 'Coxinha de Frango', category: 'Salgados Tradicionais', price: 1.20, image: 'https://i.imgur.com/3h2YqVp.jpg', minimumOrder: 10, isAvailable: true, requiresScheduling: false },
    { name: 'Rissoles de Carne', category: 'Salgados Tradicionais', price: 1.20, image: 'https://i.imgur.com/sBw91hB.jpg', minimumOrder: 10, isAvailable: true, requiresScheduling: false },
    { name: 'Bolinha de Queijo', category: 'Salgados Tradicionais', price: 1.10, image: 'https://i.imgur.com/bCn7h8S.jpg', minimumOrder: 10, isAvailable: true, requiresScheduling: false },
    { name: 'Croquete de Queijo e Fiambre', category: 'Salgados Especiais', price: 1.30, image: 'https://i.imgur.com/K1LdKjW.jpg', minimumOrder: 10, isAvailable: true, requiresScheduling: false },
    { name: 'Croquete de Calabresa', category: 'Salgados Especiais', price: 1.30, image: 'https://i.imgur.com/0iYwW5q.jpg', minimumOrder: 10, isAvailable: true, requiresScheduling: false },
    { name: 'Kibe', category: 'Salgados Especiais', price: 1.50, image: 'https://i.imgur.com/Y4bBv8e.jpg', minimumOrder: 10, isAvailable: true, requiresScheduling: false },
    { name: 'Box Tradicional 15 Salgados', category: 'Boxes', price: 15.00, customizable: true, size: 15, image: 'https://i.imgur.com/uD4fGTy.png', isAvailable: true, requiresScheduling: false, allowedCategories: ['Salgados Tradicionais'] },
    { name: 'Box Tradicional 30 Salgados', category: 'Boxes', price: 28.00, customizable: true, size: 30, image: 'https://i.imgur.com/uD4fGTy.png', isAvailable: true, requiresScheduling: false, allowedCategories: ['Salgados Tradicionais'] },
    { name: 'Box Especial 30 Salgados', category: 'Boxes', price: 32.00, customizable: true, size: 30, image: 'https://i.imgur.com/uD4fGTy.png', isAvailable: true, requiresScheduling: false, allowedCategories: ['Salgados Tradicionais', 'Salgados Especiais'] },
    { name: 'Box Tradicional 50 Salgados', category: 'Boxes', price: 45.00, customizable: true, size: 50, image: 'https://i.imgur.com/uD4fGTy.png', isAvailable: true, requiresScheduling: false, allowedCategories: ['Salgados Tradicionais'] },
    { name: 'Box Gigante 100 Salgados', category: 'Boxes', price: 85.00, customizable: true, size: 100, image: 'https://i.imgur.com/uD4fGTy.png', isAvailable: true, requiresScheduling: false, allowedCategories: ['Salgados Tradicionais', 'Salgados Especiais'] },
];

const INITIAL_SHOP_SETTINGS = {
    storeName: "Salgados da Bia",
    logoUrl: "https://i.imgur.com/kHw2x5L.png",
    email: "contato@salgadosdabia.pt",
    phone: "+351 912 345 678",
    currency: "EUR",
    pickupAddress: "Rua das Flores, 123, Lisboa, Portugal",
    whatsappNumber: "5511999999999",
    whatsappMessage: "Olá! Quero fazer uma encomenda."
};


const FirebaseErrorScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-800 p-4 text-center">
        <AlertTriangle size={48} className="mb-4 text-red-500" />
        <h1 className="text-2xl font-bold">Erro de Configuração do Firebase</h1>
        <p className="mt-2 max-w-md">Não foi possível estabelecer ligação à base de dados. Isto acontece normalmente quando as Variáveis de Ambiente na Vercel não estão configuradas corretamente.</p>
    </div>
);

// Adicione os emails dos administradores aqui.
const ADMIN_EMAILS = ['bianca.cardosomedeiros@gmail.com'];


// --- COMPONENTE PRINCIPAL: App ---
export default function App() {
    const [view, setView] = useState('menu'); 
    const [menu, setMenu] = useState([]);
    const [orders, setOrders] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [shopSettings, setShopSettings] = useState(INITIAL_SHOP_SETTINGS);
    const [cart, setCart] = useState([]);
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [error, setError] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    };

    useEffect(() => {
        if (!firebaseInitialized) {
            setLoading(false);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setIsAdmin(ADMIN_EMAILS.includes(currentUser.email));

                if (currentUser && !currentUser.isAnonymous) {
                    const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUser.uid);
                    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setUserData(docSnap.data());
                        }
                    });
                     setLoading(false);
                    return () => unsubscribeUser();
                } else {
                    setUserData(null);
                    setLoading(false);
                }
            } else {
                signInAnonymously(auth).catch(err => {
                    console.error("Falha no login anônimo:", err);
                    setError("Não foi possível carregar o cardápio. Tente atualizar a página.");
                    setLoading(false);
                });
            }
        });
        
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user || !firebaseInitialized) return;
        
        if (isAdmin) setView('admin');

        const menuCollectionPath = `artifacts/${appId}/public/data/menu`;
        const menuRef = collection(db, menuCollectionPath);
        const populateInitialData = async () => {
            try {
                const snapshot = await getDocs(menuRef);
                if (snapshot.empty) {
                    const batch = writeBatch(db);
                    INITIAL_MENU_DATA.forEach(item => {
                        const docRef = doc(collection(db, menuCollectionPath));
                        batch.set(docRef, item);
                    });
                    await batch.commit();
                }
            } catch (e) { console.error("Erro ao popular dados do cardápio:", e); }
        };
        populateInitialData();
        const unsubscribeMenu = onSnapshot(menuRef, (snapshot) => {
            setMenu(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error("Erro no listener do cardápio:", err));

        const ordersCollectionPath = `artifacts/${appId}/public/data/orders`;
        const ordersRef = collection(db, ordersCollectionPath);
        const unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(ordersData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
        }, (err) => console.error("Erro no listener de pedidos:", err));
        
        const feedbackCollectionPath = `artifacts/${appId}/public/data/feedback`;
        const feedbackRef = collection(db, feedbackCollectionPath);
        const unsubscribeFeedbacks = onSnapshot(feedbackRef, (snapshot) => {
            const feedbackData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()}));
            setFeedbacks(feedbackData);
        }, (err) => console.error("Erro no listener de feedbacks:", err));

        const settingsDocPath = `artifacts/${appId}/public/data/settings`;
        const settingsRef = doc(db, settingsDocPath, 'shopConfig');
        const populateInitialSettings = async () => {
             try {
                const docSnap = await getDocs(collection(db, settingsDocPath));
                if (docSnap.empty) {
                    await setDoc(settingsRef, INITIAL_SHOP_SETTINGS);
                }
            } catch (e) { console.error("Erro ao popular configurações iniciais:", e); }
        };
        populateInitialSettings();
        const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                setShopSettings(doc.data());
            }
        });


        return () => {
            unsubscribeMenu();
            unsubscribeOrders();
            unsubscribeSettings();
            unsubscribeFeedbacks();
        };
    }, [user, isAdmin]);

    const addToCart = (item, customization, priceOverride) => {
        const applyMinimumOrder = cart.length === 0;
    
        // A box is always added as 1 unit. For other items, check minimum order rule if cart is empty.
        const quantityToAdd = item.customizable 
            ? 1 
            : (applyMinimumOrder && item.minimumOrder > 1 ? item.minimumOrder : 1);
    
        const finalPrice = priceOverride !== undefined ? priceOverride : item.price;
        const finalItem = { ...item, price: finalPrice };
    
        setCart(prevCart => {
            const existingItem = prevCart.find(ci => ci.id === item.id && JSON.stringify(ci.customization) === JSON.stringify(customization));
            if (existingItem) {
                return prevCart.map(ci => ci.id === item.id && JSON.stringify(ci.customization) === JSON.stringify(customization) ? { ...ci, quantity: ci.quantity + 1 } : ci);
            }
            return [...prevCart, { ...finalItem, quantity: quantityToAdd, customization }];
        });
    
        // Adjust toast message for boxes
        const toastText = item.customizable ? `${item.name} adicionado!` : `${quantityToAdd > 1 ? quantityToAdd + 'x ' : ''}${item.name} adicionado!`;
        showToast(toastText);
    };

    const updateQuantity = (itemId, amount, customization) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id === itemId && JSON.stringify(item.customization) === JSON.stringify(customization)) {
                let newQuantity = item.quantity + amount;
                return { ...item, quantity: Math.max(0, newQuantity) };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };
    
    const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);
    const cartTotalQuantity = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

    const handleLogin = async (email, password) => {
        setAuthLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            if(ADMIN_EMAILS.includes(email)) {
                setView('admin');
            } else {
                setView('cart');
            }
        } catch (err) { setError('Email ou senha inválidos.'); }
        finally { setAuthLoading(false); }
    };
    
    const handleSignUp = async (email, password, name) => {
        setAuthLoading(true);
        setError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userCredential.user.uid);
            await setDoc(userDocRef, { 
                name, 
                email,
                hasGivenFeedback: false,
                hasFeedbackDiscount: false
            });
            
            setView('cart');
        } catch(err) { setError('Não foi possível criar a conta. O email pode já estar em uso.'); }
        finally { setAuthLoading(false); }
    }

    const handleLogout = async () => {
        await signOut(auth);
        setCart([]);
        setView('menu');
    };
    
    const placeOrder = async (customerDetails) => {
        if (!user || user.isAnonymous) {
            setError("Por favor, faça login para finalizar o pedido.");
            setView('customerLogin');
            return;
        }
        setAuthLoading(true);
        try {
            const discountPercentage = 0.05;
            const hasDiscount = userData?.hasFeedbackDiscount;
            const subtotal = cartTotal;
            const discountAmount = hasDiscount ? subtotal * discountPercentage : 0;
            const finalTotal = subtotal - discountAmount;

            const orderData = {
                ...customerDetails,
                items: cart,
                subtotal: subtotal,
                total: finalTotal,
                status: 'Pendente',
                createdAt: new Date(),
                userId: user.uid,
            };

            if (hasDiscount) {
                orderData.discount = {
                    type: 'feedback',
                    amount: discountAmount,
                };
            }

            const ordersCollectionPath = `artifacts/${appId}/public/data/orders`;
            await addDoc(collection(db, ordersCollectionPath), orderData);

            if (hasDiscount) {
                const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
                await updateDoc(userDocRef, { hasFeedbackDiscount: false });
            }

            setCart([]);
            setView('confirmation');
        } catch (error) { console.error("Erro ao fazer pedido: ", error); setError("Não foi possível processar seu pedido. Tente novamente."); }
        finally { setAuthLoading(false); }
    };
    
    if (!firebaseInitialized) return <FirebaseErrorScreen />;
    
    const renderView = () => {
        switch (view) {
            case 'cart': return <CartView cart={cart} updateQuantity={updateQuantity} cartTotal={cartTotal.toFixed(2)} setView={setView} emptyCart={() => setCart([])} user={user} />;
            case 'checkout': return <CheckoutView placeOrder={placeOrder} cartTotal={cartTotal} cartTotalQuantity={cartTotalQuantity} cart={cart} setView={setView} initialError={error} user={user} userData={userData} authLoading={authLoading} shopSettings={shopSettings} />;
            case 'confirmation': return <ConfirmationView setView={setView} showToast={showToast} user={user} userData={userData} />;
            case 'adminLogin': return <LoginView handleLogin={handleLogin} error={error} isAdminLogin={true} authLoading={authLoading} />;
            case 'customerLogin': return <LoginView handleLogin={handleLogin} error={error} setView={setView} authLoading={authLoading} />;
            case 'signUp': return <SignUpView handleSignUp={handleSignUp} error={error} setView={setView} authLoading={authLoading} />;
            case 'myOrders': return <MyOrdersView orders={orders.filter(o => o.userId === user?.uid)} setView={setView} />;
            case 'accountSettings': return <AccountSettingsView user={user} userData={userData} showToast={showToast} setView={setView} />;
            case 'admin': return isAdmin ? <AdminDashboard menu={menu} orders={orders} feedbacks={feedbacks} handleLogout={handleLogout} showToast={showToast} settings={shopSettings} setView={setView} /> : <MenuView menu={menu} addToCart={addToCart} cart={cart} setView={setView} cartTotal={cartTotal.toFixed(2)} />;
            case 'kitchenView': return <KitchenView orders={orders.filter(o => ['Pendente', 'Em Preparo'].includes(o.status))} setView={setView} />;
            case 'deliveryView': return <DeliveryView orders={orders.filter(o => o.status === 'Pronto para Entrega' || o.status === 'Saiu para Entrega')} setView={setView} />;
            default: return <MenuView menu={menu} addToCart={addToCart} cart={cart} setView={setView} cartTotal={cartTotal.toFixed(2)} />;
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen bg-amber-50"><ChefHat className="animate-spin text-amber-500" size={64} /></div>;

    return (
        <div className="bg-stone-50 min-h-screen font-sans text-stone-800" style={{fontFamily: "'Inter', sans-serif"}}>
            {toastMessage && <Toast message={toastMessage} />}
            {view !== 'kitchenView' && view !== 'deliveryView' && <Header cartCount={cartTotalQuantity} setView={setView} user={user} isAdmin={isAdmin} settings={shopSettings}/>}
            <main className={!['kitchenView', 'deliveryView'].includes(view) ? "p-4 md:p-6 max-w-7xl mx-auto" : ""}>
                {renderView()}
            </main>
            {!isAdmin && <WhatsAppButton settings={shopSettings} />}
            {view !== 'kitchenView' && view !== 'deliveryView' && <Footer user={user} setView={setView} handleLogout={handleLogout} isAdmin={isAdmin} />}
        </div>
    );
}

// --- COMPONENTES DE VIEW ---

const Toast = ({ message }) => (
     <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-stone-800 text-white py-2 px-6 rounded-full shadow-lg z-50 transition-opacity duration-300 animate-fade-in-up">
        <p className="flex items-center gap-2"><CheckCircle size={16}/> {message}</p>
    </div>
);

const WhatsAppButton = ({ settings }) => {
    if (!settings.whatsappNumber) return null;
    const whatsappLink = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(settings.whatsappMessage || '')}`;
    return (
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 bg-green-500 text-white rounded-full p-4 shadow-lg hover:bg-green-600 transition-transform hover:scale-110 z-30 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.919 6.066l-1.479 5.423 5.57-1.457z"/></svg>
        </a>
    )
}

const Header = ({ cartCount, setView, user, isAdmin, settings }) => (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-4 cursor-pointer transition-transform hover:scale-105" onClick={() => setView(isAdmin ? 'admin' : 'menu')}>
                <img src={settings.logoUrl} alt="Logo Salgados da Bia" className="h-14 w-14 object-contain" />
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-amber-600">{settings.storeName}</h1>
                    <p className="text-xs text-stone-500 -mt-1">O sabor do Brasil em Portugal</p>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
                 { !isAdmin && 
                    <button onClick={() => setView('cart')} className="relative p-2 rounded-full hover:bg-amber-100 transition-colors">
                        <ShoppingCart className="text-amber-600" />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pop">
                                {cartCount}
                            </span>
                        )}
                    </button>
                 }
                 {user && user.isAnonymous && (
                    <button onClick={() => setView('customerLogin')} className="p-2 rounded-full hover:bg-amber-100 transition-colors" title="Login de Cliente">
                        <User className="text-amber-600" />
                    </button>
                 )}
                 {user && !user.isAnonymous && !isAdmin && (
                    <button onClick={() => setView('myOrders')} className="p-2 rounded-full hover:bg-amber-100 transition-colors" title="Meus Pedidos">
                        <UserCheck className="text-amber-600" />
                    </button>
                 )}
                 {isAdmin && (
                    <button onClick={() => setView('admin')} className="p-2 rounded-full hover:bg-amber-100 transition-colors" title="Painel de Administrador">
                        <KeyRound className="text-amber-600" />
                    </button>
                 )}
            </div>
        </div>
    </header>
);

const Footer = ({ user, setView, handleLogout, isAdmin }) => (
    <footer className="bg-white mt-10 py-5 text-center text-stone-500 text-sm border-t">
        <p>&copy; {new Date().getFullYear()} Salgados da Bia. Todos os direitos reservados.</p>
        <div className="flex justify-center items-center gap-2 mt-2 cursor-pointer" onClick={() => setView('adminLogin')}>
            <img src="https://images.builderservices.io/s/cdn/v1.0/i/m?url=https%3A%2F%2Fstorage.googleapis.com%2Fproduction-hostgator-brasil-v1-0-0%2F090%2F1710090%2FqxDm1tGU%2F8cfd07d10a204d089d52eac3e4f3bc2f&methods=resize%2C500%2C5000" alt="Nikola TEC Logo" className="h-5" />
            <p>Desenvolvido por Nikola TEC</p>
        </div>
        {user && !user.isAnonymous && (
            <p className="mt-2">
                <button onClick={handleLogout} className="text-red-500 font-semibold hover:underline">Sair da Conta</button>
            </p>
        )}
    </footer>
);

const MenuView = ({ menu, addToCart, cart, setView, cartTotal }) => {
    const [customizingBox, setCustomizingBox] = useState(null);
    
    const handleCustomizeClick = (boxItem) => {
        // Fallback for old boxes without `allowedCategories`
        const allowed = boxItem.allowedCategories || (boxItem.name.toLowerCase().includes('especial') || boxItem.name.toLowerCase().includes('gigante') ? ['Salgados Tradicionais', 'Salgados Especiais'] : ['Salgados Tradicionais']);
        
        const availableSalgados = menu.filter(item => 
            allowed.includes(item.category) && !item.customizable && item.isAvailable !== false
        );

        setCustomizingBox({ box: boxItem, availableSalgados });
    };

    const categories = [...new Set(menu.filter(item => item.isAvailable !== false).map(item => item.category))].sort((a,b) => a === 'Boxes' ? -1 : b === 'Boxes' ? 1 : a.localeCompare(b));

    return (
        <div className="animate-fade-in">
            {customizingBox && (
                <CustomizeBoxModal 
                    box={customizingBox.box} 
                    salgados={customizingBox.availableSalgados} 
                    onClose={() => setCustomizingBox(null)} 
                    addToCart={addToCart}
                />
            )}
            {categories.map(category => (
                <div key={category} className="mb-10">
                    <h2 className="text-3xl font-bold text-amber-600 border-b-2 border-amber-200 pb-2 mb-6">{category}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {menu.filter(item => item.category === category && item.isAvailable !== false).map(item => (
                            <MenuItemCard key={item.id} item={item} onOrderClick={() => item.customizable ? handleCustomizeClick(item) : addToCart(item)} />
                        ))}
                    </div>
                </div>
            ))}
            {cart.length > 0 && (
                <div className="fixed bottom-24 right-4 z-30 md:bottom-4">
                    <button onClick={() => setView('cart')} className="bg-amber-500 text-white font-bold py-3 px-6 rounded-full hover:bg-amber-600 transition-all duration-300 shadow-lg flex items-center gap-3 transform hover:scale-105 active:scale-100">
                        <ShoppingCart size={22} />
                        <span>Ver Carrinho ({cart.reduce((acc, item) => acc + item.quantity, 0)} itens)</span>
                        <span className="font-normal opacity-80">|</span>
                        <span>{cartTotal}€</span>
                    </button>
                </div>
            )}
        </div>
    );
};

const MenuItemCard = ({ item, onOrderClick }) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
        <div className="h-48 overflow-hidden relative">
            <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/400x300/FBBF24/FFFFFF?text=Salgado'; }} />
            {item.requiresScheduling && <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Calendar size={12}/> Sob Encomenda</div>}
        </div>
        <div className="p-4 flex flex-col flex-grow">
            <h3 className="text-lg font-bold text-stone-800">{item.name}</h3>
            {item.minimumOrder > 1 && <p className="text-xs text-amber-600 font-semibold mt-1">Pedido mínimo: {item.minimumOrder} unidades</p>}
            <p className="text-stone-600 text-sm flex-grow mt-1">{item.description || ''}</p>
            <div className="flex justify-between items-center mt-4">
                <span className="text-xl font-bold text-green-600">{item.price.toFixed(2)}€</span>
                <button onClick={onOrderClick} className="bg-amber-500 text-white font-bold py-2 px-4 rounded-full hover:bg-amber-600 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md transform active:scale-95">
                    <Plus size={18} /> {item.customizable ? 'Montar' : 'Adicionar'}
                </button>
            </div>
        </div>
    </div>
);

const CustomizeBoxModal = ({ box, salgados, onClose, addToCart }) => {
    const [selection, setSelection] = useState({});
    const [error, setError] = useState('');
    const totalSelected = useMemo(() => Object.values(selection).reduce((sum, count) => sum + count, 0), [selection]);
    const [dynamicPrice, setDynamicPrice] = useState(box.price);

    useEffect(() => {
        if (totalSelected <= box.size || box.size === 0) {
            setDynamicPrice(box.price);
        } else {
            // When exceeding the box size, the price becomes the sum of individual items.
            const calculatedPrice = Object.entries(selection).reduce((sum, [salgadoId, quantity]) => {
                const salgado = salgados.find(s => s.id === salgadoId);
                return sum + (salgado ? salgado.price * quantity : 0);
            }, 0);
            setDynamicPrice(calculatedPrice);
        }
    }, [selection, totalSelected, box.price, box.size, salgados]);

    const handleSelectionChange = (salgadoId, amount) => {
        setError('');
        const currentCount = selection[salgadoId] || 0;
        const newCount = Math.max(0, currentCount + amount);
        setSelection(prev => ({ ...prev, [salgadoId]: newCount }));
    };

    const handleAddToCart = () => {
        setError('');
        const customization = Object.entries(selection)
            .filter(([, quantity]) => quantity > 0)
            .map(([salgadoId, quantity]) => {
                const salgado = salgados.find(s => s.id === salgadoId);
                return { name: salgado.name, quantity, price: salgado.price };
            });

        if (totalSelected >= box.size && customization.length > 0) {
            addToCart(box, customization, dynamicPrice);
            onClose();
        } else {
            setError(`Por favor, selecione no mínimo ${box.size} salgados.`);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-slide-up">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-amber-600">Monte seu {box.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-stone-500 hover:bg-stone-200"><XCircle /></button>
                </div>
                <div className="p-4 overflow-y-auto">
                    <div className="sticky top-0 bg-white py-2 mb-2 z-10">
                        <p className="mb-2 text-center text-stone-600">Mínimo de {box.size} salgados. Adicione mais se quiser!</p>
                        <p className="text-center text-sm text-stone-500">Selecionados: <strong className="text-amber-600">{totalSelected}</strong></p>
                    </div>
                    <div className="space-y-3">
                        {salgados.map(salgado => (
                            <div key={salgado.id} className="flex justify-between items-center bg-stone-100 p-3 rounded-md">
                                <p className="font-semibold text-stone-700">{salgado.name}</p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleSelectionChange(salgado.id, -1)} className="p-1 rounded-full bg-amber-200 text-amber-800 hover:bg-amber-300 disabled:opacity-50 transition-colors active:scale-90" disabled={(selection[salgado.id] || 0) === 0}><MinusCircle size={22} /></button>
                                    <span className="font-bold w-8 text-center text-lg">{selection[salgado.id] || 0}</span>
                                    <button onClick={() => handleSelectionChange(salgado.id, 1)} className="p-1 rounded-full bg-amber-200 text-amber-800 hover:bg-amber-300 transition-colors active:scale-90"><PlusCircle size={22} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t mt-auto bg-stone-50 rounded-b-lg">
                         {error && <p className="text-red-500 text-center text-sm mb-2">{error}</p>}
                         <button 
                            onClick={handleAddToCart} 
                            disabled={totalSelected < box.size}
                            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-all duration-200 disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform active:scale-95"
                        >
                            <ShoppingCart size={20} /> Adicionar ao Carrinho ({dynamicPrice.toFixed(2)}€)
                        </button>
                </div>
            </div>
        </div>
    );
};

const CartView = ({ cart, updateQuantity, cartTotal, setView, emptyCart, user }) => {
    const [confirmingEmpty, setConfirmingEmpty] = useState(false);
    const handleEmptyCart = () => { emptyCart(); setConfirmingEmpty(false); }

    if (cart.length === 0) {
        return (
            <div className="text-center py-16 animate-fade-in">
                <ShoppingCart size={64} className="mx-auto text-stone-300" />
                <h2 className="text-2xl font-bold mt-4 text-stone-700">O seu carrinho está vazio</h2>
                <p className="text-stone-500 mt-2">Adicione alguns salgados deliciosos para começar!</p>
                <button onClick={() => setView('menu')} className="mt-6 bg-amber-500 text-white font-bold py-3 px-6 rounded-full hover:bg-amber-600 transition-colors shadow hover:shadow-lg active:scale-95">
                    Ver Cardápio
                </button>
            </div>
        );
    }
    return (
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-lg animate-fade-in">
            {confirmingEmpty && <ConfirmDeleteModal title="Esvaziar Carrinho" message="Tem a certeza que quer remover todos os itens do carrinho?" onConfirm={handleEmptyCart} onCancel={() => setConfirmingEmpty(false)} confirmText="Esvaziar" />}
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold text-stone-800">Meu Carrinho</h2>
                 <button onClick={() => setConfirmingEmpty(true)} className="text-sm text-red-500 hover:underline flex items-center gap-1"><Trash2 size={14}/> Esvaziar Carrinho</button>
            </div>
            <div className="space-y-4">
                {cart.map((item, index) => (
                    <div key={item.id + index} className="flex items-start justify-between border-b pb-4">
                        <div className="flex items-start gap-4">
                            <img src={item.image} alt={item.name} className="w-20 h-20 rounded-md object-cover" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/FBBF24/FFFFFF?text=Item'; }}/>
                            <div>
                                <h3 className="font-bold text-stone-800">{item.name}</h3>
                                {item.customization && (
                                    <ul className="text-sm text-stone-600 list-disc list-inside mt-1">
                                        {item.customization.map(c => <li key={c.name}>{c.quantity}x {c.name}</li>)}
                                    </ul>
                                )}
                                 {item.customizable ? (
                                    <p className="text-stone-600 font-bold">{item.price.toFixed(2)}€</p>
                                ) : (
                                    <p className="text-stone-600">{item.price.toFixed(2)}€ /unidade</p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                             <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.id, -1, item.customization)} className="p-1 rounded-full text-stone-600 hover:bg-stone-200 active:scale-90"><MinusCircle size={20} /></button>
                                <span className="font-bold text-lg w-8 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1, item.customization)} className="p-1 rounded-full text-stone-600 hover:bg-stone-200 active:scale-90"><PlusCircle size={20} /></button>
                            </div>
                            <p className="font-bold mt-2 text-stone-800">{(item.price * item.quantity).toFixed(2)}€</p>
                            <button onClick={() => updateQuantity(item.id, -item.quantity, item.customization)} className="text-red-500 hover:text-red-700 text-sm mt-1"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-6 text-right">
                <p className="text-lg">Subtotal: <span className="font-bold text-xl text-stone-800">{cartTotal}€</span></p>
                <button onClick={() => user.isAnonymous ? setView('customerLogin') : setView('checkout')} className="mt-4 bg-green-500 text-white font-bold py-3 px-8 rounded-full hover:bg-green-600 transition-colors text-lg shadow hover:shadow-lg active:scale-95">
                    Finalizar Pedido
                </button>
            </div>
        </div>
    );
};

const CheckoutView = ({ placeOrder, cart, cartTotal, cartTotalQuantity, setView, initialError, user, userData, authLoading, shopSettings }) => {
    const isLargeOrder = cartTotalQuantity >= 150;
    const hasScheduledItem = cart.some(item => item.requiresScheduling);
    const forceScheduling = isLargeOrder || hasScheduledItem;

    const [deliveryMethod, setDeliveryMethod] = useState(forceScheduling ? 'schedule' : 'deliver');
    const [name] = useState(userData?.name || user?.displayName || '');
    const [phone] = useState(userData?.phone || '');
    const [address, setAddress] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [formError, setFormError] = useState('');
    
    const discountPercentage = 0.05;
    const hasDiscount = userData?.hasFeedbackDiscount;
    const subtotal = cartTotal;
    const discountAmount = hasDiscount ? subtotal * discountPercentage : 0;
    const finalTotal = subtotal - discountAmount;


    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');
        const details = { name, phone, deliveryMethod };

        if (deliveryMethod === 'deliver') {
            if (!address) { setFormError('Por favor, preencha a morada de entrega.'); return; }
            details.address = address;
            details.isScheduled = false;
        } else if (deliveryMethod === 'pickup') {
            if (!pickupTime) { setFormError('Por favor, selecione um horário para retirada.'); return; }
            details.pickupTime = pickupTime;
            details.address = `Retirada em: ${shopSettings.pickupAddress}`;
            details.isScheduled = false;
        } else { // schedule
            if (!scheduledDate || !scheduledTime) { setFormError('Por favor, selecione data e hora para a encomenda.'); return; }
            if (!address && !shopSettings.pickupAddress) { setFormError('Por favor, preencha a morada para a encomenda.'); return; }
            details.scheduledDate = scheduledDate;
            details.scheduledTime = scheduledTime;
            details.address = address || `Retirada em: ${shopSettings.pickupAddress}`;
            details.isScheduled = true;
        }

        placeOrder(details);
    };

    return (
        <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-stone-800">Finalizar Pedido</h2>
            
             {forceScheduling && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6" role="alert">
                    <p className="font-bold">Apenas Encomenda Disponível</p>
                    <p>O seu pedido contém itens especiais ou excede 150 unidades, por isso precisa ser agendado.</p>
                </div>
            )}

            <div className="mb-6">
                <div className="flex border border-stone-300 rounded-lg p-1">
                    <button onClick={() => setDeliveryMethod('deliver')} disabled={forceScheduling} className={`w-1/3 py-2 rounded-md font-semibold transition-colors ${deliveryMethod === 'deliver' ? 'bg-amber-500 text-white' : 'hover:bg-amber-100'} disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed`}>
                        Entregar
                    </button>
                    <button onClick={() => setDeliveryMethod('pickup')} disabled={forceScheduling} className={`w-1/3 py-2 rounded-md font-semibold transition-colors ${deliveryMethod === 'pickup' ? 'bg-amber-500 text-white' : 'hover:bg-amber-100'} disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed`}>
                        Retirar
                    </button>
                    <button onClick={() => setDeliveryMethod('schedule')} className={`w-1/3 py-2 rounded-md font-semibold transition-colors ${deliveryMethod === 'schedule' ? 'bg-amber-500 text-white' : 'hover:bg-amber-100'}`}>
                        Encomendar
                    </button>
                </div>
            </div>

            <div className="bg-stone-100 p-4 rounded-lg mb-4 space-y-2">
                <div><span className="font-bold text-stone-600">Nome: </span><span>{name || "Não definido"}</span></div>
                <div><span className="font-bold text-stone-600">Telefone: </span><span>{phone || "Não definido"}</span></div>
                <p className="text-xs text-stone-500">Para alterar estes dados, vá para <button onClick={() => setView('accountSettings')} className="font-bold underline">Minha Conta</button>.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                {deliveryMethod === 'deliver' && (
                    <div>
                        <label htmlFor="address" className="block text-stone-700 font-bold mb-2">Morada para Entrega</label>
                        <textarea id="address" value={address} onChange={e => setAddress(e.target.value)} rows="3" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" required></textarea>
                    </div>
                )}
                {deliveryMethod === 'pickup' && (
                    <div>
                        <label htmlFor="pickupTime" className="block text-stone-700 font-bold mb-2">Horário para Retirada</label>
                        <input type="time" id="pickupTime" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                        <div className="mt-2 bg-stone-100 p-3 rounded-md text-sm">
                            <p className="font-bold">Endereço de Retirada:</p>
                            <p className="text-stone-600">{shopSettings.pickupAddress}</p>
                        </div>
                    </div>
                )}
                {deliveryMethod === 'schedule' && (
                    <div className="space-y-4 bg-stone-50 p-4 rounded-lg">
                        <h3 className="font-bold text-lg">Agendar Encomenda</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label htmlFor="scheduledDate" className="block text-stone-700 font-bold mb-2">Data</label>
                               <input type="date" id="scheduledDate" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg" required />
                            </div>
                             <div>
                               <label htmlFor="scheduledTime" className="block text-stone-700 font-bold mb-2">Hora</label>
                               <input type="time" id="scheduledTime" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg" required />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="address" className="block text-stone-700 font-bold mb-2">Morada de Entrega (ou deixe em branco para retirar no local)</label>
                            <textarea id="address" placeholder={shopSettings.pickupAddress} value={address} onChange={e => setAddress(e.target.value)} rows="2" className="w-full px-3 py-2 border border-stone-300 rounded-lg"></textarea>
                        </div>
                    </div>
                )}
                {formError && <p className="text-red-500 text-center">{formError}</p>}
                {initialError && <p className="text-red-500 text-center">{initialError}</p>}
                <div className="border-t pt-6 mt-2">
                    <div className="space-y-1 text-right mb-4">
                        <p className="text-md">Subtotal: <span className="font-semibold">{subtotal.toFixed(2)}€</span></p>
                        {hasDiscount && (
                            <p className="text-md text-green-600 flex items-center justify-end gap-1">
                                <Percent size={14}/> Desconto Feedback (5%): <span className="font-semibold">-{discountAmount.toFixed(2)}€</span>
                            </p>
                        )}
                        <p className="text-xl">Total a Pagar: <span className="font-bold text-2xl">{finalTotal.toFixed(2)}€</span></p>
                    </div>

                    <button type="submit" disabled={authLoading} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors text-lg shadow hover:shadow-lg active:scale-95 flex justify-center items-center disabled:bg-green-300">
                        {authLoading ? <Loader2 className="animate-spin" /> : "Confirmar Pedido"}
                    </button>
                    <button type="button" onClick={() => setView('cart')} className="w-full mt-3 text-center text-stone-600 hover:underline">
                        Voltar ao Carrinho
                    </button>
                </div>
            </form>
        </div>
    );
};

const ConfirmationView = ({ setView, showToast, user, userData }) => {
    const [feedbackView, setFeedbackView] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const showFeedbackSection = userData && !userData.hasGivenFeedback;

    const handleFeedbackSubmit = async (feedbackData) => {
        if (!user || user.isAnonymous) {
            showToast("Erro: Usuário não autenticado.");
            return;
        }
        const feedbackCollectionPath = `artifacts/${appId}/public/data/feedback`;
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
        
        try {
            await addDoc(collection(db, feedbackCollectionPath), {
                ...feedbackData,
                userId: user.uid,
                submittedAt: new Date(),
            });

            await updateDoc(userDocRef, {
                hasGivenFeedback: true,
                hasFeedbackDiscount: true,
            });
            
            setFeedbackSubmitted(true);
            showToast("Obrigado! Desconto de 5% ativado para sua próxima compra.");
        } catch (error) {
            console.error("Erro ao enviar feedback:", error);
            showToast("Erro ao enviar feedback.");
        }
    };

    if (feedbackSubmitted) {
        return (
             <div className="text-center py-16 max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg animate-fade-in">
                <Star size={64} className="mx-auto text-amber-500" />
                <h2 className="text-3xl font-bold mt-4 text-green-600">Desconto de 5% Liberado!</h2>
                <p className="text-stone-600 mt-2">Um desconto de 5% será aplicado automaticamente no seu próximo pedido.</p>
                <button onClick={() => setView('myOrders')} className="mt-8 bg-amber-500 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-600 transition-colors shadow hover:shadow-lg active:scale-95">
                    Ver Meus Pedidos
                </button>
            </div>
        );
    }
    
    if (feedbackView) {
        return <FeedbackForm onSubmit={handleFeedbackSubmit} />;
    }

    return (
        <div className="text-center py-16 max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg animate-fade-in">
            <CheckCircle size={64} className="mx-auto text-green-500" />
            <h2 className="text-3xl font-bold mt-4">Pedido Recebido!</h2>
            <p className="text-stone-600 mt-2">Obrigado pela sua preferência! O seu pedido já está a ser preparado com muito carinho.</p>
            <p className="text-stone-600 mt-1">Pode acompanhar o estado do seu pedido na secção "Meus Pedidos".</p>
            <button onClick={() => setView('myOrders')} className="mt-8 bg-amber-500 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-600 transition-colors shadow hover:shadow-lg active:scale-95">
                Ver Meus Pedidos
            </button>
            {showFeedbackSection && (
                <div className="mt-8 pt-6 border-t">
                    <h3 className="text-lg font-semibold text-stone-700">Ganhe 5% de Desconto!</h3>
                    <p className="text-stone-500 text-sm mt-1">Ajude-nos a melhorar! Responda a 3 perguntas rápidas e ganhe 5% de desconto no seu próximo pedido.</p>
                    <button onClick={() => setFeedbackView(true)} className="mt-4 bg-stone-800 text-white font-bold py-2 px-6 rounded-full hover:bg-stone-900 transition-colors shadow active:scale-95">
                        Dar Feedback
                    </button>
                </div>
            )}
        </div>
    );
};

const FeedbackForm = ({ onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [howFound, setHowFound] = useState('');
    const [wouldRecommend, setWouldRecommend] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        onSubmit({ rating, howFound, wouldRecommend });
    }

    return (
        <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-6">Sua Opinião é Importante</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-stone-700 font-bold mb-2">Como avalia o nosso aplicativo?</label>
                    <div className="flex justify-center gap-2">
                        {[1,2,3,4,5].map(star => (
                             <Star 
                                key={star}
                                size={32}
                                className={`cursor-pointer transition-colors ${star <= rating ? 'text-amber-500' : 'text-stone-300 hover:text-amber-300'}`}
                                onClick={() => setRating(star)}
                             />
                        ))}
                    </div>
                </div>
                 <div>
                    <label htmlFor="howFound" className="block text-stone-700 font-bold mb-2">Como nos conheceu?</label>
                    <select id="howFound" value={howFound} onChange={e => setHowFound(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" required>
                        <option value="">Selecione uma opção</option>
                        <option>Indicação</option>
                        <option>Pesquisa no Google</option>
                        <option>Ifood</option>
                        <option>Facebook</option>
                        <option>Instagram</option>
                        <option>WhatsApp</option>
                        <option>Anúncios de Publicidade</option>
                    </select>
                </div>
                <div>
                     <label className="block text-stone-700 font-bold mb-2">Indicaria a Salgados da Bia para amigos?</label>
                     <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="radio" name="recommend" value="Sim" onChange={e => setWouldRecommend(e.target.value)} required /> Sim</label>
                        <label className="flex items-center gap-2"><input type="radio" name="recommend" value="Não" onChange={e => setWouldRecommend(e.target.value)} required /> Não</label>
                     </div>
                </div>
                 <button type="submit" disabled={isSubmitting} className="w-full bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition-colors shadow hover:shadow-lg active:scale-95 flex justify-center items-center disabled:bg-green-300">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Enviar Feedback e Receber Desconto"}
                </button>
            </form>
        </div>
    );
}

const LoginView = ({ handleLogin, error, setView, isAdminLogin = false, authLoading }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => { e.preventDefault(); handleLogin(email, password); };

    return (
        <div className="max-w-sm mx-auto mt-10 bg-white p-8 rounded-lg shadow-xl animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-6">{isAdminLogin ? 'Acesso Administrador' : 'Entrar na sua Conta'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-stone-700 font-bold mb-2">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                <div>
                    <label className="block text-stone-700 font-bold mb-2">Senha</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                {error && <p className="text-red-500 text-center">{error}</p>}
                <button type="submit" disabled={authLoading} className="w-full bg-amber-500 text-white font-bold py-2 rounded-lg hover:bg-amber-600 transition-colors shadow hover:shadow-lg active:scale-95 flex justify-center items-center disabled:bg-amber-300">
                     {authLoading ? <Loader2 className="animate-spin" /> : "Entrar"}
                </button>
                {!isAdminLogin && (
                    <p className="text-center text-sm text-stone-600 pt-2">
                        Não tem conta? <button type="button" onClick={() => setView('signUp')} className="text-amber-600 font-bold hover:underline">Crie uma aqui.</button>
                    </p>
                )}
            </form>
        </div>
    );
};

const SignUpView = ({ handleSignUp, error, setView, authLoading }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setLocalError('As senhas não coincidem.');
            return;
        }
        setLocalError('');
        handleSignUp(email, password, name);
    };

    return (
        <div className="max-w-sm mx-auto mt-10 bg-white p-8 rounded-lg shadow-xl animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-6">Criar Conta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-stone-700 font-bold mb-2">Nome Completo</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                 <div>
                    <label className="block text-stone-700 font-bold mb-2">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                <div>
                    <label className="block text-stone-700 font-bold mb-2">Senha</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                 <div>
                    <label className="block text-stone-700 font-bold mb-2">Confirmar Senha</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                {localError && <p className="text-red-500 text-center">{localError}</p>}
                {error && <p className="text-red-500 text-center">{error}</p>}
                <button type="submit" disabled={authLoading} className="w-full bg-amber-500 text-white font-bold py-2 rounded-lg hover:bg-amber-600 transition-colors shadow hover:shadow-lg active:scale-95 flex justify-center items-center disabled:bg-amber-300">
                    {authLoading ? <Loader2 className="animate-spin" /> : "Criar Conta"}
                </button>
                 <p className="text-center text-sm text-stone-600 pt-2">
                    Já tem conta? <button type="button" onClick={() => setView('customerLogin')} className="text-amber-600 font-bold hover:underline">Entre aqui.</button>
                </p>
            </form>
        </div>
    );
}

const AccountSettingsView = ({ user, userData, showToast, setView }) => {
    const [name, setName] = useState(userData?.name || user?.displayName || '');
    const [phone, setPhone] = useState(userData?.phone || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
            await updateDoc(userDocRef, { name, phone });
            
            if (user.displayName !== name) {
                await updateProfile(user, { displayName: name });
            }
            showToast("Dados atualizados com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar dados:", error);
            showToast("Ocorreu um erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="max-w-2xl mx-auto">
             <h2 className="text-3xl font-bold mb-6 text-stone-800">Minha Conta</h2>
              <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
                  <div>
                      <label className="block text-sm font-bold mb-1 text-stone-600">Nome Completo</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-stone-300 rounded" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold mb-1 text-stone-600">Telefone de Contato</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border border-stone-300 rounded" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold mb-1 text-stone-600">Email</label>
                      <input type="email" value={user?.email || ''} className="w-full p-2 border bg-stone-100 border-stone-300 rounded" disabled />
                  </div>
                  <div className="pt-4 flex justify-between items-center">
                      <button onClick={handleSave} disabled={isSaving} className="bg-amber-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-amber-600 transition-colors shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center disabled:bg-amber-300 w-40">
                          {isSaving ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                      </button>
                      <button onClick={() => setView('myOrders')} className="text-stone-600 font-semibold hover:underline">Ver meus pedidos</button>
                  </div>
              </div>
        </div>
    );
}

const MyOrdersView = ({ orders, setView }) => {
     const statusStyles = {
        'Pendente': 'bg-yellow-100 text-yellow-800', 'Em Preparo': 'bg-blue-100 text-blue-800',
        'Pronto para Entrega': 'bg-green-100 text-green-800', 'Concluído': 'bg-stone-200 text-stone-600',
        'Rejeitado': 'bg-red-100 text-red-800', 'Saiu para Entrega': 'bg-purple-100 text-purple-800',
    };

    if (orders.length === 0) {
         return (
            <div className="text-center py-16 animate-fade-in">
                <Package size={64} className="mx-auto text-stone-300" />
                <h2 className="text-2xl font-bold mt-4 text-stone-700">Ainda não tem pedidos</h2>
                <p className="text-stone-500 mt-2">Todos os seus pedidos irão aparecer aqui.</p>
                <button onClick={() => setView('menu')} className="mt-6 bg-amber-500 text-white font-bold py-3 px-6 rounded-full hover:bg-amber-600 transition-colors shadow hover:shadow-lg active:scale-95">
                    Começar a Comprar
                </button>
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-stone-800">Meus Pedidos</h2>
                <button onClick={() => setView('accountSettings')} className="text-sm font-semibold text-amber-600 hover:underline flex items-center gap-1"><Settings size={14}/> Minha Conta</button>
            </div>
            <div className="space-y-6">
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-stone-200">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 mb-3">
                             <div>
                                <p className="text-sm text-stone-500">Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
                                <p className="text-sm text-stone-500">Feito em: {new Date(order.createdAt?.seconds * 1000).toLocaleString('pt-PT')}</p>
                                {order.isScheduled && <p className="text-sm font-bold text-blue-600">Agendado para: {order.scheduledDate} às {order.scheduledTime}</p>}
                             </div>
                             <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                 <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[order.status] || 'bg-stone-100'}`}>{order.status}</span>
                                 <span className="font-bold text-xl text-stone-800">{order.total.toFixed(2)}€</span>
                             </div>
                         </div>
                         <div>
                            <p className="font-semibold text-sm mb-2 text-stone-600">Itens:</p>
                            <ul className="list-disc list-inside text-sm text-stone-700 pl-2">
                                {order.items.map(item => (
                                    <li key={item.id + item.name}>
                                        {item.customizable ? '' : `${item.quantity}x `}{item.name}
                                        {item.customization && (<span className="text-xs text-stone-500 ml-2">({item.customization.map(c => `${c.quantity}x ${c.name}`).join(', ')})</span>)}
                                    </li>
                                ))}
                            </ul>
                            {order.discount && (
                                <p className="text-sm text-green-600 mt-2 font-semibold">Desconto aplicado: {order.discount.amount.toFixed(2)}€</p>
                            )}
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- PAINEL DE ADMINISTRAÇÃO ---

const AdminStats = ({ orders }) => {
    const totalRevenue = useMemo(() => orders.filter(o => o.status === 'Concluído').reduce((acc, order) => acc + order.total, 0), [orders]);
    const pendingOrders = useMemo(() => orders.filter(o => ['Pendente', 'Em Preparo', 'Pronto para Entrega', 'Saiu para Entrega'].includes(o.status)).length, [orders]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-stone-100 p-4 rounded-lg shadow-sm flex items-center gap-4">
                <div className="bg-blue-200 p-3 rounded-full"><Package className="text-blue-600" size={24}/></div>
                <div>
                    <p className="text-sm text-stone-500">Total de Pedidos</p>
                    <p className="text-2xl font-bold text-stone-800">{orders.length}</p>
                </div>
            </div>
            <div className="bg-stone-100 p-4 rounded-lg shadow-sm flex items-center gap-4">
                <div className="bg-green-200 p-3 rounded-full"><DollarSign className="text-green-600" size={24}/></div>
                <div>
                    <p className="text-sm text-stone-500">Faturamento (Concluídos)</p>
                    <p className="text-2xl font-bold text-stone-800">{totalRevenue.toFixed(2)}€</p>
                </div>
            </div>
            <div className="bg-stone-100 p-4 rounded-lg shadow-sm flex items-center gap-4">
                <div className="bg-yellow-200 p-3 rounded-full"><Clock className="text-yellow-600" size={24}/></div>
                <div>
                    <p className="text-sm text-stone-500">Pedidos Ativos</p>
                    <p className="text-2xl font-bold text-stone-800">{pendingOrders}</p>
                </div>
            </div>
        </div>
    );
}

const AdminDashboard = ({ menu, orders, feedbacks, handleLogout, showToast, settings, setView }) => {
    const [adminView, setAdminView] = useState('dashboard'); 
    
    const renderAdminView = () => {
        switch(adminView) {
            case 'orders': return <ManageOrders orders={orders} />;
            case 'menu': return <ManageMenu menu={menu} />;
            case 'settings': return <AdminSettings showToast={showToast} currentSettings={settings} />;
            case 'faturamento': return <FaturamentoView orders={orders} />;
            case 'feedbacks': return <FeedbacksView feedbacks={feedbacks} />;
            default: return <AdminStats orders={orders} />;
        }
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4">
                <h2 className="text-3xl font-bold text-stone-800">Painel de Admin</h2>
                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    <button onClick={() => setView('kitchenView')} className="bg-stone-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-stone-900 transition-colors text-sm">Visão Cozinha</button>
                    <button onClick={() => setView('deliveryView')} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm">Visão Entregador</button>
                    <button onClick={handleLogout} title="Sair" className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors"><LogOut /></button>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-6 border-b">
                <button onClick={() => setAdminView('dashboard')} className={`px-4 py-2 font-semibold text-sm rounded-t-md flex items-center gap-2 transition-colors ${adminView === 'dashboard' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><Package size={16}/> Resumo</button>
                <button onClick={() => setAdminView('orders')} className={`px-4 py-2 font-semibold text-sm rounded-t-md flex items-center gap-2 transition-colors ${adminView === 'orders' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><ShoppingCart size={16}/> Pedidos</button>
                <button onClick={() => setAdminView('menu')} className={`px-4 py-2 font-semibold text-sm rounded-t-md flex items-center gap-2 transition-colors ${adminView === 'menu' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><ChefHat size={16}/> Cardápio</button>
                <button onClick={() => setAdminView('faturamento')} className={`px-4 py-2 font-semibold text-sm rounded-t-md flex items-center gap-2 transition-colors ${adminView === 'faturamento' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><TrendingUp size={16}/> Faturamento</button>
                <button onClick={() => setAdminView('feedbacks')} className={`px-4 py-2 font-semibold text-sm rounded-t-md flex items-center gap-2 transition-colors ${adminView === 'feedbacks' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><Star size={16}/> Feedbacks</button>
                <button onClick={() => setAdminView('settings')} className={`px-4 py-2 font-semibold text-sm rounded-t-md flex items-center gap-2 transition-colors ${adminView === 'settings' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><Settings size={16}/> Configurações</button>
            </div>
            {renderAdminView()}
        </div>
    );
};

const FaturamentoView = ({ orders }) => {
    const [filter, setFilter] = useState('30d');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

    const availableYears = useMemo(() => {
        if (!orders || orders.length === 0) return [new Date().getFullYear()];
        const years = new Set(orders.map(o => new Date(o.createdAt?.seconds * 1000).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [orders]);

    const filteredData = useMemo(() => {
        const now = new Date();
        let filteredOrders = orders.filter(o => o.status === 'Concluído' && o.createdAt?.seconds);

        if (filter === '30d') {
            const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
            filteredOrders = filteredOrders.filter(o => new Date(o.createdAt.seconds * 1000) >= thirtyDaysAgo);
        } else if (filter === '60d') {
            const sixtyDaysAgo = new Date(new Date().setDate(now.getDate() - 60));
            filteredOrders = filteredOrders.filter(o => new Date(o.createdAt.seconds * 1000) >= sixtyDaysAgo);
        } else if (filter === '90d') {
            const ninetyDaysAgo = new Date(new Date().setDate(now.getDate() - 90));
            filteredOrders = filteredOrders.filter(o => new Date(o.createdAt.seconds * 1000) >= ninetyDaysAgo);
        } else if (filter === 'year') {
            filteredOrders = filteredOrders.filter(o => new Date(o.createdAt.seconds * 1000).getFullYear() === yearFilter);
        }

        const monthlyRevenue = filteredOrders.reduce((acc, order) => {
            const date = new Date(order.createdAt.seconds * 1000);
            const month = date.toLocaleString('pt-PT', { month: 'short', year: 'numeric' });
            acc[month] = (acc[month] || 0) + order.total;
            return acc;
        }, {});
        
        const sortedMonths = Object.keys(monthlyRevenue).sort((a, b) => {
            const [monthA, yearA] = a.replace('.', '').split(' de ');
            const [monthB, yearB] = b.replace('.', '').split(' de ');
            const dateA = new Date(`${monthA} 1, ${yearA}`);
            const dateB = new Date(`${monthB} 1, ${yearB}`);
            return dateA - dateB;
        });

        const chartData = sortedMonths.map(month => ({
            name: month.charAt(0).toUpperCase() + month.slice(1),
            Faturamento: parseFloat(monthlyRevenue[month].toFixed(2))
        }));

        const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
        const averageTicket = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
        
        return { chartData, totalRevenue, averageTicket, totalOrders: filteredOrders.length };

    }, [orders, filter, yearFilter]);

    return (
        <div>
            <h3 className="text-xl font-bold mb-4 text-stone-700">Análise de Faturamento</h3>
            <div className="flex flex-wrap gap-2 items-center mb-4 p-2 bg-stone-100 rounded-lg">
                <button onClick={() => setFilter('30d')} className={`px-3 py-1 text-sm font-semibold rounded-md ${filter === '30d' ? 'bg-amber-500 text-white' : 'bg-white'}`}>Últimos 30 dias</button>
                <button onClick={() => setFilter('60d')} className={`px-3 py-1 text-sm font-semibold rounded-md ${filter === '60d' ? 'bg-amber-500 text-white' : 'bg-white'}`}>Últimos 60 dias</button>
                <button onClick={() => setFilter('90d')} className={`px-3 py-1 text-sm font-semibold rounded-md ${filter === '90d' ? 'bg-amber-500 text-white' : 'bg-white'}`}>Últimos 90 dias</button>
                <div className="flex items-center gap-2">
                    <button onClick={() => setFilter('year')} className={`px-3 py-1 text-sm font-semibold rounded-md ${filter === 'year' ? 'bg-amber-500 text-white' : 'bg-white'}`}>Por Ano:</button>
                    <select value={yearFilter} onChange={e => {setYearFilter(Number(e.target.value)); setFilter('year');}} className="p-1 border-stone-300 rounded-md text-sm">
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-100 p-4 rounded-lg"><p className="text-sm text-green-800">Faturamento Total (Período)</p><p className="text-2xl font-bold text-green-900">{filteredData.totalRevenue.toFixed(2)}€</p></div>
                <div className="bg-blue-100 p-4 rounded-lg"><p className="text-sm text-blue-800">Pedidos Concluídos (Período)</p><p className="text-2xl font-bold text-blue-900">{filteredData.totalOrders}</p></div>
                <div className="bg-yellow-100 p-4 rounded-lg"><p className="text-sm text-yellow-800">Ticket Médio</p><p className="text-2xl font-bold text-yellow-900">{filteredData.averageTicket.toFixed(2)}€</p></div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border h-96">
                <h4 className="font-bold mb-4">Faturamento Mensal</h4>
                <ResponsiveContainer width="100%" height="90%">
                    {filteredData.chartData.length > 0 ? (
                        <BarChart data={filteredData.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => `${value}€`}/>
                            <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                            <Legend />
                            <Bar dataKey="Faturamento" fill="#f59e0b" />
                        </BarChart>
                    ) : (
                        <div className="flex items-center justify-center h-full text-stone-500">Nenhum dado de faturamento para o período selecionado.</div>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const FeedbacksView = ({ feedbacks }) => {
    const feedbackAnalysis = useMemo(() => {
        if (!feedbacks || feedbacks.length === 0) {
            return { total: 0, averageRating: 0, howFoundData: [], recommendData: [] };
        }

        const total = feedbacks.length;
        const averageRating = feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / total;
        
        const howFoundCounts = feedbacks.reduce((acc, f) => {
            if(f.howFound) acc[f.howFound] = (acc[f.howFound] || 0) + 1;
            return acc;
        }, {});
        const howFoundData = Object.keys(howFoundCounts).map(key => ({ name: key, value: howFoundCounts[key] }));

        const recommendCounts = feedbacks.reduce((acc, f) => {
            if(f.wouldRecommend) acc[f.wouldRecommend] = (acc[f.wouldRecommend] || 0) + 1;
            return acc;
        }, {});
        const recommendData = Object.keys(recommendCounts).map(key => ({ name: key, value: recommendCounts[key] }));

        return { total, averageRating, howFoundData, recommendData };
    }, [feedbacks]);

    const COLORS = ['#FBBF24', '#F97316', '#EC4899', '#8B5CF6', '#3B82F6', '#10B981'];
    
    if (feedbackAnalysis.total === 0) {
        return <div className="text-center py-10 text-stone-500">Ainda não há feedbacks para analisar.</div>;
    }

    return (
        <div>
            <h3 className="text-xl font-bold mb-4 text-stone-700">Análise de Feedbacks</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 <div className="bg-stone-100 p-4 rounded-lg text-center"><p className="text-sm text-stone-600">Total de Respostas</p><p className="text-3xl font-bold">{feedbackAnalysis.total}</p></div>
                 <div className="bg-stone-100 p-4 rounded-lg text-center"><p className="text-sm text-stone-600">Avaliação Média</p><div className="flex justify-center items-center gap-1"><p className="text-3xl font-bold">{feedbackAnalysis.averageRating.toFixed(2)}</p><Star className="text-amber-500" size={28}/></div></div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-4 rounded-lg shadow-sm border h-96">
                     <h4 className="font-bold mb-4 text-center">Como os clientes nos conheceram?</h4>
                     <ResponsiveContainer width="100%" height="90%">
                         <PieChart>
                             <Pie data={feedbackAnalysis.howFoundData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                 {feedbackAnalysis.howFoundData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                             </Pie>
                             <Tooltip />
                             <Legend />
                         </PieChart>
                     </ResponsiveContainer>
                 </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm border h-96">
                     <h4 className="font-bold mb-4 text-center">Indicaria a um amigo?</h4>
                     <ResponsiveContainer width="100%" height="90%">
                         <PieChart>
                             <Pie data={feedbackAnalysis.recommendData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${(entry.percent * 100).toFixed(0)}%`}>
                                 <Cell key="cell-0" fill="#10B981" />
                                 <Cell key="cell-1" fill="#EF4444" />
                             </Pie>
                             <Tooltip />
                             <Legend />
                         </PieChart>
                     </ResponsiveContainer>
                 </div>
             </div>
        </div>
    );
};

const AdminSettings = ({showToast, currentSettings}) => {
    const [settings, setSettings] = useState(currentSettings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSettings(currentSettings);
    }, [currentSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        const settingsDocPath = `artifacts/${appId}/public/data/settings`;
        const settingsRef = doc(db, settingsDocPath, 'shopConfig');
        try {
            await setDoc(settingsRef, settings, { merge: true });
            showToast("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            showToast("Erro ao salvar. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
         <div>
            <h3 className="text-xl font-bold mb-4 text-stone-700">Configurações da Loja</h3>
            <div className="bg-stone-50 p-6 rounded-lg border border-stone-200 space-y-4 max-w-2xl">
                 <div>
                    <label className="block text-sm font-bold mb-1 text-stone-600">Nome da Loja</label>
                    <input type="text" value={settings.storeName || ''} onChange={(e) => setSettings({...settings, storeName: e.target.value})} className="w-full p-2 border border-stone-300 rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-bold mb-1 text-stone-600">URL do Logo</label>
                    <input type="text" value={settings.logoUrl || ''} onChange={(e) => setSettings({...settings, logoUrl: e.target.value})} className="w-full p-2 border border-stone-300 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1 text-stone-600">Email de Contato</label>
                    <input type="email" value={settings.email || ''} onChange={(e) => setSettings({...settings, email: e.target.value})} className="w-full p-2 border border-stone-300 rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-bold mb-1 text-stone-600">Telefone</label>
                    <input type="tel" value={settings.phone || ''} onChange={(e) => setSettings({...settings, phone: e.target.value})} className="w-full p-2 border border-stone-300 rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-bold mb-1 text-stone-600">Número do WhatsApp (com código do país)</label>
                    <input type="tel" value={settings.whatsappNumber || ''} onChange={(e) => setSettings({...settings, whatsappNumber: e.target.value})} className="w-full p-2 border border-stone-300 rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-bold mb-1 text-stone-600">Mensagem Padrão do WhatsApp</label>
                    <textarea value={settings.whatsappMessage || ''} onChange={(e) => setSettings({...settings, whatsappMessage: e.target.value})} className="w-full p-2 border border-stone-300 rounded" rows="3"></textarea>
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1 text-stone-600">Endereço para Retirar</label>
                    <input type="text" value={settings.pickupAddress || ''} onChange={(e) => setSettings({...settings, pickupAddress: e.target.value})} className="w-full p-2 border border-stone-300 rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-bold mb-1 text-stone-600">Moeda</label>
                    <select value={settings.currency || 'EUR'} onChange={(e) => setSettings({...settings, currency: e.target.value})} className="w-full p-2 border border-stone-300 rounded bg-white">
                        <option value="EUR">Euro (€)</option>
                        <option value="BRL">Real (R$)</option>
                        <option value="USD">Dólar ($)</option>
                    </select>
                </div>
                <div className="pt-4">
                    <button onClick={handleSave} disabled={isSaving} className="bg-amber-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-amber-600 transition-colors shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center disabled:bg-amber-300 w-40">
                        {isSaving ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                    </button>
                </div>
            </div>
        </div>
    );
};


const ManageOrders = ({ orders }) => {
    const handleUpdateStatus = async (orderId, status) => {
        const orderDocPath = `artifacts/${appId}/public/data/orders/${orderId}`;
        const orderRef = doc(db, orderDocPath);
        await updateDoc(orderRef, { status });
    };

    const handleRejectOrder = async (orderId) => {
        if (window.confirm("Tem a certeza que quer rejeitar e apagar este pedido? Esta ação não pode ser desfeita.")) {
            const orderDocPath = `artifacts/${appId}/public/data/orders/${orderId}`;
            await deleteDoc(doc(db, orderDocPath));
        }
    }

    const statusStyles = {
        'Pendente': 'bg-yellow-100 text-yellow-800',
        'Em Preparo': 'bg-blue-100 text-blue-800',
        'Pronto para Entrega': 'bg-indigo-100 text-indigo-800',
        'Saiu para Entrega': 'bg-purple-100 text-purple-800',
        'Concluído': 'bg-green-100 text-green-800',
    };

    return (
        <div>
            <h3 className="text-xl font-bold mb-4 text-stone-700">Gerenciar Pedidos ({orders.length})</h3>
            <div className="space-y-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-stone-50 p-4 rounded-lg border border-stone-200 hover:shadow-md transition-shadow">
                         <div className="flex flex-wrap justify-between items-center">
                             <div>
                                 <p className="font-bold text-lg text-stone-800">{order.name}</p>
                                 <p className="text-sm text-stone-600">{order.phone} | {order.address}</p>
                                 <p className="text-sm text-stone-500">Pedido feito em: {new Date(order.createdAt?.seconds * 1000).toLocaleString('pt-PT')}</p>
                                 {order.isScheduled && <p className="text-sm font-bold text-blue-600">Agendado para: {order.scheduledDate} às {order.scheduledTime}</p>}
                             </div>
                             <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                 <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[order.status] || 'bg-stone-100'}`}>{order.status}</span>
                                 <span className="font-bold text-lg">{order.total.toFixed(2)}€</span>
                             </div>
                         </div>
                         <div className="mt-4 border-t pt-2">
                            <p className="font-semibold text-sm mb-1 text-stone-600">Itens:</p>
                            <ul className="list-disc list-inside text-sm text-stone-700">
                                {order.items.map(item => (
                                     <li key={item.id + item.name}>
                                        {item.customizable ? '' : `${item.quantity}x `}{item.name}
                                        {item.customization && (<span className="text-xs text-stone-500 ml-2">({item.customization.map(c => `${c.quantity}x ${c.name}`).join(', ')})</span>)}
                                    </li>
                                ))}
                            </ul>
                         </div>
                         <div className="mt-4 flex flex-wrap gap-2 items-center">
                             {['Pendente', 'Em Preparo', 'Pronto para Entrega', 'Saiu para Entrega', 'Concluído'].map(status => (
                                 <button key={status} onClick={() => handleUpdateStatus(order.id, status)} className={`px-3 py-1 text-sm rounded-md transition-all ${order.status === status ? 'ring-2 ring-offset-1 ring-amber-500 bg-stone-200 font-bold' : 'bg-white hover:bg-stone-200 border'}`}>{status}</button>
                             ))}
                             <div className="flex-grow"></div>
                             <button onClick={() => handleRejectOrder(order.id)} className={'bg-red-100 hover:bg-red-200 border border-red-200 text-red-700 px-3 py-1 text-sm rounded-md transition-all'}>Rejeitar</button>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ConfirmDeleteModal = ({ onConfirm, onCancel, title="Confirmar Exclusão", message="Tem a certeza que quer apagar este item? Esta ação não pode ser desfeita.", confirmText="Apagar" }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 animate-fade-in">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm animate-slide-up">
            <h4 className="text-lg font-bold mb-2">{title}</h4>
            <p className="text-stone-600 mb-6">{message}</p>
            <div className="flex justify-end gap-4">
                <button onClick={onCancel} className="bg-stone-300 text-stone-800 font-bold py-2 px-4 rounded-lg hover:bg-stone-400 transition-colors active:scale-95">Cancelar</button>
                <button onClick={onConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors active:scale-95">{confirmText}</button>
            </div>
        </div>
    </div>
);

const ManageMenu = ({ menu }) => {
    const [editingItem, setEditingItem] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState(null);

    const handleSave = async (itemToSave) => {
        const menuCollectionPath = `artifacts/${appId}/public/data/menu`;
        if (itemToSave.id) {
            const itemRef = doc(db, menuCollectionPath, itemToSave.id);
            const { id, ...dataToUpdate } = itemToSave;
            await updateDoc(itemRef, dataToUpdate);
        } else {
            await addDoc(collection(db, menuCollectionPath), itemToSave);
        }
        setEditingItem(null);
        setIsCreating(false);
    };
    
    const handleDeleteConfirm = async () => {
        if (deletingItemId) {
            const itemRef = doc(db, `artifacts/${appId}/public/data/menu`, deletingItemId);
            await deleteDoc(itemRef);
            setDeletingItemId(null);
        }
    };
    
    const startCreating = () => {
        setIsCreating(true);
        setEditingItem({ name: '', category: 'Salgados Tradicionais', price: 0, image: '', description: '', customizable: false, size: 0, minimumOrder: 1, isAvailable: true, requiresScheduling: false, allowedCategories: [] });
    };
    
    const allCategories = useMemo(() => [...new Set(menu.filter(item => !item.customizable).map(item => item.category))], [menu]);

    return (
        <div>
            {deletingItemId && <ConfirmDeleteModal onConfirm={handleDeleteConfirm} onCancel={() => setDeletingItemId(null)} />}
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-stone-700">Gerenciar Cardápio</h3>
                 <button onClick={startCreating} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95"><Plus size={18}/> Novo Item</button>
            </div>
            {(editingItem || isCreating) && <MenuItemForm item={editingItem} onSave={handleSave} onCancel={() => { setEditingItem(null); setIsCreating(false); }} allCategories={allCategories} />}
            <div className="space-y-2 mt-6">
                {menu.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${item.isAvailable !== false ? 'bg-stone-50 border-stone-200' : 'bg-stone-200 border-stone-300 opacity-60'}`}>
                        <div className="flex items-center gap-4">
                             <img src={item.image} alt={item.name} className="w-12 h-12 rounded-md object-cover bg-stone-200" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100x100/FBBF24/FFFFFF?text=?'; }}/>
                            <div>
                                <p className="font-bold text-stone-800">{item.name}</p>
                                <p className="text-sm text-stone-500">{item.category} - {item.price.toFixed(2)}€</p>
                            </div>
                        </div>
                        <div className="flex gap-2 items-center">
                             <span className="text-xs font-semibold flex items-center gap-1">
                                {item.isAvailable !== false ? <Eye size={14} className="text-green-600"/> : <EyeOff size={14} className="text-red-600"/>}
                             </span>
                             <button onClick={() => setEditingItem(item)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"><Edit size={18} /></button>
                             <button onClick={() => setDeletingItemId(item.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MenuItemForm = ({ item, onSave, onCancel, allCategories }) => {
    const [formData, setFormData] = useState(item);

    useEffect(() => { setFormData(item); }, [item]);
    
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value);
        setFormData(prev => ({...prev, [name]: val}));
    };
    
    const handleCategoryChange = (category) => {
        const currentCategories = formData.allowedCategories || [];
        if (currentCategories.includes(category)) {
            setFormData(prev => ({...prev, allowedCategories: currentCategories.filter(c => c !== category)}));
        } else {
            setFormData(prev => ({...prev, allowedCategories: [...currentCategories, category]}));
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 animate-fade-in">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                <h4 className="text-lg font-bold mb-4">{item.id ? 'Editar Item' : 'Criar Novo Item'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Nome</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded" required />
                    </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">Categoria</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded" required>
                            <option>Salgados Tradicionais</option>
                            <option>Salgados Especiais</option>
                            <option>Boxes</option>
                            <option>Bebidas</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">Preço (€)</label>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} step="0.01" className="w-full p-2 border border-stone-300 rounded" required />
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1">URL da Imagem</label>
                        <input type="text" name="image" value={formData.image} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded" />
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1">Descrição (opcional)</label>
                        <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Pedido Mínimo (Unidades)</label>
                        <input type="number" name="minimumOrder" value={formData.minimumOrder || 1} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded" />
                    </div>
                    <div className="flex items-center gap-2 border p-2 rounded-md bg-stone-50">
                        <input type="checkbox" id="customizable" name="customizable" checked={!!formData.customizable} onChange={handleChange} className="h-5 w-5"/>
                        <label htmlFor="customizable">É um box customizável?</label>
                    </div>
                     {formData.customizable && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1">Nº mínimo de salgados no box</label>
                            <input type="number" name="size" value={formData.size} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded" />
                        </div>
                     )}
                </div>

                {formData.customizable && (
                    <div className="mt-4 border-t pt-4">
                        <label className="block text-sm font-bold mb-2">Categorias Permitidas no Box</label>
                        <div className="grid grid-cols-2 gap-2">
                            {allCategories.map(cat => (
                                <div key={cat} className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id={`cat-${cat}`}
                                        checked={(formData.allowedCategories || []).includes(cat)}
                                        onChange={() => handleCategoryChange(cat)}
                                        className="h-4 w-4"
                                    />
                                    <label htmlFor={`cat-${cat}`}>{cat}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4 border-t pt-4">
                     <div className="flex items-center gap-2 p-2 rounded-md bg-stone-50 border">
                        <input type="checkbox" id="isAvailable" name="isAvailable" checked={formData.isAvailable !== false} onChange={handleChange} className="h-5 w-5"/>
                        <label htmlFor="isAvailable">Exibir no catálogo?</label>
                    </div>
                     <div className="flex items-center gap-2 p-2 rounded-md bg-stone-50 border">
                        <input type="checkbox" id="requiresScheduling" name="requiresScheduling" checked={!!formData.requiresScheduling} onChange={handleChange} className="h-5 w-5"/>
                        <label htmlFor="requiresScheduling">Requer encomenda?</label>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onCancel} className="bg-stone-300 text-stone-800 font-bold py-2 px-4 rounded-lg hover:bg-stone-400 active:scale-95 transition-colors">Cancelar</button>
                    <button type="submit" className="bg-amber-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-600 active:scale-95 transition-colors">Salvar</button>
                </div>
            </form>
        </div>
    );
};

const KitchenView = ({ orders, setView }) => {
    const updateStatus = async (orderId, status) => {
        const orderDocPath = `artifacts/${appId}/public/data/orders/${orderId}`;
        const orderRef = doc(db, orderDocPath);
        await updateDoc(orderRef, { status });
    };

    return (
        <div className="bg-stone-900 min-h-screen p-4 text-white">
            <div className="flex justify-between items-center mb-4">
                 <h1 className="text-4xl font-bold text-amber-400">Visão da Cozinha</h1>
                 <button onClick={() => setView('admin')} className="bg-stone-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-stone-600 flex items-center gap-2"><ChevronsLeft size={16}/> Voltar ao Painel</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {orders.map(order => (
                    <div key={order.id} className={`p-4 rounded-lg shadow-lg flex flex-col ${order.status === 'Pendente' ? 'bg-red-900 border-red-700' : 'bg-blue-900 border-blue-700'} border-2`}>
                        <div className="flex justify-between items-center border-b border-white/20 pb-2 mb-2">
                             <h2 className="text-2xl font-bold">{order.name}</h2>
                             <span className="text-lg font-mono">#{order.id.slice(0, 6).toUpperCase()}</span>
                        </div>
                         {order.isScheduled && <p className="text-sm font-bold text-amber-300 mb-2">AGENDADO: {order.scheduledDate} {order.scheduledTime}</p>}
                        <div className="flex-grow overflow-y-auto py-2">
                            <ul className="space-y-1">
                                {order.items.map(item => (
                                     <li key={item.id + item.name} className="flex justify-between items-start text-lg">
                                         <span className="font-semibold">{item.quantity}x {item.name}</span>
                                         {item.customization && (
                                             <ul className="text-sm text-stone-300 pl-4 text-right">
                                                 {item.customization.map(c => <li key={c.name}>- {c.quantity}x {c.name}</li>)}
                                             </ul>
                                         )}
                                     </li>
                                ))}
                            </ul>
                        </div>
                         <div className="mt-auto pt-2">
                             {order.status === 'Pendente' && (
                                <button onClick={() => updateStatus(order.id, 'Em Preparo')} className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 text-lg transition-colors">
                                    Iniciar Preparo
                                </button>
                             )}
                              {order.status === 'Em Preparo' && (
                                <button onClick={() => updateStatus(order.id, 'Pronto para Entrega')} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 text-lg transition-colors">
                                    Pedido Finalizado
                                </button>
                             )}
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DeliveryView = ({ orders, setView }) => {
    const updateStatus = async (orderId, status) => {
        const orderDocPath = `artifacts/${appId}/public/data/orders/${orderId}`;
        const orderRef = doc(db, orderDocPath);
        await updateDoc(orderRef, { status });
    };

    return (
        <div className="bg-stone-200 min-h-screen p-4">
            <div className="flex justify-between items-center mb-4">
                 <h1 className="text-3xl font-bold text-stone-800">Painel do Entregador</h1>
                 <button onClick={() => setView('admin')} className="bg-stone-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-stone-600 flex items-center gap-2"><ChevronsLeft size={16}/> Voltar</button>
            </div>
             <div className="space-y-4">
                {orders.map(order => (
                     <div key={order.id} className="bg-white p-4 rounded-lg shadow-md">
                         <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-2 mb-2">
                             <div>
                                <h2 className="text-xl font-bold text-stone-800">{order.name}</h2>
                                <p className="text-sm text-stone-500 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                             </div>
                             <p className={`font-bold text-lg ${order.status === 'Saiu para Entrega' ? 'text-purple-600' : 'text-green-600'}`}>{order.status}</p>
                         </div>
                         <div className="my-2">
                             <p className="font-semibold">Telefone: <a href={`tel:${order.phone}`} className="text-blue-600 hover:underline">{order.phone}</a></p>
                             <p className="font-semibold">Endereço: <span className="font-normal text-stone-700">{order.address}</span></p>
                         </div>
                         <div className="flex flex-wrap gap-2 mt-3">
                              {order.status === 'Pronto para Entrega' && (
                                <button onClick={() => updateStatus(order.id, 'Saiu para Entrega')} className="flex-1 bg-purple-500 text-white font-bold py-3 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2">
                                    <Bike size={18}/> Saiu para Entrega
                                </button>
                             )}
                              {order.status === 'Saiu para Entrega' && (
                                <button onClick={() => updateStatus(order.id, 'Concluído')} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors">
                                    Entrega Concluída
                                </button>
                             )}
                         </div>
                     </div>
                ))}
             </div>
        </div>
    );
};

