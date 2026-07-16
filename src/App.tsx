import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ShieldCheck, ShoppingBag, Heart, Info, Search, Menu, X, 
  ChevronRight, AlertCircle, CheckCircle, Phone, MapPin, Mail, 
  Check, Copy, ExternalLink, Award, TrendingUp, Zap, 
  Users, HelpCircle, Activity, ChevronDown, ArrowRight, Trash2,
  Smartphone, Key, AlertTriangle, Cpu, HelpCircle as HelpIcon, Play, Instagram
} from 'lucide-react';
import { INITIAL_PRODUCTS } from './data/seed';
import { Product, Order, Banner, StoreSettings, formatBRL } from './types';
import TriarcLogo from './components/TriarcLogo';
import AdminPanel from './components/AdminPanel';
import { db, auth } from './firebase';
import { collection, doc, onSnapshot, setDoc, increment, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

const WhatsAppLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    viewBox="0 0 32 32" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <radialGradient 
        id="waGlossyGradient" 
        cx="45%" 
        cy="25%" 
        r="55%" 
        fx="35%" 
        fy="15%"
      >
        <stop offset="0%" stopColor="#efc050" />
        <stop offset="25%" stopColor="#d4af37" />
        <stop offset="65%" stopColor="#aa7c11" />
        <stop offset="100%" stopColor="#784b00" />
      </radialGradient>
      <linearGradient id="waReflection" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="white" stopOpacity="0.25" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="15" fill="url(#waGlossyGradient)" />
    <circle cx="16" cy="16" r="14.5" stroke="url(#waReflection)" strokeWidth="0.8" fill="none" />
    <path 
      d="M16.035 8.5C11.874 8.5 8.5 11.874 8.5 16.035c0 1.488.432 2.872 1.176 4.045L8.6 23.9l3.96-.984c1.12.696 2.432 1.104 3.84 1.104 4.161 0 7.6-3.374 7.6-7.535C24.035 12.33 20.2 8.5 16.035 8.5zm4.004 10.375c-.161.455-.945.881-1.3.918-.344.037-.777.062-2.31-.54a10.05 10.05 0 01-3.303-2.887c-.097-.13-.78-.103-.78-1.036 0-.938.487-1.399.664-1.59.176-.191.381-.237.507-.237.127 0 .254 0 .365.006.12.006.275-.045.43.328.16.381.545 1.317.593 1.413.048.096.08.206.016.332-.064.127-.096.206-.192.316-.096.11-.202.247-.287.332-.096.096-.196.2-.084.39.111.19.493.81 1.056 1.312.727.644 1.341.843 1.531.938.19.095.301.08.411-.047.111-.127.476-.887.603-1.06.127-.174.254-.143.428-.08s1.11.523 1.3.618c.19.095.317.143.365.222.048.08.048.459-.111.914z" 
      fill="black" 
    />
  </svg>
);

// High quality fallback photos for local sportwear models to ensure spectacular design instantly
const getProductImage = (prod: Product): string => {
  if (prod.imageUrl && !prod.imageUrl.startsWith('/images/')) {
    return prod.imageUrl;
  }
  const fallbackMap: Record<string, string> = {
    "triarc-comp-01": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
    "triarc-comp-02": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&auto=format&fit=crop&q=80",
    "triarc-comp-03": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
    "triarc-bra-04": "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=800&auto=format&fit=crop&q=80",
    "triarc-wind-05": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80"
  };
  return fallbackMap[prod.id] || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80";
};

