import { motion } from 'motion/react';
import { Product, formatBRL } from '../types';
import { Sparkles, Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  key?: any;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  // Format price beautifully in local currency Brazilian Real or USD
  const formatPrice = (value: number, currency: string) => {
    return formatBRL(value);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      id={`product-card-${product.id}`}
      onClick={() => onSelect(product)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-800 bg-gradient-to-b from-stone-900 to-[#111] p-4 transition-all duration-300 hover:border-yellow-500/40 hover:shadow-[0_15px_30px_rgba(234,179,8,0.06)] cursor-pointer"
    >
      {/* Radiant Ambient Backlight on Hover */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-yellow-500/0 via-yellow-500/0 to-yellow-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div>
        {/* Dynamic Image Wrapper */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-stone-950">
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-700 ease-out ${
              product.images && product.images.length > 0 ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105 group-hover:brightness-110'
            }`}
          />
          {product.images && product.images.length > 0 && (
            <img
              src={product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105 group-hover:brightness-110"
            />
          )}
          {/* Subtle Category Tag */}
          <div className="absolute top-3 left-3 rounded-md bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono tracking-widest text-amber-400 uppercase border border-yellow-500/20">
            {product.category}
          </div>
          
          {/* Stock state indicator */}
          {product.stock <= 2 && product.stock > 0 && (
            <div className="absolute bottom-3 right-3 rounded-md bg-red-950/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono tracking-wider text-red-400 border border-red-500/20 uppercase">
              Poucas unidades
            </div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-xs">
              <span className="rounded border border-amber-500/20 bg-stone-900 px-3 py-1 font-mono text-xs tracking-widest text-amber-400 uppercase">
                Indisponível
              </span>
            </div>
          )}
        </div>

        {/* Info Wrapper */}
        <div className="mt-4">
          <h3 className="font-serif text-lg font-medium text-stone-100 group-hover:text-amber-300 transition-colors duration-300 line-clamp-1">
            {product.name}
          </h3>
          <p className="mt-2 text-stone-400 text-xs leading-relaxed line-clamp-2 h-8 font-sans">
            {product.description}
          </p>

          {/* Tags list inside Card */}
          {product.tags && product.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1 overflow-hidden h-5">
              {product.tags.slice(0, 3).map((tag, tIdx) => (
                <span
                  key={tIdx}
                  className="rounded bg-stone-950 px-1.5 py-0.5 text-[8.5px] font-mono text-amber-500/80 border border-stone-850/80 hover:border-amber-500/25 transition-all text-ellipsis overflow-hidden whitespace-nowrap max-w-[120px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-800/60 flex items-center justify-between gap-2">
        {/* Product Price */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Valor Estimado</span>
          <span className="font-mono text-base font-bold text-amber-400">
            {formatPrice(product.price, product.currency)}
          </span>
        </div>

        {/* Bespoke Inquiry Action */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 font-mono text-xs font-semibold text-stone-900 shadow-sm transition-all hover:bg-gradient-to-r hover:from-amber-400 hover:to-yellow-500 hover:text-stone-950 hover:shadow-[0_4px_12px_rgba(234,179,8,0.2)] disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500"
          id={`btn-view-${product.id}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>VER DETALHES</span>
        </button>
      </div>
    </motion.div>
  );
}
