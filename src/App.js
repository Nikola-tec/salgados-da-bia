/* eslint-disable no-undef */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    onAuthStateChanged, 
    signOut,
    signInAnonymously,
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
import { ChefHat, ShoppingCart, User, LogOut, PlusCircle, MinusCircle, Trash2, Edit, XCircle, CheckCircle, Package, DollarSign, Clock, Settings, Plus, Star, AlertTriangle, UserCheck, KeyRound, Loader2, ChevronsLeft, MapPin, Bike, TrendingUp, Percent, Calendar, Eye, EyeOff, Trash, Satellite, Map, MessageSquare,Navigation } from 'lucide-react';
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

// --- CONSTANTES ---
const ADMIN_EMAILS = ['bianca.cardosomedeiros@gmail.com'];
const INITIAL_MENU_DATA = [
    { name: 'Coxinha de Frango', category: 'Salgados Tradicionais', price: 1.20, image: 'https://placehold.co/400x300/FBBF24/FFFFFF?text=Coxinha', minimumOrder: 10, isAvailable: true, requiresScheduling: false },
    { name: 'Rissoles de Carne', category: 'Salgados Tradicionais', price: 1.20, image: 'https://placehold.co/400x300/FBBF24/FFFFFF?text=Rissoles', minimumOrder: 10, isAvailable: true, requiresScheduling: false },
    { name: 'Bolinha de Queijo', category: 'Salgados Tradicionais', price: 1.10, image: 'https://placehold.co/400x300/FBBF24/FFFFFF?text=Bolinha', minimumOrder: 10, isAvailable: true, requiresScheduling: false },
    { name: 'Box Tradicional 50 Salgados', category: 'Boxes', price: 45.00, customizable: true, size: 50, image: 'https://placehold.co/400x300/FBBF24/FFFFFF?text=Box', isAvailable: true, requiresScheduling: false, allowedCategories: ['Salgados Tradicionais'] },
];

const INITIAL_WORKING_HOURS = {
    monday: { open: true, start: '10:00', end: '22:00' },
    tuesday: { open: true, start: '10:00', end: '22:00' },
    wednesday: { open: true, start: '10:00', end: '22:00' },
    thursday: { open: true, start: '10:00', end: '22:00' },
    friday: { open: true, start: '10:00', end: '23:00' },
    saturday: { open: true, start: '10:00', end: '23:00' },
    sunday: { open: false, start: '00:00', end: '00:00' },
};

const INITIAL_SHOP_SETTINGS = {
    storeName: "Salgados da Bia",
    logoUrl: "https://placehold.co/100x100/FBBF24/FFFFFF?text=SB",
    email: "contato@salgadosdabia.pt",
    phone: "+351 912 345 678",
    currency: "EUR",
    pickupAddress: "Rua Pintor Antonio de Almeida, lote 2, Viseu, Portugal",
    pickupCep: "3500-038",
    storeLatitude: 40.6558,
    storeLongitude: -7.9095,
    whatsappNumber: "5511999999999",
    whatsappMessage: "Olá! Quero fazer uma encomenda.",
    workingHours: INITIAL_WORKING_HOURS,
    holidays: [], 
    storeTimezone: 'Europe/Lisbon', 
    deliveryPricePerKm: 1.0, 
    deliveryMaxRadiusKm: 17, 
};


// --- FUNÇÕES DE UTILIDADE (GEO) ---
const getCoordsFromAddress = async (addressString, cep = null) => {
    let query = cep ? `postalcode=${cep}&country=portugal` : `q=${encodeURIComponent(addressString)}`;
    // Linha duplicada que causava o bug foi removida

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}&format=json&limit=1`);
        if (!response.ok) throw new Error('Falha na rede da API Nominatim');
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                address: cep ? {
                    street: result.address?.road || '',
                    district: result.address?.suburb || '',
                    city: result.address?.city || 'Viseu', 
                    state: result.address?.state || 'Viseu',
                    cep: cep,
                    country: 'Portugal',
                } : null 
            };
        }
        return null;
    } catch (error) {
        console.error("Erro ao geocodificar endereço:", error);
        return null;
    }
};

const getAddressFromCoords = async (lat, lng) => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        if (!response.ok) throw new Error('Falha na rede da API Nominatim Reverse');
        const data = await response.json();
        
        if (data && data.address) {
            const addr = data.address;
            return {
                street: addr.road || '',
                number: addr.house_number || '',
                district: addr.suburb || addr.quarter || '',
                city: addr.city || addr.town || addr.village || '',
                state: addr.state || '',
                country: addr.country || 'Portugal',
                cep: addr.postcode || ''
            };
        }
        return null;
    } catch (error) {
        console.error("Erro na geocodificação reversa:", error);
        return null;
    }
};

const getDistanceFromCoords = async (originLat, originLng, destLat, destLng) => {
    if (!originLat || !originLng || !destLat || !destLng) {
        console.error("Coordenadas de origem ou destino ausentes.");
        return null;
    }

    // CORREÇÃO: Se a origem e o destino são (praticamente) idênticos, a distância é 0.
    // Isso evita falhas no OSRM ao calcular uma rota para o mesmo ponto.
    if (Math.abs(originLat - destLat) < 0.00001 && Math.abs(originLng - destLng) < 0.00001) {
        return 0; // Retorna 0 metros
    }
    
    const url = `https://router.osrm.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha na rede da API OSRM');
        const data = await response.json();

        if (data && data.routes && data.routes.length > 0) {
            return data.routes[0].distance; // Distância em metros
        }
        return null;
    } catch (error) {
        console.error("Erro ao calcular distância:", error);
        return null;
    }
};

// --- FUNÇÕES DE UTILIDADE (TEMPO) ---
const isStoreOpenNow = (workingHours, holidays, storeTimezone) => {
    try {
        const now = new Date();
        const storeLocaleOptions = { 
            weekday: 'long', 
            hour: '2-digit', 
            minute: '2-digit', 
            hourCycle: 'h23', 
            timeZone: storeTimezone 
        };
        const parts = new Intl.DateTimeFormat('en-US', storeLocaleOptions).formatToParts(now);
        
        const dayMap = {};
        parts.forEach(p => { dayMap[p.type] = p.value; });

        const storeDayName = dayMap.weekday.toLowerCase(); 
        const storeCurrentTimeStr = `${dayMap.hour.padStart(2, '0')}:${dayMap.minute.padStart(2, '0')}`;

        const storeDateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: storeTimezone }).format(now); 
        if (holidays && holidays.includes(storeDateStr)) {
            return false;
        }

        const todayConfig = workingHours[storeDayName];
        if (!todayConfig || !todayConfig.open) {
            return false;
        }

        const { start, end } = todayConfig;

        if (start === end && start === '00:00') {
            return true;
        }

        if (start > end) {
            return storeCurrentTimeStr >= start || storeCurrentTimeStr < end;
        }

        if (end === '00:00') {
             return storeCurrentTimeStr >= start;
        }
        
        return storeCurrentTimeStr >= start && storeCurrentTimeStr < end;

    } catch (error) {
        console.error("Erro ao verificar horário da loja:", error);
        return false; 
    }
};

const getWorkingInterval = (workingHours, dateString) => {
    const date = new Date(dateString);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = date.getUTCDay(); 
    const today = dayNames[dayIndex];

    const todayConfig = workingHours[today];
    
    if (!todayConfig || !todayConfig.open) {
        return null; 
    }
    
    return { start: todayConfig.start, end: todayConfig.end };
}

// --- OUTRAS UTILIDADES ---

// OTIMIZAÇÃO 1: Handler de erro reutilizável para listeners do Firestore
const handleSnapshotError = (collectionName) => (err) => {
    if (err.code !== 'permission-denied') {
        console.error(`Erro no listener de ${collectionName}:`, err);
    } else {
        console.warn(`Permissão negada no listener de ${collectionName}. (Esperado para anônimos/não-admins).`);
    }
};

// OTIMIZAÇÃO 2: Hook customizado para centralizar cálculos de total e desconto
const useCartTotals = (cartTotal, userData, deliveryFee = 0) => {
    return useMemo(() => {
        const discountPercentage = 0.05;
        const hasDiscount = userData?.hasFeedbackDiscount;
        const subtotal = cartTotal;
        const discountAmount = hasDiscount ? subtotal * discountPercentage : 0;
        const finalTotal = subtotal - discountAmount + deliveryFee;
        return { subtotal, hasDiscount, discountAmount, finalTotal };
    }, [cartTotal, userData, deliveryFee]);
};


