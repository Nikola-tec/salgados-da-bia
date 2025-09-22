import React, { useState, useEffect, useMemo } from 'react';

// Mock Data (Simulando um banco de dados)
// ========================================================================

const initialStoreInfo = {
  name: "Salgados da Bia",
  logo: "https://placehold.co/100x100/f97316/ffffff?text=Bia",
  email: "contato@salgadosdabia.pt",
  phone: "+351 912 345 678",
  currency: "EUR", // Moeda padrão para Portugal
  domain: "salgadosdabia.vercel.app",
};

const menuItemsData = [
  { id: 1, name: "Coxinha de Frango", description: "Massa cremosa com recheio de frango desfiado e temperado.", price: 1.20, image: "https://placehold.co/300x200/f97316/ffffff?text=Coxinha", category: "Tradicional" },
  { id: 2, name: "Rissoles de Carne", description: "Delicioso recheio de carne moída refogada, envolto em massa fina.", price: 1.20, image: "https://placehold.co/300x200/f97316/ffffff?text=Rissoles", category: "Tradicional" },
  { id: 3, name: "Bolinha de Queijo", description: "Queijo derretido por dentro, crocante por fora. Um clássico!", price: 1.10, image: "https://placehold.co/300x200/f97316/ffffff?text=Bolinha+Queijo", category: "Tradicional" },
  { id: 4, name: "Croquete de Queijo e Fiambre", description: "A combinação perfeita de queijo e fiambre em um croquete suculento.", price: 1.30, image: "https://placehold.co/300x200/ea580c/ffffff?text=Croquete+Q&F", category: "Especial" },
  { id: 5, name: "Croquete de Calabresa", description: "Sabor intenso de calabresa levemente picante.", price: 1.30, image: "https://placehold.co/300x200/ea580c/ffffff?text=Croquete+Calabresa", category: "Especial" },
  { id: 6, name: "Kibe", description: "Receita tradicional com carne, trigo e um toque de hortelã.", price: 1.50, image: "https://placehold.co/300x200/ea580c/ffffff?text=Kibe", category: "Especial" },
];

const boxesData = [
  { id: 1, name: "Box 15", size: 15, description: "Para um lanche rápido." },
  { id: 2, name: "Box 30", size: 30, description: "Perfeito para compartilhar." },
  { id: 3, name: "Box 50", size: 50, description: "Para a galera toda!" },
  { id: 4, name: "Box 100", size: 100, description: "Uma fome gigantesca!" },
];