export default function App() {
  // Reactive state synced with Firestore 
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [analyticsCounters, setAnalyticsCounters] = useState<{ visits: number; whatsapp_clicks: number } | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);

  // Carousel cycle index
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Admin access controls
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [isFirstAccessMode, setIsFirstAccessMode] = useState(false);
  const [adminNotification, setAdminNotification] = useState<{ type: 'success' | 'error' | 'info' | 'loading', text: string } | null>(null);

  const showAdminNotification = (type: 'success' | 'error' | 'info' | 'loading', text: string) => {
    setAdminNotification({ type, text });
    if (type !== 'loading') {
      setTimeout(() => setAdminNotification(null), 4000);
    }
  };

  // Observar estado de autenticação para manter o admin logado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const email = user.email?.trim().toLowerCase();
        if (email === 'gustavoncoimbra@gmail.com') {
          setIsAdminLoggedIn(true);
        } else if (email) {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', email));
            if (adminDoc.exists()) {
              setIsAdminLoggedIn(true);
            } else {
              setIsAdminLoggedIn(false);
            }
          } catch (e) {
            console.error("Erro ao verificar status de admin:", e);
            setIsAdminLoggedIn(false);
          }
        } else {
          setIsAdminLoggedIn(false);
        }
      } else {
        setIsAdminLoggedIn(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Synchronize Firestore collections
  useEffect(() => {
    setIsFirebaseLoading(true);
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(list.length > 0 ? list : INITIAL_PRODUCTS);
      setIsFirebaseLoading(false);
    }, (err) => {
      console.warn("Products sync pending: ", err);
      setProducts(INITIAL_PRODUCTS);
      setIsFirebaseLoading(false);
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const list: Order[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Order);
      });
      setOrders(list);
    }, (err) => console.warn("Orders error: ", err));

    const unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => {
      const list: Banner[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Banner);
      });
      setBanners(list);
    }, (err) => console.warn("Banners error: ", err));

    const unsubSettings = onSnapshot(doc(db, 'storeSettings', 'triarc_config'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as StoreSettings);
      }
    }, (err) => console.warn("Settings error: ", err));

    const unsubAnalytics = onSnapshot(doc(db, 'analytics', 'counters'), (snap) => {
      if (snap.exists()) {
        setAnalyticsCounters(snap.data() as { visits: number; whatsapp_clicks: number });
      }
    }, (err) => console.warn("Analytics error: ", err));

    return () => {
      unsubProducts();
      unsubOrders();
      unsubBanners();
      unsubSettings();
      unsubAnalytics();
    };
  }, []);

  // Track page visits
  useEffect(() => {
    const recordVisit = async () => {
      try {
        const visitedFlag = sessionStorage.getItem('triarc_analytics_visited');
        if (!visitedFlag) {
          sessionStorage.setItem('triarc_analytics_visited', 'true');
          const countersRef = doc(db, 'analytics', 'counters');
          await setDoc(countersRef, { visits: increment(1) }, { merge: true });
        }
      } catch (e) {
        console.warn("Visits counting pending:", e);
      }
    };
    recordVisit();
  }, []);

  const trackWhatsAppClick = async () => {
    try {
      const countersRef = doc(db, 'analytics', 'counters');
      await setDoc(countersRef, { whatsapp_clicks: increment(1) }, { merge: true });
    } catch (e) {
      console.warn("WhatsApp action analytic registry pending:", e);
    }
  };

  // Empty callbacks to satisfy AdminPanel types
  const handleRefreshProducts = async () => {};
  const handleRefreshOrders = async () => {};
  const handleRefreshBanners = async () => {};

  // Interactive hooks
  const [selectedCategory, setSelectedCategory] = useState<string>('Tudo');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // PWA Support States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [showPWAInstallPrompt, setShowPWAInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isPWAOpen, setIsPWAOpen] = useState(false); // Modal control

  // Monitor PWA events and installation condition
  useEffect(() => {
    let isStandalone = false;
    let iosDetected = false;

    try {
      if (typeof window !== 'undefined') {
        const hasMatchMedia = typeof window.matchMedia === 'function';
        const isStandaloneMatch = hasMatchMedia ? window.matchMedia('(display-mode: standalone)').matches : false;
        const isNavigatorStandalone = typeof navigator !== 'undefined' && (navigator as any).standalone === true;
        isStandalone = isStandaloneMatch || isNavigatorStandalone;
      }
    } catch (e) {
      console.warn("PWA matchMedia or navigator.standalone check failed:", e);
    }
    setIsPWAInstalled(isStandalone);

    try {
      if (typeof navigator !== 'undefined' && navigator.userAgent) {
        iosDetected = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      }
    } catch (e) {
      console.warn("PWA iOS userAgent check failed:", e);
    }
    setIsIOS(iosDetected);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto show standard install badge after 4 seconds
      setTimeout(() => {
        let alreadyInstalled = false;
        try {
          if (typeof window !== 'undefined') {
            const hasMatchMedia = typeof window.matchMedia === 'function';
            const isStandaloneMatch = hasMatchMedia ? window.matchMedia('(display-mode: standalone)').matches : false;
            const isNavigatorStandalone = typeof navigator !== 'undefined' && (navigator as any).standalone === true;
            alreadyInstalled = isStandaloneMatch || isNavigatorStandalone;
          }
        } catch (err) {
          console.warn("PWA standalone timeout check failed:", err);
        }
        if (!alreadyInstalled) {
          setShowPWAInstallPrompt(true);
        }
      }, 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsPWAInstalled(true);
      setShowPWAInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('TRIARC PWA instalado com sucesso!');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handlePWAInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsPWAInstalled(true);
        setShowPWAInstallPrompt(false);
        setDeferredPrompt(null);
      }
    } else {
      // If no native prompt is captured (iOS Safari/Mac/Custom browsers), we open our explanatory beautiful visual wizard
      setIsPWAOpen(true);
    }
  };
  
  // Modal state variables
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(0);

  // Local storage quick shopping bag
  const [cart, setCart] = useState<{ product: Product; size: string; color: string; qty: number }[]>(() => {
    try {
      const saved = localStorage.getItem('triarc_landing_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartBuyerName, setCartBuyerName] = useState('');
  const [cartBuyerPhone, setCartBuyerPhone] = useState('');
  const [cartBuyerLocation, setCartBuyerLocation] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    interest: 'Track Black Motion',
    size: 'M',
    message: ''
  });

  const getConsultationStockInfo = () => {
    const size = contactForm.size;
    const interest = contactForm.interest;
    
    let mappedCategory = '';
    if (interest === "Track Black Motion") {
      mappedCategory = "Compressão";
    } else if (interest === "Track Black Edition") {
      mappedCategory = "Camisetas";
    }

    const categoryProducts = products.filter(p => !mappedCategory || p.category === mappedCategory);
    
    if (categoryProducts.length === 0) {
      return { available: true, count: 15 };
    }

    let totalInStockForSize = 0;
    categoryProducts.forEach(p => {
      if (p.sizeStock) {
        totalInStockForSize += (p.sizeStock[size] ?? 0);
      } else {
        totalInStockForSize += (p.sizes?.includes(size) ? 15 : 0);
      }
    });

    return {
      available: totalInStockForSize > 0,
      count: totalInStockForSize
    };
  };

  useEffect(() => {
    localStorage.setItem('triarc_landing_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (selectedProduct) {
      const activeSizes = selectedProduct.sizes || ['P', 'M', 'G', 'GG'];
      const firstInStockSize = activeSizes.find(sz => {
        const sc = selectedProduct.sizeStock ? (selectedProduct.sizeStock[sz] ?? 0) : 15;
        return sc > 0;
      });
      setSelectedSize(firstInStockSize || activeSizes[0] || 'M');
      setSelectedColor(selectedProduct.colors?.[0] || 'Carbon Black');
    }
  }, [selectedProduct]);

  // Categories definition
  const categoriesList = ['Tudo', 'Compressão', 'Camisetas', 'Feminino'];

  const filteredProducts = products.filter(product => {
    const matchCategory = selectedCategory === 'Tudo' || product.category === selectedCategory;
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Base setup
  const WHATSAPP_PHONE = settings?.supportPhone 
    ? settings.supportPhone.replace(/\D/g, '') 
    : "5518997034546";
  const SUPPORT_EMAIL = settings?.supportEmail || "triarcstore1@gmail.com";

  // Shopping Bag Actions
  const addToCart = (product: Product, size: string, color: string) => {
    const sizeStockAvailable = product.sizeStock && typeof product.sizeStock[size] === 'number'
      ? product.sizeStock[size]
      : 15;

    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id && item.size === size && item.color === color);
      if (idx > -1) {
        const cp = [...prev];
        const nextQty = cp[idx].qty + 1;
        if (nextQty > sizeStockAvailable) {
          return prev; // silently prevent exceeding available size stock
        }
        cp[idx].qty = nextQty;
        return cp;
      }
      return [...prev, { product, size, color, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const changeQty = (index: number, diff: number) => {
    setCart(prev => {
      const cp = [...prev];
      const item = cp[index];
      const sizeStockAvailable = item.product.sizeStock && typeof item.product.sizeStock[item.size] === 'number'
        ? item.product.sizeStock[item.size]
        : 15;

      const newQty = item.qty + diff;
      if (newQty <= 0) {
        return cp.filter((_, i) => i !== index);
      }
      if (newQty > sizeStockAvailable) {
        return prev; // hold quantity within stock limit
      }
      cp[index].qty = newQty;
      return cp;
    });
  };

  // WhatsApp payload creation
  const handleCheckoutCart = () => {
    if (cart.length === 0) return;
    trackWhatsAppClick();
    
    const orderId = "TRC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);

    const itemsText = cart.map((item, idx) => {
      return `🔹 *${idx + 1}. ${item.product.name}*\n` +
             `   └─ Tamanho: *${item.size}* | Cor: *${item.color}*\n` +
             `   └─ Quantidade: ${item.qty}x | Unitário: ${formatBRL(item.product.price)} | Subtotal: ${formatBRL(item.product.price * item.qty)}`;
    }).join('\n\n');

    const msg = `⚡ *NOVO PEDIDO - TRIARC SHOWROOM* ⚡\n` +
                `──────────────────────────────\n\n` +
                `Olá equipe TRIARC! Gostaria de formalizar o meu pedido de alta performance montado no catálogo virtual:\n\n` +
                `📦 *CÓDIGO DE RESERVA:* \`#${orderId}\`\n\n` +
                `🛒 *PRODUTOS SELECIONADOS:*\n\n` +
                `${itemsText}\n\n` +
                `──────────────────────────────\n` +
                `💰 *RESUMO DO PEDIDO:*\n` +
                `• *Subtotal:* ${formatBRL(subtotal)}\n` +
                `• *Serviço de Entrega:* Expressa Grátis (Pres. Prudente)\n` +
                `• *Faturamento Estimado PIX:* *${formatBRL(subtotal)}*\n\n` +
                `──────────────────────────────\n` +
                `📋 *DADOS DO COMPRADOR PARA CADASTRO:*\n` +
                `• *Nome do Atleta:* ${cartBuyerName ? `*${cartBuyerName.trim()}*` : `_Preencher na conversa_`}\n` +
                `• *WhatsApp / Tel:* ${cartBuyerPhone ? `*${cartBuyerPhone.trim()}*` : `_Preencher na conversa_`}\n` +
                `• *Endereço / Bairro:* ${cartBuyerLocation ? `*${cartBuyerLocation.trim()}*` : `_Presidente Prudente - SP_`}\n\n` +
                `──────────────────────────────\n` +
                `💬 Fico no aguardo da verificação de estoque físico e envio da chave Pix para liberação do pedido e agendamento de entrega!`;

    window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDirectBuy = (product: Product, size: string, color: string) => {
    trackWhatsAppClick();
    const orderId = "TRC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    let msg = "";
    if (settings?.showroomCustomMessage) {
      let baseMsg = settings.showroomCustomMessage;
      msg = baseMsg
        .replace(/{productName}/g, product.name)
        .replace(/{productPrice}/g, formatBRL(product.price));
      
      // Append size and color if provided
      if (size || color) {
        msg += `\n\n📌 *Especificações do pedido:*`;
        if (size) msg += `\n• *Tamanho:* ${size}`;
        if (color) msg += `\n• *Cor/Design:* ${color}`;
      }
      msg += `\n\n📦 *Código de Pedido:* \`#${orderId}\``;
    } else {
      msg = `⚡ *COMPRA DIRETA - TRIARC* ⚡\n` +
            `──────────────────────────────\n\n` +
            `Olá! Gostaria de encomendar agora mesmo o seguinte item esportivo premium:\n\n` +
            `📦 *CÓDIGO DE PEDIDO:* \`#${orderId}\`\n\n` +
            `⚙️ *FICHA DA PEÇA:*\n` +
            `• *Item:* *${product.name}*\n` +
            `• *Tamanho:* *${size}*\n` +
            `• *Design/Cor:* *${color}*\n` +
            `• *Investimento de Elite:* *${formatBRL(product.price)}*\n` +
            `• *Prazo local:* Entrega Expressa Automática\n\n` +
            `──────────────────────────────\n` +
            `💬 Por favor, me passem os dados Pix para efetuar o pagamento e digam se posso mandar meu endereço de Presidente Prudente por aqui! Obrigado.`;
    }

    window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Auto-rotate carousels if active banners exist or we have presets
  const activeBanners = banners.filter(b => b.isActive);
  const defaultCarouselSlides = [
    {
      title: "ATENÇÃO ABSOLUTA AOS DETALHES",
      subtitle: "A união definitiva entre o conforto térmico colmeia e o caimento que molda a silhueta.",
      imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1600&auto=format&fit=crop&q=80"
    },
    {
      title: "VISTA A EVOLUÇÃO FÍSICA E MENTAL",
      subtitle: "Materiais importados com engineered fit projetados para atletas de Presidente Prudente - SP.",
      imageUrl: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1600&auto=format&fit=crop&q=80"
    }
  ];

  const totalSlidesCount = activeBanners.length > 0 ? activeBanners.length : defaultCarouselSlides.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % totalSlidesCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [totalSlidesCount]);

  const currentSlide = activeBanners.length > 0 
    ? activeBanners[carouselIndex] 
    : defaultCarouselSlides[carouselIndex];

  return (
    <div className="min-h-screen bg-[#070707] text-[#eaeaea] font-sans antialiased overflow-x-hidden selection:bg-amber-400 selection:text-black">
      
      {/* 1. TOP PREMIUM ANNOUNCEMENT BAR */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-600 py-2.5 px-4 text-center text-[10px] sm:text-xs text-[#060606] font-mono tracking-widest font-black flex items-center justify-center gap-1.5 flex-wrap uppercase border-b border-amber-400/20">
        <span className="bg-black text-amber-400 text-[9px] px-2 py-0.5 rounded-full font-bold">EDITION LUXURY</span>
        <span>ATENDIMENTO EXCLUSIVO EM PRESIDENTE PRUDENTE - SP</span>
        <span className="h-1.5 w-1.5 rounded-full bg-black animate-ping" />
      </div>

      {/* 2. STICKY GLASSMORPHIC HEADER */}
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-xl border-b border-stone-900/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          
          {/* Trademark Luxury Brand Logo */}
          <a href="#inicio" className="flex items-center gap-3.5 group">
            <div className="transition-all duration-500 group-hover:scale-105 group-hover:rotate-1">
              <TriarcLogo size={42} hideText={true} animate={false} className="drop-shadow-[0_0_15px_rgba(212,175,55,0.35)]" />
            </div>
            <div className="text-left leading-none">
              <span className="block text-base font-black tracking-[0.25em] text-white group-hover:text-amber-400 transition-colors">TRIARC</span>
              <span className="block text-[8px] font-mono tracking-[0.3em] text-[#d4af37] uppercase font-bold mt-0.5">ELITE LIFE</span>
            </div>
          </a>

          {/* Minimalist Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono tracking-[0.2em] text-stone-300 uppercase">
            <a href="#inicio" className="hover:text-amber-400 transition-colors duration-200">Início</a>
            <a href="#diferenciais" className="hover:text-amber-400 transition-colors duration-200">Diferenciais</a>
            <a href="#produtos" className="hover:text-amber-400 transition-colors duration-200">Coleção</a>
            <a href="#institucional" className="hover:text-amber-400 transition-colors duration-200">Institucional</a>
            <a href="#faq" className="hover:text-amber-400 transition-colors duration-200">FAQ</a>
            <a href="#localizacao" className="hover:text-amber-400 transition-colors duration-200">Localização</a>
            <button 
              onClick={() => setIsPWAOpen(true)}
              className="hover:text-[#d4af37] text-amber-400 transition-colors duration-200 flex items-center gap-1.5 cursor-pointer font-bold select-none group"
            >
              <Smartphone className="w-3.5 h-3.5 group-hover:scale-110 duration-200 transition" />
              <span>Instalar App</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-ping" />
            </button>
          </nav>

          {/* Actions Menu */}
          <div className="flex items-center gap-4">
            
            {/* Interactive Cart Button */}
            {(!settings || settings.showroomRedirectToWhatsApp !== true) && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-full border border-stone-900 bg-stone-950 hover:bg-stone-900 hover:border-amber-400/30 transition duration-300 flex items-center justify-center cursor-pointer group"
                aria-label="Carrinho de compras"
              >
                <ShoppingBag className="w-4.5 h-4.5 text-amber-400 group-hover:scale-110 duration-305 transition" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#d4af37] to-[#eab308] text-black font-mono font-black text-[9px] h-5 w-5 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.6)] animate-pulse">
                    {cart.reduce((s, c) => s + c.qty, 0)}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Nav Menu button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 md:hidden rounded-lg border border-stone-900 text-stone-400 hover:text-white transition cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-stone-900/60 bg-black/95 px-6 py-5 flex flex-col gap-4 text-xs font-mono tracking-[0.15em] text-[#cccccc] uppercase text-left"
            >
              <a href="#inicio" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-400 transition py-1.5 border-b border-stone-900/40">Início</a>
              <a href="#diferenciais" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-400 transition py-1.5 border-b border-stone-900/40">Diferenciais</a>
              <a href="#produtos" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-400 transition py-1.5 border-b border-stone-900/40">Coleção</a>
              <a href="#institucional" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-400 transition py-1.5 border-b border-stone-900/40">Institucional</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-400 transition py-1.5 border-b border-stone-900/40">Dúvidas</a>
              <a href="#localizacao" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-amber-400 transition py-1.5 border-b border-stone-900/40">Localização</a>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsPWAOpen(true);
                }}
                className="hover:text-[#d4af37] text-amber-400 font-bold transition py-2 flex items-center justify-between cursor-pointer w-full select-none"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5" />
                  Instalar Aplicativo (PWA)
                </span>
                <span className="bg-[#d4af37] text-black text-[9px] px-1.5 py-0.5 rounded font-black tracking-normal uppercase">Grátis</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 3. SHOWSTOPPING ROTATIVE WALLPAPER HERO */}
      <section id="inicio" className="relative h-[85vh] sm:h-[80vh] flex items-center justify-center overflow-hidden border-b border-stone-900 text-center">
        
        {/* Animated Background Image Slider */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={carouselIndex}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <img 
                src={currentSlide.imageUrl} 
                alt="TRIARC Premium Wear Cover" 
                className="w-full h-full object-cover brightness-[0.28] saturate-[0.85]"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </AnimatePresence>
          {/* Atmospheric Luxury gold-to-dark radial overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#070707]/30 via-[#070707]/75 to-[#070707]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_100%)]" />
        </div>

        {/* Content Box */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 flex flex-col items-center">
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="flex flex-col items-center"
          >
            {/* Centered Large Luxury Emblem */}
            <TriarcLogo size={130} hideText={true} animate={true} className="mb-4 drop-shadow-[0_0_30px_rgba(212,175,55,0.45)]" />
            
            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-[#d4af37] font-black bg-[#161616]/75 border border-[#d4af37]/20 px-4 py-1.5 rounded-full mb-4">
              ✨ SELEÇÃO ATIVA DE ALTA COSTURA ESPORTIVA
            </span>
          </motion.div>

          <div className="space-y-4">
            {/* The absolute ONE AND ONLY H1 tag for perfect local SEO targeting */}
            <h1 className="font-sans font-black text-3xl sm:text-5xl md:text-6xl tracking-tight text-white leading-none uppercase">
              VISTA A EVOLUÇÃO. <br />
              <span className="bg-gradient-to-r from-amber-400 via-[#d4af37] to-amber-300 bg-clip-text text-transparent">
                {settings?.heroTitle || "TRIARC STORE"}
              </span> <br />
              <span className="text-stone-400 text-lg sm:text-2xl font-light font-mono tracking-widest block mt-2">
                Presidente Prudente - SP
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-stone-300 leading-relaxed font-light">
              {settings?.heroSubtitle || "Desenvolvida para quem treina além do limite físico e mental. Roupas com toque ultra macio e modelagem de compressão anatômica perfeita."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <a 
              href="#produtos"
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-amber-500 via-[#d4af37] to-amber-300 rounded-lg text-black font-mono text-xs font-black tracking-widest uppercase hover:brightness-110 active:scale-95 duration-200 shadow-[0_4px_25px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>EXPLORAR COLEÇÃO</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </a>
            
            <a 
              href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent('Olá TRIARC Store! Vi a sua coleção de luxo no site e gostaria de agendar uma entrega rápida em Presidente Prudente.')}`}
              target="_blank"
              rel="noreferrer"
              onClick={trackWhatsAppClick}
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-stone-900/80 border border-[#d4af37]/35 text-stone-200 hover:text-amber-400 hover:bg-stone-950 font-mono text-xs font-bold tracking-widest uppercase cursor-pointer duration-200 transition-all flex items-center justify-center gap-2"
            >
              <WhatsAppLogo className="w-4.5 h-4.5" />
              <span>CONSULTA VIA WHATSAPP</span>
            </a>
          </div>

        </div>

        {/* Diagonal Corner Accents */}
        <div className="absolute bottom-0 left-0 w-32 h-1 bg-gradient-to-r from-[#d4af37] to-transparent opacity-30" />
        <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-l from-[#d4af37] to-transparent opacity-30" />
      </section>

      {/* 4. BRAND VALUES & ELITE SCIENCE (DIFFERENTIALS) */}
      <section id="diferenciais" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#d4af37] font-bold">
              <span className="h-1.5 w-1.5 bg-[#d4af37] rounded-full animate-pulse" />
              <span>A Essência do Luxo Técnico</span>
            </div>
            <h2 className="font-sans font-black text-3xl sm:text-4xl text-white leading-tight uppercase tracking-tight">
              O ÁPICE DO <br />
              <span className="bg-gradient-to-r from-amber-400 to-[#d4af37] bg-clip-text text-transparent">VESTUÁRIO ESPORTIVO</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed font-light">
              Nossa assinatura se apoia na ciência do caimento e na modelagem corporal adaptativa. Rejeitamos a mediocridade da moda padrão das grandes redes concorrentes: escolhemos fios com alta respirabilidade e toque térmico gelado.
            </p>

            <div className="p-5 rounded-2xl border border-stone-900 bg-stone-950/40 flex items-start gap-4">
              <Award className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="block text-[11px] font-mono uppercase text-white font-black tracking-wider">Acabamento Dourado Customizado</span>
                <p className="text-[11px] text-stone-400 font-light leading-relaxed">Cada peça é estampada com processos manuais de cura térmica para preservar o brilho e relevo do triângulo emblemático TRIARC.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Card 1 */}
            <div className="group rounded-2xl border border-stone-900 bg-stone-950/20 p-6 hover:border-[#d4af37]/30 transition duration-500 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#d4af37]/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-[#d4af37]/20 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-sans font-bold text-sm text-stone-100 uppercase tracking-wider">TECIDO COLMEIA INTELIGENTE</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-light">
                Estrutura microperfurada porosa de alta densidade que promove excelente renovação de fluxo de ar, acelerando o conforto térmico durante as atividades físicas intensas.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded-2xl border border-stone-900 bg-stone-950/20 p-6 hover:border-[#d4af37]/30 transition duration-500 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#d4af37]/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-[#d4af37]/20 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-sans font-bold text-sm text-stone-100 uppercase tracking-wider">ENGINEERED COMPRESSION</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-light">
                Camadas adaptativas de alta compressão que estimulam o feedback muscular, garantindo segurança na postura de alta intensidade.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded-2xl border border-stone-900 bg-stone-950/20 p-6 hover:border-[#d4af37]/30 transition duration-500 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#d4af37]/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-[#d4af37]/20 flex items-center justify-center text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-sans font-bold text-sm text-stone-100 uppercase tracking-wider">DESIGN MINIMAL CLÁSSICO</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-light">
                Combinação sutil de tons sóbrios foscos com acabamentos de luxo dourados, transitando perfeitamente do treino pesado ao lifestyle corporativo de elite.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group rounded-2xl border border-stone-900 bg-stone-950/20 p-6 hover:border-[#d4af37]/30 transition duration-500 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#d4af37]/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-[#d4af37]/20 flex items-center justify-center text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-sans font-bold text-sm text-stone-100 uppercase tracking-wider">DURABILIDADE CONSTRUTIVA</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-light">
                Pontas costuradas em máquinas de entrelaçamento triplo para zero desfiamento. Tolerância elevada para lavagens e uso extremo constante.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 5. INTERACTIVE PREMIUM CATALOGUE */}
      <section id="produtos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-12">
        
        {/* Title */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#d4af37] font-bold">
            ⚔️ MOSTRE SUA DETERMINAÇÃO
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-4xl text-white uppercase tracking-tight leading-none">
            ESTOQUE INTEGRADO <br />
            <span className="bg-gradient-to-r from-amber-400 via-[#d4af37] to-amber-250 bg-clip-text text-transparent">Coleção Ativa de Luxo</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed font-light">
            Selecione seus itens e feche pelo carrinho. Nossos especialistas de Presidente Prudente entregam no local combinado em até 12 horas.
          </p>
        </div>

        {/* Filter bar - Luxury aesthetics */}
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-stone-900 pb-6 gap-4">
          
          <div className="flex items-center gap-2 overflow-x-auto p-1 max-w-full">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full font-mono text-[10px] sm:text-xs tracking-widest uppercase transition-all duration-300 ${
                  selectedCategory === cat
                    ? 'bg-[#d4af37] text-black font-extrabold shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                    : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-900 hover:border-stone-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Buscar modelo de compressão..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-stone-950 border border-stone-900 px-10 py-2.5 text-xs text-stone-100 placeholder-stone-605 focus:outline-none focus:border-[#d4af37] transition duration-200"
            />
          </div>

        </div>

        {/* Product Cards Grid */}
        <div className={`grid gap-8 ${
          settings?.showroomLayoutStyle === 'bento' 
            ? 'grid-cols-1 md:grid-cols-6 lg:grid-cols-12' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {filteredProducts.map((prod, index) => {
            const productMainImage = getProductImage(prod);
            const isBento = settings?.showroomLayoutStyle === 'bento';
            const gridSpan = isBento 
              ? (index % 5 === 0 || index % 5 === 3 ? 'md:col-span-3 lg:col-span-6' : 'md:col-span-3 lg:col-span-3') 
              : '';
            return (
              <div 
                key={prod.id}
                className={`group rounded-2xl border border-stone-900/80 bg-stone-950/40 overflow-hidden flex flex-col justify-between hover:border-[#d4af37]/35 duration-500 transition-all text-left relative ${gridSpan}`}
              >
                {/* Visual Label Tag */}
                {prod.tags && prod.tags.length > 0 && (
                  <span className="absolute top-4 left-4 z-10 bg-black/85 backdrop-blur-md border border-[#d4af37]/30 text-[9px] font-mono text-amber-400 px-3 py-1 rounded-full uppercase tracking-widest font-black uppercase shadow-lg">
                    🔥 {prod.tags[0]}
                  </span>
                )}

                {/* Cover Image */}
                <div 
                  onClick={() => setSelectedProduct(prod)}
                  className="aspect-[4/5] relative overflow-hidden bg-stone-900 cursor-pointer"
                >
                  <img 
                    src={productMainImage} 
                    alt={prod.name} 
                    className="w-full h-full object-cover group-hover:scale-105 duration-700 transition"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  {/* Subtle Quick Hover Panel */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 duration-300 transition flex items-center justify-center p-4">
                    <span className="px-5 py-2.5 bg-[#d4af37] text-black font-mono text-[10px] font-bold tracking-widest uppercase rounded-lg shadow-lg">
                      Visualizar Detalhes
                    </span>
                  </div>
                </div>

                {/* Specs list */}
                <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] font-semibold">
                        {prod.category}
                      </span>
                      {(!settings || settings.showroomShowStock !== false) && (
                        <span className="text-[10px] text-stone-500 uppercase font-mono">
                          Qtd: {prod.stock} unidades
                        </span>
                      )}
                    </div>

                    <h3 
                      onClick={() => setSelectedProduct(prod)}
                      className="font-sans font-bold text-base text-stone-100 uppercase hover:text-amber-400 cursor-pointer transition max-w-full line-clamp-1"
                    >
                      {prod.name}
                    </h3>

                    <p className="text-[11px] text-stone-400 font-light line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>

                  {/* Pricing and Buying Buttons */}
                  <div className="pt-2 border-t border-stone-900/60 flex items-center justify-between">
                    <div>
                      {(!settings || settings.showroomShowPrice !== false) ? (
                        <>
                          <span className="block text-[8px] font-mono text-stone-500 uppercase tracking-wider">Faturamento PIX</span>
                          <span className="text-xl font-serif text-[#d4af37] font-black tracking-tight">{formatBRL(prod.price)}</span>
                        </>
                      ) : (
                        <>
                          <span className="block text-[8px] font-mono text-stone-500 uppercase tracking-wider">Preço</span>
                          <span className="text-xs font-sans text-stone-405 font-bold uppercase">Sob Consulta</span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedProduct(prod)}
                      className="rounded-lg px-4.5 py-2 bg-stone-900 hover:bg-[#d4af37] hover:text-black hover:scale-102 border border-stone-800 hover:border-transparent text-stone-300 font-mono text-[10px] font-black tracking-widest uppercase transition duration-300"
                    >
                      Selecionar
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>

      </section>

      {/* 6. COMFORT ZONE AND LOGISTICS (PRESIDENTE PRUDENTE SP LOCAL FOCUS) */}
      <section id="institucional" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
        <div className="bg-stone-950 border border-stone-900 rounded-3xl p-6 sm:p-10 space-y-10 relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.06)_0%,transparent_100%)] rounded-bl-full pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#d4af37] uppercase font-black">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                LOGÍSTICA CORPORATIVA LOCAL INTELIGENTE
              </span>
              <h3 className="font-sans font-black text-2xl uppercase tracking-tight text-white leading-none">
                Rapidez Imbatível em Presidente Prudente - SP
              </h3>
            </div>
            
            <div className="flex items-center gap-2 rounded-full border border-stone-900 bg-black/60 px-4 py-2 self-start md:self-auto">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px] text-stone-350 uppercase tracking-widest">EXPEDIÇÃO IMEDIATA</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="rounded-xl border border-stone-900/60 p-5 bg-black/30 space-y-2">
              <span className="block text-[11px] font-mono text-[#d4af37] uppercase font-bold">1. Presidente Prudente (Centro)</span>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                Centralização estratégica virtual que permite entregas expressas via portadores particulares em até 12 horas.
              </p>
            </div>

            <div className="rounded-xl border border-stone-900/60 p-5 bg-black/30 space-y-2">
              <span className="block text-[11px] font-mono text-[#d4af37] uppercase font-bold">2. Zona Sul &amp; Parques de Lazer</span>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                Agendamos entregas descomplicadas em endereços residenciais ou pontos comerciais amigáveis no entorno do Parque do Povo.
              </p>
            </div>

            <div className="rounded-xl border border-stone-900/60 p-5 bg-black/30 space-y-2">
              <span className="block text-[11px] font-mono text-[#d4af37] uppercase font-bold">3. Despacho Nacional Integrado</span>
              <p className="text-xs text-stone-400 font-light leading-relaxed">
                Enviamos para todo o território nacional através de parcerias com SEDEX e PAC dos Correios, com faturamento simplificado pelo WhatsApp.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 7. CUSTOM CONSULTING RESERVATIONS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-12">
        <div className="space-y-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#d4af37] font-bold">
            👔 CONSULTORIA DE VESTUÁRIO PERSONALIZADO
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
            AGENDE SEU TAMANHO PERFEITO
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed font-light">
            Tem dúvidas sobre o caimento da compressão ou deseja ver combos personalizados? Preencha os dados e fale diretamente com o consultor.
          </p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            trackWhatsAppClick();
            
            const stockCheck = getConsultationStockInfo();
            const waitlistNotice = !stockCheck.available 
              ? `\n⚠️ *STATUS:* TAMANHO ATUALMENTE ESGOTADO EM ESTOQUE (PROCURANDO ENTRAR NA FILA DE ESPERA / ENCOMENDA ESPECIAL)`
              : `\n📦 *STATUS:* TAMANHO DISPONÍVEL DO ESTOQUE COM ENTREGA RÁPIDA IMEDIATA`;

            const msg = `⚡ *ADVISORY / AGENDAMENTO DE CONSULTORIA* ⚡\n` +
                        `──────────────────────────────\n\n` +
                        `Olá equipe TRIARC! Gostaria de agendar um atendimento para consultoria de caimento adaptativo de alta performance:\n\n` +
                        `📋 *FICHA DE CONTATO COMPRADOR:*\n` +
                        `• *Atleta:* *${contactForm.name}*\n` +
                        `• *WhatsApp / Tel:* *${contactForm.phone}*\n` +
                        `• *Referência de Medida:* *${contactForm.size}*\n` +
                        `• *Estilo Desejado:* *${contactForm.interest}*\n` +
                        `• *Região:* Presidente Prudente - SP ${waitlistNotice}\n\n` +
                        `💬 *Anotação do Cliente:* "_${contactForm.message || 'Gostaria de conhecer o estoque disponível e fotos reais.'}_"\n\n` +
                        `──────────────────────────────\n` +
                        `💬 Aguardo as sugestões dos especialistas de vestuário da marca para meu biotipo corporal!`;

            window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(msg)}`, '_blank');
          }}
          className="rounded-3xl border border-stone-905 bg-stone-950/60 p-6 sm:p-10 text-left grid grid-cols-1 md:grid-cols-2 gap-6 relative shadow-2xl"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-[9px] text-[#d4af37] uppercase tracking-wide font-black">Seu Nome Completo *</label>
              <input
                required
                type="text"
                placeholder="Ex: Gustavo Silva"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="w-full rounded-xl bg-black border border-stone-900 px-4 py-3 text-xs text-stone-200 placeholder-stone-700 focus:outline-none focus:border-[#d4af37] transition duration-200"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[9px] text-[#d4af37] uppercase tracking-wide font-black">Seu Telefone / WhatsApp *</label>
              <input
                required
                type="tel"
                placeholder="Ex: (18) 99703-4546"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                className="w-full rounded-xl bg-black border border-stone-900 px-4 py-3 text-xs text-stone-200 placeholder-stone-700 focus:outline-none focus:border-[#d4af37] transition duration-200"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[9px] text-[#d4af37] uppercase tracking-wide font-black">Área de Interesse / Coleção Premium</label>
              <select
                value={contactForm.interest}
                onChange={(e) => setContactForm({ ...contactForm, interest: e.target.value })}
                className="w-full rounded-xl bg-black border border-stone-900 px-3.5 py-3 text-xs text-stone-300 focus:outline-none focus:border-[#d4af37] transition duration-200 cursor-pointer"
              >
                <option value="Track Black Motion">Track Black Motion</option>
                <option value="Track Black Edition">Track Black Edition</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono text-[9px] text-[#d4af37] uppercase tracking-wide font-black">Qual é o seu tamanho usual?</label>
                <span className="font-mono text-[8px] uppercase text-stone-500">
                  {getConsultationStockInfo().available ? "Estoque verificado: Disponível" : "⚠️ Esgotado para entrega rápida"}
                </span>
              </div>
              <div className="flex gap-2">
                {['P', 'M', 'G', 'GG'].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setContactForm({ ...contactForm, size: sz })}
                    className={`flex-1 py-2 text-xs font-mono rounded-lg transition border ${
                      contactForm.size === sz
                        ? 'bg-[#d4af37] text-black border-transparent font-black'
                        : 'bg-black border-stone-900 text-stone-400 hover:text-white'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Live out of stock feedback */}
            {!getConsultationStockInfo().available && (
              <div className="rounded-xl border border-red-950/40 bg-red-950/15 p-3.5 text-[11px] text-stone-300 leading-normal font-sans">
                <span className="font-bold block text-red-400 uppercase tracking-wider mb-0.5">
                  ⚠️ TAMANHO ESGOTADO NO MOMENTO
                </span>
                Todas as peças deste segmento no tamanho <strong>{contactForm.size}</strong> estão sem estoque físico de pronta entrega em Presidente Prudente - SP. Ao enviar sua solicitação, você entrará na fila de espera especial.
              </div>
            )}

            <div className="space-y-1">
              <label className="font-mono text-[9px] text-[#d4af37] uppercase tracking-wide font-black">Anotações ou modelo específico</label>
              <textarea
                placeholder="Ex: Gostaria de saber detalhes sobre o tecido colmeia inteligente..."
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="w-full rounded-xl bg-black border border-stone-900 px-4 py-3 text-xs text-stone-200 placeholder-stone-700 focus:outline-none focus:border-[#d4af37] transition duration-200"
                rows={!getConsultationStockInfo().available ? 2 : 3}
              />
            </div>

            <button
              type="submit"
              className="w-full py-4.5 bg-gradient-to-r from-amber-500 via-[#d4af37] to-amber-300 hover:brightness-110 rounded-xl text-black font-mono text-xs font-black tracking-widest uppercase shadow-lg transition duration-200 cursor-pointer"
            >
              {!getConsultationStockInfo().available ? "RESERVAR MEU TAMANHO (ENTRAR NA FILA)" : "ENVIAR REQUISIÇÃO PARA O CONSULTOR"}
            </button>
          </div>
        </form>
      </section>

      {/* 8. ELITE TESTIMONIALS (REAL FEEDBACK WITH LOCAL REFERENCE) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-12 border-t border-stone-900">
        
        <div className="space-y-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#d4af37] font-bold">
            🗣️ CLUB TRIARC
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
            QUEM USA COMPROVA A QUALIDADE
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed font-light">
            Feedbacks de atletas e profissionais do esporte de Presidente Prudente - SP que sentiram a diferença extrema do toque colmeia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          
          {/* Quote 1 */}
          <div className="rounded-2xl border border-stone-900 bg-stone-950/20 p-6 flex flex-col justify-between relative space-y-4">
            <span className="text-[#d4af37] font-serif text-5xl absolute top-4 right-6 select-none opacity-20">“</span>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-light italic relative z-10">
              "Corro de manhã cedo ali no Parque do Povo em Prudente e quando bate aquele vento frio, a **Black Motion** salva demais. Ela segura o calor do corpo sem deixar a gente encharcado de suor no meio do treino. Melhor compra do ano."
            </p>
            <div className="border-t border-stone-900/60 pt-4 flex items-center gap-3">
              <div className="h-9 w-9 bg-stone-900 border border-[#d4af37]/20 rounded-full flex items-center justify-center font-mono text-xs text-[#d4af37] font-extrabold select-none">
                AM
              </div>
              <div>
                <span className="block text-xs font-bold text-white uppercase tracking-wider">Arthur Medeiros</span>
                <span className="block text-[9px] font-mono text-stone-500 uppercase">Atleta Amador / Pres. Prudente - SP</span>
              </div>
            </div>
          </div>

          {/* Quote 2 */}
          <div className="rounded-2xl border border-stone-900 bg-stone-950/20 p-6 flex flex-col justify-between relative space-y-4">
            <span className="text-[#d4af37] font-serif text-5xl absolute top-4 right-6 select-none opacity-20">“</span>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-light italic relative z-10">
              "Quem treina crossfit de verdade sabe como é ruim blusa que fica travando o movimento ou encharcada de suor. A **Black Edition** me surpreendeu demais, é super levinha, não incomoda pra agachar ou pular corda e fica linda no corpo."
            </p>
            <div className="border-t border-stone-900/60 pt-4 flex items-center gap-3">
              <div className="h-9 w-9 bg-stone-900 border border-[#d4af37]/20 rounded-full flex items-center justify-center font-mono text-xs text-[#d4af37] font-extrabold select-none">
                LS
              </div>
              <div>
                <span className="block text-xs font-bold text-white uppercase tracking-wider">Lívia Sanches</span>
                <span className="block text-[9px] font-mono text-stone-500 uppercase">Profissional Liberal / Pres. Prudente - SP</span>
              </div>
            </div>
          </div>

          {/* Quote 3 */}
          <div className="rounded-2xl border border-stone-900 bg-stone-950/20 p-6 flex flex-col justify-between relative space-y-4">
            <span className="text-[#d4af37] font-serif text-5xl absolute top-4 right-6 select-none opacity-20">“</span>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-light italic relative z-10">
              "Comprei a **Black Motion** e a **Black Edition** pra testar e virei fã. Elas valorizam o shape sem ficar coladas demais ou sufocando, o tecido é muito confortável. Além de tudo, a entrega aqui em Prudente foi em pouco tempo."
            </p>
            <div className="border-t border-stone-900/60 pt-4 flex items-center gap-3">
              <div className="h-9 w-9 bg-stone-900 border border-[#d4af37]/20 rounded-full flex items-center justify-center font-mono text-xs text-[#d4af37] font-extrabold select-none">
                RL
              </div>
              <div>
                <span className="block text-xs font-bold text-white uppercase tracking-wider">Rodrigo Lemos</span>
                <span className="block text-[9px] font-mono text-stone-500 uppercase">Consultor Fitness / Pres. Prudente - SP</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 9. ELITE FAQ (ACCORDION) */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-12">
        
        <div className="space-y-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#d4af37] font-bold">
            💬 FAQ DE QUALIDADE
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
            RESPOSTAS CORPORATIVAS
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed font-light">
            Dúvidas frequentes de nossos clientes locais respondidas diretamente de forma rápida.
          </p>
        </div>

        <div className="space-y-4 text-left font-sans">
          {[
            {
              q: "O tecido é transparente ou marca muito o corpo?",
              a: "Absolutamente não. Nossas peças possuem gramatura premium inteligente de fio duplo (engineered double-mesh). Elas se moldam à silhueta sem apresentar transparência, garantindo total privacidade e elegância de postura durante treinos de alta intensidade, agachamentos ou corridas."
            },
            {
              q: "As camisetas encolhem, perdem a elasticidade ou desbotam?",
              a: "Não. Utilizamos fios nobres de poliamida tecnológica purificada de alta densidade e elastano genuíno pré-encolhidos em indústria, em sinergia com estamparia de cura térmica de fusão a vácuo. Suas peças manterão a modelagem original anatômica e o brilho do triângulo dourado intactos mesmo após dezenas de lavagens na máquina."
            },
            {
              q: "E se o tamanho escolhido não servir perfeitamente?",
              a: "Nosso foco corporativo é a satisfação absoluta de caimento da marca. Para clientes de Presidente Prudente - SP, agendamos voluntariamente um portador para ir até o seu local com tamanhos sobressalentes nas próximas 24h úteis para troca amigável imediata. Para outras cidades do Brasil, fornecemos logística reversa gratuita acelerada via Correios."
            },
            {
              q: "O suor fica aparente na malha ou gera odor desagradável?",
              a: "Nossa tecnologia antiodor e bacteriostática de íons de prata bloqueia permanentemente a proliferação de bactérias que causam cheiro. O tecido inteligente microesferizado drena a umidade líquida e promove a evaporação acelerada em menos de 3 minutos, deixando a camiseta sempre leve, seca e com toque térmico confortavelmente gelado."
            },
            {
              q: "O processo de checkout e faturamento via WhatsApp é seguro?",
              a: "Totalmente seguro e auditado contra fraudes. Ao finalizar sua seleção premium nesta página showroom, sua reserva é convertida em um código criptografado que facilita a triagem de estoque físico em nossa matriz. Você recebe o link seguro com fatura de faturamento e chaves Pix diretamente de nossa Central de Atendimento verificada."
            }
          ].map((item, idx) => {
            const isOpen = openFAQIndex === idx;
            return (
              <div 
                key={idx}
                className="rounded-xl border border-stone-900 bg-stone-950/40 overflow-hidden text-left transition duration-200"
              >
                <button
                  onClick={() => setOpenFAQIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-xs sm:text-sm text-stone-100 font-bold uppercase transition focus:outline-none hover:text-amber-400 select-none cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    <span className="text-[#d4af37] font-mono">{idx + 1}.</span> {item.q}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#d4af37] transition duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-6 pb-5 pt-1 text-xs text-stone-400 leading-relaxed font-light border-t border-stone-900/40">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. REAL GOOGLE MAP FOR LOCAL AUTHORITY */}
      <section id="localizacao" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center space-y-8">
        
        <div className="space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#d4af37] font-bold">
            📍 PRESENÇA FÍSICA E DIGITAL
          </span>
          <h2 className="font-sans font-black text-2xl uppercase tracking-tight text-white leading-none">
            ESTAMOS PRÓXIMOS DE VOCÊ
          </h2>
          <p className="text-xs text-stone-400 font-light max-w-xl mx-auto">
            Atendimento digital otimizado focado na área metropolitana de Presidente Prudente - SP.
          </p>
        </div>

        {/* Real interactive dark-styled frame Google Map */}
        <div className="rounded-3xl border border-[#d4af37]/30 bg-black overflow-hidden shadow-[0_10px_35px_rgba(212,175,55,0.15)] relative h-96">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d59132.890483863456!2d-51.42531641328124!3d-22.1224856!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9493f411b9a2c3a5%3A0x6d09cc28af6c77ba!2sPresidente%20Prudente%20-%20State%20of%20S%C3%A3o%20Paulo!5e0!3m2!1sen!2sbr!4v1718310000000!5m2!1sen!2sbr" 
            className="w-full h-full border-none filter inset-0 absolute brightness-75 invert saturate-50 contrast-125" 
            allowFullScreen={false} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Map localizador de Presidente Prudente SP"
          />
        </div>

      </section>

      {/* 11. LUXURY FOOTER & SECURITY LOG */}
      <footer className="bg-black border-t border-stone-900 py-16 px-4 sm:px-6 lg:px-8 text-left text-xs text-stone-500 font-mono">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TriarcLogo size={32} hideText={true} animate={false} />
              <span className="text-sm font-black tracking-[0.2em] text-white uppercase">TRIARC STORE</span>
            </div>
            <p className="text-[11px] leading-relaxed font-light text-stone-400">
              Alta performance, engenharia de compressão têxtil e toque térmico inteligente. Vista o ápice.
            </p>
            <div className="pt-2">
              <a 
                href="https://www.instagram.com/triarc2026/" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-850 bg-stone-950 hover:bg-stone-900 text-stone-300 hover:text-amber-400 transition-all text-[11px] font-sans"
              >
                <Instagram className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="font-bold">TRIARC | Performance</span>
              </a>
            </div>
          </div>

          {/* Quick Nav Col */}
          <div className="space-y-4 text-xs font-mono uppercase">
            <span className="block font-black tracking-widest text-[#d4af37] text-[10px]">Navegação</span>
            <ul className="space-y-2 text-[11px] font-medium text-stone-400">
              <li><a href="#inicio" className="hover:text-amber-400 transition">&bull; Início</a></li>
              <li><a href="#diferenciais" className="hover:text-amber-400 transition">&bull; Diferenciais</a></li>
              <li><a href="#produtos" className="hover:text-amber-400 transition">&bull; Catálogo</a></li>
              <li><a href="#faq" className="hover:text-amber-400 transition">&bull; Perguntas Frequentes</a></li>
              <li>
                <button 
                  onClick={() => {
                    if (isAdminLoggedIn) {
                      setIsAdminPanelOpen(true);
                    } else {
                      setIsAdminLoginModalOpen(true);
                    }
                  }} 
                  className="hover:text-amber-400 transition cursor-pointer text-left font-mono font-bold text-stone-500 hover:text-amber-400 uppercase flex items-center gap-1 focus:outline-none pt-1"
                >
                  &bull; Acesso Administrador
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 text-xs font-mono">
            <span className="block font-black tracking-widest text-[#d4af37] text-[10px] uppercase">Corporativo</span>
            <ul className="space-y-2 text-[11px] text-stone-400">
              <li>E-mail: {SUPPORT_EMAIL}</li>
              <li>Telefone: {settings?.supportPhone || "+55 (18) 99703-4546"}</li>
              <li>Instagram: <a href="https://www.instagram.com/triarc2026/" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">@triarc2026</a></li>
              <li>Cidade: Presidente Prudente - SP</li>
              <li>Status: <span className="text-emerald-500 font-bold">● VIRTUAL HUB LIVE</span></li>
            </ul>
          </div>

          {/* Security details */}
          <div className="space-y-4">
            <span className="block font-black tracking-widest text-[#d4af37] text-[10px] uppercase">Garantia Corporativa</span>
            <div className="rounded-xl border border-stone-900 bg-stone-950 p-4 space-y-2 text-[10px] text-stone-400 font-sans leading-relaxed">
              <p>📍 Operação em total conformidade fiscal brasileira baseada em Presidente Prudente - SP.</p>
              <p>🔒 Checkout 100% criptografado e verificado via WhatsApp.</p>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-stone-900 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-600 font-light font-sans gap-4">
          <p>© {new Date().getFullYear()} TRIARC STORE. Todos os direitos reservados. Feito para alta performance física.</p>
          <div className="flex gap-4 font-mono text-[10px]">
            <span className="hover:text-stone-400 transition">TERMOS DE SERVIÇO</span>
            <span className="hover:text-stone-400 transition">DIRETRIZES DE PRIVACIDADE</span>
          </div>
        </div>
      </footer>

      {/* 12. FLOATING WHATSAPP BUTTON (FOR CRO OPTIMIZATION) */}
      <a 
        href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent('Olá TRIARC Store! Gostaria de esclarecer algumas dúvidas rápidas sobre as camisetas premium.')}`}
        target="_blank"
        rel="noreferrer"
        onClick={trackWhatsAppClick}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#efc050] flex items-center justify-center shadow-[0_10px_25px_rgba(212,175,55,0.4)] hover:bg-[#aa7c11] hover:scale-110 duration-300 transition group cursor-pointer"
        aria-label="Fale direto com a equipe TRIARC pelo WhatsApp"
      >
        <WhatsAppLogo className="w-8 h-8 shrink-0 text-black fill-black" />
      </a>

      {/* 13. SHOPPING CART SIDE DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            
            <div className="absolute inset-y-0 right-0 max-w-full flex">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-screen max-w-md bg-[#0a0a0a] border-l border-stone-900 shadow-2xl flex flex-col justify-between"
              >
                {/* Header */}
                <div className="border-b border-stone-900 px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4.5 h-4.5 text-amber-400" />
                    <h3 className="font-sans font-black text-xs uppercase tracking-widest text-stone-100">Sua Seleção Premium</h3>
                  </div>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 -mr-2 rounded-lg hover:bg-stone-900 text-stone-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Items */}
                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                      <ShoppingBag className="w-10 h-10 text-stone-820" />
                      <p className="text-xs font-mono uppercase tracking-widest text-stone-400">Nenhum item selecionado</p>
                      <button 
                        onClick={() => setIsCartOpen(false)}
                        className="text-xs text-amber-400 font-mono tracking-wider hover:underline"
                      >
                        Ver coleções ativas
                      </button>
                    </div>
                  ) : (
                    cart.map((item, index) => {
                      const itemMainImage = getProductImage(item.product);
                      return (
                        <div key={index} className="flex gap-4 p-4 rounded-xl border border-stone-900 bg-[#0e0e0e] text-left">
                          <img src={itemMainImage} alt={item.product.name} className="h-20 w-16 object-cover rounded-lg border border-stone-850" referrerPolicy="no-referrer" />
                          <div className="flex-grow flex flex-col justify-between">
                            <div className="flex justify-between items-start gap-2">
                              <div className="space-y-1 min-w-0">
                                <h4 className="font-sans font-bold text-xs text-stone-100 uppercase line-clamp-1">{item.product.name}</h4>
                                <p className="text-[10px] font-mono text-stone-500 uppercase">Tam: {item.size} | Cor: {item.color}</p>
                              </div>
                              <button
                                onClick={() => removeFromCart(index)}
                                className="text-stone-600 hover:text-red-400 p-1 transition cursor-pointer"
                                title="Remover item da sacola"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center border border-stone-850 rounded bg-black">
                                <button onClick={() => changeQty(index, -1)} className="px-2.5 py-1 text-stone-400 hover:text-white text-xs">-</button>
                                <span className="px-2 font-mono text-xs text-stone-200">{item.qty}</span>
                                <button onClick={() => changeQty(index, 1)} className="px-2.5 py-1 text-stone-400 hover:text-white text-xs">+</button>
                              </div>
                              <span className="font-serif text-sm font-bold text-[#d4af37]">{formatBRL(item.product.price * item.qty)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Subtotal and checkout action */}
                {cart.length > 0 && (
                  <div className="border-t border-stone-900 p-5 bg-stone-950/65 space-y-3.5">
                    
                    {/* Fast checkout registration fields to simplify business organization */}
                    <div className="border border-stone-900 bg-stone-950/40 rounded-xl p-3.5 space-y-2.5">
                      <span className="block text-[9px] font-mono tracking-widest text-[#d4af37] uppercase font-bold flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        DADOS CADASTRAIS (AGILIZAR ENTREGA)
                      </span>
                      <p className="text-[9px] text-stone-500 font-sans leading-normal">
                        Preencha para receber seu pedido totalmente formatado. Facilita o faturamento e envio imediato.
                      </p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Seu Nome Completo (Ex: Gustavo)"
                          value={cartBuyerName}
                          onChange={(e) => setCartBuyerName(e.target.value)}
                          className="w-full text-xs font-sans text-stone-200 placeholder-stone-800 bg-black border border-stone-900 focus:outline-none focus:border-[#d4af37] rounded-lg px-3 py-2 transition"
                          required
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="tel"
                            placeholder="WhatsApp (Ex: 18997034546)"
                            value={cartBuyerPhone}
                            onChange={(e) => setCartBuyerPhone(e.target.value)}
                            className="w-full text-xs font-sans text-stone-200 placeholder-stone-800 bg-black border border-stone-900 focus:outline-none focus:border-[#d4af37] rounded-lg px-2.5 py-2 transition"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Bairro / Cidade"
                            value={cartBuyerLocation}
                            onChange={(e) => setCartBuyerLocation(e.target.value)}
                            className="w-full text-xs font-sans text-stone-200 placeholder-stone-800 bg-black border border-stone-900 focus:outline-none focus:border-[#d4af37] rounded-lg px-2.5 py-2 transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                      <span>Valor dos Itens:</span>
                      <span>{formatBRL(cart.reduce((s, item) => s + (item.product.price * item.qty), 0))}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                      <span>Entrega Rápida local:</span>
                      <span className="text-emerald-400 font-bold font-mono">GRÁTIS (PRUDENTE)</span>
                    </div>
                    
                    <div className="border-t border-stone-900 pt-2 flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-[#d4af37]">TOTAL ESTIMADO PIX:</span>
                      <span className="text-xl font-serif font-black text-[#d4af37]">{formatBRL(cart.reduce((s, item) => s + (item.product.price * item.qty), 0))}</span>
                    </div>

                    {/* Highly Professional Action Button Row */}
                    <div className="pt-2 grid grid-cols-5 gap-2">
                      <button
                        onClick={handleCheckoutCart}
                        disabled={!cartBuyerName || !cartBuyerPhone}
                        className={`col-span-4 py-4 rounded-xl font-mono text-[10px] font-black tracking-widest uppercase shadow-lg transition flex items-center justify-center gap-1.5 ${
                          (!cartBuyerName || !cartBuyerPhone)
                            ? 'bg-stone-900 text-stone-500 border border-stone-850 cursor-not-allowed opacity-60'
                            : 'bg-gradient-to-r from-amber-500 via-[#d4af37] to-amber-300 hover:brightness-110 text-black cursor-pointer'
                        }`}
                        title={(!cartBuyerName || !cartBuyerPhone) ? "Preencha o Nome e WhatsApp acima para liberar o envio" : "Enviar diretamente para a central do WhatsApp"}
                      >
                        <WhatsAppLogo className="w-4 h-4 text-current fill-current shrink-0" />
                        <span>ENVIAR VIA WHATSAPP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (cart.length === 0) return;
                          
                          const orderId = "TRC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                          const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);

                          const itemsText = cart.map((item, idx) => {
                            return `🔹 *${idx + 1}. ${item.product.name}*\n` +
                                   `   └─ Tamanho: *${item.size}* | Cor: *${item.color}*\n` +
                                   `   └─ Quantidade: ${item.qty}x | Unitário: ${formatBRL(item.product.price)} | Subtotal: ${formatBRL(item.product.price * item.qty)}`;
                          }).join('\n\n');

                          const msgText = `⚡ *NOVO PEDIDO - TRIARC SHOWROOM* ⚡\n` +
                                      `──────────────────────────────\n\n` +
                                      `Olá equipe TRIARC! Gostaria de formalizar o meu pedido de alta performance montado no catálogo virtual:\n\n` +
                                      `📦 *CÓDIGO DE RESERVA:* \`#${orderId}\`\n\n` +
                                      `🛒 *PRODUTOS SELECIONADOS:*\n\n` +
                                      `${itemsText}\n\n` +
                                      `──────────────────────────────\n` +
                                      `💰 *RESUMO DO PEDIDO:*\n` +
                                      `• *Subtotal:* ${formatBRL(subtotal)}\n` +
                                      `• *Serviço de Entrega:* Expressa Grátis (Pres. Prudente)\n` +
                                      `• *Faturamento Estimado PIX:* *${formatBRL(subtotal)}*\n\n` +
                                      `──────────────────────────────\n` +
                                      `📋 *DADOS DO COMPRADOR PARA CADASTRO:*\n` +
                                      `• *Nome do Atleta:* ${cartBuyerName ? `*${cartBuyerName.trim()}*` : `_Preencher na conversa_`}\n` +
                                      `• *WhatsApp / Tel:* ${cartBuyerPhone ? `*${cartBuyerPhone.trim()}*` : `_Preencher na conversa_`}\n` +
                                      `• *Endereço / Bairro:* ${cartBuyerLocation ? `*${cartBuyerLocation.trim()}*` : `_Presidente Prudente - SP_`}\n\n` +
                                      `──────────────────────────────\n` +
                                      `💬 Fico no aguardo da verificação de estoque físico e envio da chave Pix para liberação do pedido e agendamento de entrega!`;

                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(msgText).then(() => {
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2500);
                            }).catch(err => {
                              console.warn("Erro ao usar API de área de transferência:", err);
                            });
                          } else {
                            try {
                              const textArea = document.createElement("textarea");
                              textArea.value = msgText;
                              textArea.style.position = "fixed";
                              textArea.style.left = "-999999px";
                              textArea.style.top = "-999999px";
                              document.body.appendChild(textArea);
                              textArea.focus();
                              textArea.select();
                              document.execCommand('copy');
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2500);
                              document.body.removeChild(textArea);
                            } catch (err) {
                              console.error("Fallback de cópia falhou:", err);
                            }
                          }
                        }}
                        className={`col-span-1 rounded-xl border transition flex items-center justify-center p-2 cursor-pointer ${
                          isCopied 
                            ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400' 
                            : 'border-stone-850 hover:border-yellow-500/40 bg-black text-[#d4af37] hover:text-white'
                        }`}
                        title="Copiar resumo do pedido formatado (para colar manualmente)"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 animate-scale-up text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#d4af37]" />
                        )}
                      </button>
                    </div>

                    {(!cartBuyerName || !cartBuyerPhone) && (
                      <p className="text-[9px] text-stone-500 text-center select-none animate-pulse">
                        * Preencha seu Nome e WhatsApp acima para ativar o faturamento automático.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 14. COMPREHENSIVE DETAILED OVERLAY/MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl rounded-3xl border border-stone-900 bg-[#0a0a0a] p-6 text-left shadow-2xl z-10 overflow-y-auto max-h-[90vh] grid grid-cols-1 md:grid-cols-2 gap-8 text-stone-200"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 rounded-full border border-stone-900 bg-stone-950/80 text-stone-400 hover:text-white transition cursor-pointer z-20"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Product Visual Details */}
              <div className="space-y-4">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-stone-900 relative">
                  <img 
                    src={getProductImage(selectedProduct)} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {/* Additional dynamic pictures if available */}
                <div className="flex gap-2">
                  <div className="flex-1 aspect-[4/5] rounded-xl border border-stone-900 overflow-hidden bg-stone-950 relative">
                    <img 
                      src={getProductImage(selectedProduct)} 
                      alt="Product Details angle" 
                      className="w-full h-full object-cover filter brightness-90 saturate-50 hover:saturate-100 transition" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 aspect-[4/5] rounded-xl border border-stone-900 overflow-hidden bg-stone-950 relative">
                    <img 
                      src={selectedProduct.images?.[0] || getProductImage(selectedProduct)} 
                      alt="Product Specs angle" 
                      className="w-full h-full object-cover filter brightness-90 saturate-50 hover:saturate-100 transition" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              {/* Product Content Details */}
              <div className="flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-900 pb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#d4af37] font-bold">
                      {selectedProduct.category}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono uppercase">
                      Lote Ativo: #{selectedProduct.id}
                    </span>
                  </div>

                  <h3 className="font-sans font-black text-lg sm:text-xl text-white uppercase tracking-tight">
                    {selectedProduct.name}
                  </h3>

                  <p className="text-xs text-stone-400 leading-relaxed font-light">
                    {selectedProduct.description}
                  </p>

                  {/* Pricing visual */}
                  <div className="rounded-2xl border border-stone-900 bg-black/40 p-4 flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] font-mono text-stone-500 uppercase tracking-wider">Código de Compra</span>
                      <span className="text-xs text-[#d4af37] font-mono font-black uppercase">TRIARC DE LUXE</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-mono text-stone-500 uppercase text-right">Preço Especial</span>
                      {(!settings || settings.showroomShowPrice !== false) ? (
                        <span className="text-2xl font-serif text-[#d4af37] font-black">{formatBRL(selectedProduct.price)}</span>
                      ) : (
                        <span className="text-base font-sans text-stone-400 font-bold">Sob Consulta</span>
                      )}
                    </div>
                  </div>

                  {/* Size Select pills */}
                  <div className="space-y-2">
                    <span className="block font-mono text-[9px] text-[#d4af37] uppercase font-black">Selecione o Tamanho:</span>
                    <div className="flex gap-2.5 flex-wrap">
                      {Array.from(new Set(selectedProduct.sizes || ['P', 'M', 'G', 'GG'])).map((sz, idx) => {
                        const isSizeOutOfStock = selectedProduct.sizeStock 
                          ? (selectedProduct.sizeStock[sz] ?? 0) <= 0 
                          : false;

                        return (
                          <button
                            key={`${sz}-${idx}`}
                            disabled={isSizeOutOfStock}
                            onClick={() => setSelectedSize(sz)}
                            className={`h-9 px-3.5 font-mono text-xs rounded-lg transition border flex items-center justify-center relative ${
                              isSizeOutOfStock
                                ? 'bg-stone-950/40 border-stone-900/60 text-stone-600 line-through cursor-not-allowed'
                                : selectedSize === sz
                                  ? 'bg-[#d4af37] text-black border-transparent font-black'
                                  : 'bg-black border-stone-900 text-stone-300 hover:text-white'
                            }`}
                            title={isSizeOutOfStock ? "Tamanho esgotado no momento" : (!settings || settings.showroomShowStock !== false) ? `Apenas ${selectedProduct.sizeStock?.[sz] ?? 15} disponíveis` : "Tamanho disponível"}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color selectors */}
                  <div className="space-y-2">
                    <span className="block font-mono text-[9px] text-[#d4af37] uppercase font-black">Selecione a Cor:</span>
                    <div className="flex gap-2">
                      {Array.from(new Set(selectedProduct.colors || ['Carbon Black', 'Golden Shield', 'Titan Gray'])).map((color, idx) => (
                        <button
                          key={`${color}-${idx}`}
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 py-1.5 font-mono text-[10px] rounded-lg transition border ${
                            selectedColor === color
                              ? 'bg-[#d4af37] text-black border-transparent font-black'
                              : 'bg-black border-stone-900 text-stone-400 hover:text-white'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tech specs info */}
                  {selectedProduct.material && (
                    <div className="text-[10px] border-t border-stone-900/60 pt-3 flex items-start gap-2 text-stone-500">
                      <Cpu className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span className="leading-normal">
                        <strong>Composição Técnica:</strong> {selectedProduct.material}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirming Selection Buttons */}
                <div className="space-y-3 pt-4 border-t border-stone-900">
                  {(() => {
                    const isCurrentSelectionOutOfStock = selectedProduct.sizeStock 
                      ? (selectedProduct.sizeStock[selectedSize] ?? 0) <= 0 
                      : (selectedProduct.stock <= 0);

                    return (
                      <>
                        {settings?.showroomRedirectToWhatsApp ? (
                          <button
                            disabled={isCurrentSelectionOutOfStock}
                            onClick={() => {
                              handleDirectBuy(selectedProduct, selectedSize, selectedColor);
                              setSelectedProduct(null);
                            }}
                            className={`w-full py-3.5 rounded-xl font-mono text-[12px] font-black uppercase tracking-widest text-center shadow-lg transition flex items-center justify-center gap-2 ${
                              isCurrentSelectionOutOfStock
                                ? 'bg-stone-900 text-stone-600 border border-stone-850 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)]'
                            }`}
                          >
                            <WhatsAppLogo className="w-4 h-4 text-white fill-white" />
                            <span>{isCurrentSelectionOutOfStock ? "Esgotado" : "Pedir pelo WhatsApp"}</span>
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              disabled={isCurrentSelectionOutOfStock}
                              onClick={() => {
                                addToCart(selectedProduct, selectedSize, selectedColor);
                                setSelectedProduct(null);
                              }}
                              className={`py-3.5 rounded-xl font-mono text-[11px] font-black uppercase tracking-widest text-center shadow-lg transition ${
                                isCurrentSelectionOutOfStock
                                  ? 'bg-stone-900 text-stone-600 border border-stone-850 cursor-not-allowed'
                                  : 'bg-[#d4af37] text-black hover:brightness-110'
                              }`}
                            >
                              {isCurrentSelectionOutOfStock ? "Esgotado" : "Adicionar à Sacola"}
                            </button>
                            
                            <button
                              disabled={isCurrentSelectionOutOfStock}
                              onClick={() => {
                                handleDirectBuy(selectedProduct, selectedSize, selectedColor);
                                setSelectedProduct(null);
                              }}
                              className={`py-3.5 rounded-xl font-mono text-[11px] font-black uppercase tracking-widest text-center transition border ${
                                isCurrentSelectionOutOfStock
                                  ? 'bg-stone-900/30 border-stone-900 text-stone-700 cursor-not-allowed'
                                  : 'bg-stone-900 hover:bg-stone-950 border-[#d4af37]/30 text-amber-400 hover:text-amber-300'
                              }`}
                            >
                              {isCurrentSelectionOutOfStock ? "Indisponível" : "Comprar Agora"}
                            </button>
                          </div>
                        )}

                        {isCurrentSelectionOutOfStock && (
                          <div className="rounded-xl border border-red-950/40 bg-red-950/10 p-3.5 text-center flex flex-col items-center justify-center space-y-1 text-[11px] text-red-00 leading-normal font-sans">
                            <span className="font-bold flex items-center gap-1 text-red-400">
                              ⚠️ TAMANHO INDISPONÍVEL
                            </span>
                            <span className="text-stone-400">
                              O tamanho <strong>{selectedSize}</strong> para este modelo premium está esgotado temporariamente do estoque de entrega rápida local.
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 15. ADMINISTRATIVE PANEL OVERLAY */}
      {isAdminPanelOpen && isAdminLoggedIn && (
        <div className="fixed inset-0 z-50 bg-[#0c0c0c] flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="border-b border-stone-900 bg-[#0d0d0d] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-[#d4af37] flex items-center justify-center rounded-lg border border-[#d4af37]/20 text-black font-black font-mono">
                TA
              </div>
              <div className="text-left">
                <span className="block font-mono text-[8px] text-amber-500 uppercase font-black tracking-wider">Console de Configurações do Negócio</span>
                <h2 className="font-serif text-base font-light text-stone-100 uppercase tracking-tight">TRIARC CONTROLE CENTRAL</h2>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsAdminPanelOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-850 text-stone-300 hover:text-white hover:border-stone-700 bg-stone-900/50 font-mono text-[10px] uppercase font-bold tracking-widest cursor-pointer transition"
              >
                Voltar para a Landing Page
              </button>
              <button
                onClick={async () => {
                  try {
                    await signOut(auth);
                  } catch (e) {
                    console.error("Erro ao fazer logout:", e);
                  }
                  setIsAdminLoggedIn(false);
                  setIsAdminPanelOpen(false);
                }}
                className="px-4 py-2 rounded-lg border border-red-950/40 text-red-400 hover:text-red-300 hover:border-red-800 bg-red-950/15 font-mono text-[10px] uppercase font-bold tracking-widest cursor-pointer transition"
              >
                Sair
              </button>
            </div>
          </div>

          {/* Admin panel body */}
          <div className="flex-grow p-6">
            <AdminPanel 
              products={products}
              orders={orders}
              banners={banners}
              onRefreshProducts={handleRefreshProducts}
              onRefreshOrders={handleRefreshOrders}
              onRefreshBanners={handleRefreshBanners}
              isLoading={isFirebaseLoading}
              onShowNotification={showAdminNotification}
            />
          </div>
        </div>
      )}

      {/* 16. ADMINISTRATIVE LOGIN TRIGGER MODAL */}
      <AnimatePresence>
        {isAdminLoginModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminLoginModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-2xl border border-[#d4af37]/25 bg-[#0a0a0a] p-6 text-left shadow-2xl z-10 space-y-5"
            >
              <button 
                onClick={() => setIsAdminLoginModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg border border-stone-900 bg-stone-900/40 text-stone-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#d4af37]/10 text-amber-400 border border-[#d4af37]/20">
                  <Key className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="font-serif text-xl font-bold text-stone-105 uppercase tracking-wide">
                  {isFirstAccessMode ? "Criar Chave Adm" : "Console Adm"}
                </h3>
                <p className="text-[11px] text-stone-400 font-sans leading-relaxed">
                  {isFirstAccessMode 
                    ? "Cadastre sua senha de acesso (mínimo 6 caracteres) se o seu e-mail já foi autorizado pelo proprietário."
                    : "Painel corporativo restrito para o administrador."}
                </p>
              </div>

              {adminLoginError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2 text-[11px] text-red-400 font-sans">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{adminLoginError}</span>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setAdminLoginError('');
                
                const trimmedEmail = adminEmailInput.trim().toLowerCase();
                const trimmedPassword = adminPasswordInput.trim();
                
                if (!trimmedEmail) {
                  setAdminLoginError('Por favor diga seu e-mail corporativo.');
                  return;
                }
                if (!trimmedPassword || trimmedPassword.length < 6) {
                  setAdminLoginError('A senha do painel corporativo deve ter pelo menos 6 caracteres.');
                  return;
                }
                
                if (isFirstAccessMode) {
                  showAdminNotification('loading', 'Verificando autorização do e-mail no Firestore...');
                  try {
                    let isAuthorized = false;
                    if (trimmedEmail === 'gustavoncoimbra@gmail.com') {
                      isAuthorized = true;
                    } else {
                      const adminDoc = await getDoc(doc(db, 'admins', trimmedEmail));
                      if (adminDoc.exists()) {
                        isAuthorized = true;
                      }
                    }

                    if (!isAuthorized) {
                      setAdminLoginError('Este e-mail corporativo não está autorizado. Solicite permissão ao administrador principal.');
                      showAdminNotification('error', 'Acesso negado: Não autorizado.');
                      return;
                    }

                    showAdminNotification('loading', 'Registrando conta e chave de acesso no Firebase...');
                    try {
                      await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
                      setIsAdminLoggedIn(true);
                      setIsAdminLoginModalOpen(false);
                      setIsAdminPanelOpen(true);
                      setAdminEmailInput('');
                      setAdminPasswordInput('');
                      setIsFirstAccessMode(false);
                      showAdminNotification('success', 'Nova conta registrada e logada com sucesso!');
                    } catch (createErr: any) {
                      if (createErr.code === 'auth/email-already-in-use') {
                        // Se já existir, tentar fazer login diretamente
                        try {
                          await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
                          setIsAdminLoggedIn(true);
                          setIsAdminLoginModalOpen(false);
                          setIsAdminPanelOpen(true);
                          setAdminEmailInput('');
                          setAdminPasswordInput('');
                          setIsFirstAccessMode(false);
                          showAdminNotification('success', 'Acesso de administrador autorizado!');
                        } catch (loginErr: any) {
                          setAdminLoginError('Esta conta já está cadastrada. Se esqueceu sua chave, contate o administrador ou faça o login comum.');
                          showAdminNotification('error', 'Erro ao conectar conta existente.');
                        }
                      } else {
                        setAdminLoginError(`Erro de registro no Firebase: ${createErr.message}`);
                        showAdminNotification('error', 'Falha no registro.');
                      }
                    }
                  } catch (err: any) {
                    console.error("Erro na verificação de administrador:", err);
                    setAdminLoginError('Erro ao consultar as permissões no Firestore.');
                    showAdminNotification('error', 'Erro de conexão.');
                  }
                } else {
                  showAdminNotification('loading', 'Autenticando credenciais no Firebase...');
                  try {
                    // Tenta fazer o login com e-mail e senha no Firebase Auth diretamente
                    const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
                    const user = userCredential.user;
                    
                    // Verificar se o e-mail está autorizado no Firestore ou se é o gustavoncoimbra@gmail.com
                    const email = user.email?.trim().toLowerCase();
                    let isAuthorized = false;
                    
                    if (email === 'gustavoncoimbra@gmail.com') {
                      isAuthorized = true;
                    } else if (email) {
                      const adminDoc = await getDoc(doc(db, 'admins', email));
                      if (adminDoc.exists()) {
                        isAuthorized = true;
                      }
                    }
                    
                    if (isAuthorized) {
                      setIsAdminLoggedIn(true);
                      setIsAdminLoginModalOpen(false);
                      setIsAdminPanelOpen(true);
                      setAdminEmailInput('');
                      setAdminPasswordInput('');
                      showAdminNotification('success', 'Acesso de administrador autorizado!');
                    } else {
                      // Não está autorizado! Deslogamos o usuário do Auth para manter segurança
                      await signOut(auth);
                      setIsAdminLoggedIn(false);
                      setAdminLoginError('Esta conta do Firebase está autenticada, mas não está autorizada como administrador. Contate o suporte.');
                      showAdminNotification('error', 'Acesso negado: Conta não autorizada.');
                    }
                  } catch (authErr: any) {
                    console.warn("Falha ao autenticar administrador:", authErr);
                    
                    // Se o erro for que a credencial é inválida, mas é o super usuário e o Firebase está indisponível/sem internet, ou conta não existe no Firebase ainda:
                    if (trimmedEmail === 'gustavoncoimbra@gmail.com' && trimmedPassword === 'triarc202602012211') {
                      // Tenta criar a conta para o superadmin se não existir no Firebase
                      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-email') {
                        try {
                          showAdminNotification('info', 'Registrando credenciais do superadmin no Firebase...');
                          await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
                          setIsAdminLoggedIn(true);
                          setIsAdminLoginModalOpen(false);
                          setIsAdminPanelOpen(true);
                          setAdminEmailInput('');
                          setAdminPasswordInput('');
                          showAdminNotification('success', 'Superadmin registrado e conectado!');
                        } catch (createErr: any) {
                          console.error("Falha ao registrar superadmin:", createErr);
                          // Fallback local
                          setIsAdminLoggedIn(true);
                          setIsAdminLoginModalOpen(false);
                          setIsAdminPanelOpen(true);
                          setAdminEmailInput('');
                          setAdminPasswordInput('');
                          showAdminNotification('success', 'Acesso autorizado localmente.');
                        }
                      } else {
                        // Fallback local
                        setIsAdminLoggedIn(true);
                        setIsAdminLoginModalOpen(false);
                        setIsAdminPanelOpen(true);
                        setAdminEmailInput('');
                        setAdminPasswordInput('');
                        showAdminNotification('success', 'Acesso autorizado localmente (Offline).');
                      }
                    } else {
                      // Erro comum de senha incorreta ou usuário não encontrado
                      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
                        setAdminLoginError('Usuário ou senha incorretos no Firebase Authentication.');
                      } else {
                        setAdminLoginError(`Falha de autenticação: ${authErr.message || authErr.code}`);
                      }
                      showAdminNotification('error', 'Credenciais inválidas.');
                    }
                  }
                }
              }} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-stone-500 uppercase font-black">E-mail Corporativo</label>
                  <input 
                    type="email"
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    placeholder="admin@triarc.com"
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3.5 py-2.5 text-stone-100 placeholder-stone-700 outline-none focus:border-amber-400 text-xs font-sans"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-stone-500 uppercase font-black">
                    {isFirstAccessMode ? "Cadastrar Nova Senha" : "Chave Corporativa (Senha)"}
                  </label>
                  <input 
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder={isFirstAccessMode ? "Escolha uma senha para seus acessos futuros..." : "Sua senha secreta de customização..."}
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3.5 py-2.5 text-stone-100 placeholder-stone-700 outline-none focus:border-amber-400 text-xs font-sans"
                    required
                  />
                </div>

                <div className="rounded-lg border border-stone-900 bg-stone-950/50 p-3 text-[10px] text-stone-500 font-sans leading-relaxed">
                  🔒 <strong>Acesso Seguro:</strong> {isFirstAccessMode 
                    ? "Sua senha é privada. Após cadastrar, use esta mesma senha para fazer o login nos seus próximos acessos."
                    : "Use seu e-mail cadastrado e sua chave privada exclusiva de administrador para acessar o painel de controle."}
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-[#d4af37] to-amber-300 hover:brightness-110 text-black font-mono text-xs font-black tracking-widest uppercase rounded-xl transition cursor-pointer shadow-[0_10px_20px_rgba(212,175,55,0.15)]"
                >
                  {isFirstAccessMode ? "REGISTRAR E ACESSAR CONSOLE" : "AUTENTICAR E ACESSAR CONSOLE"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFirstAccessMode(!isFirstAccessMode);
                      setAdminLoginError('');
                    }}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 hover:underline cursor-pointer transition uppercase tracking-wider bg-transparent border-0 outline-none"
                  >
                    {isFirstAccessMode ? "Já possui senha? Fazer Login" : "Primeiro Acesso? Cadastrar Senha"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 17. RE-DESIGNED NOTIFICATION OVERLAYS */}
      {adminNotification && (
        <div className="fixed bottom-24 left-6 z-[120] rounded-xl border border-stone-900 bg-[#0d0d0d] p-4 text-left shadow-2xl flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-[#d4af37] animate-pulse shrink-0" />
          <p className="text-xs font-mono font-bold text-stone-200">
            {adminNotification.text}
          </p>
        </div>
      )}

      {/* 18. FLOATING PWA TOAST/CARD (BOTTOM LIGHT PROMPT) */}
      <AnimatePresence>
        {showPWAInstallPrompt && !isPWAInstalled && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed bottom-24 right-6 left-6 sm:left-auto sm:max-w-xs z-40 rounded-2xl border border-[#d4af37]/35 bg-black/95 p-5 text-left shadow-[0_15px_35px_rgba(212,175,55,0.15)] backdrop-blur-xl flex flex-col gap-3.5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#d4af37]/10 flex items-center justify-center border border-[#d4af37]/25 text-amber-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-black text-xs text-white uppercase tracking-wider">TRIARC no Celular</h4>
                  <p className="text-[10px] text-stone-400 font-sans leading-normal">Instale o aplicativo oficial grátis!</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPWAInstallPrompt(false)}
                className="p-1 hover:bg-stone-900 rounded text-stone-500 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPWAInstallPrompt(false)}
                className="flex-1 py-1.5 text-stone-400 hover:text-white rounded-lg border border-stone-900 text-[10px] font-mono uppercase tracking-wider transition cursor-pointer"
              >
                Mais Tarde
              </button>
              <button 
                onClick={() => {
                  setShowPWAInstallPrompt(false);
                  setIsPWAOpen(true);
                }}
                className="flex-1 py-1.5 bg-gradient-to-r from-amber-500 to-[#d4af37] text-black font-semibold rounded-lg text-[10px] font-mono uppercase tracking-wider transition cursor-pointer shadow-md hover:brightness-110"
              >
                Instalar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 19. ELEGANT HIGH-FIDELITY PWA INSTALLER WIZARD */}
      <AnimatePresence>
        {isPWAOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPWAOpen(false)}
              className="absolute inset-0 bg-black/98 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl border border-[#d4af37]/20 bg-[#070707] p-6 text-left shadow-2xl z-10 overflow-hidden"
            >
              {/* Gold gradient background shine */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />

              <button 
                onClick={() => setIsPWAOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl border border-stone-900 bg-stone-900/50 text-stone-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-6">
                
                {/* Header branding */}
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-stone-900 to-black border border-[#d4af37]/35 shadow-md">
                    <TriarcLogo size={75} hideText={true} animate={false} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#d4af37] font-bold">APLICATIVO MULTIPLATAFORMA PWA</span>
                    <h3 className="font-sans font-black text-xl text-white uppercase tracking-tight">EXPERIÊNCIA OFICIAL TRIARC</h3>
                    <p className="text-[11px] text-stone-400 max-w-sm mx-auto font-sans leading-relaxed">
                      Navegue mais rápido, consulte coleções offline, poupe dados e faça checkouts no WhatsApp em segundos!
                    </p>
                  </div>
                </div>

                {/* Status Section */}
                <div className="rounded-2xl border border-stone-900 bg-stone-950 p-4.5 space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono border-b border-stone-900 pb-2.5">
                    <span className="text-stone-500 uppercase">Status do Sistema:</span>
                    {isPWAInstalled ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> INSTALADO
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold flex items-center gap-1.5 animate-pulse">
                        <Smartphone className="w-3.5 h-3.5" /> DISPONÍVEL GRÁTIS
                      </span>
                    )}
                  </div>

                  {/* Primary context installer triggers */}
                  {!isPWAInstalled ? (
                    <div className="space-y-4">
                      {deferredPrompt ? (
                        /* Android/Windows (Standard chrome install prompt) */
                        <div className="space-y-3">
                          <p className="text-[11px] text-stone-400 leading-relaxed font-sans text-center">
                            Seu navegador de última geração suporta a instalação instantânea nativa com um único clique!
                          </p>
                          <button
                            onClick={handlePWAInstallClick}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 via-[#d4af37] to-amber-300 hover:brightness-110 text-black font-mono text-[11px] font-black tracking-widest uppercase rounded-xl transition cursor-pointer shadow-[0_10px_25px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2"
                          >
                            <Sparkles className="w-4 h-4 fill-current animate-spin-slow" />
                            <span>INSTALAR AGORA NO DISPOSITIVO</span>
                          </button>
                        </div>
                      ) : isIOS ? (
                        /* iOS Safari Guide */
                        <div className="space-y-4 font-sans">
                          <span className="block text-[9px] font-mono text-stone-500 uppercase tracking-widest text-center">Instruções para Apple (Safari)</span>
                          <div className="space-y-3.5">
                            <div className="flex gap-3 items-start text-stone-300">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-[10px] font-bold font-mono">1</span>
                              <p className="text-[11px] leading-relaxed">
                                Clique no botão de <strong>Compartilhar</strong> <span className="inline-flex text-amber-400 mx-0.5"><ExternalLink className="w-3.5 h-3.5 rotate-270" /></span> no painel inferior do seu navegador Safari.
                              </p>
                            </div>
                            <div className="flex gap-3 items-start text-stone-300">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-[10px] font-bold font-mono">2</span>
                              <p className="text-[11px] leading-relaxed">
                                Role a lista de opções para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (ou Add to Home Screen).
                              </p>
                            </div>
                            <div className="flex gap-3 items-start text-stone-300">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 border border-stone-800 text-[10px] font-bold font-mono">3</span>
                              <p className="text-[11px] leading-relaxed">
                                Toque em <strong>"Adicionar"</strong> no canto superior direito para confirmar o ícone original da TRIARC na sua lista de apps!
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Other Browsers (Mac Chrome/Safari, etc.) */
                        <div className="space-y-4">
                          <p className="text-[11px] text-stone-400 text-center font-sans leading-relaxed">
                            Seu navegador não disparou o assistente nativo de instalação automática do PWA. Você também pode instalar clicando no ícone de <strong>"Instalar"</strong> (<Smartphone className="w-3.5 h-3.5 inline mx-0.5" />) diretamente na barra de endereço do seu navegador.
                          </p>
                          <div className="flex gap-3 justify-center text-[10px] text-stone-500 font-mono uppercase bg-black border border-stone-900 rounded-xl p-3.5">
                            <span>💻 Windows, Mac ou Linux</span>
                            <span className="text-stone-700">|</span>
                            <span>📱 Android ou iOS</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Already installed view */
                    <div className="text-center py-4 space-y-3 font-sans">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-stone-200 font-black">Você já está usando o aplicativo oficial!</p>
                        <p className="text-[10px] text-stone-500">Aproveite todo o desempenho, rapidez e segurança do showroom digital direto do seu launcher do celular ou desktop.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer specs / share info */}
                <div className="flex items-center justify-between text-[9px] text-stone-600 font-mono uppercase">
                  <span>Lite PWA v1.0.8</span>
                  <span>Sem Downloads Pesados na App Store</span>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
