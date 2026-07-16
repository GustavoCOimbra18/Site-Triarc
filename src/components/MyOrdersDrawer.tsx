import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, LogisticsLog, formatBRL } from '../types';
import { 
  X, Package, Truck, Calendar, ChevronDown, ChevronUp, MapPin, 
  Plus, Search, ShoppingBag, AlertCircle, Activity, CheckCircle, ShieldCheck
} from 'lucide-react';

const formatPrice = (value: number) => {
  return formatBRL(value);
};

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

interface MyOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  myOrderIds: string[];
  orders: Order[];
  onAddOrderIdLocal: (orderId: string) => void;
  onShowNotification: (type: 'success' | 'error' | 'info' | 'loading', text: string) => void;
  currentUser?: any;
}

export default function MyOrdersDrawer({
  isOpen,
  onClose,
  myOrderIds,
  orders,
  onAddOrderIdLocal,
  onShowNotification,
  currentUser
}: MyOrdersDrawerProps) {
  // Store expanded state per order ID
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Manual order search to add to local list
  const [manualOrderId, setManualOrderId] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);

  if (!isOpen) return null;

  // Filter global orders that belong to the user's localized order list
  // Case-insensitive comparisons and match either ID or trackingCode
  const matchedOrders = orders.filter(
    (order) => myOrderIds.some(
      (localId) => localId.toLowerCase() === order.id.toLowerCase() || 
                   (order.trackingCode && localId.toLowerCase() === order.trackingCode.toLowerCase())
    )
  );

  // Sum calculated spent
  const totalSpent = matchedOrders.reduce((acc, order) => acc + (order.totalPrice || 0), 0);
  
  // Calculate Athlete Tier
  let athleteTier = 'Bronze';
  let tierBg = 'from-amber-950/40 via-orange-950/20 to-stone-950 border-amber-900/35 text-amber-500';
  let tierIndicator = '🥉 Atleta Bronze';
  let nextTierMessage = `Faltam ${formatPrice(300 - totalSpent)} de investimento para atingir o nível Prata (Bronze: < R$300 | Prata: R$300 | Ouro: R$800).`;
  let discountBenefit = 'Disponível cupom padrão de 10% OFF';
  
  if (totalSpent >= 300 && totalSpent < 800) {
    athleteTier = 'Silver';
    tierBg = 'from-stone-850/40 via-stone-900/20 to-[#0c0c0c] border-stone-800 text-stone-205';
    tierIndicator = '🥈 Atleta Prata';
    nextTierMessage = `Faltam ${formatPrice(800 - totalSpent)} de investimento para atingir o nível Ouro.`;
    discountBenefit = 'Desbloqueou Cupom SHIELD15 (15% OFF)';
  } else if (totalSpent >= 800) {
    athleteTier = 'Gold';
    tierBg = 'from-amber-500/15 via-yellow-950/10 to-[#0e0e0e] border-yellow-500/20 text-yellow-450 shadow-[0_4px_15px_rgba(234,179,8,0.05)]';
    tierIndicator = '🏆 Atleta Ouro (VIP)';
    nextTierMessage = 'Parabéns! Você alcançou o nível mais alto do ecossistema TRIARC!';
    discountBenefit = 'Desbloqueou Cupom ELITE20 (20% OFF) especial';
  }

  const handleAddManualOrder = () => {
    const cleanId = manualOrderId.trim();
    if (!cleanId) {
      onShowNotification('error', "Insira o código do pedido.");
      return;
    }

    // Check if the order exists in our global db
    const exists = orders.find(
      (o) => o.id.toLowerCase() === cleanId.toLowerCase() || 
             (o.trackingCode && o.trackingCode.toLowerCase() === cleanId.toLowerCase())
    );

    if (exists) {
      if (myOrderIds.includes(exists.id)) {
        onShowNotification('info', "Este pedido já está registrado no seu terminal.");
      } else {
        onAddOrderIdLocal(exists.id);
        setExpandedOrderId(exists.id); // auto-expand to show tracking!
        onShowNotification('success', "Pedido localizado e adicionado ao seu histórico!");
        setManualOrderId('');
        setIsAddingManual(false);
      }
    } else {
      onShowNotification('error', "Pedido não localizado. Por favor, verifique o código.");
    }
  };

  const getStatusLabelAndColor = (status?: string) => {
    switch (status) {
      case 'dispatching':
        return { label: 'Em Despacho', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'shipped':
        return { label: 'Despachado', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
      case 'in_transit':
        return { label: 'Em Trânsito', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'customs':
        return { label: 'Fiscalização', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'out_for_delivery':
        return { label: 'Saiu para Entrega', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
      case 'delivered':
        return { label: 'Entregue', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      default:
        return { label: 'Processando', color: 'text-stone-400 bg-stone-500/10 border-stone-500/20' };
    }
  };

  const getPercentageForStatus = (status?: string) => {
    switch (status) {
      case 'dispatching': return 15;
      case 'shipped': return 40;
      case 'in_transit': return 65;
      case 'customs': return 75;
      case 'out_for_delivery': return 90;
      case 'delivered': return 100;
      default: return 5;
    }
  };

  const toggleExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden">
        {/* Backdrop background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
        />

        {/* sliding container */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 220 }}
          className="relative h-full w-full max-w-lg border-l border-stone-850 bg-[#0a0a0a] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-900 pb-4">
              <div>
                <span className="font-mono text-[9px] tracking-[0.25em] text-yellow-500 uppercase font-bold">
                  Histórico Individual
                </span>
                <h2 className="font-serif text-xl font-bold text-stone-100 uppercase mt-0.5 tracking-tight flex items-center gap-1.5">
                  <Package className="w-5 h-5 text-yellow-450" />
                  <span>Meus Pedidos</span>
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl border border-stone-850 bg-stone-900/45 p-2 text-stone-400 hover:text-white hover:border-stone-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CLIENT LOYALTY PROFILE MODULE */}
            {currentUser ? (
              <div className="mt-5 bg-gradient-to-br from-stone-950 via-stone-900/50 to-stone-950 border border-stone-850 p-5 rounded-2xl space-y-4 font-sans">
                {/* Athlete Profile Greeting */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center font-bold text-sm tracking-widest font-mono">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : (currentUser.email ? currentUser.email[0].toUpperCase() : 'A')}
                  </div>
                  <div>
                    <h3 className="text-stone-400 text-[9px] font-bold font-mono tracking-wider uppercase">PAINEL DO ATLETA</h3>
                    <p className="text-stone-100 font-serif text-sm font-semibold tracking-tight">
                      {currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Sócio Triarc')}
                    </p>
                  </div>
                </div>

                {/* Simulated VIP member card */}
                <div className={`p-4 rounded-xl border bg-gradient-to-r ${tierBg} flex flex-col justify-between h-28 relative overflow-hidden transition-all duration-300`}>
                  <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-yellow-500/5 to-transparent pointer-events-none" />
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="block font-mono text-[7px] tracking-widest text-[#d97706] font-bold">MEMBER DE ELITE</span>
                      <span className="block font-serif text-[10px] font-bold tracking-widest text-stone-100 uppercase">TRIARC SÔCIO CLUB</span>
                    </div>
                    <span className="text-[9px] font-mono uppercase bg-stone-950/90 border border-stone-800 px-2 py-0.5 rounded font-black tracking-wider">{athleteTier}</span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block text-[7px] font-mono text-stone-500 uppercase">NÍVEL ALCANÇADO</span>
                      <span className="font-mono text-xs font-bold text-stone-100">{tierIndicator}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[7px] font-mono text-stone-500 uppercase">INVESTIDO ACUMULADO</span>
                      <span className="font-mono text-xs font-bold text-yellow-500">{formatPrice(totalSpent)}</span>
                    </div>
                  </div>
                </div>

                {/* Loyalty Tier Progress Message */}
                <div className="text-[10px] text-stone-400 font-sans leading-relaxed border-t border-stone-900 pt-3">
                  <p>{nextTierMessage}</p>
                  <p className="text-stone-500 mt-1">Benefício atual: <strong className="text-yellow-505 font-bold">{discountBenefit}</strong></p>
                </div>

                {/* Active Coupons Segment */}
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-900 space-y-2">
                  <span className="block font-mono text-[8px] text-stone-500 uppercase tracking-widest font-black">Copiar Cupom Exclusivo</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between bg-stone-900 border border-stone-850 px-2.5 py-1.5 rounded-lg">
                      <span className="font-mono text-[9px] font-bold text-stone-300">ATLETA10 (10%)</span>
                      <button 
                        onClick={() => {
                          safeCopyToClipboard('ATLETA10');
                          onShowNotification('success', "Cupom ATLETA10 copiado!");
                        }}
                        className="text-[9px] font-mono text-yellow-500 uppercase hover:text-white font-bold cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                    {athleteTier !== 'Bronze' && (
                      <div className="flex items-center justify-between bg-stone-900 border border-stone-850 px-2.5 py-1.5 rounded-lg">
                        <span className="font-mono text-[9px] font-bold text-stone-300">SHIELD15 (15%)</span>
                        <button 
                          onClick={() => {
                            safeCopyToClipboard('SHIELD15');
                            onShowNotification('success', "Cupom SHIELD15 copiado!");
                          }}
                          className="text-[9px] font-mono text-yellow-500 uppercase hover:text-white font-bold cursor-pointer"
                        >
                          Copiar
                        </button>
                      </div>
                    )}
                    {athleteTier === 'Gold' && (
                      <div className="flex items-center justify-between bg-stone-900 border border-amber-500/20 px-2.5 py-1.5 rounded-lg bg-amber-500/5">
                        <span className="font-mono text-[9px] font-extrabold text-yellow-500 animate-pulse">ELITE20 (20%)</span>
                        <button 
                          onClick={() => {
                            safeCopyToClipboard('ELITE20');
                            onShowNotification('success', "Cupom VIP ELITE20 copiado!");
                          }}
                          className="text-[9px] font-mono text-yellow-400 uppercase hover:text-white font-bold cursor-pointer"
                        >
                          Copiar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 bg-stone-950 border border-dashed border-stone-850 p-4.5 rounded-2xl space-y-3 text-center">
                <span className="inline-block bg-yellow-500/10 text-yellow-400 border border-yellow-500/15 font-mono text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                  ★ CLUBE DE ATLETAS TRIARC ★
                </span>
                <p className="text-stone-300 text-xs font-serif leading-relaxed">
                  Crie ou acesse sua conta para ativar o Painel VIP do Cliente. Usuários logados acumulam histórico de pedidos para subir de nível e desbloquear cupons de até 20% OFF!
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-mono text-stone-400 pt-1">
                  <div className="bg-stone-900/50 p-2 rounded-lg border border-stone-900">
                    <span className="block text-stone-200 font-bold mb-0.5">🥉 Bronze</span>
                    Normal &lt; R$300
                  </div>
                  <div className="bg-stone-900/50 p-2 rounded-lg border border-stone-900">
                    <span className="block text-stone-250 font-bold mb-0.5">🥈 Prata</span>
                    R$300 a R$800
                  </div>
                  <div className="bg-stone-900/50 p-2 rounded-lg border border-stone-900">
                    <span className="block text-yellow-500 font-bold mb-0.5">🏆 Ouro</span>
                    Acima R$800
                  </div>
                </div>
              </div>
            )}

            {/* Manual add widget toggler */}
            <div className="mt-4">
              {!isAddingManual ? (
                <button
                  onClick={() => setIsAddingManual(true)}
                  className="w-full rounded-lg border border-dashed border-stone-850 bg-stone-950/20 py-2.5 px-4 text-left font-mono text-[11px] text-stone-400 hover:text-yellow-400 hover:border-stone-700 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" /> Adicionar pedido de outro navegador
                  </span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl border border-stone-850 bg-stone-950/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-stone-500 uppercase font-bold">Localizar Pedido</span>
                    <button onClick={() => setIsAddingManual(false)} className="text-[10px] font-mono text-stone-400 hover:text-white uppercase">Cancelar</button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Identificador do Pedido ou Rastreio"
                      value={manualOrderId}
                      onChange={(e) => setManualOrderId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddManualOrder()}
                      className="flex-1 text-xs rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2 text-stone-100 placeholder-stone-700 focus:outline-none focus:border-yellow-500/40"
                    />
                    <button
                      onClick={handleAddManualOrder}
                      className="rounded-lg bg-amber-400 hover:bg-yellow-500 px-4 py-2 text-xs font-mono font-bold text-stone-950 uppercase"
                    >
                      Pesquisar
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* List of matched orders */}
            {matchedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-stone-950 flex items-center justify-center border border-dashed border-stone-850">
                  <ShoppingBag className="w-6 h-6 text-stone-750" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#e1e1e1] uppercase mt-1">Nenhum pedido localizado</h4>
                  <p className="text-2xs text-stone-500 font-sans max-w-xs mt-1.5 leading-relaxed">
                    Você ainda não efetuou compras neste terminal de navegação, ou seus códigos locais estão vazios. Faça um pedido técnico ou use o localizador acima.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {matchedOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const statusInfo = getStatusLabelAndColor(order.logisticsStatus);
                  const progressValue = getPercentageForStatus(order.logisticsStatus);

                  return (
                    <div 
                      key={order.id} 
                      className="rounded-xl border border-stone-900 bg-stone-950 p-4 transition-all duration-300 flex flex-col hover:border-stone-800 text-left"
                    >
                      {/* Top Info Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-mono text-[8.5px] text-stone-500 uppercase block">Código de faturamento</span>
                          <span className="font-mono text-xs font-bold text-stone-200">#{order.id}</span>
                          
                          <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] text-stone-500">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}
                            </span>
                          </div>
                        </div>

                        {/* Status label */}
                        <div className={`rounded-full px-2.5 py-1 text-[9px] font-mono border uppercase tracking-wider ${statusInfo.color}`}>
                          {statusInfo.label}
                        </div>
                      </div>

                      {/* Purchased Item/Product preview info */}
                      <div className="border-t border-stone-900 mt-3 pt-3 flex items-center gap-3">
                        <div className="h-11 w-11 flex-shrink-0 rounded-lg border border-stone-855 bg-black overflow-hidden">
                          {/* We don't have the full product object here always, but we can render details */}
                          <div className="h-full w-full flex items-center justify-center font-bold text-[10px] bg-stone-900 border border-stone-800 text-stone-500">
                            TRC
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-serif text-xs font-semibold text-stone-200 truncate block">
                            {order.productName}
                          </span>
                          <div className="flex gap-2 mt-0.5 text-[9px] font-mono text-stone-400">
                            <span>Tam: {order.selectedSize || 'M'}</span>
                            <span>&bull;</span>
                            <span>Cor: {order.selectedColor || 'Stealth Black'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-yellow-500/90 tracking-tight block">
                            {formatPrice(order.totalPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Logistics Shipping progress timeline logs */}
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="w-full border-t border-stone-900/60 mt-3 pt-2.5 flex items-center justify-between text-[10px] font-mono text-amber-500 hover:text-amber-400 transition-all uppercase cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" />
                          <span>Status e Detalhes de Despacho</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* Expanded Section with dynamic progress bar and logs stepper */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="border-t border-stone-900 mt-2.5 pt-3 space-y-4 overflow-hidden"
                        >
                          {/* Mini progress bar representer */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[8px] font-mono text-stone-500 tracking-wider">
                              <span>MATRIZ TRIARC</span>
                              <span>{progressValue}% COMPLETO</span>
                              <span>ENTREGA ATLETA</span>
                            </div>
                            <div className="h-1 bg-stone-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-450 transition-all duration-700"
                                style={{ width: `${progressValue}%` }}
                              />
                            </div>
                          </div>

                          {/* Logistic information highlights */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-sans text-stone-450">
                            <div className="bg-[#0f0f0f] p-2 rounded-lg border border-stone-900/40">
                              <span className="block font-mono text-[8px] text-stone-600 uppercase">Transportadora</span>
                              <span className="font-mono text-stone-300 font-bold">{order.shippingCarrier || 'Sedex Real Alta Performance'}</span>
                            </div>
                            <div className="bg-[#0f0f0f] p-2 rounded-lg border border-stone-900/40">
                              <span className="block font-mono text-[8px] text-stone-600 uppercase">Registro Rastreio</span>
                              <span className="font-mono text-stone-300 font-bold select-all break-all">{order.trackingCode || order.id}</span>
                            </div>
                          </div>

                          {/* Logistics history list */}
                          <div className="space-y-3 pt-1">
                            <span className="block font-mono text-[8px] text-stone-500 uppercase tracking-widest font-black">Historograma de Eventos</span>
                            
                            {!order.logisticsHistory || order.logisticsHistory.length === 0 ? (
                              <div className="p-3 border border-dashed border-stone-900 rounded-lg flex items-center justify-center text-center">
                                <Activity className="w-4 h-4 text-yellow-500 animate-pulse mr-2" />
                                <span className="text-[9px] font-mono text-stone-500 uppercase leading-snug">
                                  Pacote em manufatura e processamento de segurança.
                                </span>
                              </div>
                            ) : (
                              <div className="relative border-l border-stone-900 ml-1.5 pl-3.5 space-y-3.5 max-h-[160px] overflow-y-auto pr-0.5">
                                {order.logisticsHistory.map((step, sIdx) => (
                                  <div key={sIdx} className="relative">
                                    <div className="absolute -left-[21px] top-1 h-1.5 w-1.5 rounded-full bg-yellow-500 ring-4 ring-yellow-500/10 shadow-[0_0_6px_rgba(234,179,8,0.3)]" />
                                    
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[9px] font-mono text-stone-550">
                                      <span>
                                        {new Date(step.date).toLocaleDateString('pt-BR')} - {new Date(step.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                      </span>
                                      {step.location && (
                                        <span className="text-yellow-405/80 font-bold">📍 {step.location}</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-stone-300 font-sans font-light mt-0.5 leading-snug">{step.message}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-stone-900 mt-6 text-center text-[10px] font-mono text-stone-600 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-700" />
            <span>TRIARC SEGURANÇA E FLUXO CONTÍNUO</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
