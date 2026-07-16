import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, formatBRL } from '../types';
import { X, ShoppingBag, Heart, Shield, RefreshCw, Zap, Flame, Award, Star, Sparkles, Calculator } from 'lucide-react';

interface ProductDetailDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, color: string) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
  onShowNotification?: (type: 'success' | 'error' | 'info' | 'loading', text: string) => void;
}

export default function ProductDetailDrawer({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
  onShowNotification
}: ProductDetailDrawerProps) {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isInfinitePayLoading, setIsInfinitePayLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews'>('details');
  const [displayedImage, setDisplayedImage] = useState<string | null>(null);

  // Reset states when current product changes
  React.useEffect(() => {
    if (product) {
      setDisplayedImage(product.imageUrl);
      setSelectedSize('');
      setSelectedColor('');
    }
  }, [product?.id]);

  // Provador Virtual / Fit Finder States
  const [showFitFinder, setShowFitFinder] = useState(false);
  const [fitHeight, setFitHeight] = useState<number>(175);
  const [fitWeight, setFitWeight] = useState<number>(75);
  const [fitPreference, setFitPreference] = useState<'justo' | 'normal' | 'solto'>('normal');
  const [calculatedSize, setCalculatedSize] = useState<string | null>(null);

  // Customer Reviews States
  const [localReviews, setLocalReviews] = useState<Record<string, Array<{ name: string; rating: number; comment: string; date: string }>>>({});
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');

  if (!product) return null;

  const activeImg = displayedImage && (product.imageUrl === displayedImage || product.images?.includes(displayedImage))
    ? displayedImage
    : product.imageUrl;

  // Defaults for sizes and colors if not specified
  const sizes = product.sizes || ['P', 'M', 'G', 'GG'];
  const colors = product.colors || ['Stealth Black', 'Cyber Gold', 'Obsidian Gray'];

  const handleAdd = () => {
    if (!selectedSize) {
      if (onShowNotification) {
        onShowNotification('error', "Selecione seu tamanho de alta performance.");
      } else {
        alert("Selecione seu tamanho de alta performance.");
      }
      return;
    }
    if (!selectedColor) {
      if (onShowNotification) {
        onShowNotification('error', "Selecione a tonalidade de elite desejada.");
      } else {
        alert("Selecione a tonalidade de elite desejada.");
      }
      return;
    }
    onAddToCart(product, selectedSize, selectedColor);
    onClose();
  };

  const handleInfinitePayCheckout = async () => {
    if (!selectedSize) {
      if (onShowNotification) {
        onShowNotification('error', "Selecione seu tamanho de alta performance.");
      } else {
        alert("Selecione seu tamanho de alta performance.");
      }
      return;
    }
    if (!selectedColor) {
      if (onShowNotification) {
        onShowNotification('error', "Selecione a tonalidade de elite desejada.");
      } else {
        alert("Selecione a tonalidade de elite desejada.");
      }
      return;
    }

    // Direct buy now: add to cart and close detail view (which automatically opens checkout drawer in App.tsx)
    onAddToCart(product, selectedSize, selectedColor);
    if (onShowNotification) {
      onShowNotification('success', `${product.name} adicionado! Abrindo faturamento...`);
    }
    onClose();
  };

  const formatPrice = (value: number, currency: string) => {
    return formatBRL(value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />

          {/* Sliding Drawer Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 220 }}
            id={`product-detail-drawer-${product.id}`}
            className="relative h-full w-full max-w-lg border-l border-stone-850 bg-[#0a0a0a] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto"
          >
            <div>
              {/* Header section with Close and Favorite */}
              <div className="flex items-center justify-between border-b border-stone-900 pb-4">
                <div>
                  <span className="font-mono text-[9px] tracking-[0.3em] text-yellow-400 uppercase font-black">
                    Alta Performance Esportiva
                  </span>
                  <h2 className="font-serif text-xl font-bold tracking-tight text-white uppercase mt-0.5">
                    Detalhe do Item
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Share/Favorite trigger */}
                  <button
                    onClick={() => onToggleFavorite(product.id)}
                    className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                      isFavorite 
                        ? 'border-red-500/30 bg-red-500/10 text-red-500' 
                        : 'border-stone-850 bg-stone-900/40 text-stone-400 hover:text-white'
                    }`}
                    title={isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                    id={`btn-fav-${product.id}`}
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={onClose}
                    className="rounded-xl border border-stone-850 bg-stone-900/40 p-2.5 text-stone-400 hover:text-white hover:border-stone-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Responsive Display Image & Quick Technology Labels */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-5 space-y-2">
                  <div className="aspect-square overflow-hidden rounded-2xl border border-stone-850 bg-stone-950 flex items-center justify-center">
                    <img
                      src={activeImg}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-all duration-300"
                    />
                  </div>
                  
                  {/* Additional thumbnail gallery list */}
                  {product.images && product.images.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {/* Main cover image thumb */}
                      <button
                        type="button"
                        onClick={() => setDisplayedImage(product.imageUrl)}
                        className={`relative h-10 w-10 rounded-lg overflow-hidden border flex-shrink-0 transition-all cursor-pointer ${
                          activeImg === product.imageUrl 
                            ? 'border-yellow-500 scale-102 ring-1 ring-yellow-500' 
                            : 'border-stone-850 hover:border-stone-600'
                        }`}
                      >
                        <img src={product.imageUrl} className="h-full w-full object-cover" alt="thumb-cover" referrerPolicy="no-referrer" />
                      </button>
                      {/* Gallery items thumbs */}
                      {product.images.map((imgUrl, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setDisplayedImage(imgUrl)}
                          className={`relative h-10 w-10 rounded-lg overflow-hidden border flex-shrink-0 transition-all cursor-pointer ${
                            activeImg === imgUrl 
                              ? 'border-yellow-500 scale-102 ring-1 ring-yellow-500' 
                              : 'border-stone-850 hover:border-stone-600'
                          }`}
                        >
                          <img src={imgUrl} className="h-full w-full object-cover" alt={`thumb-${index}`} referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-7 space-y-3">
                  <span className="inline-flex rounded-md bg-stone-900 px-2 py-0.5 font-mono text-[9px] tracking-wider text-amber-400 border border-yellow-500/10 uppercase">
                    {product.category}
                  </span>
                  <h3 className="font-serif text-lg font-black text-stone-100 uppercase leading-snug">
                    {product.name}
                  </h3>
                  <p className="font-mono text-xl font-bold text-yellow-500">
                    {formatPrice(product.price, product.currency)}
                  </p>

                  {/* Stock state dynamic badge */}
                  <div className="flex items-center gap-1.5 font-mono text-[9px] text-stone-400">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      selectedSize 
                        ? ((product.sizeStock?.[selectedSize] ?? 0) > 0 ? 'bg-emerald-500 animate-ping' : 'bg-red-500')
                        : (product.stock > 0 ? 'bg-emerald-500 animate-ping' : 'bg-red-500')
                    }`} />
                    <span className="uppercase">
                      {selectedSize ? (
                        (product.sizeStock?.[selectedSize] ?? 0) > 0
                          ? `Tamanho ${selectedSize}: ${product.sizeStock?.[selectedSize]} unidades`
                          : `Tamanho ${selectedSize} esgotado em nossa central`
                      ) : (
                        product.stock > 0 
                          ? `ESTOQUE DISPONÍVEL: ${product.stock} UNIDADES` 
                          : 'INDISPONÍVEL EM NOSSA CENTRAL'
                      )}
                    </span>
                  </div>
                </div>
              </div>              {/* Tabs: Description vs Technical Specs vs Customer Reviews */}
              <div className="mt-6 flex border-b border-stone-900 font-mono text-[10px] tracking-wider">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`border-b-2 px-4 py-2 uppercase font-bold transition-all ${
                    activeTab === 'details'
                      ? 'border-yellow-550 text-yellow-400'
                      : 'border-transparent text-stone-500 hover:text-stone-300'
                  }`}
                >
                  Descrição Geral
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`border-b-2 px-4 py-2 uppercase font-bold transition-all ${
                    activeTab === 'specs'
                      ? 'border-yellow-550 text-yellow-400'
                      : 'border-transparent text-stone-500 hover:text-stone-300'
                  }`}
                >
                  Ficha Tecnológica
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`border-b-2 px-4 py-2 uppercase font-bold transition-all flex items-center gap-1 ${
                    activeTab === 'reviews'
                      ? 'border-yellow-550 text-yellow-400'
                      : 'border-transparent text-stone-500 hover:text-stone-300'
                  }`}
                >
                  Avaliações ({3 + (localReviews[product.id]?.length || 0)})
                </button>
              </div>

              <div className="mt-4 text-xs leading-relaxed text-stone-400">
                {activeTab === 'details' ? (
                  <p className="font-sans font-light text-stone-305">
                    {product.description}
                  </p>
                ) : activeTab === 'specs' ? (
                  <div className="space-y-2.5 font-sans">
                    <div className="flex items-center justify-between border-b border-stone-900 pb-1.5">
                      <span className="text-stone-550 font-mono text-[9px] uppercase">Material</span>
                      <span className="text-stone-200 font-medium text-right text-[11px]">
                        {product.material || "Poliamida Tecnológica com Spandex Superior"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-stone-900 pb-1.5">
                      <span className="text-stone-550 font-mono text-[9px] uppercase">Tecnologia Têxtil</span>
                      <span className="text-amber-400 font-medium text-right flex items-center gap-1 text-[11px]">
                        <Zap className="w-3.5 h-3.5" /> Tri-Dri Termo-Reguladora
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-stone-900 pb-1.5">
                      <span className="text-stone-550 font-mono text-[9px] uppercase">Costura</span>
                      <span className="text-stone-200 font-medium text-right text-[11px]">Flatlock de Seção Chata (Anti-Atrito)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-550 font-mono text-[9px] uppercase">Certificações</span>
                      <span className="text-stone-200 font-medium text-right flex items-center gap-1 text-[11px]">
                        <Award className="w-3.5 h-3.5 text-yellow-450" /> Elite Sport Certified
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 font-sans">
                    {/* Score Summary Metrics */}
                    <div className="flex items-center gap-4 bg-stone-950 p-3 rounded-xl border border-stone-900">
                      <div className="text-center">
                        <span className="block text-2xl font-black text-white leading-none">4.9</span>
                        <span className="text-[8.5px] font-mono uppercase text-stone-500">De 5.0 estrelas</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-yellow-400 flex gap-0.5"><Star className="w-2.5 h-2.5 fill-current" /><Star className="w-2.5 h-2.5 fill-current" /><Star className="w-2.5 h-2.5 fill-current" /><Star className="w-2.5 h-2.5 fill-current" /><Star className="w-2.5 h-2.5 fill-current" /></span>
                          <span className="h-1 flex-1 bg-stone-900 rounded-full overflow-hidden">
                            <span className="block h-full bg-amber-400 rounded-full" style={{ width: '88%' }} />
                          </span>
                          <span className="font-mono text-[9.5px] text-stone-500">88%</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-yellow-400 flex gap-0.5"><Star className="w-2.5 h-2.5 fill-current" /><Star className="w-2.5 h-2.5 fill-current" /><Star className="w-2.5 h-2.5 fill-current" /><Star className="w-2.5 h-2.5 fill-current" /><Star className="w-2.5 h-2.5" /></span>
                          <span className="h-1 flex-1 bg-stone-900 rounded-full overflow-hidden">
                            <span className="block h-full bg-amber-400 rounded-full" style={{ width: '12%' }} />
                          </span>
                          <span className="font-mono text-[9.5px] text-stone-500">12%</span>
                        </div>
                      </div>
                    </div>

                    {/* Single Reviews List loop */}
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {[
                        { name: "Guilherme Santos", rating: 5, comment: "Mano, sem palavras pra essa camiseta. Peguei a Black Motion e o pano é diferenciado demais, veste muito bem e não fica subindo na hora de agachar. Curti muito!", date: "09/06/2026" },
                        { name: "Clara Menezes", rating: 5, comment: "Comprei a Black Edition pro crossfit e amei. Ela se ajusta super bem no corpo sem apertar muito, o tecido é bem levinho e seca super rápido. Ótima pro dia a dia do treino.", date: "05/06/2026" },
                        { name: "Thiago Ramos", rating: 5, comment: "Excelente qualidade. Comprei os dois modelos (a Black Motion e a Black Edition) e a costura é impecável. É difícil achar peça de treino que dure tanto tempo sem lacear toda.", date: "28/05/2026" },
                        ...(localReviews[product.id] || [])
                      ].map((rev, rIdx) => (
                        <div key={rIdx} className="p-2.5 rounded-lg border border-stone-900 bg-[#0e0e0e] space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-semibold text-stone-300">{rev.name}</span>
                            <span className="font-mono text-stone-600 text-[8.5px]">{rev.date}</span>
                          </div>
                          <div className="flex items-center gap-1 text-yellow-450">
                            {Array.from({ length: 5 }).map((_, sIdx) => (
                              <Star
                                key={sIdx}
                                className={`w-2.5 h-2.5 ${sIdx < rev.rating ? 'fill-current text-amber-450' : 'text-stone-800'}`}
                              />
                            ))}
                          </div>
                          <p className="text-[10.5px] text-stone-400 font-light leading-relaxed">{rev.comment}</p>
                        </div>
                      ))}
                    </div>

                    {/* Submit Review Form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newReviewName.trim() || !newReviewComment.trim()) {
                          alert("Preencha seu nome e o campo de comentário de atleta.");
                          return;
                        }
                        const newlyCreated = {
                          name: newReviewName,
                          rating: newReviewRating,
                          comment: newReviewComment,
                          date: new Date().toLocaleDateString('pt-BR')
                        };
                        const currentList = localReviews[product.id] || [];
                        setLocalReviews({
                          ...localReviews,
                          [product.id]: [newlyCreated, ...currentList]
                        });
                        setNewReviewName('');
                        setNewReviewComment('');
                        setNewReviewRating(5);
                      }}
                      className="border-t border-stone-900 pt-3 space-y-2"
                    >
                      <span className="block font-mono text-[9px] tracking-wider text-amber-500 uppercase font-bold">
                        Deixe sua Opinião Franca
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <input
                            type="text"
                            placeholder="Seu Nome Completo"
                            value={newReviewName}
                            onChange={(e) => setNewReviewName(e.target.value)}
                            className="w-full rounded-lg border border-stone-850 bg-stone-950 px-2.5 py-1 text-stone-200 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                          />
                        </div>
                        <div className="flex items-center justify-between bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-850">
                          <span className="text-stone-500 font-mono text-[8.5px]">Nota:</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, starIdx) => (
                              <button
                                key={starIdx}
                                type="button"
                                onClick={() => setNewReviewRating(starIdx + 1)}
                                className="text-yellow-450"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 cursor-pointer ${
                                    starIdx < newReviewRating ? 'fill-current' : 'text-stone-800'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <textarea
                          placeholder="Conte sua experiência com este modelo tech esportivo..."
                          rows={2}
                          value={newReviewComment}
                          onChange={(e) => setNewReviewComment(e.target.value)}
                          className="w-full rounded-lg border border-stone-850 bg-stone-950 px-2.5 py-1.5 text-[10.5px] text-stone-200 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 resize-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-mono text-2xs uppercase font-extrabold tracking-widest rounded-lg transition"
                      >
                        Enviar Avaliação de Performance
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Advanced Custom Tech Tags (Diferenciais / Qualidades) */}
              {product.tags && product.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-900">
                  <span className="block font-mono text-[9px] tracking-widest text-amber-500 uppercase font-bold mb-2">
                    🏷️ Qualidades e Tecnologias Integradas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] font-medium font-mono text-amber-300 tracking-wide"
                      >
                        <span className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Variation Selection (Sizes) */}
              <div className="mt-6 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="block font-mono text-[10px] tracking-wider text-stone-400 uppercase font-black">
                    Selecione seu Tamanho
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFitFinder(!showFitFinder)}
                    className="flex items-center gap-1 font-mono text-[9px] text-amber-400 uppercase tracking-wider hover:text-amber-300 transition cursor-pointer"
                  >
                    <Calculator className="w-3 h-3" /> Provador Virtual
                  </button>
                </div>

                {showFitFinder && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-amber-500/10 bg-stone-950 text-stone-300 space-y-3 font-sans"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-stone-900">
                      <span className="font-mono text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Calculadora de Medidas Inteligente
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowFitFinder(false);
                          setCalculatedSize(null);
                        }}
                        className="text-stone-500 hover:text-stone-300 text-[10px] uppercase font-mono"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-mono uppercase text-stone-500 mb-1">Altura (cm)</label>
                        <input
                          type="range"
                          min="150"
                          max="210"
                          value={fitHeight}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setFitHeight(val);
                            setCalculatedSize(null);
                          }}
                          className="w-full h-1 bg-stone-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <span className="font-mono text-[11px] font-bold text-stone-350 block mt-1">{fitHeight} cm</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono uppercase text-stone-500 mb-1">Peso (kg)</label>
                        <input
                          type="range"
                          min="45"
                          max="130"
                          value={fitWeight}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setFitWeight(val);
                            setCalculatedSize(null);
                          }}
                          className="w-full h-1 bg-stone-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <span className="font-mono text-[11px] font-bold text-stone-350 block mt-1">{fitWeight} kg</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono uppercase text-stone-500 mb-1">Preferência de Caimento</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['justo', 'normal', 'solto'] as const).map((pref) => (
                          <button
                            key={pref}
                            type="button"
                            onClick={() => {
                              setFitPreference(pref);
                              setCalculatedSize(null);
                            }}
                            className={`rounded-lg py-1 font-mono text-[9px] uppercase border font-bold transition-all ${
                              fitPreference === pref
                                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                                : 'bg-stone-900 text-stone-500 border-stone-850 hover:text-stone-300'
                            }`}
                          >
                            {pref}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        let w = fitWeight;
                        if (fitPreference === 'justo') w -= 5;
                        if (fitPreference === 'solto') w += 5;

                        if (fitHeight > 185) w -= 3;
                        if (fitHeight < 165) w += 3;

                        let recommended = 'M';
                        if (w < 61) recommended = 'P';
                        else if (w >= 61 && w < 76) recommended = 'M';
                        else if (w >= 76 && w < 90) recommended = 'G';
                        else recommended = 'GG';

                        setCalculatedSize(recommended);
                      }}
                      className="w-full py-1.5 bg-stone-900 hover:bg-stone-850 border border-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold rounded-lg tracking-wider transition-all"
                    >
                      Analisar Biotipo e Calcular Tamanho
                    </button>

                    {calculatedSize && (
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center space-y-1.5"
                      >
                        <p className="text-[11px] font-medium text-stone-200">
                          Recomendamos o tamanho <strong className="text-amber-400 font-mono text-xs">{calculatedSize}</strong> para você!
                        </p>
                        <p className="text-[9.5px] text-stone-400 leading-tight">
                          Garantia de 94.6% de satisfação no caimento baseada em respostas de outros atletas corporais.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSize(calculatedSize);
                            setShowFitFinder(false);
                            setCalculatedSize(null);
                          }}
                          className="px-4 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-mono text-[10px] uppercase font-bold rounded-md"
                        >
                          Aplicar recomendação
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(sizes)).map((sz, idx) => {
                    const szStock = product.sizeStock?.[sz];
                    const isOutOfStock = product.sizeStock !== undefined && szStock !== undefined ? szStock <= 0 : product.stock <= 0;
                    
                    return (
                      <button
                        key={`${sz}-${idx}`}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`relative h-11 min-w-14 rounded-lg font-mono text-xs font-bold transition-all border flex flex-col items-center justify-center p-1 cursor-pointer ${
                          selectedSize === sz
                            ? 'bg-yellow-500 border-yellow-500 text-stone-950 font-black scale-102 shadow-[0_3px_10px_rgba(234,179,8,0.15)] animate-pulse'
                            : isOutOfStock
                              ? 'bg-stone-950 text-stone-600 border-stone-900/60 opacity-40 cursor-not-allowed line-through'
                              : 'bg-stone-900/60 text-stone-300 border-stone-850 hover:border-stone-700 hover:text-white'
                        }`}
                        id={`size-${sz}`}
                        title={isOutOfStock ? `Tamanho ${sz} esgotado` : `Tamanho ${sz} disponível em estoque`}
                      >
                        <span>{sz}</span>
                        {szStock !== undefined && szStock > 0 && (
                          <span className={`text-[8.5px] font-mono mt-0.5 font-bold ${selectedSize === sz ? 'text-stone-950' : 'text-stone-500'}`}>
                            {szStock} un
                          </span>
                        )}
                        {szStock === 0 && (
                          <span className={`text-[8.5px] font-mono mt-0.5 font-black text-red-500`}>
                            0 un
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Variation Selection (Colors Swatch) */}
              <div className="mt-6 space-y-2.5">
                <span className="block font-mono text-[10px] tracking-wider text-stone-400 uppercase font-black">
                  Selecione a Tonalidade de Força
                </span>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(colors)).map((col, idx) => {
                    const isSelected = selectedColor === col;
                    return (
                      <button
                        key={`${col}-${idx}`}
                        onClick={() => setSelectedColor(col)}
                        className={`px-3 py-1.5 rounded-lg border font-mono text-2xs transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-gradient-to-r from-stone-900 to-[#121212] border-yellow-550 text-yellow-400 font-bold scale-102'
                            : 'bg-stone-900/30 text-stone-400 border-stone-850 hover:text-stone-200'
                        }`}
                        id={`color-${col}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${
                          col.toLowerCase().includes('black') ? 'bg-stone-950 border border-stone-800' :
                          col.toLowerCase().includes('gold') ? 'bg-amber-500' :
                          col.toLowerCase().includes('gray') || col.toLowerCase().includes('titan') ? 'bg-stone-400' :
                          col.toLowerCase().includes('white') ? 'bg-white' : 'bg-red-500'
                        }`} />
                        <span>{col}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Technical features showcase (Brand highlights) */}
              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-stone-900 bg-stone-950/40 p-3 text-center space-y-1">
                  <Flame className="w-4 h-4 text-orange-500 mx-auto animate-pulse" />
                  <span className="block font-mono text-[8.5px] uppercase text-stone-500">Termorregulação</span>
                  <p className="text-[9.5px] text-stone-400 font-sans leading-tight">Secagem 8x mais veloz</p>
                </div>
                <div className="rounded-xl border border-stone-900 bg-stone-950/40 p-3 text-center space-y-1">
                  <Zap className="w-4 h-4 text-yellow-400 mx-auto animate-pulse" />
                  <span className="block font-mono text-[8.5px] uppercase text-stone-500">Elasticidade</span>
                  <p className="text-[9.5px] text-stone-400 font-sans leading-tight">Suporte 4D sem limite</p>
                </div>
                <div className="rounded-xl border border-stone-900 bg-stone-950/40 p-3 text-center space-y-1">
                  <Shield className="w-4 h-4 text-amber-500 mx-auto animate-pulse" />
                  <span className="block font-mono text-[8.5px] uppercase text-stone-500">Durabilidade</span>
                  <p className="text-[9.5px] text-stone-400 font-sans leading-tight">Costura tripla de aço</p>
                </div>
              </div>
            </div>

            {/* Sticky/Fixed Bottom call to actions */}
            {(() => {
              const isSelectedSizeOutOfStock = selectedSize 
                ? (product.sizeStock?.[selectedSize] ?? 0) <= 0 
                : product.stock <= 0;

              return (
                <div className="mt-8 border-t border-stone-900 pt-5 space-y-3">
                  <button
                    onClick={handleAdd}
                    disabled={product.stock === 0 || isSelectedSizeOutOfStock || isInfinitePayLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 py-3.5 font-mono text-2xs font-extrabold text-stone-950 uppercase tracking-widest shadow-[0_4px_25px_rgba(234,179,8,0.15)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    id="btn-add-to-cart"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      {product.stock === 0 
                        ? 'Esgotado Completo' 
                        : isSelectedSizeOutOfStock 
                          ? 'Tamanho Selecionado Esgotado' 
                          : 'Incorporar ao Carrinho Elite'}
                    </span>
                  </button>

                  <button
                    onClick={handleInfinitePayCheckout}
                    disabled={product.stock === 0 || isSelectedSizeOutOfStock || isInfinitePayLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-900/60 py-3.5 font-mono text-2xs font-extrabold text-yellow-405 hover:text-yellow-300 hover:bg-stone-900 uppercase tracking-widest shadow-md hover:brightness-110 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    id="btn-buy-now"
                  >
                    {isInfinitePayLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-yellow-405" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                    )}
                    <span>
                      {isInfinitePayLoading 
                        ? 'Redirecionando...' 
                        : 'Comprar Agora'}
                    </span>
                  </button>

                  <p className="text-[9.5px] text-center text-stone-500 font-mono uppercase">
                    ⚡ Despacho ultrarrápido garantido pelo ecossistema TRIARC SaaS.
                  </p>
                </div>
              );
            })()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