// --- COMPONENTE PRINCIPAL: App ---
export default function App() {
    const fallbackMenuWithIds = INITIAL_MENU_DATA.map((item, index) => ({ id: 'fallback-' + index, ...item }));
    const [view, setView] = useState('menu'); 
    const [menu, setMenu] = useState(fallbackMenuWithIds); 
    const [orders, setOrders] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [shopSettings, setShopSettings] = useState(INITIAL_SHOP_SETTINGS);
    const [cart, setCart] = useState([]);
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [error, setError] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false); 

    const storeOpen = useMemo(() => {
        if (!shopSettings.workingHours || !shopSettings.storeTimezone) return false;
        return isStoreOpenNow(shopSettings.workingHours, shopSettings.holidays, shopSettings.storeTimezone);
    }, [shopSettings.holidays, shopSettings.workingHours, shopSettings.storeTimezone]);
    
    const [showStoreClosedToast, setShowStoreClosedToast] = useState(false);

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    };

    useEffect(() => {
        if (!storeOpen && view === 'menu') {
            setShowStoreClosedToast(true);
            const timer = setTimeout(() => setShowStoreClosedToast(false), 10000); 
            return () => clearTimeout(timer);
        } else {
            setShowStoreClosedToast(false);
        }
    }, [storeOpen, view]); 


    useEffect(() => {
        document.title = shopSettings.storeName;
    }, [shopSettings.storeName]);


    // HOOK PRINCIPAL: Autenticação
    useEffect(() => {
        if (!firebaseInitialized) {
            setIsAuthReady(true);
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
                        } else {
                            setUserData({ name: currentUser.displayName, email: currentUser.email, addresses: [], hasGivenFeedback: false, hasFeedbackDiscount: false });
                        }
                    });
                    setIsAuthReady(true);
                    return () => unsubscribeUser();
                } else {
                    setUserData({ name: 'Anônimo', email: '', addresses: [], hasGivenFeedback: false, hasFeedbackDiscount: false });
                    setIsAuthReady(true);
                }
            } else {
                signInAnonymously(auth).catch(err => {
                    console.error("Falha no login anônimo:", err);
                    setError("Não foi possível carregar o cardápio. Tente atualizar a página.");
                }).finally(() => {
                    setIsAuthReady(true);
                });
            }
        });
        
        return () => unsubscribeAuth();
    }, []); 

    // HOOK SECUNDÁRIO: Listeners de Dados (dependente da autenticação)
    useEffect(() => {
        if (!isAuthReady || !firebaseInitialized) return;
        
        if (isAdmin) setView('admin');

        // Funções auxiliares para popular dados (só rodam se admin)
        const populateInitialData = async (ref, data) => {
             if (!isAdmin) return;
             try {
                const snapshot = await getDocs(ref);
                if (snapshot.empty) {
                    const batch = writeBatch(db);
                    data.forEach(item => {
                        const docRef = doc(collection(db, ref.path));
                        batch.set(docRef, item);
                    });
                    await batch.commit();
                }
             } catch (e) { 
                handleSnapshotError(`popular ${ref.path}`)(e);
             }
        };
        
        const populateInitialSettings = async (ref, data) => {
             if (!isAdmin) return;
             try {
                const docSnap = await getDoc(ref);
                if (!docSnap.exists()) {
                    await setDoc(ref, data);
                }
             } catch (e) { 
                handleSnapshotError(`popular ${ref.path}`)(e);
             }
        };

        // --- Listeners ---
        
        const menuCollectionPath = `artifacts/${appId}/public/data/menu`;
        const menuRef = collection(db, menuCollectionPath);
        populateInitialData(menuRef, INITIAL_MENU_DATA); // Tenta popular se admin
        
        const unsubscribeMenu = onSnapshot(menuRef, (snapshot) => {
            const remoteMenu = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (remoteMenu.length > 0 || isAdmin) {
                 setMenu(remoteMenu);
            }
        }, handleSnapshotError('cardápio')); // OTIMIZAÇÃO 1: Handler usado

        const ordersCollectionPath = `artifacts/${appId}/public/data/orders`;
        const ordersRef = collection(db, ordersCollectionPath);
        const unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(ordersData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
        }, handleSnapshotError('pedidos')); // OTIMIZAÇÃO 1: Handler usado
        
        const feedbackCollectionPath = `artifacts/${appId}/public/data/feedback`;
        const feedbackRef = collection(db, feedbackCollectionPath);
        const unsubscribeFeedbacks = onSnapshot(feedbackRef, (snapshot) => {
            const feedbackData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()}));
            setFeedbacks(feedbackData);
        }, handleSnapshotError('feedbacks')); // OTIMIZAÇÃO 1: Handler usado

        const settingsDocPath = `artifacts/${appId}/public/data/settings`;
        const settingsRef = doc(db, settingsDocPath, 'shopConfig');
        populateInitialSettings(settingsRef, INITIAL_SHOP_SETTINGS); // Tenta popular se admin
       
        const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                setShopSettings(docSnap.data());
            } else {
                setShopSettings(INITIAL_SHOP_SETTINGS);
            }
        }, (err) => {
            handleSnapshotError('configurações')(err); // OTIMIZAÇÃO 1: Handler usado
            setShopSettings(INITIAL_SHOP_SETTINGS); // Fallback em caso de erro
        });


        return () => {
            unsubscribeMenu();
            unsubscribeOrders();
            unsubscribeSettings();
            unsubscribeFeedbacks();
        };
    }, [isAuthReady, isAdmin]); 

    const addToCart = (item, customization, priceOverride) => {
        const applyMinimumOrder = cart.length === 0;
    
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
    const cartTotalQuantity = useMemo(() => cart.reduce((total, item) => {
        if (item.customizable) {
            return total + (item.customization || []).reduce((subTotal, custItem) => subTotal + custItem.quantity, 0);
        }
        return total + item.quantity;
    }, 0), [cart]);

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
                addresses: [], 
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
    
    // --- INÍCIO DA CORREÇÃO ---
    const placeOrder = async (customerDetails) => {
        if (!user || user.isAnonymous) {
            setError("Por favor, faça login para finalizar o pedido.");
            setView('customerLogin');
            return;
        }
        setAuthLoading(true);
        try {
            // OTIMIZAÇÃO 2: O hook foi movido para o CheckoutView.
            // Os totais (subtotal, hasDiscount, etc.) já estão em `customerDetails`.
            const { subtotal, hasDiscount, discountAmount, finalTotal } = customerDetails;
            
            const deliveryDetails = (customerDetails.deliveryMethod === 'deliver' || (customerDetails.deliveryMethod === 'schedule' && customerDetails.address !== shopSettings.pickupAddress)) ? {
                deliveryTracker: {
                    lat: customerDetails.lat,
                    lng: customerDetails.lng,
                    lastUpdate: null,
                    active: false,
                }
            } : {};


            const orderData = {
                ...customerDetails,
                ...deliveryDetails,
                items: cart,
                subtotal: subtotal, // Usando o valor de customerDetails
                total: finalTotal, // Usando o valor de customerDetails
                deliveryFee: customerDetails.deliveryFee || 0,
                distanceKm: customerDetails.distanceKm || 0,
                status: 'Pendente',
                createdAt: new Date(),
                userId: user.uid,
            };

            if (hasDiscount) { // Usando o valor de customerDetails
                orderData.discount = {
                    type: 'feedback',
                    amount: discountAmount, // Usando o valor de customerDetails
                };
            }
            // --- FIM DA CORREÇÃO ---

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
    
    if (!firebaseInitialized && isAuthReady) return <FirebaseErrorScreen />;
    if (!isAuthReady) return <div className="flex justify-center items-center h-screen bg-amber-50"><ChefHat className="animate-spin text-amber-500" size={64} /></div>;

    const isCartButtonVisible = (view === 'menu' || view === 'cart') && cart.length > 0;
    
    const renderView = () => {
        switch (view) {
            case 'cart': return <CartView cart={cart} updateQuantity={updateQuantity} cartTotal={cartTotal.toFixed(2)} setView={setView} emptyCart={() => setCart([])} user={user} />;
            case 'checkout': return <CheckoutView placeOrder={placeOrder} cartTotal={cartTotal} cartTotalQuantity={cartTotalQuantity} cart={cart} setView={setView} initialError={error} user={user} userData={userData} authLoading={authLoading} shopSettings={shopSettings} storeOpen={storeOpen} getWorkingInterval={getWorkingInterval}/>;
            case 'confirmation': return <ConfirmationView setView={setView} showToast={showToast} user={user} userData={userData} />;
            case 'adminLogin': return <LoginView handleLogin={handleLogin} error={error} isAdminLogin={true} authLoading={authLoading} />;
            case 'customerLogin': return <LoginView handleLogin={handleLogin} error={error} setView={setView} authLoading={authLoading} />;
            case 'signUp': return <SignUpView handleSignUp={handleSignUp} error={error} setView={setView} authLoading={authLoading} />;
            case 'myOrders': return <MyOrdersView orders={orders.filter(o => o.userId === user?.uid)} setView={setView} />;
            case 'accountSettings': return <AccountSettingsView user={user} userData={userData} showToast={showToast} setView={setView} db={db} appId={appId} />;
            case 'admin': return isAdmin ? <AdminDashboard menu={menu} orders={orders} feedbacks={feedbacks} handleLogout={handleLogout} showToast={showToast} settings={shopSettings} setView={setView} /> : <MenuView menu={menu} addToCart={addToCart} showStoreClosedToast={showStoreClosedToast} />;
            case 'kitchenView': return <KitchenView orders={orders.filter(o => ['Pendente', 'Em Preparo'].includes(o.status))} setView={setView} />;
            case 'deliveryView': return <DeliveryView orders={orders.filter(o => o.status === 'Pronto para Entrega' || o.status === 'Saiu para Entrega')} setView={setView} db={db} appId={appId} user={user} isAdmin={isAdmin} />;
            case 'manageAgenda': return <ManageAgenda currentSettings={shopSettings} showToast={showToast} db={db} appId={appId} />;
            default: return <MenuView menu={menu} addToCart={addToCart} showStoreClosedToast={showStoreClosedToast} />;
        }
    };

    return (
        <div className="bg-stone-50 min-h-screen font-sans text-stone-800" style={{fontFamily: "'Inter', sans-serif"}}>
            {toastMessage && <Toast message={toastMessage} />}
            {view !== 'kitchenView' && view !== 'deliveryView' && <Header cartCount={cartTotalQuantity} setView={setView} user={user} isAdmin={isAdmin} settings={shopSettings}/>}
            <main className={!['kitchenView', 'deliveryView'].includes(view) ? "p-4 md:p-6 max-w-7xl mx-auto" : ""}>
                {renderView()}
            </main>
            
            <div className={`fixed right-4 z-30 flex flex-col items-end gap-4 transition-all duration-300 ${isCartButtonVisible ? 'bottom-24 md:bottom-4' : 'bottom-6'}`}>
                {isCartButtonVisible && (
                    <button onClick={() => setView('cart')} className="bg-amber-500 text-white font-bold py-3 px-6 rounded-full hover:bg-amber-600 shadow-lg flex items-center gap-3 transform hover:scale-105 active:scale-100 animate-fade-in-up">
                        <ShoppingCart size={22} />
                        <span>Ver Carrinho ({cart.reduce((acc, item) => acc + item.quantity, 0)} itens)</span>
                        <span className="font-normal opacity-80">|</span>
                        <span>{cartTotal.toFixed(2)}€</span>
                    </button>
                )}
                {!isAdmin && <WhatsAppButton settings={shopSettings} />}
            </div>

            {view !== 'kitchenView' && view !== 'deliveryView' && <Footer user={user} setView={setView} handleLogout={handleLogout} isAdmin={isAdmin} />}
        </div>
    );
}

// --- COMPONENTES DE VIEW (UTILITÁRIOS) ---

const Toast = ({ message, isWarning = false }) => (
     <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 ${isWarning ? 'bg-red-600' : 'bg-stone-800'} text-white py-2 px-6 rounded-full shadow-lg z-50 transition-opacity duration-300 animate-fade-in-up`}>
        <p className="flex items-center gap-2">{isWarning ? <AlertTriangle size={16}/> : <CheckCircle size={16}/>} {message}</p>
    </div>
);

const FirebaseErrorScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-800 p-4 text-center">
        <AlertTriangle size={48} className="mb-4 text-red-500" />
        <h1 className="text-2xl font-bold">Erro de Configuração do Firebase</h1>
        <p className="mt-2 max-w-md">Não foi possível estabelecer ligação à base de dados. Isto acontece normalmente quando as Variáveis de Ambiente na Vercel não estão configuradas corretamente.</p>
    </div>
);

const WhatsAppButton = ({ settings }) => {
    if (!settings.whatsappNumber) return null;
    const whatsappLink = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(settings.whatsappMessage || '')}`;
    
    return (
        <div className="group relative flex items-center">
             <div className="absolute right-full mr-3 whitespace-nowrap bg-white text-stone-700 text-sm font-semibold py-2 px-4 rounded-lg shadow-lg transform transition-all duration-300 scale-0 group-hover:scale-100 origin-right">
                Fale Connosco
            </div>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform flex items-center justify-center">
                <MessageSquare size={24}/>
            </a>
        </div>
    );
};

const Header = ({ cartCount, setView, user, isAdmin, settings }) => (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-4 cursor-pointer transition-transform hover:scale-105" onClick={() => setView(isAdmin ? 'admin' : 'menu')}>
                <img src={settings.logoUrl} alt="Logo Salgados da Bia" className="h-14 w-14 object-contain" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100x100/FBBF24/FFFFFF?text=SB'; }} />
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
                        <Package className="text-amber-600" />
                    </button>
                 )}
                 {user && !user.isAnonymous && (
                    <button onClick={() => setView('accountSettings')} className="p-2 rounded-full hover:bg-amber-100 transition-colors" title="Minha Conta">
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

const ConfirmDeleteModal = ({ onConfirm, onCancel, title="Confirmar Exclusão", message="Tem a certeza que quer apagar este item? Esta ação não pode ser desfeita.", confirmText="Apagar" }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 animate-fade-in">
        <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm animate-slide-up">
            <h4 className="text-lg font-bold mb-2">{title}</h4>
            <p className="text-stone-600 mb-6">{message}</p>
            <div className="flex justify-end gap-4">
                <button onClick={onCancel} className="bg-stone-300 text-stone-800 font-bold py-2 px-4 rounded-full hover:bg-stone-400 transition-colors active:scale-95">Cancelar</button>
                <button onClick={onConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded-full hover:bg-red-700 transition-colors active:scale-95">{confirmText}</button>
            </div>
        </div>
    </div>
);


// --- COMPONENTES DE VIEW (CLIENTE) ---

const MenuView = ({ menu, addToCart, showStoreClosedToast }) => {
    const [customizingBox, setCustomizingBox] = useState(null);
    
    const handleCustomizeClick = (boxItem) => {
        const allowed = boxItem.allowedCategories || (boxItem.name.toLowerCase().includes('especial') || boxItem.name.toLowerCase().includes('gigante') ? ['Salgados Tradicionais', 'Salgados Especiais'] : ['Salgados Tradicionais']);
        
        const availableSalgados = menu.filter(item => 
            allowed.includes(item.category) && !item.customizable && item.isAvailable !== false
        );

        setCustomizingBox({ box: boxItem, availableSalgados });
    };

    const categories = [...new Set(menu.filter(item => item.isAvailable !== false).map(item => item.category))].sort((a,b) => a === 'Boxes' ? -1 : b === 'Boxes' ? 1 : a.localeCompare(b));

    return (
        <div className="animate-fade-in">
             {showStoreClosedToast && (
                <Toast 
                    message="A loja está fechada. Pedidos serão processados no próximo horário. Use 'Encomendar'." 
                    isWarning={true}
                />
            )}
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
        </div>
    );
};

const MenuItemCard = ({ item, onOrderClick }) => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group">
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
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-slide-up">
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
                                    <button onClick={() => handleSelectionChange(salgado.id, 10)} className="text-xs font-bold w-9 h-9 rounded-md bg-amber-300 text-amber-900 hover:bg-amber-400 transition-colors active:scale-90">+10</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t mt-auto bg-stone-50 rounded-b-xl">
                         {error && <p className="text-red-500 text-center text-sm mb-2">{error}</p>}
                         <button 
                            onClick={handleAddToCart} 
                            disabled={totalSelected < box.size}
                            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-all duration-200 disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform active:scale-95"
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
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-lg animate-fade-in">
            {confirmingEmpty && <ConfirmDeleteModal title="Esvaziar Carrinho" message="Tem a certeza que quer remover todos os itens do carrinho?" onConfirm={handleEmptyCart} onCancel={() => setConfirmingEmpty(false)} confirmText="Esvaziar" />}
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold text-stone-800">Meu Carrinho</h2>
                 <button onClick={() => setConfirmingEmpty(true)} className="text-sm text-red-500 hover:underline flex items-center gap-1"><Trash2 size={14}/> Esvaziar Carrinho</button>
            </div>
            <div className="space-y-4">
                {cart.map((item, index) => (
                    <div key={item.id + index} className="flex items-start justify-between border-b pb-4">
                        <div className="flex items-start gap-4">
                            <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/FBBF24/FFFFFF?text=Item'; }}/>
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

const CheckoutView = ({ placeOrder, cart, cartTotal, cartTotalQuantity, setView, initialError, user, userData, authLoading, shopSettings, storeOpen, getWorkingInterval }) => {
    const isLargeOrder = cartTotalQuantity >= 150;
    const hasScheduledItem = cart.some(item => item.requiresScheduling);
    const forceScheduling = isLargeOrder || hasScheduledItem || !storeOpen;

    const [deliveryMethod, setDeliveryMethod] = useState(forceScheduling ? 'schedule' : 'deliver');
    const [selectedAddress, setSelectedAddress] = useState(null); 
    const [newAddressDetails, setNewAddressDetails] = useState({
        cep: '', street: '', number: '', district: '', city: '', state: '', lat: null, lng: null
    });
    const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
    
    const [pickupTime, setPickupTime] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    
    const [formError, setFormError] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [deliveryDistance, setDeliveryDistance] = useState(0);
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const [deliveryError, setDeliveryError] = useState(''); 
    
    const [cepLoading, setCepLoading] = useState(false); 

    const addresses = userData?.addresses || [];
    const name = userData?.name || user?.displayName || '';
    const phone = userData?.phone || '';

    // OTIMIZAÇÃO 2: Usando o hook de totais
    const { subtotal, hasDiscount, discountAmount, finalTotal } = useCartTotals(
        cartTotal, 
        userData, 
        deliveryFee
    );
    
    useEffect(() => {
        if (forceScheduling) {
             setDeliveryMethod('schedule');
        }
    }, [forceScheduling]);
    
    useEffect(() => {
        if (deliveryMethod !== 'deliver') {
            setDeliveryFee(0);
            setDeliveryDistance(0);
            setDeliveryError('');
            return;
        }

        let targetAddress = null;
        if (isAddingNewAddress && newAddressDetails.lat && newAddressDetails.lng) {
            targetAddress = newAddressDetails;
        } else if (selectedAddress) {
            targetAddress = addresses.find(a => a.id === selectedAddress);
        }

        if (!targetAddress) {
            setDeliveryFee(0);
            setDeliveryDistance(0);
            setDeliveryError(''); 
            return;
        }

        const calculateFee = async () => {
            setIsCalculatingDistance(true);
            setDeliveryError('');
            
            const originLat = shopSettings.storeLatitude;
            const originLng = shopSettings.storeLongitude;
            const destLat = targetAddress.lat;
            const destLng = targetAddress.lng;

            if (!originLat || !originLng || !destLat || !destLng) {
                setDeliveryError("Endereço da loja ou do cliente inválido.");
                setIsCalculatingDistance(false);
                return;
            }

            try {
                const distanceMeters = await getDistanceFromCoords(originLat, originLng, destLat, destLng);
                if (distanceMeters === null) {
                    setDeliveryError("Não foi possível calcular a rota para este endereço.");
                    setIsCalculatingDistance(false);
                    return;
                }
                
                const distanceKm = distanceMeters / 1000;
                setDeliveryDistance(distanceKm);

                const maxRadius = shopSettings.deliveryMaxRadiusKm || 17;
                if (distanceKm > maxRadius) {
                    setDeliveryError(`Lamentamos, este endereço está a ${distanceKm.toFixed(1)} KM. O nosso limite atual é ${maxRadius} KM. Por favor, escolha "Retirar" ou "Encomendar".`);
                    setDeliveryFee(0);
                    setIsCalculatingDistance(false);
                    return;
                }

                // REQUISITO: Se a distância for menor que 1km, a taxa é gratuita.
                if (distanceKm < 1) {
                    setDeliveryFee(0);
                } else {
                    const pricePerKm = shopSettings.deliveryPricePerKm || 1;
                    const fee = distanceKm * pricePerKm;
                    setDeliveryFee(fee);
                }

            } catch (error) {
                console.error(error);
                setDeliveryError("Erro ao calcular a taxa de entrega.");
            } finally {
                setIsCalculatingDistance(false);
            }
        };

        calculateFee();
        
    }, [deliveryMethod, selectedAddress, isAddingNewAddress, newAddressDetails, addresses, shopSettings]);


    const validateScheduledTime = (date, time) => {
        if (!date || !time) return '';

        const interval = getWorkingInterval(shopSettings.workingHours, date);
        if (!interval) return 'A loja está fechada na data selecionada. Por favor, escolha outro dia.';
        
        const { start, end } = interval;
        
        if (start > end) {
            if (time < start && time >= end) {
                 return `O horário de funcionamento para ${date} é das ${start} até ${end} (do dia seguinte).`;
            }
        } else {
            if (time < start || (end !== '00:00' && time >= end)) {
                return `O horário de funcionamento para ${date} é das ${start} às ${end}.`;
            }
        }
        
        try {
            const storeNow = new Date(new Date().toLocaleString("en-US", { timeZone: shopSettings.storeTimezone }));
            storeNow.setMinutes(0, 0, 0);
            const selectedDate = new Date(`${date}T${time}:00`);
            
            if (selectedDate < storeNow) {
                 return 'Não é possível agendar para uma data ou hora no passado.';
            }
        } catch(e) { console.error("Erro ao validar data de agendamento:", e); }

        return ''; 
    };

    const handleCepLookup = async (cep) => {
        const cleanedCep = cep.replace(/\D/g, '');
        if (cleanedCep.length < 7) return; 
        
        setCepLoading(true);
        setFormError('');
        try {
            const result = await getCoordsFromAddress(null, cleanedCep);
            if (result && result.address) {
                setNewAddressDetails({
                    ...result.address,
                    lat: result.lat,
                    lng: result.lng,
                });
            } else {
                setFormError("CEP não encontrado ou inválido.");
            }
        } catch (e) { console.error("Erro ao buscar CEP:", e); setFormError("Erro ao buscar CEP."); }
        finally { setCepLoading(false); }
    };
    
    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            setFormError('Seu navegador não suporta geolocalização.');
            return;
        }
        setFormError('');
        setCepLoading(true);
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const addressResult = await getAddressFromCoords(latitude, longitude);
                if (addressResult) {
                     setNewAddressDetails({
                        ...addressResult,
                        lat: latitude,
                        lng: longitude,
                    });
                    setIsAddingNewAddress(true);
                } else {
                     setFormError('Não foi possível encontrar um endereço para esta localização.');
                }
            } catch (error) {
                 setFormError('Erro ao buscar endereço pela localização.');
                 console.error(error);
            } finally {
                setCepLoading(false);
            }
        }, (error) => {
            setFormError(`Erro de localização: ${error.message}`);
            setCepLoading(false);
        });
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');
        
        if (deliveryError) {
            setFormError(deliveryError);
            return;
        }
        
        let finalAddress = null;

        if (deliveryMethod === 'deliver' || (deliveryMethod === 'schedule' && (selectedAddress || isAddingNewAddress))) {
            if (isAddingNewAddress) {
                if (!newAddressDetails.street || !newAddressDetails.number) { 
                    setFormError('Preencha a Rua e o Número para o novo endereço.'); 
                    return; 
                }
                finalAddress = newAddressDetails;
            } else if (selectedAddress) {
                finalAddress = addresses.find(addr => addr.id === selectedAddress);
            }
            
            if (!finalAddress) {
                setFormError('Selecione ou adicione um endereço de entrega válido.');
                return;
            }
        }

        if (deliveryMethod === 'pickup' && !pickupTime) { setFormError('Por favor, selecione um horário para retirada.'); return; }
        
        if (deliveryMethod === 'schedule') {
             const scheduleError = validateScheduledTime(scheduledDate, scheduledTime);
             if (scheduleError) {
                 setFormError(scheduleError);
                 return;
             }
        }

        // --- INÍCIO DA CORREÇÃO ---
        const details = { 
            name, 
            phone, 
            deliveryMethod, 
            // Passando todos os valores calculados
            subtotal: subtotal,
            hasDiscount: hasDiscount,
            discountAmount: discountAmount,
            total: finalTotal, 
            // Fim da adição
            deliveryFee: deliveryFee, 
            distanceKm: deliveryDistance 
        };
        // --- FIM DA CORREÇÃO ---

        if (deliveryMethod === 'deliver') {
            details.address = `${finalAddress.street}, ${finalAddress.number}, ${finalAddress.district}, ${finalAddress.city}`;
            details.lat = finalAddress.lat;
            details.lng = finalAddress.lng;
            details.isScheduled = false;
        } else if (deliveryMethod === 'pickup') {
            details.pickupTime = pickupTime;
            details.address = `Retirada em: ${shopSettings.pickupAddress}`;
            details.isScheduled = false;
        } else { // schedule
            if (!scheduledDate || !scheduledTime) { setFormError('Por favor, selecione data e hora para a encomenda.'); return; }
            details.scheduledDate = scheduledDate;
            details.scheduledTime = scheduledTime;
            
            if (finalAddress) {
                details.address = `${finalAddress.street}, ${finalAddress.number}, ${finalAddress.district}, ${finalAddress.city}`;
                details.lat = finalAddress.lat;
                details.lng = finalAddress.lng;
            } else {
                 details.address = `Retirada em: ${shopSettings.pickupAddress}`;
            }
            details.isScheduled = true;
        }

        placeOrder(details);
    };

    const todayDate = new Date().toISOString().split('T')[0];

    return (
        <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-stone-800">Finalizar Pedido</h2>
            
             {forceScheduling && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-xl" role="alert">
                    <p className="font-bold">Apenas Encomenda Disponível</p>
                    <p>O seu pedido contém itens especiais, excede 150 unidades, ou a loja está fechada. Apenas agendamento é permitido.</p>
                </div>
            )}

            <div className="mb-6">
                <div className="flex border border-stone-300 rounded-xl p-1 bg-stone-100">
                    <button 
                        onClick={() => setDeliveryMethod('deliver')} 
                        disabled={forceScheduling || (deliveryError && deliveryMethod === 'deliver')} 
                        className={`w-1/3 py-2 rounded-lg font-semibold transition-colors ${deliveryMethod === 'deliver' ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-amber-200'} disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed`}
                    >
                        Entregar
                    </button>
                    <button onClick={() => setDeliveryMethod('pickup')} disabled={forceScheduling} className={`w-1/3 py-2 rounded-lg font-semibold transition-colors ${deliveryMethod === 'pickup' ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-amber-200'} disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed`}>
                        Retirar
                    </button>
                    <button onClick={() => setDeliveryMethod('schedule')} className={`w-1/3 py-2 rounded-lg font-semibold transition-colors ${deliveryMethod === 'schedule' ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-amber-200'}`}>
                        Encomendar
                    </button>
                </div>
            </div>

            <div className="bg-stone-100 p-4 rounded-xl mb-4 space-y-2">
                <div><span className="font-bold text-stone-600">Nome: </span><span>{name || "Não definido"}</span></div>
                <div><span className="font-bold text-stone-600">Telefone: </span><span>{phone || "Não definido"}</span></div>
                <p className="text-xs text-stone-500">Para alterar estes dados, vá para <button type="button" onClick={() => setView('accountSettings')} className="font-bold underline">Minha Conta</button>.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                 {(deliveryMethod === 'deliver' || (deliveryMethod === 'schedule' && !isAddingNewAddress)) && (
                     <div className="p-4 bg-stone-50 rounded-xl border">
                         <h3 className="font-bold mb-2 text-stone-700">Morada para {deliveryMethod === 'deliver' ? 'Entrega' : 'Encomenda'}</h3>
                         {addresses.length > 0 && (
                            <div className="space-y-2 mb-3">
                                <label className="block text-stone-700 font-bold text-sm">Endereços Cadastrados</label>
                                <select 
                                    value={selectedAddress || ''} 
                                    onChange={e => { setSelectedAddress(e.target.value); setIsAddingNewAddress(false); }}
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" 
                                    required={deliveryMethod === 'deliver' && !isAddingNewAddress}
                                >
                                    <option value="">Selecione um endereço</option>
                                    {addresses.map(addr => (
                                        <option key={addr.id} value={addr.id}>{addr.street}, {addr.number} ({addr.city})</option>
                                    ))}
                                </select>
                            </div>
                         )}
                         <button 
                            type="button" 
                            onClick={() => { setIsAddingNewAddress(true); setSelectedAddress(null); setNewAddressDetails({ cep: '', street: '', number: '', district: '', city: '', state: '', lat: null, lng: null }); }} 
                            className="text-amber-600 font-semibold text-sm hover:underline flex items-center gap-1 mt-2"
                         >
                            <Plus size={16}/> Adicionar Novo Endereço
                         </button>
                     </div>
                 )}

                {isAddingNewAddress && (
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
                        <h3 className="font-bold text-lg text-red-700 flex justify-between items-center">
                            Novo Endereço de Entrega
                            <button type="button" onClick={() => setIsAddingNewAddress(false)} className="text-red-500 hover:text-red-700"><XCircle size={20}/></button>
                        </h3>
                        
                        <div className="flex items-center gap-2">
                             <input type="text" placeholder="CEP (Ex: 3500-038)" value={newAddressDetails.cep} onChange={e => setNewAddressDetails(p => ({...p, cep: e.target.value}))} onBlur={(e) => handleCepLookup(e.target.value)} className="w-1/2 p-2 border border-stone-300 rounded-xl focus:ring-amber-400" />
                             <button type="button" onClick={handleCurrentLocation} disabled={cepLoading} className="w-1/2 bg-blue-500 text-white font-bold py-2 px-3 rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                                {cepLoading ? <Loader2 className="animate-spin" size={18}/> : <><MapPin size={18}/> Localização Atual</>}
                             </button>
                        </div>
                        <input type="text" name="street" placeholder="Rua / Logradouro" value={newAddressDetails.street} onChange={e => setNewAddressDetails(p => ({...p, street: e.target.value}))} className="w-full p-2 border border-stone-300 rounded-xl focus:ring-amber-400" required />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="text" name="number" placeholder="Número" value={newAddressDetails.number} onChange={e => setNewAddressDetails(p => ({...p, number: e.target.value}))} className="w-full p-2 border border-stone-300 rounded-xl focus:ring-amber-400" required />
                            <input type="text" name="district" placeholder="Bairro" value={newAddressDetails.district} onChange={e => setNewAddressDetails(p => ({...p, district: e.target.value}))} className="w-full p-2 border border-stone-300 rounded-xl focus:ring-amber-400" required />
                        </div>
                        <input type="text" name="city" placeholder="Município/Cidade" value={newAddressDetails.city} onChange={e => setNewAddressDetails(p => ({...p, city: e.target.value}))} className="w-full p-2 border border-stone-300 rounded-xl focus:ring-amber-400" required />
                    </div>
                )}
                
                {deliveryMethod === 'pickup' && (
                    <div>
                        <label htmlFor="pickupTime" className="block text-stone-700 font-bold mb-2">Horário para Retirada</label>
                        <input type="time" id="pickupTime" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                        <div className="mt-2 bg-stone-100 p-3 rounded-xl text-sm">
                            <p className="font-bold">Endereço de Retirada:</p>
                            <p className="text-stone-600">{shopSettings.pickupAddress}</p>
                        </div>
                    </div>
                )}
                
                {deliveryMethod === 'schedule' && (
                    <div className="space-y-4 bg-stone-50 p-4 rounded-xl">
                        <h3 className="font-bold text-lg">Agendar Encomenda</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label htmlFor="scheduledDate" className="block text-stone-700 font-bold mb-2">Data</label>
                               <input type="date" id="scheduledDate" min={todayDate} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl" required />
                            </div>
                             <div>
                               <label htmlFor="scheduledTime" className="block text-stone-700 font-bold mb-2">Hora</label>
                               <input type="time" id="scheduledTime" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl" required />
                            </div>
                        </div>
                        {scheduledDate && scheduledTime && validateScheduledTime(scheduledDate, scheduledTime) && (
                            <div className="text-red-600 text-sm font-semibold p-2 bg-red-100 rounded-xl">
                                <AlertTriangle size={16} className="inline mr-1"/> {validateScheduledTime(scheduledDate, scheduledTime)}
                            </div>
                        )}
                        <p className="text-sm text-stone-500">Selecione um endereço acima (ou adicione um novo) para entrega, ou deixe em branco para retirar no local.</p>
                    </div>
                )}
                
                {formError && <p className="text-red-500 text-center">{formError}</p>}
                {initialError && <p className="text-red-500 text-center">{initialError}</p>}
                
                {deliveryMethod === 'deliver' && (
                    <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold text-lg mb-2">Detalhes da Entrega</h4>
                        {isCalculatingDistance ? (
                             <div className="flex items-center gap-2 text-stone-600">
                                <Loader2 className="animate-spin" size={16} />
                                <span>Calculando rota e taxa...</span>
                             </div>
                        ) : (
                            <div>
                                {deliveryError ? (
                                    <div className="text-red-600 text-sm font-semibold p-3 bg-red-100 rounded-xl">
                                        <AlertTriangle size={16} className="inline mr-1"/> {deliveryError}
                                    </div>
                                ) : (
                                    deliveryDistance > 0 && (
                                        <div className="space-y-1">
                                            <p>Distância: <span className="font-bold">{deliveryDistance.toFixed(2)} KM</span></p>
                                            <p>Taxa de Entrega: <span className="font-bold">{deliveryFee.toFixed(2)}€</span></p>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="border-t pt-6 mt-2">
                    <div className="space-y-1 text-right mb-4">
                        <p className="text-md">Subtotal: <span className="font-semibold">{subtotal.toFixed(2)}€</span></p>
                        {hasDiscount && (
                            <p className="text-md text-green-600 flex items-center justify-end gap-1">
                                <Percent size={14}/> Desconto Feedback (5%): <span className="font-semibold">-{discountAmount.toFixed(2)}€</span>
                            </p>
                        )}
                        {deliveryFee > 0 && (
                             <p className="text-md">Taxa de Entrega: <span className="font-semibold">+{deliveryFee.toFixed(2)}€</span></p>
                        )}
                        <p className="text-xl">Total a Pagar: <span className="font-bold text-2xl">{finalTotal.toFixed(2)}€</span></p>
                    </div>

                    <button 
                        type="submit" 
                        disabled={authLoading || isCalculatingDistance || !!deliveryError || formError || (deliveryMethod === 'schedule' && validateScheduledTime(scheduledDate, scheduledTime))} 
                        className="w-full bg-green-500 text-white font-bold py-3 rounded-full hover:bg-green-600 transition-colors text-lg shadow hover:shadow-lg active:scale-95 flex justify-center items-center disabled:bg-stone-400"
                    >
                        {authLoading || isCalculatingDistance ? <Loader2 className="animate-spin" /> : "Confirmar Pedido"}
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
             <div className="text-center py-16 max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg animate-fade-in">
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
        <div className="text-center py-16 max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg animate-fade-in">
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
        <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg animate-fade-in">
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
                    <select id="howFound" value={howFound} onChange={e => setHowFound(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" required>
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
                 <button type="submit" disabled={isSubmitting} className="w-full bg-green-500 text-white font-bold py-2 rounded-full hover:bg-green-600 transition-colors shadow hover:shadow-lg active:scale-95 flex justify-center items-center disabled:bg-green-300">
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
        <div className="max-w-sm mx-auto mt-10 bg-white p-8 rounded-xl shadow-xl animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-6">{isAdminLogin ? 'Acesso Administrador' : 'Entrar na sua Conta'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-stone-700 font-bold mb-2">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                <div>
                    <label className="block text-stone-700 font-bold mb-2">Senha</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                {error && <p className="text-red-500 text-center">{error}</p>}
                <button type="submit" disabled={authLoading} className="w-full bg-amber-500 text-white font-bold py-2 rounded-full hover:bg-amber-600 transition-colors shadow hover:shadow-lg active:scale-95 flex justify-center items-center disabled:bg-amber-300">
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
}

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
        <div className="max-w-sm mx-auto mt-10 bg-white p-8 rounded-xl shadow-xl animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-6">Criar Conta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-stone-700 font-bold mb-2">Nome Completo</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                 <div>
                    <label className="block text-stone-700 font-bold mb-2">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                <div>
                    <label className="block text-stone-700 font-bold mb-2">Senha</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                 <div>
                    <label className="block text-sm font-bold mb-2">Confirmar Senha</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>
                {localError && <p className="text-red-500 text-center">{localError}</p>}
                {error && <p className="text-red-500 text-center">{error}</p>}
                <button type="submit" disabled={authLoading} className="w-full bg-amber-500 text-white font-bold py-2 rounded-full hover:bg-amber-600 transition-colors shadow hover:shadow-lg active:scale-95 flex justify-center items-center disabled:bg-amber-300">
                    {authLoading ? <Loader2 className="animate-spin" /> : "Criar Conta"}
                </button>
                 <p className="text-center text-sm text-stone-600 pt-2">
                    Já tem conta? <button type="button" onClick={() => setView('customerLogin')} className="text-amber-600 font-bold hover:underline">Entre aqui.</button>
                </p>
            </form>
        </div>
    );
}

const AddressForm = ({ address, onSave, onCancel, showToast }) => {
    const [formData, setFormData] = useState(address || { cep: '', street: '', number: '', district: '', city: '', state: '', lat: null, lng: null });
    const [cepLoading, setCepLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleCepLookup = async (cep) => {
        const cleanedCep = cep.replace(/\D/g, '');
        if (cleanedCep.length < 7) return;
        
        setCepLoading(true);
        setFormError('');
        try {
            const result = await getCoordsFromAddress(null, cleanedCep);
            if (result && result.address) {
                setFormData(prev => ({
                    ...prev,
                    ...result.address,
                    lat: result.lat,
                    lng: result.lng,
                }));
            } else {
                 setFormError("CEP não encontrado ou inválido.");
            }
        } catch (e) { console.error("Erro ao buscar CEP:", e); setFormError("Erro ao buscar CEP."); }
        finally { setCepLoading(false); }
    };
    
    const handleCurrentLocation = () => {
         if (!navigator.geolocation) {
            setFormError('Seu navegador não suporta geolocalização.');
            return;
        }
        setFormError('');
        setCepLoading(true);
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const addressResult = await getAddressFromCoords(latitude, longitude);
                if (addressResult) {
                     setFormData({
                        ...addressResult,
                        lat: latitude,
                        lng: longitude,
                    });
                    showToast("Localização atual preenchida com sucesso!");
                } else {
                     setFormError('Não foi possível encontrar um endereço para esta localização.');
                }
            } catch (error) {
                 setFormError('Erro ao buscar endereço pela localização.');
                 console.error(error);
            } finally {
                setCepLoading(false);
            }
        }, (error) => {
            setFormError(`Erro de localização: ${error.message}`);
            setCepLoading(false);
        });
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.street || !formData.number || !formData.district || !formData.city) {
            setFormError('Preencha todos os campos de endereço obrigatórios.');
            return;
        }
        if (!formData.lat || !formData.lng) {
             setFormError('Endereço inválido. Tente usar o CEP ou "Localização Atual" para garantir as coordenadas.');
             return;
        }
        setFormError('');
        onSave(formData);
    };

    return (
         <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 animate-fade-in">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                <h4 className="text-xl font-bold mb-4">{address ? 'Editar Endereço' : 'Adicionar Novo Endereço'}</h4>
                
                <div className="space-y-3">
                     <div className="flex items-center gap-2">
                         <input type="text" name="cep" placeholder="CEP (Ex: 3500-038)" value={formData.cep} onChange={handleChange} onBlur={(e) => handleCepLookup(e.target.value)} className="w-1/2 p-2 border border-stone-300 rounded-xl focus:ring-amber-400" />
                         <button type="button" onClick={handleCurrentLocation} disabled={cepLoading} className="w-1/2 bg-blue-500 text-white font-bold py-2 px-3 rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                            {cepLoading ? <Loader2 className="animate-spin" size={18}/> : <><MapPin size={18}/> Localização Atual</>}
                         </button>
                    </div>
                    <input type="text" name="street" placeholder="Rua / Logradouro" value={formData.street} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl focus:ring-amber-400" required />
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" name="number" placeholder="Número" value={formData.number} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl focus:ring-amber-400" required />
                        <input type="text" name="district" placeholder="Bairro" value={formData.district} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl focus:ring-amber-400" required />
                    </div>
                    <input type="text" name="city" placeholder="Município/Cidade" value={formData.city} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl focus:ring-amber-400" required />
                </div>
                 {formError && <p className="text-red-500 text-sm mt-3">{formError}</p>}
                 <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onCancel} className="bg-stone-300 text-stone-800 font-bold py-2 px-4 rounded-full hover:bg-stone-400 active:scale-95 transition-colors">Cancelar</button>
                    <button type="submit" className="bg-amber-500 text-white font-bold py-2 px-4 rounded-full hover:bg-amber-600 active:scale-95 transition-colors">Salvar Endereço</button>
                </div>
            </form>
        </div>
    );
}

const AccountSettingsView = ({ user, userData, showToast, setView, db, appId }) => {
    const [name, setName] = useState(userData?.name || user?.displayName || '');
    const [phone, setPhone] = useState(userData?.phone || '');
    const [isSaving, setIsSaving] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [deletingAddressId, setDeletingAddressId] = useState(null);

    const addresses = userData?.addresses || [];

    const handleSaveUserData = async () => {
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
    
    const handleSaveAddress = async (newAddressData) => {
        try {
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
            let updatedAddresses = [...addresses];

            if (newAddressData.id) {
                updatedAddresses = updatedAddresses.map(addr => addr.id === newAddressData.id ? newAddressData : addr);
            } else {
                if (!newAddressData.lat || !newAddressData.lng) {
                    showToast("Erro: Endereço sem coordenadas. Tente usar 'Localização Atual'.");
                    return;
                }
                const newId = crypto.randomUUID();
                updatedAddresses.push({ ...newAddressData, id: newId });
            }

            await updateDoc(userDocRef, { addresses: updatedAddresses });
            showToast("Endereço salvo com sucesso!");
            setEditingAddress(null);
        } catch (error) {
            console.error("Erro ao salvar endereço:", error);
            showToast("Erro ao salvar endereço.");
        }
    };
    
    const handleDeleteAddressConfirm = async () => {
         try {
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
            const updatedAddresses = addresses.filter(addr => addr.id !== deletingAddressId);
            await updateDoc(userDocRef, { addresses: updatedAddresses });
            showToast("Endereço removido com sucesso!");
            setDeletingAddressId(null);
        } catch (error) {
            console.error("Erro ao remover endereço:", error);
            showToast("Erro ao remover endereço.");
        }
    };
    
    return (
        <div className="max-w-2xl mx-auto">
             {editingAddress && <AddressForm address={editingAddress.data} onSave={handleSaveAddress} onCancel={() => setEditingAddress(null)} showToast={showToast} />}
             {deletingAddressId && <ConfirmDeleteModal title="Remover Endereço" message="Tem certeza que deseja remover este endereço?" onConfirm={handleDeleteAddressConfirm} onCancel={() => setDeletingAddressId(null)} confirmText="Remover" />}
             
             <h2 className="text-3xl font-bold mb-6 text-stone-800">Minha Conta</h2>
              <div className="bg-white p-6 rounded-xl shadow-lg space-y-4 mb-8">
                  <h3 className="font-bold text-xl text-amber-600 border-b pb-2">Dados Pessoais</h3>
                  <div>
                      <label className="block text-sm font-bold mb-1 text-stone-600">Nome Completo</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-stone-300 rounded-xl" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold mb-1 text-stone-600">Telefone de Contato</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border border-stone-300 rounded-xl" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold mb-1 text-stone-600">Email</label>
                      <input type="email" value={user?.email || ''} className="w-full p-2 border bg-stone-100 border-stone-300 rounded-xl" disabled />
                  </div>
                  <div className="pt-4 flex justify-between items-center">
                      <button onClick={handleSaveUserData} disabled={isSaving} className="bg-amber-500 text-white font-bold py-2 px-6 rounded-full hover:bg-amber-600 transition-colors shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center disabled:bg-amber-300 w-40">
                          {isSaving ? <Loader2 className="animate-spin" /> : "Salvar Dados"}
                      </button>
                      <button onClick={() => setView('myOrders')} className="text-stone-600 font-semibold hover:underline">Ver meus pedidos</button>
                  </div>
              </div>
              
               <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-bold text-xl text-amber-600">Meus Endereços ({addresses.length})</h3>
                       <button onClick={() => setEditingAddress({})} className="text-sm font-semibold text-green-600 hover:underline flex items-center gap-1"><Plus size={16}/> Adicionar</button>
                  </div>
                  {addresses.length === 0 ? (
                      <p className="text-stone-500">Nenhum endereço cadastrado. Adicione um para agilizar seus pedidos!</p>
                  ) : (
                      <div className="space-y-3">
                          {addresses.map(addr => (
                              <div key={addr.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center">
                                  <p className="text-stone-700 font-semibold">{addr.street}, {addr.number} ({addr.city})</p>
                                  <div className="flex gap-2">
                                      <button onClick={() => setEditingAddress({ data: addr })} className="p-1 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"><Edit size={18} /></button>
                                      <button onClick={() => setDeletingAddressId(addr.id)} className="p-1 text-red-600 hover:bg-red-100 rounded-full transition-colors"><Trash2 size={18}/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
        </div>
    );
}

const DeliveryTrackerComponent = ({ order }) => {
    const { deliveryTracker } = order;
    
    if (!deliveryTracker || !deliveryTracker.active || order.status !== 'Saiu para Entrega') {
        return (
            <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-3 mt-4 rounded-xl flex items-center gap-3">
                <Satellite size={20} />
                <p className="text-sm">Rastreamento Inativo. Aguardando o entregador iniciar a rota.</p>
            </div>
        );
    }
    
    const estimatedTime = Math.floor(Math.random() * 11) + 5; 
    
    const mapCenter = `${deliveryTracker.lat},${deliveryTracker.lng}`;
    const destination = `${order.lat},${order.lng}`;

    const mapUrl = `https://maps.google.com/maps?q=${mapCenter}&z=14&t=k&output=embed`;

    const lastUpdate = deliveryTracker.lastUpdate ? new Date(deliveryTracker.lastUpdate.seconds * 1000).toLocaleTimeString('pt-PT') : 'N/A';

    return (
        <div className="mt-4 p-4 bg-white border border-green-200 rounded-xl shadow-inner">
            <h4 className="font-bold text-lg text-green-600 flex items-center gap-2"><MapPin size={20}/> Entrega em Tempo Real</h4>
            <p className="text-sm text-stone-600 mb-2">Última atualização: {lastUpdate}</p>
            <p className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
                <Bike size={20}/> Estimativa de Entrega: {estimatedTime} min
            </p>
            
            <div className="relative w-full h-64 overflow-hidden rounded-xl border border-stone-300">
                <iframe 
                    title="Localização do Entregador" 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    style={{border:0}} 
                    src={mapUrl}
                    allowFullScreen 
                    loading="lazy"
                ></iframe>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Bike size={36} className="text-purple-600 bg-white p-1 rounded-full border-2 border-purple-600 shadow-xl animate-bounce"/>
                </div>
            </div>
            <p className="text-xs text-stone-500 mt-2">O ponto central do mapa representa a localização atualizada do seu entregador.</p>
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
                    <div key={order.id} className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-stone-200">
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
                                <p className="text-sm text-green-600 mt-2 font-semibold">Desconto aplicado: -{order.discount.amount.toFixed(2)}€</p>
                            )}
                            {order.deliveryFee > 0 && (
                                <p className="text-sm text-stone-600 mt-2 font-semibold">Taxa de Entrega ({order.distanceKm > 0 ? order.distanceKm.toFixed(1) : '...'} KM): +{order.deliveryFee.toFixed(2)}€</p>
                            )}
                            {order.deliveryTracker && (order.status === 'Saiu para Entrega' || order.status === 'Pronto para Entrega') && <DeliveryTrackerComponent order={order} />}
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- COMPONENTES DE VIEW (ADMIN) ---

const AdminStats = ({ orders }) => {
    const totalRevenue = useMemo(() => orders.filter(o => o.status === 'Concluído').reduce((acc, order) => acc + order.total, 0), [orders]);
    const pendingOrders = useMemo(() => orders.filter(o => ['Pendente', 'Em Preparo', 'Pronto para Entrega', 'Saiu para Entrega'].includes(o.status)).length, [orders]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-stone-100 p-4 rounded-xl shadow-lg flex items-center gap-4">
                <div className="bg-blue-200 p-3 rounded-full"><Package className="text-blue-600" size={24}/></div>
                <div>
                    <p className="text-sm text-stone-500">Total de Pedidos</p>
                    <p className="text-2xl font-bold text-stone-800">{orders.length}</p>
                </div>
            </div>
            <div className="bg-stone-100 p-4 rounded-xl shadow-lg flex items-center gap-4">
                <div className="bg-green-200 p-3 rounded-full"><DollarSign className="text-green-600" size={24}/></div>
                <div>
                    <p className="text-sm text-stone-500">Faturamento (Concluídos)</p>
                    <p className="text-2xl font-bold text-stone-800">{totalRevenue.toFixed(2)}€</p>
                </div>
            </div>
            <div className="bg-stone-100 p-4 rounded-xl shadow-lg flex items-center gap-4">
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
            case 'feedbacks': return <FeedbacksView feedbacks={feedbacks} showToast={showToast} />;
            case 'manageAgenda': return <ManageAgenda currentSettings={settings} showToast={showToast} db={db} appId={appId}/>;
            default: return <AdminStats orders={orders} />;
        }
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4">
                <h2 className="text-3xl font-bold text-stone-800">Painel de Admin</h2>
                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    <button onClick={() => setView('kitchenView')} className="bg-stone-800 text-white font-semibold py-2 px-4 rounded-full hover:bg-stone-900 transition-colors text-sm">Visão Cozinha</button>
                    <button onClick={() => setView('deliveryView')} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-full hover:bg-blue-700 transition-colors text-sm">Visão Entregador</button>
                    <button onClick={handleLogout} title="Sair" className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors"><LogOut /></button>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-6 border-b">
                <button onClick={() => setAdminView('dashboard')} className={`px-4 py-2 font-semibold text-sm rounded-t-xl flex items-center gap-2 transition-colors ${adminView === 'dashboard' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><Package size={16}/> Resumo</button>
                <button onClick={() => setAdminView('orders')} className={`px-4 py-2 font-semibold text-sm rounded-t-xl flex items-center gap-2 transition-colors ${adminView === 'orders' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><ShoppingCart size={16}/> Pedidos</button>
                <button onClick={() => setAdminView('menu')} className={`px-4 py-2 font-semibold text-sm rounded-t-xl flex items-center gap-2 transition-colors ${adminView === 'menu' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><ChefHat size={16}/> Cardápio</button>
                <button onClick={() => setAdminView('faturamento')} className={`px-4 py-2 font-semibold text-sm rounded-t-xl flex items-center gap-2 transition-colors ${adminView === 'faturamento' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><TrendingUp size={16}/> Faturamento</button>
                <button onClick={() => setAdminView('feedbacks')} className={`px-4 py-2 font-semibold text-sm rounded-t-xl flex items-center gap-2 transition-colors ${adminView === 'feedbacks' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><Star size={16}/> Feedbacks</button>
                <button onClick={() => setAdminView('manageAgenda')} className={`px-4 py-2 font-semibold text-sm rounded-t-xl flex items-center gap-2 transition-colors ${adminView === 'manageAgenda' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><Calendar size={16}/> Agenda</button>
                <button onClick={() => setAdminView('settings')} className={`px-4 py-2 font-semibold text-sm rounded-t-xl flex items-center gap-2 transition-colors ${adminView === 'settings' ? 'bg-stone-100 border-b-2 border-amber-500 text-amber-600' : 'text-stone-500 hover:bg-stone-100'}`}><Settings size={16}/> Configurações</button>
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
            <div className="flex flex-wrap gap-2 items-center mb-4 p-2 bg-stone-100 rounded-xl">
                <button onClick={() => setFilter('30d')} className={`px-3 py-1 text-sm font-semibold rounded-full ${filter === '30d' ? 'bg-amber-500 text-white' : 'bg-white'}`}>Últimos 30 dias</button>
                <button onClick={() => setFilter('60d')} className={`px-3 py-1 text-sm font-semibold rounded-full ${filter === '60d' ? 'bg-amber-500 text-white' : 'bg-white'}`}>Últimos 60 dias</button>
                <button onClick={() => setFilter('90d')} className={`px-3 py-1 text-sm font-semibold rounded-full ${filter === '90d' ? 'bg-amber-500 text-white' : 'bg-white'}`}>Últimos 90 dias</button>
                <div className="flex items-center gap-2">
                    <button onClick={() => setFilter('year')} className={`px-3 py-1 text-sm font-semibold rounded-full ${filter === 'year' ? 'bg-amber-500 text-white' : 'bg-white'}`}>Por Ano:</button>
                    <select value={yearFilter} onChange={e => {setYearFilter(Number(e.target.value)); setFilter('year');}} className="p-1 border-stone-300 rounded-full text-sm">
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-100 p-4 rounded-xl"><p className="text-sm text-green-800">Faturamento Total (Período)</p><p className="text-2xl font-bold text-green-900">{filteredData.totalRevenue.toFixed(2)}€</p></div>
                <div className="bg-blue-100 p-4 rounded-xl"><p className="text-sm text-blue-800">Pedidos Concluídos (Período)</p><p className="text-2xl font-bold text-blue-900">{filteredData.totalOrders}</p></div>
                <div className="bg-yellow-100 p-4 rounded-xl"><p className="text-sm text-yellow-800">Ticket Médio</p><p className="text-2xl font-bold text-yellow-900">{filteredData.averageTicket.toFixed(2)}€</p></div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-lg border h-96">
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

const FeedbacksView = ({ feedbacks, showToast }) => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleClearAllFeedbacks = async () => {
        setShowConfirmModal(false);
        try {
            const feedbackCollectionPath = `artifacts/${appId}/public/data/feedback`;
            const feedbackQuerySnapshot = await getDocs(collection(db, feedbackCollectionPath));
            const feedbackBatch = writeBatch(db);
            feedbackQuerySnapshot.forEach(doc => {
                feedbackBatch.delete(doc.ref);
            });
            await feedbackBatch.commit();

            const usersCollectionPath = `artifacts/${appId}/public/data/users`;
            const usersQuerySnapshot = await getDocs(collection(db, usersCollectionPath));
            const usersBatch = writeBatch(db);
            usersQuerySnapshot.forEach(doc => {
                usersBatch.update(doc.ref, {
                    hasGivenFeedback: false,
                    hasFeedbackDiscount: false
                });
            });
            await usersBatch.commit();

            showToast("Todos os feedbacks foram limpos com sucesso!");
        } catch (error) {
            console.error("Erro ao limpar feedbacks:", error);
            showToast("Ocorreu um erro ao limpar os feedbacks.");
        }
    };

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
    
    return (
        <div>
            {showConfirmModal && 
                <ConfirmDeleteModal 
                    title="Limpar Todos os Feedbacks" 
                    message="Tem a certeza que quer apagar TODOS os feedbacks? Esta ação também irá resetar o status de feedback de todos os usuários, permitindo que eles enviem novamente. Esta ação não pode ser desfeita."
                    onConfirm={handleClearAllFeedbacks}
                    onCancel={() => setShowConfirmModal(false)}
                    confirmText="Sim, Limpar Tudo"
                />
            }
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-stone-700">Análise de Feedbacks</h3>
                <button onClick={() => setShowConfirmModal(true)} className="bg-red-500 text-white font-bold py-2 px-4 rounded-full hover:bg-red-600 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 text-sm">
                    <Trash size={16}/> Limpar Feedbacks
                </button>
            </div>
            
            {feedbackAnalysis.total === 0 ? (
                 <div className="text-center py-10 text-stone-500">Ainda não há feedbacks para analisar.</div>
            ) : (
                <>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                     <div className="bg-stone-100 p-4 rounded-xl text-center"><p className="text-sm text-stone-600">Total de Respostas</p><p className="text-3xl font-bold">{feedbackAnalysis.total}</p></div>
                     <div className="bg-stone-100 p-4 rounded-xl text-center"><p className="text-sm text-stone-600">Avaliação Média</p><div className="flex justify-center items-center gap-1"><p className="text-3xl font-bold">{feedbackAnalysis.averageRating.toFixed(2)}</p><Star className="text-amber-500" size={28}/></div></div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="bg-white p-4 rounded-xl shadow-lg border h-96">
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
                     <div className="bg-white p-4 rounded-xl shadow-lg border h-96">
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
                </>
            )}
        </div>
    );
};


const AdminSettings = ({showToast, currentSettings}) => {
    const [settings, setSettings] = useState({
        ...INITIAL_SHOP_SETTINGS, 
        ...currentSettings 
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [cepLoading, setCepLoading] = useState(false); 
    const [isGeocoding, setIsGeocoding] = useState(false); 
    
    const timezones = ['Europe/Lisbon', 'America/Sao_Paulo', 'America/Fortaleza', 'America/Noronha', 'UTC'];

    useEffect(() => {
        setSettings(prev => ({ ...prev, ...currentSettings }));
    }, [currentSettings]);
    
    const handlePickupCepLookup = async () => {
        const cep = settings.pickupCep;
        if (!cep || cep.replace(/\D/g, '').length < 7) return;
        
        setCepLoading(true);
        try {
            const result = await getCoordsFromAddress(null, cep);
            if (result && result.address) {
                setSettings(prev => ({
                    ...prev,
                    pickupAddress: `${result.address.street || 'Rua não informada'}, ${result.address.district || 'Bairro não informado'}, ${result.address.city || 'Cidade não informada'}`,
                    storeLatitude: result.lat,
                    storeLongitude: result.lng,
                }));
                 showToast("CEP localizado e coordenadas atualizadas!");
            } else {
                showToast("CEP não encontrado.");
            }
        } catch (e) { console.error("Erro ao buscar CEP de retirada:", e); showToast("Erro ao buscar CEP."); }
        finally { setCepLoading(false); }
    };
    
    const handlePickupCurrentLocation = () => {
        if (!navigator.geolocation) {
            showToast('Seu navegador não suporta geolocalização.');
            return;
        }
        setCepLoading(true);
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const addressResult = await getAddressFromCoords(latitude, longitude);
                if (addressResult) {
                    setSettings(prev => ({
                         ...prev,
                        pickupAddress: `${addressResult.street || 'Rua não informada'}, ${addressResult.number || 'S/N'}, ${addressResult.district || 'Bairro não informado'}, ${addressResult.city || 'Cidade não informada'}`,
                        pickupCep: addressResult.cep || '',
                        storeLatitude: latitude,
                        storeLongitude: longitude,
                    }));
                    showToast("Localização de retirada preenchida!");
                } else {
                     showToast('Erro ao buscar endereço pela localização.');
                }
            } catch (error) {
                 showToast('Erro ao buscar endereço pela localização.');
                 console.error(error);
            } finally {
                setCepLoading(false);
            }
        }, (error) => {
            showToast(`Erro de localização: ${error.message}`);
            setCepLoading(false);
        });
    }
    
    const handleGeocodeAddress = async () => {
        if (!settings.pickupAddress) {
             showToast("Por favor, preencha o endereço completo.");
             return;
        }
        setIsGeocoding(true);
         try {
            const result = await getCoordsFromAddress(settings.pickupAddress, settings.pickupCep);
            if (result) {
                setSettings(prev => ({
                    ...prev,
                    storeLatitude: result.lat,
                    storeLongitude: result.lng,
                }));
                showToast(`Coordenadas atualizadas: ${result.lat}, ${result.lng}`);
            } else {
                showToast("Não foi possível encontrar coordenadas para este endereço.");
            }
         } catch(e) {
             showToast("Erro ao geocodificar endereço.");
         } finally {
            setIsGeocoding(false);
         }
    }


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
    
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? parseFloat(value) || 0 : value;
        setSettings(prev => ({ ...prev, [name]: val }));
    }

    return (
         <div>
            <h3 className="text-xl font-bold mb-4 text-stone-700">Configurações da Loja</h3>
            <div className="bg-stone-50 p-6 rounded-xl shadow-lg border border-stone-200 space-y-4 max-w-3xl">
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold mb-1 text-stone-600">Nome da Loja</label>
                        <input type="text" name="storeName" value={settings.storeName || ''} onChange={handleInputChange} className="w-full p-2 border border-stone-300 rounded-xl" />
                    </div>
                     <div>
                        <label className="block text-sm font-bold mb-1 text-stone-600">URL do Logo</label>
                        <input type="text" name="logoUrl" value={settings.logoUrl || ''} onChange={handleInputChange} className="w-full p-2 border border-stone-300 rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-stone-600">Email de Contato</label>
                        <input type="email" name="email" value={settings.email || ''} onChange={handleInputChange} className="w-full p-2 border border-stone-300 rounded-xl" />
                    </div>
                     <div>
                        <label className="block text-sm font-bold mb-1 text-stone-600">Telefone</label>
                        <input type="tel" name="phone" value={settings.phone || ''} onChange={handleInputChange} className="w-full p-2 border border-stone-300 rounded-xl" />
                    </div>
                 </div>
                 
                  <div className="border-t pt-4">
                     <div>
                        <label className="block text-sm font-bold mb-1 text-stone-600">Número do WhatsApp (com código do país)</label>
                        <input type="tel" name="whatsappNumber" value={settings.whatsappNumber || ''} onChange={handleInputChange} className="w-full p-2 border border-stone-300 rounded-xl" />
                    </div>
                     <div>
                        <label className="block text-sm font-bold mb-1 text-stone-600">Mensagem Padrão do WhatsApp</label>
                        <textarea name="whatsappMessage" value={settings.whatsappMessage || ''} onChange={handleInputChange} className="w-full p-2 border border-stone-300 rounded-xl" rows="3"></textarea>
                    </div>
                 </div>
                
                <div className="border-t pt-4 space-y-3">
                    <h4 className="font-bold text-lg text-amber-600">Endereço da Loja (Origem das Entregas)</h4>
                     <p className="text-xs text-stone-500">Este é o endereço de Viseu. Use os botões para atualizar as coordenadas exatas.</p>
                     
                     <div className="flex items-center gap-2">
                         <input 
                            type="text" 
                            name="pickupCep"
                            value={settings.pickupCep || ''} 
                            onChange={handleInputChange} 
                            className="w-1/3 p-2 border border-stone-300 rounded-xl" 
                            placeholder="CEP (Ex: 3500-038)"
                         />
                         <button type="button" onClick={handlePickupCepLookup} disabled={cepLoading} className="w-2/3 bg-blue-500 text-white font-bold py-2 px-3 rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 text-sm disabled:opacity-50 shadow-md">
                            {cepLoading ? <Loader2 className="animate-spin" size={18}/> : <><MapPin size={18}/> Usar CEP para localizar</>}
                         </button>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 text-stone-600">Endereço Completo</label>
                        <input type="text" name="pickupAddress" value={settings.pickupAddress || ''} onChange={handleInputChange} className="w-full p-2 border border-stone-300 rounded-xl" placeholder="Rua, Número, Bairro, Cidade" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleGeocodeAddress} disabled={isGeocoding || !settings.pickupAddress} className="w-1/2 bg-amber-600 text-white font-bold py-2 px-3 rounded-xl hover:bg-amber-700 flex items-center justify-center gap-2 text-sm disabled:opacity-50 shadow-md">
                            {isGeocoding ? <Loader2 className="animate-spin" size={18}/> : <><Navigation size={18}/> Geocodificar Endereço</>}
                        </button>
                         <button type="button" onClick={handlePickupCurrentLocation} disabled={cepLoading} className="w-1/2 bg-blue-500 text-white font-bold py-2 px-3 rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 text-sm disabled:opacity-50 shadow-md">
                            {cepLoading ? <Loader2 className="animate-spin" size={18}/> : <><MapPin size={18}/> Usar Minha Localização</>}
                         </button>
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="block text-xs font-bold mb-1 text-stone-600">Latitude (Auto-preenchida)</label>
                             <input type="number" name="storeLatitude" value={settings.storeLatitude || ''} onChange={handleInputChange} className="w-full p-2 border bg-stone-100 border-stone-300 rounded-xl" />
                        </div>
                         <div>
                             <label className="block text-xs font-bold mb-1 text-stone-600">Longitude (Auto-preenchida)</label>
                             <input type="number" name="storeLongitude" value={settings.storeLongitude || ''} onChange={handleInputChange} className="w-full p-2 border bg-stone-100 border-stone-300 rounded-xl" />
                        </div>
                    </div>
                </div>
                 
                 <div className="border-t pt-4 space-y-3">
                     <h4 className="font-bold text-lg text-amber-600">Configurações de Entrega</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-bold mb-1 text-stone-600">Preço por KM (€)</label>
                            <input type="number" name="deliveryPricePerKm" value={settings.deliveryPricePerKm || 0} onChange={handleInputChange} step="0.10" className="w-full p-2 border border-stone-300 rounded-xl" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-stone-600">Raio Máximo de Entrega (KM)</label>
                            <input type="number" name="deliveryMaxRadiusKm" value={settings.deliveryMaxRadiusKm || 0} onChange={handleInputChange} step="1" className="w-full p-2 border border-stone-300 rounded-xl" />
                        </div>
                    </div>
                 </div>

                 <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold mb-1 text-stone-600">Fuso Horário da Loja</label>
                        <select name="storeTimezone" value={settings.storeTimezone || 'Europe/Lisbon'} onChange={handleInputChange} className="w-full p-2 border border-stone-300 rounded-xl bg-white">
                            {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-stone-600">Moeda</label>
                        <select name="currency" value={settings.currency || 'EUR'} onChange={handleInputChange} className="w-full p-2 border border-stone-300 rounded-xl bg-white">
                            <option value="EUR">Euro (€)</option>
                            <option value="BRL">Real (R$)</option>
                            <option value="USD">Dólar ($)</option>
                        </select>
                    </div>
                 </div>

                <div className="pt-4">
                    <button onClick={handleSave} disabled={isSaving} className="bg-amber-500 text-white font-bold py-2 px-6 rounded-full hover:bg-amber-600 transition-colors shadow-lg active:scale-95 flex items-center justify-center disabled:bg-amber-300 w-40">
                        {isSaving ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                    </button>
                </div>
            </div>
        </div>
    );
};


const ManageOrders = ({ orders }) => {
    const [deletingOrderId, setDeletingOrderId] = useState(null);

    const handleUpdateStatus = async (orderId, status) => {
        const orderDocPath = `artifacts/${appId}/public/data/orders/${orderId}`;
        const orderRef = doc(db, orderDocPath);
        await updateDoc(orderRef, { status });
    };

    const handleRejectOrder = (orderId) => {
        setDeletingOrderId(orderId);
    }
    
    const handleDeleteConfirm = async () => {
         if (deletingOrderId) {
            const orderDocPath = `artifacts/${appId}/public/data/orders/${deletingOrderId}`;
            await deleteDoc(doc(db, orderDocPath));
            setDeletingOrderId(null);
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
             {deletingOrderId && (
                <ConfirmDeleteModal 
                    title="Rejeitar e Apagar Pedido" 
                    message={`Tem a certeza que quer rejeitar e apagar o Pedido #${deletingOrderId.slice(0, 8).toUpperCase()}? Esta ação não pode ser desfeita.`} 
                    onConfirm={handleDeleteConfirm} 
                    onCancel={() => setDeletingOrderId(null)} 
                    confirmText="Rejeitar e Apagar" 
                />
            )}
            <h3 className="text-xl font-bold mb-4 text-stone-700">Gerenciar Pedidos ({orders.length})</h3>
            <div className="space-y-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-stone-50 p-4 rounded-xl border border-stone-200 hover:shadow-lg transition-shadow">
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
                             {order.discount && (
                                <p className="text-sm text-green-600 mt-1">Desconto: -{order.discount.amount.toFixed(2)}€</p>
                            )}
                            {order.deliveryFee > 0 && (
                                <p className="text-sm text-stone-600 mt-1">Taxa de Entrega: +{order.deliveryFee.toFixed(2)}€</p>
                            )}
                         </div>
                         <div className="mt-4 flex flex-wrap gap-2 items-center">
                             {['Pendente', 'Em Preparo', 'Pronto para Entrega', 'Saiu para Entrega', 'Concluído'].map(status => (
                                 <button key={status} onClick={() => handleUpdateStatus(order.id, status)} className={`px-3 py-1 text-sm rounded-full transition-all ${order.status === status ? 'ring-2 ring-offset-1 ring-amber-500 bg-stone-200 font-bold' : 'bg-white hover:bg-stone-200 border'}`}>{status}</button>
                             ))}
                             <div className="flex-grow"></div>
                             <button onClick={() => handleRejectOrder(order.id)} className={'bg-red-100 hover:bg-red-200 border border-red-200 text-red-700 px-3 py-1 text-sm rounded-full transition-all'}>Rejeitar</button>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

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
                 <button onClick={startCreating} className="bg-green-500 text-white font-bold py-2 px-4 rounded-full hover:bg-green-600 flex items-center gap-2 shadow-lg active:scale-95"><Plus size={18}/> Novo Item</button>
            </div>
            {(editingItem || isCreating) && <MenuItemForm item={editingItem} onSave={handleSave} onCancel={() => { setEditingItem(null); setIsCreating(false); }} allCategories={allCategories} />}
            <div className="space-y-2 mt-6">
                {menu.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${item.isAvailable !== false ? 'bg-stone-50 border-stone-200' : 'bg-stone-200 border-stone-300 opacity-60'}`}>
                        <div className="flex items-center gap-4">
                             <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover bg-stone-200" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100x100/FBBF24/FFFFFF?text=?'; }}/>
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
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                <h4 className="text-lg font-bold mb-4">{item.id ? 'Editar Item' : 'Criar Novo Item'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Nome</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl" required />
                    </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">Categoria</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl" required>
                            <option>Salgados Tradicionais</option>
                            <option>Salgados Especiais</option>
                            <option>Boxes</option>
                            <option>Bebidas</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">Preço (€)</label>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} step="0.01" className="w-full p-2 border border-stone-300 rounded-xl" required />
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1">URL da Imagem</label>
                        <input type="text" name="image" value={formData.image} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl" />
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1">Descrição (opcional)</label>
                        <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Pedido Mínimo (Unidades)</label>
                        <input type="number" name="minimumOrder" value={formData.minimumOrder || 1} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl" />
                    </div>
                    <div className="flex items-center gap-2 border p-2 rounded-xl bg-stone-50">
                        <input type="checkbox" id="customizable" name="customizable" checked={!!formData.customizable} onChange={handleChange} className="h-5 w-5"/>
                        <label htmlFor="customizable">É um box customizável?</label>
                    </div>
                     {formData.customizable && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1">Nº mínimo de salgados no box</label>
                            <input type="number" name="size" value={formData.size} onChange={handleChange} className="w-full p-2 border border-stone-300 rounded-xl" />
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
                     <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 border">
                        <input type="checkbox" id="isAvailable" name="isAvailable" checked={formData.isAvailable !== false} onChange={handleChange} className="h-5 w-5"/>
                        <label htmlFor="isAvailable">Exibir no catálogo?</label>
                    </div>
                     <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 border">
                        <input type="checkbox" id="requiresScheduling" name="requiresScheduling" checked={!!formData.requiresScheduling} onChange={handleChange} className="h-5 w-5"/>
                        <label htmlFor="requiresScheduling">Requer encomenda?</label>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onCancel} className="bg-stone-300 text-stone-800 font-bold py-2 px-4 rounded-full hover:bg-stone-400 active:scale-95 transition-colors">Cancelar</button>
                    <button type="submit" className="bg-amber-500 text-white font-bold py-2 px-4 rounded-full hover:bg-amber-600 active:scale-95 transition-colors">Salvar</button>
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
                 <button onClick={() => setView('admin')} className="bg-stone-700 text-white font-semibold py-2 px-4 rounded-full hover:bg-stone-600 flex items-center gap-2"><ChevronsLeft size={16}/> Voltar ao Painel</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {orders.map(order => (
                    <div key={order.id} className={`p-4 rounded-xl shadow-lg flex flex-col ${order.status === 'Pendente' ? 'bg-red-900 border-red-700' : 'bg-blue-900 border-blue-700'} border-2`}>
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
                                <button onClick={() => updateStatus(order.id, 'Em Preparo')} className="w-full bg-blue-500 text-white font-bold py-3 rounded-full hover:bg-blue-600 text-lg transition-colors">
                                    Iniciar Preparo
                                </button>
                             )}
                              {order.status === 'Em Preparo' && (
                                <button onClick={() => updateStatus(order.id, 'Pronto para Entrega')} className="w-full bg-green-500 text-white font-bold py-3 rounded-full hover:bg-green-600 text-lg transition-colors">
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


const ManageAgenda = ({ currentSettings, showToast, db, appId }) => {
    const safeSettings = useMemo(() => ({
        ...currentSettings,
        workingHours: currentSettings.workingHours || INITIAL_WORKING_HOURS,
        holidays: currentSettings.holidays || [],
    }), [currentSettings]);
    
    const [settings, setSettings] = useState(safeSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState('');
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    useEffect(() => {
        setSettings(safeSettings);
    }, [safeSettings]);

    const handleHourChange = (day, field, value) => {
        setSettings(prev => ({
            ...prev,
            workingHours: {
                ...prev.workingHours,
                [day]: {
                    ...prev.workingHours[day],
                    [field]: value
                }
            }
        }));
    };

    const handleToggleOpen = (day, isOpen) => {
         setSettings(prev => ({
            ...prev,
            workingHours: {
                ...prev.workingHours,
                [day]: {
                    ...prev.workingHours[day],
                    open: isOpen
                }
            }
        }));
    };
    
    const handleAddHoliday = () => {
        if (editingHoliday && !settings.holidays.includes(editingHoliday)) {
            setSettings(prev => ({ ...prev, holidays: [...prev.holidays, editingHoliday].sort() }));
            setEditingHoliday('');
        }
    };
    
    const handleRemoveHoliday = (date) => {
        setSettings(prev => ({ ...prev, holidays: prev.holidays.filter(h => h !== date) }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        if (!db || !appId) {
             showToast("Erro: Conexão com o Firebase não disponível.");
             setIsSaving(false);
             return;
        }

        const settingsDocPath = `artifacts/${appId}/public/data/settings`;
        const settingsRef = doc(db, settingsDocPath, 'shopConfig');
        try {
            await updateDoc(settingsRef, {
                workingHours: settings.workingHours,
                holidays: settings.holidays,
            });
            showToast("Agenda e horários salvos com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar agenda:", error);
            showToast("Erro ao salvar agenda. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    }

    const dayNameMap = {
        monday: 'Segunda-feira', tuesday: 'Terça-feira', wednesday: 'Quarta-feira',
        thursday: 'Quinta-feira', friday: 'Sexta-feira', saturday: 'Sábado', sunday: 'Domingo'
    };
    
    return (
        <div>
            <h3 className="text-xl font-bold mb-4 text-stone-700">Gerenciamento de Agenda</h3>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-stone-200 space-y-8">
                 <div>
                    <h4 className="font-bold text-lg mb-4 text-amber-600 flex items-center gap-2"><Clock size={20}/> Horário Semanal</h4>
                    <div className="space-y-3">
                        {daysOfWeek.map(day => (
                            <div key={day} className={`flex items-center p-3 rounded-xl border ${settings.workingHours[day]?.open ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="font-semibold w-32">{dayNameMap[day]}</p>
                                <div className="flex items-center gap-4 flex-grow">
                                     <button onClick={() => handleToggleOpen(day, !settings.workingHours[day]?.open)} className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${settings.workingHours[day]?.open ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                                         {settings.workingHours[day]?.open ? 'Fechar' : 'Abrir'}
                                     </button>
                                     {settings.workingHours[day]?.open ? (
                                         <div className="flex items-center gap-2">
                                              <input type="time" value={settings.workingHours[day]?.start || '00:00'} onChange={(e) => handleHourChange(day, 'start', e.target.value)} className="p-2 border rounded-xl" />
                                              <span className="font-bold">-</span>
                                              <input type="time" value={settings.workingHours[day]?.end || '00:00'} onChange={(e) => handleHourChange(day, 'end', e.target.value)} className="p-2 border rounded-xl" />
                                         </div>
                                     ) : (
                                         <span className="text-sm text-stone-500">Fechado o dia todo</span>
                                     )}
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
                 
                 <div>
                     <h4 className="font-bold text-lg mb-4 text-amber-600 flex items-center gap-2"><Calendar size={20}/> Feriados / Datas Especiais</h4>
                     <div className="flex gap-2 mb-4">
                         <input type="date" value={editingHoliday} onChange={(e) => setEditingHoliday(e.target.value)} className="p-2 border border-stone-300 rounded-xl flex-grow" />
                         <button onClick={handleAddHoliday} className="bg-green-500 text-white font-bold py-2 px-4 rounded-full hover:bg-green-600 active:scale-95 transition-colors flex items-center gap-2"><Plus size={18}/> Adicionar</button>
                     </div>
                     <div className="flex flex-wrap gap-3">
                         {settings.holidays.map(date => (
                             <div key={date} className="flex items-center gap-2 bg-stone-100 p-2 rounded-full border">
                                 <span className="text-sm font-semibold text-stone-700">{date}</span>
                                 <button onClick={() => handleRemoveHoliday(date)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><XCircle size={16}/></button>
                             </div>
                         ))}
                     </div>
                 </div>

                 <div className="pt-4 border-t">
                    <button onClick={handleSave} disabled={isSaving} className="bg-amber-500 text-white font-bold py-2 px-6 rounded-full hover:bg-amber-600 transition-colors shadow-lg active:scale-95 flex items-center justify-center disabled:bg-amber-300 w-40">
                        {isSaving ? <Loader2 className="animate-spin" /> : "Salvar Agenda"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const DeliveryView = ({ orders, setView, db, appId, user }) => {
    
    const [trackerIntervalId, setTrackerIntervalId] = useState(null);
    const [trackingOrderId, setTrackingOrderId] = useState(null);
    const [currentLat, setCurrentLat] = useState(38.7223); // Lisboa como base
    const [currentLng, setCurrentLng] = useState(-9.1393);

    const updateStatus = async (orderId, status) => {
        const orderDocPath = `artifacts/${appId}/public/data/orders/${orderId}`;
        const orderRef = doc(db, orderDocPath);
        
        const updateData = { status };
        
        if (status === 'Concluído' && trackingOrderId === orderId) {
            stopTracking();
            updateData['deliveryTracker.active'] = false;
            updateData['deliveryTracker.lastUpdate'] = new Date();
        }
        
        if (status === 'Saiu para Entrega' && trackingOrderId !== orderId) {
             const orderToStart = orders.find(o => o.id === orderId);
             if (orderToStart?.deliveryTracker) {
                 startTracking(orderId);
                 updateData['deliveryTracker.active'] = true;
                 updateData['deliveryTracker.lastUpdate'] = new Date();
                 updateData['deliveryTracker.lat'] = orderToStart.lat || currentLat;
                 updateData['deliveryTracker.lng'] = orderToStart.lng || currentLng; 
             }
        }
        
        await updateDoc(orderRef, updateData);
    };
    
    const stopTracking = useCallback(() => {
        if (trackerIntervalId) {
            clearInterval(trackerIntervalId);
            setTrackerIntervalId(null);
            setTrackingOrderId(null);
        }
    }, [trackerIntervalId]); 

    
    const startTracking = useCallback((orderId) => {
        stopTracking(); 
        setTrackingOrderId(orderId);
        
        const intervalId = setInterval(async () => {

            const targetOrder = orders.find(o => o.id === orderId);
            if (!targetOrder || !targetOrder.lat || !targetOrder.lng) return;
            
            const latDiff = targetOrder.lat - currentLat;
            const lngDiff = targetOrder.lng - currentLng;
            
            const newLat = currentLat + (latDiff * 0.05) + (Math.random() * 0.0001);
            const newLng = currentLng + (lngDiff * 0.05) + (Math.random() * 0.0001);
            
            setCurrentLat(newLat);
            setCurrentLng(newLng);

            const orderRef = doc(db, `artifacts/${appId}/public/data/orders/${orderId}`);
            
            try {
                 await updateDoc(orderRef, {
                    'deliveryTracker.lat': newLat,
                    'deliveryTracker.lng': newLng,
                    'deliveryTracker.lastUpdate': new Date(),
                    'deliveryTracker.active': true,
                });
            } catch (error) {
                console.error("Erro ao atualizar rastreamento:", error);
            }
        }, 5000); 
        
        setTrackerIntervalId(intervalId);
    }, [stopTracking, orders, currentLat, currentLng, db, appId]);


    useEffect(() => {
        return () => stopTracking();
    }, [stopTracking]);
    
    const getGoogleMapsLink = (order) => {
        const clientLat = order.lat || 38.7; 
        const clientLng = order.lng || -9.1; 
        const origin = `${currentLat},${currentLng}`;
        
        // CORREÇÃO: URL de direções do Google Maps moderna e correta
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${clientLat},${clientLng}&travelmode=driving`;
    };

    return (
        <div className="bg-stone-200 min-h-screen p-4">
            <div className="flex justify-between items-center mb-4">
                 <h1 className="text-3xl font-bold text-stone-800">Painel do Entregador</h1>
                 <button onClick={() => setView('admin')} className="bg-stone-700 text-white font-semibold py-2 px-4 rounded-full hover:bg-stone-600 flex items-center gap-2"><ChevronsLeft size={16}/> Voltar</button>
            </div>
            {trackingOrderId && (
                <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-800 p-3 mb-4 rounded-xl">
                    <p className="font-bold">Rastreamento Ativo!</p>
                    <p className="text-sm">Acompanhando Pedido #{trackingOrderId.slice(0, 8).toUpperCase()}.</p>
                    <button onClick={stopTracking} className="text-red-600 font-semibold text-xs mt-1 hover:underline">Parar Rastreamento</button>
                </div>
            )}
             <div className="space-y-4">
                {orders.map(order => (
                     <div key={order.id} className="bg-white p-4 rounded-xl shadow-lg">
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
                             {order.deliveryFee > 0 && (
                                 <p className="font-semibold">Distância: <span className="font-normal text-stone-700">{order.distanceKm.toFixed(1)} KM</span> (Taxa: {order.deliveryFee.toFixed(2)}€)</p>
                             )}
                         </div>
                         <div className="flex flex-wrap gap-2 mt-3">
                              <a href={getGoogleMapsLink(order)} target="_blank" rel="noopener noreferrer" className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-full hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 shadow-lg">
                                  <Map size={18}/> Iniciar Rota no GPS
                              </a>
                              
                              {order.status === 'Pronto para Entrega' && (
                                <button onClick={() => updateStatus(order.id, 'Saiu para Entrega')} disabled={trackingOrderId && trackingOrderId !== order.id} className="flex-1 bg-purple-500 text-white font-bold py-3 rounded-full hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                                    <Bike size={18}/> Saiu para Entrega
                                </button>
                             )}
                              {order.status === 'Saiu para Entrega' && (
                                <button onClick={() => updateStatus(order.id, 'Concluído')} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-full hover:bg-green-600 transition-colors shadow-lg">
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