import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Coupon, ShippingCarrier, Order, LogisticsLog, StoreSettings, formatBRL } from '../types';
import { 
  X, ShoppingBag, Trash2, Plus, Minus, Tag, Truck, ChevronRight, 
  MapPin, User, Mail, Smartphone, CheckCircle, ShieldCheck, Copy,
  Sparkles, ExternalLink, HelpCircle
} from 'lucide-react';

interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

const safeCopyToClipboard = (text: string): boolean => {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(err => {
      console.warn("Clipboard API copy failed, using fallback:", err);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (innerErr) {
        console.error("Fallback copy inside promise catch failed:", innerErr);
      }
    });
    return true;
  }
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    return false;
  }
};

interface CartAndCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  customCoupons: Coupon[];
  customCarriers: ShippingCarrier[];
  onCheckoutSuccess: (orderId: string) => void;
  onShowNotification: (type: 'success' | 'error' | 'info' | 'loading', text: string) => void;
  storeSettings?: StoreSettings;
  currentUser?: any;
  onOpenAuthModal?: () => void;
}

export default function CartAndCheckoutDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  customCoupons,
  customCarriers,
  onCheckoutSuccess,
  onShowNotification,
  storeSettings,
  currentUser,
  onOpenAuthModal
}: CartAndCheckoutDrawerProps) {
  // Navigation inside Drawer: 'cart' | 'checkout_info' | 'success'
  const [currentStep, setCurrentStep] = useState<'cart' | 'checkout_info' | 'success'>('cart');
  
  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  // Shipping Carriers State
  const defaultCarriers: ShippingCarrier[] = [
    { id: 'sc-1', name: 'SEDEX High-Performance', basePrice: 22, deliveryTimeDays: 2, isActive: true },
    { id: 'sc-2', name: 'TRIARC Golden Express', basePrice: 35, deliveryTimeDays: 1, isActive: true },
    { id: 'sc-3', name: 'PAC Eco-Athletic', basePrice: 12, deliveryTimeDays: 5, isActive: true },
  ];
  const activeCarriers = customCarriers.length > 0 ? customCarriers.filter(c => c.isActive) : defaultCarriers;
  const [selectedCarrier, setSelectedCarrier] = useState<ShippingCarrier>(activeCarriers[0] || defaultCarriers[0]);

  // Checkout Fields State
  const [buyerInfo, setBuyerInfo] = useState({ name: '', email: '', whatsapp: '' });
  const [addressInfo, setAddressInfo] = useState({ cep: '', street: '', number: '', city: '', state: '' });
  
  // Preferred payment method for WhatsApp context
  const [paymentOption, setPaymentOption] = useState<'pix' | 'credit_card' | 'boleto'>('pix');
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [createdTrackingCode, setCreatedTrackingCode] = useState('');
  const [generatedWhatsAppLink, setGeneratedWhatsAppLink] = useState('');
  const [messageRaw, setMessageRaw] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  // Auto Reset status on close
  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setBuyerInfo(prev => ({
          ...prev,
          name: prev.name || currentUser.displayName || '',
          email: prev.email || currentUser.email || ''
        }));
      }
    } else {
      setCurrentStep('cart');
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError('');
      setCopiedText(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Coupon apply
  const handleApplyCoupon = (overrideCode?: string) => {
    setCouponError('');
    const targetCode = typeof overrideCode === 'string' ? overrideCode : couponCode;
    const cleanCode = targetCode.trim().toUpperCase();
    if (!cleanCode) return;

    // Hardcoded high-performance default coupons matching user specs
    const defaultCoupons: Coupon[] = [
      { id: 'c-1', code: 'ATLETA10', discountPercentage: 10, isActive: true, createdAt: '' },
      { id: 'c-2', code: 'ELITE20', discountPercentage: 20, isActive: true, createdAt: '' },
      { id: 'c-3', code: 'SHIELD15', discountPercentage: 15, isActive: true, createdAt: '' },
    ];
    
    const pool = customCoupons.length > 0 ? customCoupons : defaultCoupons;
    const found = pool.find(c => c.code === cleanCode && c.isActive);

    if (found) {
      setAppliedCoupon(found);
      onShowNotification('success', `Cupom ${found.code} aplicado: ${found.discountPercentage}% de desconto!`);
    } else {
      setCouponError('Cupom inválido, expirado ou preenchido incorretamente.');
      setAppliedCoupon(null);
    }
  };

  // Totals calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const discountAmount = appliedCoupon ? Math.round(subtotal * (appliedCoupon.discountPercentage / 100)) : 0;
  const freeShippingThreshold = 350;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingPrice = isFreeShipping ? 0 : (selectedCarrier?.basePrice || 0);
  const total = subtotal - discountAmount + shippingPrice;

  const formatPrice = (value: number) => {
    return formatBRL(value);
  };

  // Compile Checkout into WhatsApp Catalog Prompt and Local Storage order logs
  const handleFinalizeWhatsAppCheckout = () => {
    const orderId = "order_" + Math.random().toString(36).substring(2, 11).toUpperCase();
    const logisticsCode = "TRC_" + Math.random().toString(36).substring(2, 8).toUpperCase() + "_BR";

    // Setup first history log for high performance tracking
    const today = new Date().toISOString();
    const initialLogs: LogisticsLog[] = [
      { date: today, message: `Pedido consolidado sob regime de faturamento WhatsApp. Contato: ${buyerInfo.name}.`, location: "Fábrica Base Matriz" },
      { date: today, message: "Aguardando confirmação de recebimento operacional no WhatsApp para faturamento e liberação de mercadoria.", location: "Central de Embalagem" }
    ];

    // Build the order local entity compatible with MyOrdersDrawer
    const localOrderPayload: Order = {
      id: orderId,
      productId: cartItems[0]?.product.id || 'bulk',
      productName: cartItems.length === 1 
        ? `${cartItems[0].product.name} (${cartItems[0].selectedSize} - ${cartItems[0].selectedColor})` 
        : `${cartItems.length} Itens de Alta Performance (Seção ${cartItems[0]?.product.category})`,
      customerName: buyerInfo.name,
      customerEmail: buyerInfo.email,
      customerPhone: buyerInfo.whatsapp,
      status: 'pending',
      totalPrice: total,
      createdAt: today,
      updatedAt: today,
      selectedSize: cartItems[0]?.selectedSize || 'M',
      selectedColor: cartItems[0]?.selectedColor || 'Stealth Black',
      couponUsed: appliedCoupon?.code || '',
      couponDiscount: discountAmount,
      paymentMethod: paymentOption,
      shippingMethod: {
        name: selectedCarrier.name,
        price: shippingPrice
      },
      shippingAddress: {
        cep: addressInfo.cep,
        street: addressInfo.street,
        number: addressInfo.number,
        city: addressInfo.city,
        state: addressInfo.state
      },
      shippingCarrier: selectedCarrier.name,
      trackingCode: logisticsCode,
      logisticsStatus: 'dispatching',
      estimatedDelivery: new Date(Date.now() + (selectedCarrier.deliveryTimeDays * 24 * 60 * 60 * 1000)).toISOString(),
      logisticsHistory: initialLogs,
      logisticsNotes: "Embalado à vácuo sob nitrogênio para conservar as fibras de compressão. Despacho sob regime WhatsApp."
    };

    // Save order strictly to LocalStorage offline registry so tracking works instantly
    try {
      const savedOffline = localStorage.getItem('triarc_offline_orders');
      const offlineList: Order[] = savedOffline ? JSON.parse(savedOffline) : [];
      offlineList.unshift(localOrderPayload);
      localStorage.setItem('triarc_offline_orders', JSON.stringify(offlineList));
    } catch (e) {
      console.warn("Could not save order offline:", e);
    }

    // Format WhatsApp text
    let text = `🔥 *NOVO PEDIDO - ${storeSettings?.storeName || 'TRIARC PERFORMANCE'}* 🔥\n\n`;
    text += `Olá! Acabei de montar meu carrinho no showroom e gostaria de concluir meu pedido:\n\n`;
    
    text += `📦 *CÓDIGO DO PEDIDO:* \`#${orderId}\`\n`;
    text += `🚚 *DESPACHO DE ELITE:* \`${logisticsCode}\`\n\n`;

    text += `⚙️ *ITENS SELECIONADOS:*\n`;
    cartItems.forEach((item) => {
      text += `• *${item.product.name}* (${item.selectedSize} / ${item.selectedColor})\n`;
      text += `  *Qtd:* ${item.quantity}x | *Unidade:* ${formatPrice(item.product.price)}\n`;
    });
    text += `\n`;

    if (appliedCoupon) {
      text += `🏷️ *CUPOM DE DESCONTO:* ${appliedCoupon.code} (-${appliedCoupon.discountPercentage}%)\n\n`;
    }

    text += `🚚 *MÉTODO DE SUPORTE:* ${selectedCarrier.name} (${formatPrice(shippingPrice)})\n`;
    text += `📍 *ENDEREÇO DE DESPACHO:* ${addressInfo.street}, ${addressInfo.number}, ${addressInfo.city}/${addressInfo.state} (CEP: ${addressInfo.cep})\n\n`;

    text += `💳 *OPÇÃO DE PAGAMENTO PREFERIDA:* `;
    if (paymentOption === 'pix') text += `PIX (Transferência Instantânea)\n`;
    else if (paymentOption === 'credit_card') text += `Cartão de Crédito (Link de Pagamento)\n`;
    else text += `Boleto Bancário / Dinheiro\n`;
    
    text += `📊 *VALOR CONSOLIDADO:* ${formatPrice(total)}\n\n`;

    text += `👤 *ATLETA REQUISITANTE:* ${buyerInfo.name}\n`;
    text += `📱 *CONTATO:* ${buyerInfo.whatsapp}\n\n`;

    text += `Fico no aguardo das orientações de pagamento e envio na conversa! Obrigado.`;

    setMessageRaw(text);

    // Sanitize WhatsApp Phone target
    const dirtyPhone = storeSettings?.supportPhone || '+55 (11) 99999-9999';
    let cleanPhone = dirtyPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone; // add brazil country code if missing
    }

    const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    setGeneratedWhatsAppLink(waLink);
    setCreatedOrderId(orderId);
    setCreatedTrackingCode(logisticsCode);

    // Track on checkout success to log within local App state
    onCheckoutSuccess(orderId);

    // Attempt zero-context direct redirection
    onShowNotification('success', "Carrinho consolidado de alta performance!");
    window.open(waLink, '_blank', 'noreferrer,noopener');

    // Transfer wizard state to final success view
    setCurrentStep('success');
    onClearCart();
  };

  const isInfoStepValid = buyerInfo.name && buyerInfo.whatsapp && 
                          addressInfo.cep && addressInfo.street && addressInfo.number && addressInfo.city && addressInfo.state;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
        />

        {/* Sliding Drawer Container */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 220 }}
          id="cart-payment-drawer-flow"
          className="relative h-full w-full max-w-lg border-l border-stone-850 bg-[#0a0a0a] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto"
        >
          {/* Main content body */}
          <div>
            {/* Header section */}
            <div className="flex items-center justify-between border-b border-stone-900 pb-4">
              <div>
                <span className="font-mono text-[9px] tracking-[0.25em] text-yellow-500 uppercase font-black">
                  {currentStep === 'cart' ? 'Carrinho Técnico' : 
                   currentStep === 'checkout_info' ? 'Dados Logísticos de Despacho' : 'Sucesso Consolidado'}
                </span>
                <h2 className="font-serif text-xl font-bold tracking-tight text-white uppercase mt-0.5">
                  {currentStep === 'cart' ? 'Sacola de Itens' : 
                   currentStep === 'checkout_info' ? 'Checkout - Etapa 1' : 'Operação Completa'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl border border-stone-850 bg-stone-900/40 p-2.5 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List items block */}
            {cartItems.length === 0 && currentStep !== 'success' ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="h-16 w-16 bg-stone-950 rounded-full border border-dashed border-stone-850 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-stone-600 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-semibold text-stone-200 uppercase">Sua sacola está vazia</h4>
                  <p className="text-[11px] font-sans text-stone-500 max-w-xs mt-1.5 leading-relaxed">
                    Você não adicionou nenhum item de alta performance ao seu carrinho corporativo ainda.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* -------------------------------------------------------- */}
                {/* STATE 1: SHOPPING CART LIST AND AMBIENT DISPATCH DETAILS */}
                {/* -------------------------------------------------------- */}
                {currentStep === 'cart' && (
                  <div className="mt-5 space-y-5">
                    {/* Cart list wrapper loop */}
                    <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                      {cartItems.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex gap-4 p-3 rounded-xl border border-stone-900 bg-[#0c0c0c] text-left"
                        >
                          <div className="h-14 w-14 rounded-lg bg-stone-950 border border-stone-850 overflow-hidden flex-shrink-0">
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-serif text-xs font-black text-stone-200 line-clamp-1 uppercase">
                                {item.product.name}
                              </h4>
                              <button
                                onClick={() => onRemoveItem(idx)}
                                className="text-stone-600 hover:text-red-400 p-0.5 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="font-mono text-2xs text-amber-500 uppercase mt-0.5">
                              {item.selectedSize} / {item.selectedColor}
                            </p>

                            <div className="flex items-center justify-between mt-2.5">
                              {/* Quantity manipulators */}
                              <div className="flex items-center gap-2 border border-stone-850 bg-stone-950 rounded-lg px-2 py-0.5">
                                <button
                                  onClick={() => onUpdateQuantity(idx, -1)}
                                  className="text-stone-500 hover:text-white p-0.5 transition"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-mono text-xs font-bold text-stone-300 min-w-[14px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => onUpdateQuantity(idx, 1)}
                                  className="text-stone-500 hover:text-white p-0.5 transition"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <span className="font-mono text-xs text-stone-400">
                                {formatPrice(item.product.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Coupons Promo Area */}
                    <div className="border-t border-stone-900/60 pt-4 space-y-4">
                      <div className="space-y-1.5 text-left">
                        <label className="font-mono text-[9px] text-stone-500 uppercase font-black tracking-widest">
                          Cupom de Desconto de Atleta
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-grow">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-600">
                              <Tag className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              placeholder="Código (ex: ATLETA10)"
                              value={couponCode}
                              onChange={(e) => {
                                setCouponCode(e.target.value);
                                setCouponError('');
                              }}
                              className="w-full text-xs rounded-lg border border-stone-850 bg-stone-950 pl-9 pr-4 py-2.5 text-stone-100 uppercase tracking-widest font-mono"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyCoupon()}
                            className="bg-stone-900 hover:bg-stone-850 text-stone-100 hover:text-amber-400 font-mono text-[10px] uppercase font-bold tracking-widest rounded-lg px-4 border border-stone-850 cursor-pointer"
                          >
                            Aplicar
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-red-500 text-[10px] font-sans antialiased">{couponError}</p>
                        )}
                        {appliedCoupon && (
                          <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-[10.5px]">
                            <span className="text-emerald-400 font-mono">Cupom <strong>{appliedCoupon.code}</strong> Ativo!</span>
                            <button 
                              onClick={() => setAppliedCoupon(null)}
                              className="text-stone-500 hover:text-white uppercase font-mono text-[9px] font-bold"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quick click dynamic triggers */}
                      {!appliedCoupon && (
                        <div className="bg-[#0b0b0b] border border-stone-900 rounded-lg p-2 flex items-center justify-between text-left gap-1.5 font-sans">
                          <span className="text-[10px] text-stone-500 leading-none uppercase">Sugestões:</span>
                          <div className="flex gap-1.5">
                            <button 
                              type="button" 
                              onClick={() => {
                                setCouponCode('ATLETA10');
                                handleApplyCoupon('ATLETA10');
                              }}
                              className="px-2 py-1 bg-stone-900 text-stone-300 font-mono text-[9px] uppercase font-semibold rounded hover:text-yellow-450 border border-stone-850"
                            >
                              ATLETA10 (-10%)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------- */}
                {/* STATE 2: CHECKOUT WIZARD IN CIVILIAN INFORMATION         */}
                {/* -------------------------------------------------------- */}
                {currentStep === 'checkout_info' && (
                  <div className="mt-5 space-y-4 text-left">
                    <p className="text-[11px] text-stone-400 font-sans leading-normal">
                      Insira seus dados abaixo para consolidar seu pedido e gerar uma mensagem organizada para finalização no catálogo de nossa matriz do WhatsApp.
                    </p>

                    <div className="space-y-3 font-sans">
                      {/* Personal Info */}
                      <span className="block font-mono text-[8.5px] text-stone-500 uppercase tracking-widest font-black">Identificação do Atleta</span>
                      
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-600">
                          <User className="w-4 h-4" />
                        </span>
                        <input
                          required
                          type="text"
                          placeholder="Nome Completo *"
                          value={buyerInfo.name}
                          onChange={(e) => setBuyerInfo({ ...buyerInfo, name: e.target.value })}
                          className="w-full text-xs rounded-lg border border-stone-850 bg-stone-950 pl-9 pr-4 py-2.5 text-stone-100 placeholder-stone-700 focus:outline-none focus:border-yellow-550"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-600">
                            <Mail className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="email"
                            placeholder="Seu E-mail (Opcional)"
                            value={buyerInfo.email}
                            onChange={(e) => setBuyerInfo({ ...buyerInfo, email: e.target.value })}
                            className="w-full text-xs rounded-lg border border-stone-850 bg-stone-950 pl-9 pr-4 py-2.5 text-stone-100 placeholder-stone-700 focus:outline-none focus:border-yellow-550"
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-600">
                            <Smartphone className="w-3.5 h-3.5" />
                          </span>
                          <input
                            required
                            type="tel"
                            placeholder="Seu WhatsApp/Tel *"
                            value={buyerInfo.whatsapp}
                            onChange={(e) => setBuyerInfo({ ...buyerInfo, whatsapp: e.target.value })}
                            className="w-full text-xs rounded-lg border border-stone-850 bg-stone-950 pl-9 pr-4 py-2.5 text-stone-100 placeholder-stone-700 focus:outline-none focus:border-yellow-550"
                          />
                        </div>
                      </div>

                      {/* Address info */}
                      <span className="block font-mono text-[8.5px] text-stone-500 uppercase tracking-widest font-black pt-2">Localização de Despacho</span>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          required
                          type="text"
                          placeholder="CEP *"
                          value={addressInfo.cep}
                          onChange={(e) => setAddressInfo({ ...addressInfo, cep: e.target.value })}
                          className="w-full text-xs rounded-lg border border-stone-850 bg-stone-950 px-3 py-2.5 text-stone-100 placeholder-stone-700 focus:outline-none focus:border-yellow-550"
                        />
                        <input
                          required
                          type="text"
                          placeholder="Cidade *"
                          value={addressInfo.city}
                          onChange={(e) => setAddressInfo({ ...addressInfo, city: e.target.value })}
                          className="col-span-2 w-full text-xs rounded-lg border border-stone-850 bg-stone-950 px-3 py-2.5 text-stone-100 placeholder-stone-700 focus:outline-none focus:border-yellow-550"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input
                          required
                          type="text"
                          placeholder="Endereço / Logradouro *"
                          value={addressInfo.street}
                          onChange={(e) => setAddressInfo({ ...addressInfo, street: e.target.value })}
                          className="sm:col-span-8 w-full text-xs rounded-lg border border-stone-850 bg-stone-950 px-3 py-2.5 text-stone-100 placeholder-stone-700 focus:outline-none focus:border-yellow-550"
                        />
                        <input
                          required
                          type="text"
                          placeholder="Número *"
                          value={addressInfo.number}
                          onChange={(e) => setAddressInfo({ ...addressInfo, number: e.target.value })}
                          className="sm:col-span-2 w-full text-xs rounded-lg border border-stone-850 bg-stone-950 px-3 py-2.5 text-stone-100 placeholder-stone-700 focus:outline-none focus:border-yellow-550"
                        />
                        <input
                          required
                          type="text"
                          placeholder="UF *"
                          maxLength={2}
                          value={addressInfo.state}
                          onChange={(e) => setAddressInfo({ ...addressInfo, state: e.target.value })}
                          className="sm:col-span-2 w-full text-xs rounded-lg border border-stone-850 bg-stone-950 px-3 py-2.5 text-stone-100 placeholder-stone-700 focus:outline-none uppercase text-center focus:border-yellow-550"
                        />
                      </div>

                      {/* Payment Option Swatches */}
                      <span className="block font-mono text-[8.5px] text-stone-500 uppercase tracking-widest font-black pt-2">Opção de Pagamento de Interesse</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentOption('pix')}
                          className={`rounded-xl py-2 px-3 border text-center flex flex-col items-center gap-1.5 cursor-pointer transition ${
                            paymentOption === 'pix' 
                              ? 'bg-yellow-500/10 border-yellow-500 text-yellow-405 font-bold' 
                              : 'bg-stone-900/40 border-stone-850 text-stone-400 hover:text-white'
                          }`}
                        >
                          <span className="font-mono text-[10px] uppercase">PIX</span>
                          <span className="text-[8px] font-sans font-light opacity-80 leading-none">Desconto instantâneo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentOption('credit_card')}
                          className={`rounded-xl py-2 px-3 border text-center flex flex-col items-center gap-1.5 cursor-pointer transition ${
                            paymentOption === 'credit_card' 
                              ? 'bg-yellow-500/10 border-yellow-500 text-yellow-405 font-bold' 
                              : 'bg-stone-900/40 border-stone-850 text-stone-400 hover:text-white'
                          }`}
                        >
                          <span className="font-mono text-[10px] uppercase">CARTÃO</span>
                          <span className="text-[8px] font-sans font-light opacity-80 leading-none">Até 12x no link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentOption('boleto')}
                          className={`rounded-xl py-2 px-3 border text-center flex flex-col items-center gap-1.5 cursor-pointer transition ${
                            paymentOption === 'boleto' 
                              ? 'bg-yellow-500/10 border-yellow-500 text-yellow-405 font-bold' 
                              : 'bg-stone-900/40 border-stone-850 text-stone-400 hover:text-white'
                          }`}
                        >
                          <span className="font-mono text-[10px] uppercase">BOLETO</span>
                          <span className="text-[8px] font-sans font-light opacity-80 leading-none">Processamento banco</span>
                        </button>
                      </div>

                      {/* Shipping Logistics Carrier selector */}
                      <span className="block font-mono text-[8.5px] text-stone-500 uppercase tracking-widest font-black pt-2">Metodologia de Despacho</span>
                      <div className="space-y-2 font-mono text-2xs uppercase">
                        {activeCarriers.map((carrier) => {
                          const isSelected = selectedCarrier.id === carrier.id;
                          return (
                            <button
                              key={carrier.id}
                              onClick={() => setSelectedCarrier(carrier)}
                              className={`w-full rounded-xl border p-3 flex justify-between items-center transition text-left cursor-pointer ${
                                isSelected 
                                  ? 'border-yellow-500 bg-yellow-500/5 text-yellow-400 font-bold' 
                                  : 'border-stone-900 hover:border-stone-800 text-stone-400'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Truck className={`w-3.5 h-3.5 ${isSelected ? 'text-yellow-400' : 'text-stone-600'}`} />
                                <div>
                                  <span className="block text-[10px] text-stone-100">{carrier.name}</span>
                                  <span className="block text-[8px] text-stone-500 mt-0.5">ESTIMATIVA: ~{carrier.deliveryTimeDays} DIAS OPERACIONAIS</span>
                                </div>
                              </div>
                              <span className="font-mono text-[10px] text-right">
                                {isFreeShipping ? 'GRÁTIS' : formatPrice(carrier.basePrice)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------- */}
                {/* STATE 3: SUCCESS/THANK YOU VIEW & DIRECT WHATSAPP ACTION */}
                {/* -------------------------------------------------------- */}
                {currentStep === 'success' && (
                  <div className="mt-8 text-center space-y-6">
                    <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-black text-[#f5f5f5] uppercase">Pedido Pré-Registrado!</h3>
                      <p className="text-xs text-stone-400 font-sans mt-1.5 max-w-sm mx-auto leading-relaxed">
                        Seu rascunho de alta performance foi gerado offline com sucesso em nosso showroom. Ative o botão dourado abaixo para transmitir o pedido e receber as peças via WhatsApp.
                      </p>
                    </div>

                    <div className="bg-[#0c0c0c] border border-stone-900 rounded-xl p-4 space-y-3 max-w-sm mx-auto text-left">
                      <div className="flex justify-between items-center border-b border-stone-900/60 pb-2">
                        <span className="font-mono text-[9px] text-stone-500 uppercase block tracking-wider">CÓDIGO DE FATURAMENTO</span>
                        <span className="font-mono text-xs font-black text-amber-500 tracking-wider">#{createdOrderId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[9px] text-stone-500 uppercase block tracking-wider">CÓDIGO DE RASTREAMENTO</span>
                        <span className="font-mono text-xs font-black text-stone-300 tracking-wider">{createdTrackingCode}</span>
                      </div>
                      <p className="text-[10px] text-stone-400 font-sans leading-relaxed border-t border-stone-900/60 pt-2 text-center text-stone-500">
                        O código acima permite auditar o status do despacho logístico na seção de rastreamento do site assim que seu pagamento for confirmado via chat.
                      </p>
                    </div>

                    {/* Prominent Action Button: Launch/Reopen WhatsApp Link */}
                    <div className="pt-2 space-y-3.5 max-w-sm mx-auto">
                      <a
                        href={generatedWhatsAppLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 py-4 font-mono text-xs font-black text-stone-950 uppercase tracking-widest shadow-[0_4px_25px_rgba(234,179,8,0.2)] hover:scale-102 active:scale-98 transition duration-300"
                      >
                        <ExternalLink className="w-4 h-4 text-stone-950 animate-bounce" />
                        <span>Abrir WhatsApp Matriz</span>
                      </a>

                      {/* Secondary copy option for security in restricted iframes */}
                      <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-900 space-y-2 text-left">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[8.5px] text-stone-500 uppercase font-bold tracking-wider">Mensagem Gerada</span>
                          <button
                            type="button"
                            onClick={() => {
                              safeCopyToClipboard(messageRaw);
                              setCopiedText(true);
                              onShowNotification('success', "Texto do pedido copiado para a área de transferência!");
                              setTimeout(() => setCopiedText(false), 3000);
                            }}
                            className="flex items-center gap-1 font-mono text-[9px] text-yellow-500 uppercase hover:text-white font-black"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
                          </button>
                        </div>
                        <div className="bg-[#080808] border border-stone-900 rounded p-2.5 max-h-32 overflow-y-auto font-mono text-[9px] text-stone-400 whitespace-pre-wrap select-all">
                          {messageRaw}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* -------------------------------------------------------- */}
          {/* STATIC FOOTER WITH TOTAL PRICES OR FLOW STEPPING TRIGGERS */}
          {/* -------------------------------------------------------- */}
          {cartItems.length > 0 && currentStep !== 'success' && (
            <div className="mt-8 border-t border-stone-900 pt-5 space-y-4">
              
              {/* Checkout details block */}
              <div className="space-y-1.5 text-xs font-mono text-left">
                <div className="flex justify-between text-stone-500 text-[10px] uppercase">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 text-[10px] uppercase font-bold">
                    <span>Cupom Desconto ({appliedCoupon?.code})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-500 text-[10px] uppercase">
                  <span>Frete ({selectedCarrier.name})</span>
                  <span>{isFreeShipping ? 'Grátis (Pedido > R$350)' : formatPrice(shippingPrice)}</span>
                </div>
                <div className="flex justify-between text-white font-bold border-t border-stone-900/60 pt-2 text-sm">
                  <span className="uppercase tracking-wider">VALOR CONSOLIDADO</span>
                  <span className="text-yellow-500">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Multi-step action triggers */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[9px] text-stone-500 font-mono text-left">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ambiente integrado ao WhatsApp Oficial para faturamento 100% seguro.</span>
                </div>

                {currentStep === 'cart' && (
                  <button
                    onClick={() => setCurrentStep('checkout_info')}
                    className="w-full h-12 flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 rounded-xl font-mono text-2xs font-black text-stone-950 uppercase tracking-widest shadow-md hover:brightness-110 active:scale-98 transition cursor-pointer"
                  >
                    <span>Prosseguir ao Checkout</span>
                    <ChevronRight className="w-4 h-4 text-stone-950" />
                  </button>
                )}

                {currentStep === 'checkout_info' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentStep('cart')}
                      className="flex-1 py-3 bg-stone-900 hover:bg-stone-850 rounded-xl font-mono text-2xs font-bold text-stone-400 hover:text-white transition uppercase cursor-pointer border border-stone-850"
                    >
                      Voltar ao Carrinho
                    </button>
                    <button
                      onClick={handleFinalizeWhatsAppCheckout}
                      disabled={!isInfoStepValid}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 rounded-xl font-mono text-2xs font-black text-stone-950 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Finalizar no WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-950" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
