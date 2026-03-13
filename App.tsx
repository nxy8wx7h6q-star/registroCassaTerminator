
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Settings as SettingsIcon, 
  Users, 
  ChevronRight, 
  Trash2, 
  Plus, 
  Minus, 
  Receipt as ReceiptIcon,
  CreditCard,
  Banknote,
  LogOut,
  Sparkles,
  Info,
  History,
  Save,
  Clock,
  ArrowRightLeft,
  Printer,
  CheckCircle2,
  Archive,
  Send,
  Calendar,
  Eye
} from 'lucide-react';
import { 
  Category, 
  Product, 
  CartItem, 
  Sale, 
  PaymentMethod, 
  UserRole, 
  Operator, 
  VatRate,
  Unit,
  VatBreakdown,
  ClosureReport,
  SaleStatus
} from './types';
import { INITIAL_PRODUCTS, OPERATORS } from './constants';
import { Receipt } from './components/Receipt';
import { GeminiService } from './services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

// --- UI Components ---

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
      active 
        ? 'bg-amber-600 text-white shadow-md' 
        : 'text-stone-500 hover:bg-stone-100'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'reports' | 'operators' | 'settings' | 'closure' | 'archive' | 'sales'>('pos');
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [operators, setOperators] = useState<Operator[]>(OPERATORS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [archive, setArchive] = useState<ClosureReport[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Tutti'>('Tutti');
  
  // Checkout & Payment State
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // AI & Reports State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Closure State
  const [realCashInput, setRealCashInput] = useState<string>('');
  const [startingCash, setStartingCash] = useState<number>(100);
  const [isClosing, setIsClosing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cartDiscount, setCartDiscount] = useState<{ type: 'percent' | 'fixed', value: number } | null>(null);
  const [issueReceipt, setIssueReceipt] = useState(true);

  // Settings Form State
  const [newOpName, setNewOpName] = useState('');
  const [newOpRole, setNewOpRole] = useState<UserRole>(UserRole.CASHIER);
  const totals = useMemo(() => {
    const breakdown: Record<number, { taxable: number; vat: number }> = {};
    let subtotal = cart.reduce((acc, item) => {
      const price = item.basePrice + (item.variantSelections?.size?.priceDelta || 0);
      const totalForItem = price * item.quantity;
      const vatRate = item.vatRate;
      const taxable = totalForItem / (1 + vatRate / 100);
      const vat = totalForItem - taxable;
      if (!breakdown[vatRate]) breakdown[vatRate] = { taxable: 0, vat: 0 };
      breakdown[vatRate].taxable += taxable;
      breakdown[vatRate].vat += vat;
      return acc + totalForItem;
    }, 0);

    // Apply Cart Discount
    let discountAmount = 0;
    if (cartDiscount) {
      if (cartDiscount.type === 'percent') {
        discountAmount = (subtotal * cartDiscount.value) / 100;
      } else {
        discountAmount = Math.min(subtotal, cartDiscount.value);
      }
      subtotal -= discountAmount;
    }

    const vatTotal = Object.values(breakdown).reduce((sum, b) => sum + b.vat, 0);
    const vatBreakdownList: VatBreakdown[] = Object.entries(breakdown).map(([rate, vals]) => ({
      rate: Number(rate),
      taxable: vals.taxable,
      vatAmount: vals.vat
    }));
    return { total: subtotal, vatTotal, subtotal: subtotal - vatTotal, vatBreakdown: vatBreakdownList, discountAmount };
  }, [cart, cartDiscount]);

  // Methods
  const handleAddToCart = (product: Product) => {
    // Flowchart: Prodotto Valido?
    if (!product.active || product.stock <= 0) {
      alert(`Prodotto ${product.name} non disponibile o non valido.`);
      return;
    }

    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + (product.unit === Unit.KG ? 0.1 : 1) } : item));
    } else {
      setCart([...cart, { id: Math.random().toString(36).substr(2, 9), productId: product.id, name: product.name, basePrice: product.price, quantity: product.unit === Unit.KG ? 0.1 : 1, vatRate: product.vatRate }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => item.id === itemId ? { ...item, quantity: Math.max(0.1, item.quantity + delta) } : item));
  };

  const handleCheckout = () => {
    if (!selectedPaymentMethod) return;
    const paid = parseFloat(amountPaid) || totals.total;

    if (selectedPaymentMethod === PaymentMethod.CASH && paid < totals.total) {
      alert('Errore Pagamento: L\'importo versato è insufficiente.');
      return;
    }

    const change = Math.max(0, paid - totals.total);
    const newSale: Sale = { 
      id: `SALE-${Date.now()}`, 
      items: [...cart], 
      total: totals.total, 
      vatTotal: totals.vatTotal, 
      subtotal: totals.subtotal, 
      paymentMethod: selectedPaymentMethod, 
      timestamp: new Date(), 
      operator: currentOperator?.name || 'Sistema', 
      receiptNumber: sales.length + 1, 
      amountPaid: paid, 
      changeGiven: change, 
      vatBreakdown: totals.vatBreakdown,
      status: SaleStatus.COMPLETED,
      discountAmount: totals.discountAmount
    };
    setSales([newSale, ...sales]);
    setProducts(prev => prev.map(p => {
      const soldItem = cart.find(ci => ci.productId === p.id);
      return soldItem ? { ...p, stock: Math.max(0, p.stock - soldItem.quantity) } : p;
    }));
    setCart([]); 
    setCheckoutModal(false); 
    setSelectedPaymentMethod(null); 
    setAmountPaid(''); 
    if (issueReceipt) {
      setLastCompletedSale(newSale);
    }
    setCartDiscount(null);
    handleOpenDrawer();
  };

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
    setTimeout(() => setIsDrawerOpen(false), 3000);
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Sei sicuro di voler annullare la vendita corrente?')) {
      setCart([]);
      setCartDiscount(null);
    }
  };

  const handleVoidSale = (saleId: string) => {
    if (confirm('Sei sicuro di voler ANNULLARE questo scontrino?')) {
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: SaleStatus.VOIDED } : s));
    }
  };

  const handleReturnSale = (saleId: string) => {
    if (confirm('Sei sicuro di voler effettuare il RESO per questo scontrino?')) {
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: SaleStatus.RETURNED } : s));
    }
  };

  const handleFullClosure = async () => {
    setIsClosing(true);
    const rev = sales.reduce((a, b) => a + b.total, 0);
    const vatTotal = sales.reduce((a, b) => a + b.vatTotal, 0);
    const theoretical = startingCash + sales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((a, b) => a + b.total, 0);
    const real = parseFloat(realCashInput || '0');
    
    // 1. Create Report
    const report: ClosureReport = {
      id: `CLOSURE-${Date.now()}`,
      timestamp: new Date(),
      operator: currentOperator?.name || 'Sistema',
      totalSales: rev,
      netSales: rev - vatTotal,
      totalVat: vatTotal,
      receiptCount: sales.length,
      byCategory: {}, // simplified for mock
      byPaymentMethod: sales.reduce((acc, s) => ({ ...acc, [s.paymentMethod]: (acc[s.paymentMethod as any] || 0) + s.total }), {} as any),
      theoreticalCash: theoretical,
      realCash: real,
      difference: real - theoretical,
      vatBreakdown: [], // simplified
      sentToAgency: true
    };

    // 2. Simulate Delay for "Agency of Revenue" send
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Update Archive and Reset
    setArchive([report, ...archive]);
    setSales([]);
    setRealCashInput('');
    setIsClosing(false);
    setActiveTab('archive');
    alert('Chiusura effettuata! Dati inviati all\'Agenzia delle Entrate e salvati in Archivio Storico.');
  };

  const dailyStats = useMemo(() => {
    const revenue = sales.reduce((acc, s) => acc + s.total, 0);
    const hourlySales: Record<number, number> = {};
    sales.forEach(s => { const h = new Date(s.timestamp).getHours(); hourlySales[h] = (hourlySales[h] || 0) + s.total; });
    return { 
      revenue, 
      avgTicket: sales.length > 0 ? revenue / sales.length : 0, 
      itemsCount: sales.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + i.quantity, 0), 0), 
      hourlySales 
    };
  }, [sales]);

  const handleAddOperator = () => {
    if (!newOpName) return;
    const newOp: Operator = {
      id: (operators.length + 1).toString(),
      name: newOpName,
      role: newOpRole
    };
    setOperators([...operators, newOp]);
    setNewOpName('');
  };

  const handleUpdateProduct = (id: string, field: 'price' | 'vatRate', value: number) => {
    if (currentOperator?.role !== UserRole.ADMIN) return;
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleLogout = () => {
    if (confirm('Sei sicuro di voler uscire dal sistema?')) {
      setCurrentOperator(null);
      setActiveTab('pos');
    }
  };

  // Auth Guard
  if (!currentOperator) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center border border-white">
          <div className="w-24 h-24 bg-amber-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-amber-600 shadow-inner">
            <ShoppingBag size={48} />
          </div>
          <h1 className="text-3xl font-black mb-2 text-stone-800 tracking-tighter">Panetteria Pro</h1>
          <p className="text-stone-400 mb-10 font-medium">Seleziona il tuo profilo per iniziare</p>
          <div className="space-y-4">
            {operators.map(op => (
              <button key={op.id} onClick={() => setCurrentOperator(op)} className="w-full py-5 px-8 bg-stone-50 border-2 border-stone-100 rounded-2xl hover:border-amber-500 hover:bg-amber-50 transition-all flex items-center justify-between group shadow-sm">
                <div className="flex flex-col items-start">
                  <span className="font-black text-stone-800 group-hover:text-amber-700 transition-colors">{op.name}</span>
                  <span className="text-[10px] text-stone-400 font-black uppercase tracking-widest">{op.role}</span>
                </div>
                <ChevronRight className="text-stone-300 group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col no-print">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-10">
            <div className="bg-stone-900 p-2.5 rounded-xl text-white shadow-lg">
              <ShoppingBag size={24} />
            </div>
            <span className="font-black text-xl tracking-tighter text-stone-800">POS PRO</span>
          </div>
          <nav className="space-y-1.5">
            <SidebarItem icon={<ShoppingBag size={18} />} label="Vendita" active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} />
            <SidebarItem icon={<ReceiptIcon size={18} />} label="Scontrini" active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
            <SidebarItem icon={<Package size={18} />} label="Magazzino" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
            <SidebarItem icon={<BarChart3 size={18} />} label="Report" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
            <SidebarItem icon={<Archive size={18} />} label="Archivio Storico" active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} />
            <SidebarItem icon={<SettingsIcon size={18} />} label="Impostazioni" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            <div className="pt-6 mt-6 border-t border-stone-100">
              <SidebarItem icon={<History size={18} />} label="Chiusura Cassa" active={activeTab === 'closure'} onClick={() => setActiveTab('closure')} />
              <button 
                onClick={handleOpenDrawer}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-stone-500 hover:bg-stone-100 mt-1"
              >
                <ArrowRightLeft size={18} />
                <span className="font-medium text-sm">Apri Cassetto</span>
              </button>
            </div>
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-stone-100 bg-stone-50/50">
          <div className="flex items-center space-x-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center font-black text-amber-700 border border-amber-200">
              {currentOperator.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm text-stone-800">{currentOperator.name}</span>
              <span className="text-[9px] text-stone-400 font-black uppercase tracking-widest">{currentOperator.role}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 py-3 px-4 text-red-500 hover:bg-red-50 rounded-xl transition-all font-black text-xs uppercase tracking-widest border border-transparent hover:border-red-100">
            <LogOut size={16} /> <span>LOGOUT</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-stone-50 overflow-hidden no-print">
        <header className="bg-white border-b border-stone-200 px-10 py-5 flex justify-between items-center">
          <h2 className="text-xl font-black text-stone-800 tracking-tight flex items-center">
            {activeTab === 'pos' && <><ShoppingBag className="mr-3 text-amber-500" /> Cassa Registratrice</>}
            {activeTab === 'sales' && <><ReceiptIcon className="mr-3 text-amber-500" /> Registro Scontrini</>}
            {activeTab === 'inventory' && <><Package className="mr-3 text-amber-500" /> Gestione Inventario</>}
            {activeTab === 'reports' && <><BarChart3 className="mr-3 text-amber-500" /> Business Analytics</>}
            {activeTab === 'archive' && <><Archive className="mr-3 text-amber-500" /> Archivio Storico</>}
            {activeTab === 'settings' && <><SettingsIcon className="mr-3 text-amber-500" /> Configurazione Sistema</>}
            {activeTab === 'closure' && <><History className="mr-3 text-amber-500" /> Fine Giornata Fiscale</>}
          </h2>
          <div className="flex items-center space-x-6">
            {isDrawerOpen && (
              <div className="bg-amber-500 text-white px-4 py-2 rounded-2xl font-black text-xs animate-bounce shadow-lg flex items-center space-x-2">
                <ArrowRightLeft size={16} />
                <span>CASSETTO APERTO</span>
              </div>
            )}
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Stato Fiscale</span>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[9px] font-black flex items-center space-x-2 border border-green-200">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span>CONNESSO AE</span>
                </div>
            </div>
            <div className="h-8 w-px bg-stone-200"></div>
            <div className="text-right">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Orario Locale</p>
              <p className="text-sm font-black text-stone-800">{new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-10">
          
          {/* POS TAB */}
          {activeTab === 'pos' && (
            <div className="flex h-full space-x-10">
              <div className="flex-1 flex flex-col space-y-8">
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                  {['Tutti', ...Object.values(Category)].map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat as any)} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-stone-900 text-white shadow-xl shadow-stone-200' : 'bg-white text-stone-400 border border-stone-200 hover:bg-stone-50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.filter(p => p.active && (selectedCategory === 'Tutti' || p.category === selectedCategory)).map(product => (
                    <button key={product.id} onClick={() => handleAddToCart(product)} className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200 hover:shadow-2xl hover:border-amber-400 hover:-translate-y-2 transition-all text-left flex flex-col h-48 group">
                      <span className="text-[9px] font-black text-amber-600 uppercase mb-2 tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{product.category}</span>
                      <h3 className="font-black text-stone-800 mb-auto leading-tight text-base line-clamp-2 group-hover:text-amber-800 transition-colors">{product.name}</h3>
                      <div className="flex justify-between items-end mt-4">
                        <span className="text-2xl font-black text-stone-900 tracking-tighter">€{product.price.toFixed(2)}</span>
                        <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-tighter ${product.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-400'}`}>
                          STOCK: {product.stock.toFixed(1)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-[26rem] bg-white rounded-[3rem] shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
                <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                  <h3 className="font-black text-lg text-stone-800 tracking-tight">VENDITA ATTUALE</h3>
                  <div className="flex items-center space-x-2">
                    <button onClick={handleClearCart} className="p-2 text-stone-300 hover:text-red-500 transition-colors" title="Annulla Vendita">
                      <Trash2 size={20} />
                    </button>
                    <div className="bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-sm">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">#SCONTRINO {sales.length + 1}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-200 space-y-6 opacity-50">
                      <ShoppingBag size={96} strokeWidth={1} className="text-stone-200" />
                      <p className="font-black text-stone-300 text-xl tracking-tighter italic">Cassa vuota...</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm hover:border-amber-200 transition-all flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-black text-sm text-stone-800 line-clamp-1">{item.name}</h4>
                          <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-stone-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 bg-stone-50 rounded-2xl p-2 border border-stone-100 shadow-inner">
                            <button onClick={() => updateQuantity(item.id, -0.1)} className="p-1.5 bg-white hover:bg-stone-900 hover:text-white rounded-xl shadow-sm transition-all"><Minus size={16}/></button>
                            <span className="text-xs font-black w-12 text-center text-stone-900">{item.quantity.toFixed(1)}</span>
                            <button onClick={() => updateQuantity(item.id, 0.1)} className="p-1.5 bg-white hover:bg-stone-900 hover:text-white rounded-xl shadow-sm transition-all"><Plus size={16}/></button>
                          </div>
                          <span className="font-black text-lg text-stone-900">€{(item.basePrice * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-8 bg-stone-900 text-white rounded-t-[3rem]">
                  <div className="space-y-3 mb-8 text-sm opacity-90">
                    <div className="flex justify-between font-bold text-stone-400 uppercase tracking-widest text-[10px]"><span>Netto Imponibile</span><span>€{totals.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-stone-400 uppercase tracking-widest text-[10px]"><span>IVA Calcolata</span><span>€{totals.vatTotal.toFixed(2)}</span></div>
                    {totals.discountAmount > 0 && (
                      <div className="flex justify-between font-bold text-amber-500 uppercase tracking-widest text-[10px]"><span>Sconto Applicato</span><span>-€{totals.discountAmount.toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between font-black text-4xl pt-4 border-t border-white/10 tracking-tighter"><span>TOTALE</span><span>€{totals.total.toFixed(2)}</span></div>
                  </div>
                  <button disabled={cart.length === 0} onClick={() => { setCheckoutModal(true); setAmountPaid(totals.total.toFixed(2)); }} className="w-full bg-amber-600 text-white py-6 rounded-2xl font-black shadow-2xl hover:bg-amber-500 disabled:opacity-20 disabled:grayscale transition-all flex items-center justify-center space-x-4 text-xl tracking-tighter uppercase">
                    <CreditCard size={28} /> <span>PAGAMENTO</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SALES TAB */}
          {activeTab === 'sales' && (
            <div className="space-y-10 max-w-6xl mx-auto pb-12">
               <div className="bg-white rounded-[3rem] shadow-xl border border-stone-200 overflow-hidden">
                  <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                     <h3 className="font-black text-lg tracking-tight">REGISTRO SCONTRINI GIORNALIERI</h3>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              <th className="px-8 py-5">N. Scontrino</th>
                              <th className="px-8 py-5">Ora</th>
                              <th className="px-8 py-5">Operatore</th>
                              <th className="px-8 py-5 text-right">Totale</th>
                              <th className="px-8 py-5 text-center">Stato</th>
                              <th className="px-8 py-5 text-center">Azioni</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                           {sales.length === 0 ? (
                             <tr><td colSpan={6} className="px-8 py-20 text-center font-bold text-stone-300 italic">Nessuna vendita registrata oggi.</td></tr>
                           ) : sales.map(sale => (
                             <tr key={sale.id} className={`hover:bg-amber-50/30 transition-colors group ${sale.status !== SaleStatus.COMPLETED ? 'opacity-50 grayscale' : ''}`}>
                                <td className="px-8 py-6 font-black text-stone-800">#{sale.receiptNumber}</td>
                                <td className="px-8 py-6 text-sm font-bold text-stone-500">{sale.timestamp.toLocaleTimeString('it-IT')}</td>
                                <td className="px-8 py-6 text-sm font-bold text-stone-500">{sale.operator}</td>
                                <td className="px-8 py-6 text-right font-black text-stone-900">€{sale.total.toFixed(2)}</td>
                                <td className="px-8 py-6 text-center">
                                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                     sale.status === SaleStatus.COMPLETED ? 'bg-green-100 text-green-700 border-green-200' :
                                     sale.status === SaleStatus.VOIDED ? 'bg-red-100 text-red-700 border-red-200' :
                                     'bg-blue-100 text-blue-700 border-blue-200'
                                   }`}>
                                     {sale.status}
                                   </span>
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <div className="flex items-center justify-center space-x-2">
                                      {sale.status === SaleStatus.COMPLETED && (
                                        <>
                                          <button onClick={() => handleVoidSale(sale.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all" title="Annulla"><Trash2 size={18}/></button>
                                          <button onClick={() => handleReturnSale(sale.id)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-xl transition-all" title="Reso"><ArrowRightLeft size={18}/></button>
                                        </>
                                      )}
                                      <button onClick={() => setLastCompletedSale(sale)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-all"><Eye size={18}/></button>
                                   </div>
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}
          {activeTab === 'archive' && (
            <div className="space-y-10 max-w-6xl mx-auto pb-12">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200">
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Totale Storico Vendite</p>
                     <h4 className="text-3xl font-black text-stone-900 tracking-tighter">€{archive.reduce((a,b)=>a+b.totalSales,0).toFixed(2)}</h4>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200">
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Chiusure Registrate</p>
                     <h4 className="text-3xl font-black text-stone-900 tracking-tighter">{archive.length} GIORNI</h4>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200">
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Invio Fiscale</p>
                     <div className="flex items-center space-x-2 text-green-600 font-black"><CheckCircle2 size={24} /> <span className="text-xl tracking-tight">100% OK</span></div>
                  </div>
               </div>

               <div className="bg-white rounded-[3rem] shadow-xl border border-stone-200 overflow-hidden">
                  <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                     <h3 className="font-black text-lg tracking-tight">REGISTRO CHIUSURE GIORNALIERE</h3>
                     <div className="flex space-x-3">
                        <button className="bg-white p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-stone-600 transition-all shadow-sm"><Printer size={18} /></button>
                        <button className="bg-stone-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Esporta Dati</button>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              <th className="px-8 py-5">Data & Ora</th>
                              <th className="px-8 py-5">Operatore</th>
                              <th className="px-8 py-5 text-right">Incasso Totale</th>
                              <th className="px-8 py-5 text-right">Diff. Cassa</th>
                              <th className="px-8 py-5 text-center">Stato AE</th>
                              <th className="px-8 py-5 text-center">Azioni</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                           {archive.length === 0 ? (
                             <tr><td colSpan={6} className="px-8 py-20 text-center font-bold text-stone-300 italic">Nessuna chiusura presente in archivio.</td></tr>
                           ) : archive.map(report => (
                             <tr key={report.id} className="hover:bg-amber-50/30 transition-colors group">
                                <td className="px-8 py-6 font-black text-stone-800 flex items-center"><Calendar size={16} className="mr-3 text-stone-300 group-hover:text-amber-500 transition-colors" /> {report.timestamp.toLocaleString('it-IT')}</td>
                                <td className="px-8 py-6 text-sm font-bold text-stone-500">{report.operator}</td>
                                <td className="px-8 py-6 text-right font-black text-stone-900">€{report.totalSales.toFixed(2)}</td>
                                <td className={`px-8 py-6 text-right font-black ${report.difference < 0 ? 'text-red-500' : report.difference > 0 ? 'text-green-500' : 'text-stone-400'}`}>
                                   {report.difference === 0 ? '-' : `€${report.difference.toFixed(2)}`}
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-200">INVIATO</span>
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <button className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-all"><Eye size={18}/></button>
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="max-w-6xl mx-auto space-y-12 pb-20">
              {/* User Management */}
              <div className="bg-white rounded-[3rem] shadow-xl border border-stone-200 overflow-hidden">
                <div className="p-10 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-2xl tracking-tighter text-stone-800">GESTIONE UTENZE</h3>
                    <p className="text-stone-400 text-sm font-bold">Aggiungi o modifica i profili operatore</p>
                  </div>
                  <Users className="text-stone-200" size={48} />
                </div>
                <div className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {operators.map(op => (
                      <div key={op.id} className="bg-stone-50 p-6 rounded-3xl border border-stone-100 flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-stone-900 border border-stone-100">
                          {op.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-stone-800">{op.name}</p>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{op.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-stone-900 p-8 rounded-[2.5rem] text-white">
                    <h4 className="font-black text-sm uppercase tracking-widest mb-6 text-stone-400">Nuovo Profilo</h4>
                    <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                      <input 
                        type="text" 
                        placeholder="Nome Operatore" 
                        value={newOpName}
                        onChange={(e) => setNewOpName(e.target.value)}
                        className="flex-1 bg-white/10 border-none rounded-2xl px-6 py-4 text-white placeholder:text-stone-500 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                      <select 
                        value={newOpRole}
                        onChange={(e) => setNewOpRole(e.target.value as UserRole)}
                        className="bg-white/10 border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-amber-500 outline-none appearance-none"
                      >
                        <option value={UserRole.CASHIER} className="text-stone-900">Cassiere</option>
                        <option value={UserRole.ADMIN} className="text-stone-900">Amministratore</option>
                      </select>
                      <button 
                        onClick={handleAddOperator}
                        className="bg-amber-500 hover:bg-amber-400 text-white px-10 py-4 rounded-2xl font-black transition-all flex items-center justify-center space-x-2"
                      >
                        <Plus size={20} /> <span>AGGIUNGI</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Pricing & VAT */}
              <div className="bg-white rounded-[3rem] shadow-xl border border-stone-200 overflow-hidden">
                <div className="p-10 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-2xl tracking-tighter text-stone-800">PREZZI E ALIQUOTE IVA</h3>
                    <p className="text-stone-400 text-sm font-bold">Modifica i parametri fiscali dei prodotti</p>
                    {currentOperator?.role !== UserRole.ADMIN && (
                      <div className="mt-4 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 border border-red-100">
                        <Info size={16} />
                        <span>SOLO L'AMMINISTRATORE PUÒ MODIFICARE PREZZI E IVA</span>
                      </div>
                    )}
                  </div>
                  <Sparkles className="text-stone-200" size={48} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                        <th className="px-10 py-6">Prodotto</th>
                        <th className="px-10 py-6">Categoria</th>
                        <th className="px-10 py-6">Prezzo (€)</th>
                        <th className="px-10 py-6">IVA (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {products.map(product => (
                        <tr key={product.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-10 py-6">
                            <p className="font-black text-stone-800">{product.name}</p>
                            <p className="text-[10px] text-stone-400 font-bold">PLU: {product.plu}</p>
                          </td>
                          <td className="px-10 py-6">
                            <span className="text-[10px] font-black bg-stone-100 text-stone-500 px-3 py-1 rounded-full uppercase tracking-widest">{product.category}</span>
                          </td>
                          <td className="px-10 py-6">
                            <div className="relative w-32">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-black text-xs">€</span>
                              <input 
                                type="number" 
                                step="0.01"
                                disabled={currentOperator?.role !== UserRole.ADMIN}
                                value={product.price}
                                onChange={(e) => handleUpdateProduct(product.id, 'price', parseFloat(e.target.value))}
                                className="w-full bg-stone-50 border border-stone-100 rounded-xl py-2 pl-7 pr-3 font-black text-stone-800 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50"
                              />
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <select 
                              disabled={currentOperator?.role !== UserRole.ADMIN}
                              value={product.vatRate}
                              onChange={(e) => handleUpdateProduct(product.id, 'vatRate', parseInt(e.target.value))}
                              className="bg-stone-50 border border-stone-100 rounded-xl py-2 px-4 font-black text-stone-800 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50 appearance-none"
                            >
                              {Object.values(VatRate).filter(v => typeof v === 'number').map(rate => (
                                <option key={rate} value={rate}>{rate}%</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CLOSURE TAB */}
          {activeTab === 'closure' && (
            <div className="max-w-4xl mx-auto space-y-10 pb-12">
              <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-stone-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <h3 className="text-4xl font-black mb-12 text-stone-900 tracking-tighter flex items-center justify-between border-b border-stone-50 pb-10">
                  <span>REPORT FINE GIORNATA</span>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em] mb-2">Chiusura Fiscale</p>
                     <p className="text-base font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-2xl">{new Date().toLocaleDateString('it-IT')}</p>
                  </div>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
                  <div className="space-y-10">
                    <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] flex items-center">
                      <BarChart3 size={18} className="mr-3 text-amber-500" /> Analisi Incassi
                    </h4>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-stone-900 text-white p-6 rounded-[2rem] shadow-xl">
                        <span className="font-bold text-stone-400 uppercase text-[10px] tracking-widest">Incasso Lordo</span>
                        <span className="text-3xl font-black tracking-tighter">€{dailyStats.revenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center px-6 py-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <span className="text-stone-400 font-black uppercase text-[10px] tracking-widest">Imponibile Netto</span>
                        <span className="font-black text-stone-800">€{(dailyStats.revenue - sales.reduce((a,b)=>a+b.vatTotal, 0)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center px-6 py-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <span className="text-stone-400 font-black uppercase text-[10px] tracking-widest">Iva Totale</span>
                        <span className="font-black text-stone-800">€{sales.reduce((a,b)=>a+b.vatTotal, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center px-6 py-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <span className="text-stone-400 font-black uppercase text-[10px] tracking-widest">Transazioni</span>
                        <span className="font-black text-stone-800">{sales.length} Scontrini</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] flex items-center">
                      <Banknote size={18} className="mr-3 text-amber-500" /> Verifica Fisica
                    </h4>
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Fondo Iniziale</p>
                            <p className="text-xl font-black text-stone-900">€{startingCash.toFixed(2)}</p>
                         </div>
                         <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Cash Incassato</p>
                            <p className="text-xl font-black text-stone-900">€{sales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+b.total,0).toFixed(2)}</p>
                         </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4 pl-2">Conteggio Contante Reale</label>
                        <div className="relative group">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-stone-300 text-2xl transition-colors group-focus-within:text-amber-500">€</span>
                          <input type="number" value={realCashInput} onChange={(e) => setRealCashInput(e.target.value)} placeholder="0.00" className="w-full bg-stone-50 border-2 border-stone-100 rounded-[2rem] py-8 pl-14 pr-8 text-4xl font-black text-stone-900 focus:border-amber-500 focus:ring-0 focus:bg-white transition-all placeholder:text-stone-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-10 rounded-[2.5rem] border-2 flex items-center justify-between mb-12 shadow-sm transition-all ${Math.abs(parseFloat(realCashInput || '0') - (startingCash + sales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+b.total,0))) < 0.01 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">Discrepanza Rilevata</p>
                    <h5 className="text-4xl font-black tracking-tighter">€{(parseFloat(realCashInput || '0') - (startingCash + sales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+b.total,0))).toFixed(2)}</h5>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">Teorico Atteso in Cassa</p>
                    <p className="text-2xl font-black">€{(startingCash + sales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((a,b)=>a+b.total,0)).toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button disabled={isClosing || sales.length === 0} onClick={handleFullClosure} className="w-full bg-stone-900 text-white py-8 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-green-600 transition-all flex items-center justify-center space-x-6 uppercase tracking-tighter disabled:opacity-20">
                    {isClosing ? <><Sparkles className="animate-spin" size={32} /> <span>INVIO DATI AE...</span></> : <><Send size={32} /> <span>CONCLUDI GIORNATA & ARCHIVIA</span></>}
                  </button>
                  <p className="text-center text-stone-400 font-bold text-[10px] uppercase tracking-widest italic flex items-center justify-center"><History size={14} className="mr-2" /> Questa operazione azzererà i totali giornalieri e salverà i dati in Archivio Storico.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-12">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200"><p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Vendite Oggi</p><h4 className="text-3xl font-black text-amber-600">€{dailyStats.revenue.toFixed(2)}</h4></div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200"><p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Scontrino Medio</p><h4 className="text-3xl font-black text-stone-800">€{dailyStats.avgTicket.toFixed(2)}</h4></div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200"><p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Pezzi Venduti</p><h4 className="text-3xl font-black text-stone-800">{dailyStats.itemsCount.toFixed(0)}</h4></div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200"><p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Stato Stock</p><h4 className="text-3xl font-black text-green-600">OK</h4></div>
               </div>
               <div className="bg-white p-12 rounded-[3rem] border border-stone-200 shadow-sm"><h4 className="font-black text-stone-800 mb-10 uppercase text-xs tracking-[0.3em] flex items-center"><Clock size={20} className="mr-3 text-amber-500" /> Distribuzione Oraria Fatturato</h4><div className="h-96"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(dailyStats.hourlySales).map(([h, t]) => ({ h: h + ':00', t }))}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="h" fontSize={12} axisLine={false} tickLine={false} tick={{fill: '#a8a29e'}} /><YAxis fontSize={12} axisLine={false} tickLine={false} tick={{fill: '#a8a29e'}} /><Tooltip cursor={{fill: '#fafaf9'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', fontWeight: 'bold' }} /><Bar dataKey="t" fill="#d97706" radius={[12, 12, 0, 0]} barSize={60} /></BarChart></ResponsiveContainer></div></div>
            </div>
          )}
        </div>
      </main>

      {/* Checkout Modal */}
      {checkoutModal && (
        <div className="fixed inset-0 bg-stone-900/90 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h3 className="text-2xl font-black text-stone-800 tracking-tighter uppercase">Conferma Pagamento</h3>
              <button onClick={() => setCheckoutModal(false)} className="bg-white p-3 rounded-2xl shadow-sm border border-stone-200 text-stone-400 hover:text-red-500 transition-all"><Plus size={32} className="rotate-45" /></button>
            </div>
            <div className="p-12">
              <div className="text-center mb-12">
                <p className="text-stone-400 uppercase tracking-[0.4em] text-[11px] font-black mb-4">Totale dovuto al carrello</p>
                <h2 className="text-8xl font-black text-stone-900 tracking-tighter">€{totals.total.toFixed(2)}</h2>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-12">
                {[
                  { id: PaymentMethod.CASH, icon: <Banknote size={36} /> },
                  { id: PaymentMethod.CARD, icon: <CreditCard size={36} /> },
                  { id: PaymentMethod.TICKET, icon: <ReceiptIcon size={36} /> },
                  { id: PaymentMethod.MIXED, icon: <ArrowRightLeft size={36} /> },
                ].map(method => (
                  <button key={method.id} onClick={() => setSelectedPaymentMethod(method.id)} className={`p-8 border-2 rounded-[2.5rem] transition-all flex flex-col items-center space-y-4 group ${selectedPaymentMethod === method.id ? 'border-amber-500 bg-amber-50 shadow-inner scale-95' : 'border-stone-100 hover:border-stone-200 hover:bg-stone-50'}`}>
                    <div className={selectedPaymentMethod === method.id ? 'text-amber-600' : 'text-stone-300 group-hover:text-stone-500 transition-colors'}>{method.icon}</div>
                    <span className={`font-black text-[11px] uppercase tracking-[0.2em] ${selectedPaymentMethod === method.id ? 'text-amber-700' : 'text-stone-400'}`}>{method.id}</span>
                  </button>
                ))}
              </div>

              <div className="mb-12">
                <p className="text-stone-400 uppercase tracking-[0.4em] text-[11px] font-black mb-4 pl-2">Applica Sconto</p>
                <div className="flex space-x-4">
                  {[0, 5, 10, 15, 20].map(pct => (
                    <button 
                      key={pct} 
                      onClick={() => setCartDiscount(pct === 0 ? null : { type: 'percent', value: pct })}
                      className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all border-2 ${cartDiscount?.value === pct ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-stone-50 text-stone-400 border-stone-100 hover:border-stone-200'}`}
                    >
                      {pct === 0 ? 'NESSUNO' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
              {selectedPaymentMethod === PaymentMethod.CASH && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 mb-10">
                   <div className="pt-8 border-t border-stone-100 flex items-center justify-between">
                     <div className="flex items-center space-x-3">
                       <ReceiptIcon className="text-stone-400" size={24} />
                       <span className="text-xs font-black uppercase tracking-widest text-stone-500">Emetti Scontrino</span>
                     </div>
                     <button 
                       onClick={() => setIssueReceipt(!issueReceipt)}
                       className={`w-14 h-8 rounded-full transition-all relative ${issueReceipt ? 'bg-amber-500' : 'bg-stone-200'}`}
                     >
                       <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${issueReceipt ? 'left-7' : 'left-1'}`} />
                     </button>
                   </div>
                   <div className="pt-4">
                     <label className="block text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] mb-4 pl-2">Contante Versato</label>
                     <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-stone-300 text-3xl group-focus-within:text-amber-500 transition-colors">€</span>
                        <input type="number" autoFocus value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-full bg-stone-50 border-none rounded-[2rem] py-8 pl-16 pr-8 text-5xl font-black text-stone-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                     </div>
                   </div>
                   {parseFloat(amountPaid) > totals.total && (
                     <div className="bg-stone-900 p-10 rounded-[2.5rem] shadow-2xl flex justify-between items-center text-white border-l-8 border-amber-500">
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-stone-400">Resto al cliente</span>
                        <span className="text-5xl font-black tracking-tighter text-amber-400">€{(parseFloat(amountPaid) - totals.total).toFixed(2)}</span>
                     </div>
                   )}
                </div>
              )}
                  <button 
                    disabled={!selectedPaymentMethod || (selectedPaymentMethod === PaymentMethod.CASH && parseFloat(amountPaid) < totals.total)} 
                    onClick={handleCheckout} 
                    className="w-full bg-stone-900 text-white py-8 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-amber-600 transition-all disabled:opacity-20 uppercase tracking-tighter"
                  >
                    EMETTI SCONTRINO FISCALE
                  </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {lastCompletedSale && (
        <div className="fixed inset-0 bg-stone-900/95 backdrop-blur-3xl flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300 overflow-auto">
          <div className="flex flex-col items-center space-y-10 w-full max-w-2xl py-12">
            <div className="flex flex-col items-center text-center text-white space-y-4">
              <div className="bg-green-500 p-6 rounded-full shadow-2xl animate-bounce border-4 border-white/20"><CheckCircle2 size={56} /></div>
              <h2 className="text-4xl font-black uppercase tracking-tighter">OPERAZIONE REGISTRATA!</h2>
              <p className="text-stone-400 font-bold text-lg">Dati inviati con successo all'Agenzia delle Entrate.</p>
            </div>
            <div className="bg-stone-200 p-10 rounded-[4rem] shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-700">
               <Receipt sale={lastCompletedSale} />
            </div>
            <div className="flex space-x-6 w-full justify-center no-print">
               <button onClick={() => window.print()} className="bg-white text-stone-900 px-10 py-5 rounded-2xl font-black flex items-center space-x-4 shadow-xl hover:bg-stone-100 transition-all text-lg"><Printer size={24} /> <span>STAMPA</span></button>
               <button onClick={() => setLastCompletedSale(null)} className="bg-amber-600 text-white px-12 py-5 rounded-2xl font-black flex items-center space-x-4 shadow-xl hover:bg-amber-500 transition-all text-lg"><span>CONTINUA</span> <ArrowRightLeft size={24} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div className="hidden print:block print-only">
        {lastCompletedSale && <Receipt sale={lastCompletedSale} />}
        {!lastCompletedSale && sales.length > 0 && <Receipt sale={sales[0]} />}
      </div>
    </div>
  );
};

export default App;
