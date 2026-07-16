export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  images?: string[]; // Additional pictures
  category: string;
  stock: number;
  sizeStock?: Record<string, number>; // Stock per size (e.g. {"P": 5, "M": 10})
  sizes?: string[]; // E.g. ['P', 'M', 'G', 'GG', 'XG']
  colors?: string[]; // E.g. ['Stealth Black', 'Cyber Gold', 'Obsidian Gray']
  salesCount?: number; // For analytics
  material?: string; // Tech specs
  tags?: string[]; // Custom badges like "Secagem rápida", "Camiseta mais leve"
  createdAt: any; // Firestore Timestamp or ISO String
  updatedAt: any;
}

export interface LogisticsLog {
  date: string;
  message: string;
  location?: string;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  totalPrice: number;
  createdAt: any;
  updatedAt: any;
  
  // High Performance Checkout Additions
  selectedSize?: string;
  selectedColor?: string;
  couponUsed?: string;
  couponDiscount?: number;
  paymentMethod?: 'pix' | 'credit_card' | 'boleto' | 'infinitepay';
  shippingMethod?: {
    name: string;
    price: number;
  };
  shippingAddress?: {
    cep: string;
    street: string;
    number: string;
    city: string;
    state: string;
  };
  
  // Logistics controls
  shippingCarrier?: string;
  trackingCode?: string;
  logisticsStatus?: 'dispatching' | 'shipped' | 'in_transit' | 'customs' | 'out_for_delivery' | 'delivered';
  estimatedDelivery?: string;
  logisticsNotes?: string;
  logisticsHistory?: LogisticsLog[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText?: string;
  buttonLink?: string;
  isActive: boolean;
  priority: number;
  createdAt: any;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  createdAt: string;
}

export interface ShippingCarrier {
  id: string;
  name: string;
  basePrice: number;
  deliveryTimeDays: number;
  isActive: boolean;
}

export interface StorePage {
  id: string;
  title: string;
  slug: string;
  content: string;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  heroTitle: string;
  heroSubtitle: string;
  themeColor: 'gold' | 'cyberpunk' | 'monochrome';
  pwaPromoEnabled: boolean;
  supportEmail: string;
  supportPhone: string;
  customPages?: StorePage[];
  pixKey?: string;
  pixQrCodeUrl?: string;
  pixCopyPaste?: string;
  showroomRedirectToWhatsApp?: boolean;
  showroomCustomMessage?: string;
  showroomShowPrice?: boolean;
  showroomShowStock?: boolean;
  showroomLayoutStyle?: 'grid' | 'carousel' | 'bento';
}

export const formatBRL = (val: number): string => {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
  return `R$ ${formatted}`;
};