const initialOrders = [
    { id: 'ORD-001', customer: { name: 'João Silva', phone: '+351911111111' }, items: [{ name: 'Box 50', quantity: 1, details: '20 Coxinhas, 30 Bolinhas de Queijo' }], total: 60.50, status: 'Em Preparo', date: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { id: 'ORD-002', customer: { name: 'Maria Fernandes', phone: '+351922222222' }, items: [{ name: 'Box 15', quantity: 2, details: '15 Kibes, 15 Rissoles' }], total: 40.50, status: 'Pronto para Entrega', date: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: 'ORD-003', customer: { name: 'Carlos Pereira', phone: '+351933333333' }, items: [{ name: 'Box 100', quantity: 1, details: 'Aleatório' }], total: 125.00, status: 'Entregue', date: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { id: 'ORD-004', customer: { name: 'Ana Costa', phone: '+351966666666' }, items: [{ name: 'Box 30', quantity: 1, details: '10 de cada Tradicional' }], total: 36.00, status: 'Entregue', date: new Date(Date.now() - 48 * 60 * 60 * 1000) },
];


// SVG Icons (para não depender de bibliotecas externas)
// ========================================================================
const ShoppingCartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const ShuffleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>

// Componente Principal: App
// ========================================================================

export default function App() {
  const [view, setView] = useState('customer'); // customer, adminLogin, admin
  const [adminSubView, setAdminSubView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // State para a área do cliente
  const [selectedBox, setSelectedBox] = useState(null);
  const [currentBoxItems, setCurrentBoxItems] = useState({});
  const [cart, setCart] = useState([]);

  // State para a área do admin
  const [storeInfo, setStoreInfo] = useState(initialStoreInfo);
  const [menuItems, setMenuItems] = useState(menuItemsData);
  const [orders, setOrders] = useState(initialOrders);

  // Handlers de Login
  const handleLogin = (email, password) => {
    if (email === 'admin@admin.com' && password === 'admin123') {
      setIsAuthenticated(true);
      setView('admin');
      setAdminSubView('dashboard');
    } else {
      alert('Credenciais inválidas!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('customer');
  };
  
  // Navegação do App
  if (!isAuthenticated && view === 'admin') {
     return <AdminLoginPage onLogin={handleLogin} onBackToStore={() => setView('customer')} storeName={storeInfo.name} />;
  }

  if (view === 'admin') {
    return <AdminArea 
      storeInfo={storeInfo}
      setStoreInfo={setStoreInfo}
      menuItems={menuItems}
      setMenuItems={setMenuItems}
      orders={orders}
      setOrders={setOrders}
      onLogout={handleLogout}
      subView={adminSubView}
      setSubView={setAdminSubView}
      />;
  }
  
  return <CustomerArea 
      storeInfo={storeInfo} 
      menuItems={menuItems}
      boxes={boxesData}
      onAdminLogin={() => setView('admin')}
      />;
}


// Componentes da Área do Cliente
// ========================================================================

function CustomerArea({ storeInfo, menuItems, boxes, onAdminLogin }) {
    const [selectedBox, setSelectedBox] = useState(null);
    const [currentBoxItems, setCurrentBoxItems] = useState({});
    const [cart, setCart] = useState([]);

    const totalInCurrentBox = useMemo(() => Object.values(currentBoxItems).reduce((sum, qty) => sum + qty, 0), [currentBoxItems]);

    const handleSelectBox = (box) => {
        setSelectedBox(box);
        setCurrentBoxItems({});
    };

    const updateItemQuantity = (itemId, amount) => {
        const currentQty = currentBoxItems[itemId] || 0;
        const newQty = Math.max(0, currentQty + amount);

        if (totalInCurrentBox - currentQty + newQty > selectedBox.size) {
            alert(`O limite do box de ${selectedBox.size} salgados foi atingido!`);
            return;
        }

        setCurrentBoxItems(prev => ({ ...prev, [itemId]: newQty }));
    };

    const randomizeBox = () => {
        if (!selectedBox) return;
        let items = {};
        let total = 0;
        while (total < selectedBox.size) {
            const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
            items[randomItem.id] = (items[randomItem.id] || 0) + 1;
            total++;
        }
        setCurrentBoxItems(items);
    };
    
    const addToCart = () => {
        if(totalInCurrentBox !== selectedBox.size){
            alert(`Você precisa selecionar exatamente ${selectedBox.size} salgados para fechar o box.`);
            return;
        }

        const boxDetails = {
            boxId: selectedBox.id,
            boxName: selectedBox.name,
            items: { ...currentBoxItems },
            totalPrice: Object.entries(currentBoxItems).reduce((sum, [id, qty]) => {
                const item = menuItems.find(mi => mi.id === parseInt(id));
                return sum + (item.price * qty);
            }, 0)
        };
        
        setCart(prev => [...prev, boxDetails]);
        setSelectedBox(null);
        setCurrentBoxItems({});
        alert(`${boxDetails.boxName} adicionado ao carrinho!`);
    };

    const removeFromCart = (index) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };
    
    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);

    return (
      <div className="bg-gray-100 min-h-screen font-sans">
        <header className="bg-white shadow-md sticky top-0 z-10">
          <div className="container mx-auto p-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src={storeInfo.logo} alt="Logo" className="h-12 w-12 rounded-full object-cover" />
              <h1 className="text-2xl font-bold text-orange-600">{storeInfo.name}</h1>
            </div>
            <div className="relative">
              <ShoppingCartIcon />
              {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{cart.length}</span>}
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4">
          <section id="boxes" className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Escolha o tamanho da sua fome!</h2>
            <p className="text-gray-600 mb-6">Selecione um box para começar a montar.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {boxes.map(box => (
                <button
                  key={box.id}
                  onClick={() => handleSelectBox(box)}
                  className={`p-4 rounded-lg shadow-lg transform transition hover:scale-105 ${selectedBox?.id === box.id ? 'bg-orange-500 text-white ring-4 ring-orange-300' : 'bg-white'}`}
                >
                  <h3 className="text-xl font-bold">{box.name}</h3>
                  <p className="text-sm">{box.size} Salgados</p>
                  <p className="text-xs mt-1">{box.description}</p>
                </button>
              ))}
            </div>
          </section>

          {selectedBox && (
            <section id="customizer" className="bg-white p-6 rounded-lg shadow-lg mb-8 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Monte seu {selectedBox.name}</h2>
                <button onClick={randomizeBox} className="flex items-center space-x-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-lg font-semibold hover:bg-orange-200 transition">
                  <ShuffleIcon />
                  <span>Montar Aleatoriamente</span>
                </button>
              </div>
              <div className="bg-orange-50 p-3 rounded-md mb-4 text-center">
                <p className="font-semibold text-orange-700">
                  {totalInCurrentBox} de {selectedBox.size} salgados selecionados
                </p>
                <div className="w-full bg-orange-200 rounded-full h-2.5 mt-2">
                   <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${(totalInCurrentBox / selectedBox.size) * 100}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.map(item => (
                      <div key={item.id} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-lg">
                          <img src={item.image} alt={item.name} className="w-20 h-20 rounded-md object-cover"/>
                          <div className="flex-1">
                              <h4 className="font-bold">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.description}</p>
                              <p className="font-semibold text-orange-600">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(item.price)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                              <button onClick={() => updateItemQuantity(item.id, -1)} className="bg-gray-200 p-2 rounded-full hover:bg-gray-300"><MinusIcon /></button>
                              <span className="w-10 text-center font-bold text-lg">{currentBoxItems[item.id] || 0}</span>
                              <button onClick={() => updateItemQuantity(item.id, 1)} className="bg-gray-200 p-2 rounded-full hover:bg-gray-300"><PlusIcon /></button>
                              <button onClick={() => updateItemQuantity(item.id, 10)} className="bg-orange-500 text-white font-bold px-3 py-2 rounded-lg hover:bg-orange-600">+10</button>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="mt-6 text-center">
                  <button onClick={addToCart} disabled={totalInCurrentBox !== selectedBox.size} className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                      Adicionar Box ao Carrinho
                  </button>
              </div>
            </section>
          )}

          {cart.length > 0 && (
            <section id="cart" className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Seu Pedido</h2>
              <div className="space-y-4">
                {cart.map((cartItem, index) => (
                    <div key={index} className="border-b pb-4">
                        <div className="flex justify-between items-start">
                           <div>
                            <h3 className="font-bold text-lg">{cartItem.boxName}</h3>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                               {Object.entries(cartItem.items).map(([id, qty]) => {
                                   if (qty > 0) {
                                       const item = menuItems.find(mi => mi.id === parseInt(id));
                                       return <li key={id}>{qty}x {item.name}</li>;
                                   }
                                   return null;
                               })}
                           </ul>
                           </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cartItem.totalPrice)}</p>
                                <button onClick={() => removeFromCart(index)} className="text-red-500 hover:text-red-700 mt-2">
                                    <TrashIcon/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
              </div>
              <div className="mt-6 text-right">
                <p className="text-2xl font-bold">Total: {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cartTotal)}</p>
                <button className="mt-4 bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-700 transition">Finalizar Pedido</button>
              </div>
            </section>
          )}
        </main>
        
        <footer className="text-center p-4 mt-8 text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} {storeInfo.name}. Todos os direitos reservados.</p>
            <button onClick={onAdminLogin} className="mt-2 text-blue-500 hover:underline">Acesso Administrador</button>
        </footer>
      </div>
    );
}

function AdminLoginPage({ onLogin, onBackToStore, storeName }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="bg-gray-800 min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-orange-500">{storeName}</h1>
                    <h2 className="text-xl font-semibold text-white">Área Administrativa</h2>
                </div>
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><UserIcon /></span>
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 pl-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="admin@admin.com" required />
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Senha</label>
                             <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><LockIcon /></span>
                                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 pl-10 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" placeholder="admin123" required />
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-between space-y-4">
                            <button className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" type="submit">Entrar</button>
                            <button onClick={onBackToStore} className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800" type="button">Voltar para a loja</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}


// Componentes da Área do Admin
// ========================================================================
function AdminArea({ storeInfo, setStoreInfo, menuItems, setMenuItems, orders, setOrders, onLogout, subView, setSubView }) {

    const AdminViewComponent = () => {
        switch (subView) {
            case 'dashboard': return <AdminDashboard orders={orders} currency={storeInfo.currency} />;
            case 'pedidos': return <AdminPedidos orders={orders} setOrders={setOrders} currency={storeInfo.currency} />;
            case 'cardapio': return <AdminCardapio menuItems={menuItems} setMenuItems={setMenuItems} currency={storeInfo.currency} />;
            case 'configuracoes': return <AdminConfiguracoes storeInfo={storeInfo} setStoreInfo={setStoreInfo} />;
            default: return <AdminDashboard orders={orders} />;
        }
    };
    
    return (
        <div className="bg-gray-900 text-white min-h-screen flex">
            <AdminSidebar onLogout={onLogout} storeName={storeInfo.name} setSubView={setSubView} activeView={subView}/>
            <main className="flex-1 p-8 overflow-y-auto">
               <AdminViewComponent />
            </main>
        </div>
    );
}

function AdminSidebar({ onLogout, storeName, setSubView, activeView }) {
    const navItems = [
        { key: 'dashboard', name: 'Dashboard (BI)' },
        { key: 'pedidos', name: 'Pedidos' },
        { key: 'cardapio', name: 'Cardápio' },
        { key: 'configuracoes', name: 'Configurações da Loja' },
    ];
    
    return (
        <aside className="w-64 bg-gray-800 p-4 flex flex-col">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-orange-500">{storeName}</h2>
                <p className="text-sm text-gray-400">Painel do Administrador</p>
            </div>
            <nav className="flex-1">
                <ul>
                    {navItems.map(item => (
                         <li key={item.key} className="mb-2">
                            <button 
                                onClick={() => setSubView(item.key)}
                                className={`w-full text-left px-4 py-2 rounded-md transition ${activeView === item.key ? 'bg-orange-600 text-white' : 'hover:bg-gray-700'}`}
                            >
                                {item.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            <div>
                <button onClick={onLogout} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition">
                    Sair
                </button>
            </div>
        </aside>
    );
}

function AdminDashboard({ orders, currency }) {
    const stats = useMemo(() => {
        const totalFaturado = orders.reduce((acc, order) => order.status === 'Entregue' ? acc + order.total : acc, 0);
        const pedidosEmPreparo = orders.filter(o => o.status === 'Em Preparo').length;
        const pedidosProntos = orders.filter(o => o.status === 'Pronto para Entrega').length;
        const pedidosEntregues = orders.filter(o => o.status === 'Entregue').length;

        return { totalFaturado, pedidosEmPreparo, pedidosProntos, pedidosEntregues };
    }, [orders]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Resumo (BI)</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-gray-400 text-sm font-bold uppercase">Faturamento Total</h3>
                    <p className="text-3xl font-bold text-green-400 mt-2">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(stats.totalFaturado)}</p>
                </div>
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-gray-400 text-sm font-bold uppercase">Pedidos em Preparo</h3>
                    <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.pedidosEmPreparo}</p>
                </div>
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-gray-400 text-sm font-bold uppercase">Prontos para Entrega</h3>
                    <p className="text-3xl font-bold text-blue-400 mt-2">{stats.pedidosProntos}</p>
                </div>
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-gray-400 text-sm font-bold uppercase">Pedidos Entregues</h3>
                    <p className="text-3xl font-bold text-gray-200 mt-2">{stats.pedidosEntregues}</p>
                </div>
            </div>
             <div className="mt-10 bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Últimos Pedidos</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="p-3">ID</th>
                                <th className="p-3">Cliente</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.slice(0, 5).map(order => (
                                <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700">
                                    <td className="p-3">{order.id}</td>
                                    <td className="p-3">{order.customer.name}</td>
                                    <td className="p-3">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(order.total)}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        order.status === 'Em Preparo' ? 'bg-yellow-500 text-black' :
                                        order.status === 'Pronto para Entrega' ? 'bg-blue-500 text-white' :
                                        'bg-green-500 text-white'
                                      }`}>
                                        {order.status}
                                      </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function AdminPedidos({ orders, setOrders, currency }) {
    const handleStatusChange = (orderId, newStatus) => {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    };
    
    const statuses = ['Em Preparo', 'Pronto para Entrega', 'Entregue'];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Gerenciar Pedidos</h1>
            <div className="bg-gray-800 p-4 rounded-lg">
                {orders.map(order => (
                    <div key={order.id} className="bg-gray-700 p-4 rounded-lg mb-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <p className="font-bold text-lg">{order.id} - {order.customer.name}</p>
                            <p className="text-sm text-gray-300">{order.customer.phone}</p>
                            <ul className="text-xs list-disc list-inside mt-2">
                                {order.items.map((item, index) => <li key={index}>{item.quantity}x {item.name} ({item.details})</li>)}
                            </ul>
                            <p className="font-bold text-orange-400 mt-2">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(order.total)}</p>
                        </div>
                        <div className="mt-4 md:mt-0">
                             <div className="relative">
                                <select 
                                    value={order.status}
                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                    className="bg-gray-600 border border-gray-500 rounded-md py-2 px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                    <ChevronDownIcon />
                                </div>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AdminCardapio({ menuItems, setMenuItems, currency }) {
    const [editingItem, setEditingItem] = useState(null);

    const handleSave = (itemToSave) => {
        setMenuItems(menuItems.map(item => item.id === itemToSave.id ? itemToSave : item));
        setEditingItem(null);
    }
    
    if(editingItem) {
        return <EditMenuItemForm item={editingItem} onSave={handleSave} onCancel={() => setEditingItem(null)} currency={currency} />
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Gerenciar Cardápio</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map(item => (
                    <div key={item.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-48 object-cover"/>
                        <div className="p-4">
                            <h3 className="text-xl font-bold">{item.name}</h3>
                            <p className="text-gray-400 text-sm mt-1 h-10">{item.description}</p>
                            <p className="text-orange-400 font-bold text-lg mt-2">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(item.price)}</p>
                             <button onClick={() => setEditingItem(item)} className="mt-4 w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition">
                                Editar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function EditMenuItemForm({ item, onSave, onCancel, currency }) {
    const [formState, setFormState] = useState(item);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({...prev, [name]: name === 'price' ? parseFloat(value) : value }));
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formState);
    }

    return (
        <div className="bg-gray-800 p-8 rounded-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Editando: {item.name}</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Nome</label>
                    <input type="text" name="name" value={formState.name} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                 <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Descrição</label>
                    <textarea name="description" value={formState.description} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 h-24" />
                </div>
                 <div className="mb-4">
                    <label className="block text-sm font-bold mb-2">Preço ({currency})</label>
                    <input type="number" step="0.01" name="price" value={formState.price} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                 <div className="mb-6">
                    <label className="block text-sm font-bold mb-2">URL da Imagem</label>
                    <input type="text" name="image" value={formState.image} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="flex justify-end space-x-4">
                    <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition">Cancelar</button>
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition">Salvar Alterações</button>
                </div>
            </form>
        </div>
    );
}

function AdminConfiguracoes({ storeInfo, setStoreInfo }) {
    const [formState, setFormState] = useState(storeInfo);

     const handleChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({...prev, [name]: value }));
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setStoreInfo(formState);
        alert('Configurações salvas com sucesso!');
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Configurações da Loja</h1>
            <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg max-w-3xl mx-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Nome da Loja</label>
                        <input type="text" name="name" value={formState.name} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Email de Contato</label>
                        <input type="email" name="email" value={formState.email} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Telefone</label>
                        <input type="tel" name="phone" value={formState.phone} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Domínio</label>
                        <input type="text" name="domain" value={formState.domain} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">URL do Logo</label>
                        <input type="text" name="logo" value={formState.logo} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Moeda</label>
                        <select name="currency" value={formState.currency} onChange={handleChange} className="w-full bg-gray-700 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                            <option value="EUR">Euro (€)</option>
                            <option value="BRL">Real (R$)</option>
                            <option value="USD">Dólar ($)</option>
                        </select>
                    </div>
                 </div>

                <div className="mt-8 text-right">
                    <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded transition">
                        Salvar Configurações
                    </button>
                </div>
            </form>
        </div>
    )
}
