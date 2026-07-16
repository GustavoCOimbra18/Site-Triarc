import React, { useState, useRef, useEffect } from 'react';
import { Banner, StorePage, StoreSettings, formatBRL } from '../types';
import { uploadProductImage } from '../supabase';
import { supabase, rowToCamel, objectToSnake } from '../supabase';
import { INITIAL_PRODUCTS } from '../data/seed';

import { 
  Plus, Edit2, Trash2, Upload, Loader2, Sparkles, CheckCircle,
  PhoneCall, Activity, Image as ImageIcon, BarChart3, 
  Palette, Smartphone, Settings, X, RefreshCw
} from 'lucide-react';

interface AdminPanelProps {
  products: any[];
  orders: any[];
  banners: Banner[];
  onRefreshProducts: () => Promise<void>;
  onRefreshOrders: () => Promise<void>;
  onRefreshBanners: () => Promise<void>;
  isLoading: boolean;
  onShowNotification: (type: 'success' | 'error' | 'info' | 'loading', text: string) => void;
}

export default function AdminPanel({
  products = [],
  banners,
  onRefreshProducts,
  onRefreshBanners,
  isLoading,
  onShowNotification
}: AdminPanelProps) {

  // Navigation inside Admin - Analytics, Products, Layout, Showroom, Banner Images and Admins
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'customization' | 'banners' | 'showroom' | 'admins'>('analytics');

  // Real-time auxiliary settings and analytics counter states
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{ visits: number; whatsapp_clicks: number }>({ visits: 0, whatsapp_clicks: 0 });

  // Products form state
  const [isEditingProduct, setIsEditingProduct] = useState<string | null>(null);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Compressão',
    stock: '17',
    imageUrl: '',
    sizes: 'P, M, G, GG',
    colors: 'Noir Gold, Carbon Gray',
    tags: 'Alta compressão, Edição premium'
  });
  const [sizeStock, setSizeStock] = useState<Record<string, number>>({ "P": 2, "M": 10, "G": 5, "GG": 0 });

  // Additional product photos states
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [isUploadingAdditionalImage, setIsUploadingAdditionalImage] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState('');
  const additionalImageInputRef = useRef<HTMLInputElement>(null);

  // Banner form state
  const [isEditingBanner, setIsEditingBanner] = useState<string | null>(null);
  const [isUploadingBannerImage, setIsUploadingBannerImage] = useState(false);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    buttonText: 'SAIBA MAIS',
    buttonLink: '#catalog',
    priority: '1',
    isActive: true
  });

  // Admin Management states
  const [adminsList, setAdminsList] = useState<{ email: string; role: string; addedAt?: string }[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [deletingAdminEmail, setDeletingAdminEmail] = useState<string | null>(null);
  const [isAdminsLoading, setIsAdminsLoading] = useState(false);

  // Fetch admins list from Supabase
  const fetchAdmins = async () => {
    setIsAdminsLoading(true);
    try {
      const { data, error } = await supabase.from('admins').select('*').order('added_at', { ascending: true });
      if (error) throw error;
      setAdminsList((data || []).map(rowToCamel));
    } catch (e) {
      console.error("Erro ao carregar administradores:", e);
      onShowNotification('error', 'Falha ao carregar lista de administradores.');
    } finally {
      setIsAdminsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admins') {
      fetchAdmins();
    }
  }, [activeTab]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) {
      onShowNotification('error', 'Digite um e-mail válido.');
      return;
    }
    onShowNotification('loading', 'Autorizando conta no Supabase...');
    try {
      const { error } = await supabase.from('admins').upsert({
        email,
        role: newAdminRole,
        added_at: new Date().toISOString()
      });
      if (error) throw error;
      setNewAdminEmail('');
      onShowNotification('success', 'Conta de administrador autorizada no Supabase!');
      fetchAdmins();
    } catch (err) {
      console.error("Erro ao adicionar admin:", err);
      onShowNotification('error', 'Sem permissão para adicionar administradores.');
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    onShowNotification('loading', 'Revogando autorização...');
    try {
      const { error } = await supabase.from('admins').delete().eq('email', email);
      if (error) throw error;
      onShowNotification('success', 'Autorização de administrador revogada.');
      fetchAdmins();
    } catch (err) {
      console.error("Erro ao deletar admin:", err);
      onShowNotification('error', 'Não foi possível remover a autorização.');
    }
  };

  // Custom pages shape & form state
  const [newPageForm, setNewPageForm] = useState({ title: '', slug: '', content: '' });

  // Pix QR Code state helper
  const [isUploadingPixQrCode, setIsUploadingPixQrCode] = useState(false);
  const pixQrCodeInputRef = useRef<HTMLInputElement>(null);

  // Safe inline delete confirmations
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingBannerId, setDeletingBannerId] = useState<string | null>(null);

  // Helper to update settings fields safely even if database doc doesn't exist yet
  const updateSettingField = (key: keyof StoreSettings, val: any) => {
    setSettings(prev => {
      const base = prev || {
        id: 'triarc_config',
        storeName: 'TRIARC Store',
        heroTitle: 'ALTA PERFORMANCE & TECNOLOGIA',
        heroSubtitle: 'Vista a força física e a mentalidade de elite militar.',
        themeColor: 'gold',
        pwaPromoEnabled: true,
        supportEmail: 'triarcstore1@gmail.com',
        supportPhone: '+55 (18) 99703-4546',
        customPages: [],
        pixKey: '25.279.079/0001-65',
        pixQrCodeUrl: '',
        pixCopyPaste: '',
        showroomRedirectToWhatsApp: false,
        showroomCustomMessage: 'Olá! Vi o produto *{productName}* de *{productPrice}* no seu showroom e gostaria de encomendar.',
        showroomShowPrice: true,
        showroomShowStock: true,
        showroomLayoutStyle: 'grid'
      };
      return { ...base, [key]: val };
    });
  };

  // Sync state data in real-time
  useEffect(() => {
    const loadSettings = async () => {
      const { data, error } = await supabase.from('store_settings').select('*').eq('id', 'main').maybeSingle();
      if (error) { console.warn("SaaS settings listener pending: ", error); return; }
      if (data) setSettings(rowToCamel<StoreSettings>(data));
    };
    const loadAnalytics = async () => {
      const { data, error } = await supabase.from('analytics').select('visits, whatsapp_clicks').eq('id', 'main').maybeSingle();
      if (error) { console.warn("Analytics listener pending: ", error); return; }
      if (data) setAnalyticsData({ visits: data.visits || 0, whatsapp_clicks: data.whatsapp_clicks || 0 });
    };

    loadSettings();
    loadAnalytics();

    const channel = supabase
      .channel('admin-settings-analytics-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, loadSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics' }, loadAnalytics)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ------------------ IMAGE UPLOADING UTILITIES ------------------
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>, target: 'banner' | 'pix_qrcode') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'banner') {
      setIsUploadingBannerImage(true);
    } else {
      setIsUploadingPixQrCode(true);
    }
    
    onShowNotification('loading', "Transferindo imagem para armazenamento global...");

    try {
      const url = await uploadProductImage(file);
      if (target === 'banner') {
        setBannerForm(prev => ({ ...prev, imageUrl: url }));
        onShowNotification('success', "Foto carregada no banner com sucesso!");
      } else {
        updateSettingField('pixQrCodeUrl', url);
        onShowNotification('success', "QR Code do Pix carregado com sucesso!");
      }
    } catch {
      onShowNotification('error', "Erro no upload da imagem para o CDN.");
    } finally {
      setIsUploadingBannerImage(false);
      setIsUploadingPixQrCode(false);
    }
  };

  // ------------------ BANNERS FUNCTIONS ------------------
  const handleLoadEditBanner = (bn: Banner) => {
    setIsEditingBanner(bn.id);
    setBannerForm({
      title: bn.title,
      subtitle: bn.subtitle || '',
      imageUrl: bn.imageUrl,
      buttonText: bn.buttonText || 'SAIBA MAIS',
      buttonLink: bn.buttonLink || '#catalog',
      priority: bn.priority ? bn.priority.toString() : '1',
      isActive: bn.isActive ?? true
    });
    document.getElementById('banner-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetBannerForm = () => {
    setIsEditingBanner(null);
    setBannerForm({
      title: '',
      subtitle: '',
      imageUrl: '',
      buttonText: 'SAIBA MAIS',
      buttonLink: '#catalog',
      priority: '1',
      isActive: true
    });
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title || !bannerForm.imageUrl) {
      onShowNotification('error', "Por favor insira um título e faça o upload de uma imagem.");
      return;
    }

    onShowNotification('loading', "Gravando slide publicitário...");
    try {
      const bId = isEditingBanner || "banner_" + Math.random().toString(36).substring(2, 9);

      const payload = {
        id: bId,
        title: bannerForm.title,
        subtitle: bannerForm.subtitle || '',
        imageUrl: bannerForm.imageUrl,
        buttonText: bannerForm.buttonText,
        buttonLink: bannerForm.buttonLink || '#catalog',
        isActive: bannerForm.isActive,
        priority: parseInt(bannerForm.priority) || 1,
        createdAt: new Date().toISOString()
      };

      const { error } = await supabase.from('banners').upsert(objectToSnake(payload));
      if (error) throw error;
      onShowNotification('success', "Slide rotativo gravado com sucesso!");
      resetBannerForm();
      await onRefreshBanners();
    } catch {
      onShowNotification('error', "Falha ao gravar informações do Banner.");
    }
  };

  const handleToggleBannerActive = async (bn: Banner) => {
    onShowNotification('loading', "Modificando visibilidade...");
    try {
      const { error } = await supabase.from('banners').update({ is_active: !bn.isActive }).eq('id', bn.id);
      if (error) throw error;
      onShowNotification('success', "Situação de exibição modificada.");
      await onRefreshBanners();
    } catch {
      onShowNotification('error', "Falha ao alterar banner.");
    }
  };

  const handleDeleteBanner = async (id: string) => {
    onShowNotification('loading', "Retirando imagem do banco...");
    try {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
      onShowNotification('success', "Banner rotativo deletado.");
      await onRefreshBanners();
    } catch (err: any) {
      console.error("Error deleting banner:", err);
      onShowNotification('error', `Instabilidade ao demover banner: ${err?.message || err}`);
    }
  };

  const handleSeedDefaultBanners = async () => {
    onShowNotification('loading', "Injetando banners premium de demonstração...");
    try {
      const defaults = [
        {
          id: 'def-b1',
          title: 'TRIARC | PERFORMANCE INABALÁVEL',
          subtitle: 'Desenvolvida para atletas que treinam além do limite.',
          imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1600&auto=format&fit=crop&q=80',
          buttonText: 'EXPLORAR COLEÇÃO',
          buttonLink: '#produtos',
          isActive: true,
          priority: 1
        },
        {
          id: 'def-b2',
          title: 'TECNOLOGIA EM MOVIMENTO',
          subtitle: 'Compressão inteligente e mobilidade absoluta para alta performance.',
          imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1600&auto=format&fit=crop&q=80',
          buttonText: 'CONHECER MOSTRUÁRIO',
          buttonLink: '#produtos',
          isActive: true,
          priority: 2
        }
      ];

      for (const b of defaults) {
        const { error } = await supabase.from('banners').upsert(objectToSnake({
          ...b,
          createdAt: new Date().toISOString()
        }));
        if (error) throw error;
      }
      onShowNotification('success', "Banners padrões implantados!");
      await onRefreshBanners();
    } catch {
      onShowNotification('error', "Erro ao implantar banners.");
    }
  };

  const handleSeedDefaultProducts = async () => {
    onShowNotification('loading', "Injetando produtos de elite no catálogo...");
    try {
      for (const p of INITIAL_PRODUCTS) {
        const { error } = await supabase.from('products').upsert(objectToSnake({
          ...p,
          updatedAt: new Date().toISOString()
        }));
        if (error) throw error;
      }
      onShowNotification('success', "Produtos padrões da TRIARC implantados com sucesso!");
      if (onRefreshProducts) {
        await onRefreshProducts();
      }
    } catch (err: any) {
      console.error("Erro ao injetar produtos:", err);
      onShowNotification('error', `Falha ao implantar produtos: ${err?.message || err}`);
    }
  };

  // ------------------ PRODUCTS FUNCTIONS ------------------
  const handleLoadEditProduct = (prod: any) => {
    setIsEditingProduct(prod.id);
    setProductForm({
      name: prod.name || '',
      description: prod.description || '',
      price: prod.price ? prod.price.toString() : '0',
      category: prod.category || 'Compressão',
      stock: prod.stock ? prod.stock.toString() : '17',
      imageUrl: prod.imageUrl || '',
      sizes: prod.sizes ? prod.sizes.join(', ') : 'P, M, G, GG',
      colors: prod.colors ? prod.colors.join(', ') : 'Noir Gold, Carbon Gray',
      tags: prod.tags ? prod.tags.join(', ') : 'Alta compressão, Edição premium'
    });

    if (prod.images) {
      setAdditionalImages(prod.images);
    } else {
      setAdditionalImages([]);
    }

    if (prod.sizeStock) {
      setSizeStock(prod.sizeStock);
    } else {
      const defaultStock: Record<string, number> = {};
      const activeSizes = prod.sizes || ['P', 'M', 'G', 'GG'];
      activeSizes.forEach((sz: string) => {
        defaultStock[sz] = 15;
      });
      setSizeStock(defaultStock);
    }

    document.getElementById('product-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetProductForm = () => {
    setIsEditingProduct(null);
    setAdditionalImages([]);
    setProductForm({
      name: '',
      description: '',
      price: '',
      category: 'Compressão',
      stock: '17',
      imageUrl: '',
      sizes: 'P, M, G, GG',
      colors: 'Noir Gold, Carbon Gray',
      tags: 'Alta compressão, Edição premium'
    });
    setSizeStock({ "P": 2, "M": 10, "G": 5, "GG": 0 });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.imageUrl) {
      onShowNotification('error', "Insira no mínimo o nome e uma foto do produto.");
      return;
    }

    onShowNotification('loading', "Salvando informações do produto no mostruário...");
    try {
      const pId = isEditingProduct || "triarc_prod_" + Math.random().toString(36).substring(2, 9);

      const sizesArr = productForm.sizes.split(',').map(s => s.trim()).filter(Boolean);
      const colorsArr = productForm.colors.split(',').map(c => c.trim()).filter(Boolean);
      const tagsArr = productForm.tags.split(',').map(t => t.trim()).filter(Boolean);

      // Construct a clean sizes stock record
      const finalSizeStock: Record<string, number> = {};
      sizesArr.forEach(sz => {
        finalSizeStock[sz] = typeof sizeStock[sz] === 'number' ? sizeStock[sz] : 15;
      });

      // Compute total stock sum across all sizes
      const computedTotalStock = Object.values(finalSizeStock).reduce((sum, val) => sum + val, 0);

      const payload = {
        id: pId,
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price) || 0,
        currency: 'BRL',
        imageUrl: productForm.imageUrl.trim(),
        images: additionalImages,
        category: productForm.category,
        stock: computedTotalStock,
        sizeStock: finalSizeStock,
        sizes: sizesArr,
        colors: colorsArr,
        tags: tagsArr,
        updatedAt: new Date().toISOString(),
        createdAt: isEditingProduct ? undefined : new Date().toISOString()
      };

      // Clean up undefined properties before sending
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== undefined)
      );

      const { error } = await supabase.from('products').upsert(objectToSnake(cleanPayload));
      if (error) throw error;
      onShowNotification('success', "Produto salvo e integrado com sucesso!");
      resetProductForm();
      if (onRefreshProducts) {
        await onRefreshProducts();
      }
    } catch (err: any) {
      console.error("Error saving product:", err);
      onShowNotification('error', `Falha ao gravar informações do Produto: ${err?.message || err}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    onShowNotification('loading', "Deletando produto do estoque virtual...");
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      onShowNotification('success', "Produto deletado com sucesso!");
      if (onRefreshProducts) {
        await onRefreshProducts();
      }
    } catch (err: any) {
      console.error("Error deleting product:", err);
      onShowNotification('error', `Falha ao demover produto: ${err?.message || err}`);
    }
  };

  const handleProductPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProductImage(true);
    onShowNotification('loading', "Enviando foto do produto para o servidor CDN...");

    try {
      const url = await uploadProductImage(file);
      setProductForm(prev => ({ ...prev, imageUrl: url }));
      onShowNotification('success', "Foto do produto enviada com sucesso!");
    } catch {
      onShowNotification('error', "Falha no envio da imagem do produto.");
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleMultiplePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAdditionalImage(true);
    onShowNotification('loading', "Enviando foto adicional para a galeria...");

    try {
      const url = await uploadProductImage(file);
      setAdditionalImages(prev => [...prev, url]);
      onShowNotification('success', "Foto enviada e adicionada à galeria!");
    } catch {
      onShowNotification('error', "Falha no envio da imagem adicional.");
    } finally {
      setIsUploadingAdditionalImage(false);
    }
  };

  const handleAddAdditionalImageByUrl = () => {
    const url = newUrlInput.trim();
    if (!url) return;
    setAdditionalImages(prev => [...prev, url]);
    setNewUrlInput('');
    onShowNotification('success', "Link de imagem adicionado à galeria!");
  };

  // ------------------ STORE SETTINGS BRADING ------------------
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    onShowNotification('loading', "Confirmando identidade do site...");
    try {
      const payload: StoreSettings = {
        id: 'triarc_config',
        storeName: settings?.storeName || 'TRIARC Store',
        heroTitle: settings?.heroTitle || 'ALTA PERFORMANCE & TECNOLOGIA',
        heroSubtitle: settings?.heroSubtitle || 'Vista a força física e a mentalidade de elite militar.',
        themeColor: settings?.themeColor || 'gold',
        pwaPromoEnabled: settings?.pwaPromoEnabled ?? true,
        supportEmail: settings?.supportEmail || 'triarcstore1@gmail.com',
        supportPhone: settings?.supportPhone || '+55 (18) 99703-4546',
        customPages: settings?.customPages || [],
        pixKey: settings?.pixKey || '25.279.079/0001-65',
        pixQrCodeUrl: settings?.pixQrCodeUrl || '',
        pixCopyPaste: settings?.pixCopyPaste || '',
        showroomRedirectToWhatsApp: settings?.showroomRedirectToWhatsApp ?? false,
        showroomCustomMessage: settings?.showroomCustomMessage ?? 'Olá! Vi o produto *{productName}* de *{productPrice}* no seu showroom e gostaria de encomendar.',
        showroomShowPrice: settings?.showroomShowPrice ?? true,
        showroomShowStock: settings?.showroomShowStock ?? true,
        showroomLayoutStyle: settings?.showroomLayoutStyle ?? 'grid'
      };

      const { error } = await supabase.from('store_settings').upsert(objectToSnake({ ...payload, id: 'main' }));
      if (error) throw error;
      onShowNotification('success', "Informações do site salvas em tempo real!");
    } catch (err: any) {
      console.error("Save settings error:", err);
      onShowNotification('error', `Falha ao gravar as configurações: ${err?.message || err}`);
    }
  };

  // ------------------ CUSTOM FOOTER PAGES ------------------
  const handleAddCustomPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageForm.title || !newPageForm.content) return;

    onShowNotification('loading', "Criando página suplementar...");
    try {
      const slug = newPageForm.slug.trim().toLowerCase().replace(/\s+/g, '-') || newPageForm.title.trim().toLowerCase().replace(/\s+/g, '-');
      const pageId = "page_" + Math.random().toString(36).substring(2, 8);
      
      const newPage: StorePage = {
        id: pageId,
        title: newPageForm.title.trim(),
        slug,
        content: newPageForm.content
      };

      const updatedPages = [...(settings?.customPages || []), newPage];
      
      const updatedPayload = {
        ...settings,
        id: 'main',
        customPages: updatedPages
      };

      const { error } = await supabase.from('store_settings').upsert(objectToSnake(updatedPayload));
      if (error) throw error;
      onShowNotification('success', `Página "${newPage.title}" anexada ao rodapé!`);
      setNewPageForm({ title: '', slug: '', content: '' });
    } catch {
      onShowNotification('error', "Erro ao salvar página.");
    }
  };

  const handleDeleteCustomPage = async (id: string) => {
    if (!settings) return;
    onShowNotification('loading', "Removendo página...");
    try {
      const filtered = (settings.customPages || []).filter(p => p.id !== id);
      const { error } = await supabase.from('store_settings').update({ custom_pages: filtered }).eq('id', 'main');
      if (error) throw error;
      onShowNotification('success', "Página removida.");
    } catch {
      onShowNotification('error', "Instabilidade ao remover.");
    }
  };

  return (
    <div className="space-y-8 rounded-2xl border border-stone-850 bg-[#0c0c0c] p-5 sm:p-7" id="admin-luxury-core">
      
      {/* ----------------- SUBHEADER BRAND TITLE ----------------- */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-stone-900 pb-5 gap-4">
        <div className="text-left">
          <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-mono tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TRIARC Painel de Controle</span>
          </div>
          <h2 className="font-serif text-2xl font-light text-stone-100 mt-1">Console Simplificado</h2>
          <p className="text-[10px] text-stone-500 font-mono tracking-wider uppercase mt-1">
            Métricas de tráfego, banners, contatos e customização visual da landing page.
          </p>
        </div>

        {/* Simplified Tabs Navigation Menu */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-stone-950 p-1 border border-stone-900 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`rounded px-4 py-2 text-xs font-mono font-medium tracking-wider transition whitespace-nowrap ${
              activeTab === 'analytics' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            📊 MÉTRICAS DO SITE
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`rounded px-4 py-2 text-xs font-mono font-medium tracking-wider transition whitespace-nowrap ${
              activeTab === 'products' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            🛍️ GERENCIAR PRODUTOS
          </button>

          <button
            onClick={() => setActiveTab('customization')}
            className={`rounded px-4 py-2 text-xs font-mono font-medium tracking-wider transition whitespace-nowrap ${
              activeTab === 'customization' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            🎨 CUSTOMIZAR LAYOUT
          </button>

          <button
            onClick={() => setActiveTab('banners')}
            className={`rounded px-4 py-2 text-xs font-mono font-medium tracking-wider transition whitespace-nowrap ${
              activeTab === 'banners' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            📸 CARROSSEL & BANNERS
          </button>

          <button
            onClick={() => setActiveTab('showroom')}
            className={`rounded px-4 py-2 text-xs font-mono font-medium tracking-wider transition whitespace-nowrap ${
              activeTab === 'showroom' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            🏛️ CUSTOMIZAR SHOWROOM
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            className={`rounded px-4 py-2 text-xs font-mono font-medium tracking-wider transition whitespace-nowrap ${
              activeTab === 'admins' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            🔑 ADMINISTRADORES
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. ANALYTICS METRICS DISPLAY                         */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="rounded-xl border border-stone-850 bg-[#111] p-5 flex items-center gap-4">
              <div className="rounded-lg bg-indigo-500/10 text-indigo-300 p-3 border border-indigo-500/20">
                <Smartphone className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="block text-[9px] font-mono uppercase tracking-wider text-stone-500">Acessos Únicos ao Site</span>
                <span className="text-2xl font-serif text-indigo-200 font-bold">{analyticsData.visits}</span>
              </div>
            </div>

            <div className="rounded-xl border border-stone-850 bg-[#111] p-5 flex items-center gap-4">
              <div className="rounded-lg bg-emerald-500/10 text-emerald-300 p-3 border border-emerald-500/20">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[9px] font-mono uppercase tracking-wider text-stone-500">Cliques no WhatsApp</span>
                <span className="text-2xl font-serif text-emerald-300 font-bold">{analyticsData.whatsapp_clicks}</span>
              </div>
            </div>

            <div className="rounded-xl border border-stone-850 bg-[#111] p-5 flex items-center gap-4">
              <div className="rounded-lg bg-amber-500/10 text-amber-300 p-3 border border-amber-500/20">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="block text-[9px] font-mono uppercase tracking-wider text-stone-500">Conversão de Atendimento</span>
                <span className="text-2xl font-serif text-amber-300 font-bold">
                  {analyticsData.visits > 0
                    ? ((analyticsData.whatsapp_clicks / analyticsData.visits) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
            </div>

          </div>

          <div className="rounded-xl border border-stone-900 bg-stone-950/60 p-6 space-y-3">
            <h4 className="font-serif text-base text-stone-200">Visão Geral dos Indicadores de Performance</h4>
            <p className="text-xs text-stone-400 font-sans leading-relaxed">
              Estes números ajudam você a mensurar a performance da sua landing page. 
              Toda vez que um visitante diferente abre o site, o número de <strong>Acessos Únicos</strong> aumenta. 
              Quando as pessoas se interessam pela sua consultoria ou pelo estoque ativo e clicam nos botões rápidos de atendimento integrado, o número de <strong>Cliques no WhatsApp</strong> é gravado automaticamente, fornecendo taxas analíticas em tempo real.
            </p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 1.5 GERENCIAR PRODUTOS (DO QUE ESTA NO CATALOGO)   */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Left Panel - Product Form */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-6" id="product-form-anchor">
            <div>
              <span className="font-mono text-[9px] tracking-widest text-[#a3a3a3] uppercase mb-1 block">
                {isEditingProduct ? `Editando Produto: ${isEditingProduct}` : "Novo Item do Estoque"}
              </span>
              <h3 className="font-serif text-xl font-light text-stone-100">
                {isEditingProduct ? "Editar Produto" : "Adicionar Produto"}
              </h3>
              <p className="text-xs text-stone-500">Adicione ou edite produtos do catálogo de alta compressão e lifestyle premium.</p>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold font-bold">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ex: T-Shirt Premium Triarc Pro Tech"
                  className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3.5 py-2 text-stone-100 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold font-bold">Descrição do Produto</label>
                <textarea
                  required
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Descreva detalhes como caimento, respirabilidade colmeia, toque térmico, etc."
                  className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3.5 py-2 text-stone-150 focus:outline-none focus:border-yellow-500 leading-relaxed"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold font-bold">Preço (R$) *</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="189"
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 font-mono text-stone-100 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold font-bold">Categoria</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-2 py-1.5 text-stone-300 font-mono focus:outline-none focus:border-yellow-500"
                  >
                    <option value="Compressão">Compressão</option>
                    <option value="Camisetas">Camisetas</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-[#d4af37] uppercase mb-1 font-semibold font-bold">Estoque Total</label>
                  <input
                    type="number"
                    disabled
                    value={productForm.sizes.split(',').map(s => s.trim()).filter(Boolean).reduce((sum, sz) => sum + (sizeStock[sz] ?? 0), 0)}
                    className="w-full rounded-lg border border-stone-850 bg-stone-900/40 px-3 py-1.5 font-mono text-stone-400 cursor-not-allowed outline-none select-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold font-bold">Tamanhos (Separados por vírgula)</label>
                  <input
                    type="text"
                    value={productForm.sizes}
                    onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                    placeholder="P, M, G, GG"
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 text-stone-200 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold font-bold">Cores (Separadas por vírgula)</label>
                  <input
                    type="text"
                    value={productForm.colors}
                    onChange={(e) => setProductForm({ ...productForm, colors: e.target.value })}
                    placeholder="Noir Gold, Carbon Gray"
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 text-stone-200 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Dynamic stock per size configuration inputs block */}
              <div className="rounded-xl border border-stone-900 bg-stone-950/40 p-4 space-y-2.5">
                <span className="block font-mono text-[10px] text-amber-500 font-bold uppercase tracking-wider">📦 QUANTIDADE EM ESTOQUE POR TAMANHO</span>
                <p className="text-[10px] text-stone-500 leading-normal">Defina a quantidade de peças disponíveis para cada um dos tamanhos especificados:</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {Array.from(new Set(productForm.sizes.split(',').map(s => s.trim()).filter(Boolean))).map((sz, idx) => (
                    <div key={`${sz}-${idx}`} className="rounded-lg border border-stone-900 bg-[#0d0d0d] p-2 space-y-1 text-center">
                      <span className="block font-mono text-[11px] text-[#d4af37] font-black">{sz}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={sizeStock[sz] ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setSizeStock(prev => ({ ...prev, [sz as string]: val }));
                        }}
                        className="w-full rounded bg-black border border-stone-850 text-center text-[11px] px-1 py-1 font-mono text-stone-200 focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold font-bold">Tags / Diferenciais (Separadas por vírgula)</label>
                <input
                  type="text"
                  value={productForm.tags}
                  onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })}
                  placeholder="Secagem rápida, Tecido importado"
                  className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3.5 py-2 text-stone-200 focus:outline-none"
                />
              </div>

              {/* Product Image upload */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1.5 font-bold">Foto do Produto</label>
                <div
                  onClick={() => productImageInputRef.current?.click()}
                  className="group/bnu border border-dashed border-stone-800 hover:border-yellow-500/40 bg-stone-950 rounded-xl px-4 py-5 text-center cursor-pointer transition-all duration-300"
                >
                  <input
                    type="file"
                    ref={productImageInputRef}
                    onChange={handleProductPhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {isUploadingProductImage ? (
                    <div className="flex flex-col items-center justify-center space-y-2 py-2">
                       <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                       <span className="text-2xs font-mono text-stone-400">Enviando foto para armazenamento...</span>
                    </div>
                  ) : productForm.imageUrl ? (
                    <div className="flex flex-col items-center space-y-1.5">
                      <img src={productForm.imageUrl} className="h-24 w-20 object-cover rounded-lg border border-stone-850 shadow-md animate-fade-in" alt="product-preview" referrerPolicy="no-referrer" />
                      <span className="text-[9px] font-mono text-green-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Foto carregada com sucesso
                      </span>
                    </div>
                  ) : (
                    <div className="py-2 flex flex-col items-center justify-center space-y-1.5">
                      <Upload className="w-6 h-6 text-stone-700 group-hover/bnu:text-yellow-500 transition duration-300" />
                      <span className="text-2xs text-stone-400 font-sans">Carregar Imagem do Produto</span>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <span className="text-[9px] font-mono text-stone-500 block uppercase mb-1">Ou informe link manual alternativo:</span>
                  <input
                    type="url"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 text-[11px] text-stone-100 placeholder-stone-800 font-mono focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Fotos Adicionais (Galeria de Imagens) */}
              <div className="border border-stone-900 bg-stone-950/20 p-4 rounded-xl space-y-3.5">
                <div>
                  <h4 className="text-[10px] font-mono tracking-widest text-[#d4af37] uppercase font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" /> Fotos Adicionais (Galeria)
                  </h4>
                  <p className="text-[10px] text-stone-400 font-sans leading-relaxed mt-1">
                    Adicione mais fotos para exibir no carrossel de detalhes do produto. Recomendamos até 3 a 5 fotos adicionais de ângulos complementares.
                  </p>
                </div>

                {/* List of current additional images */}
                {additionalImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 border border-stone-900 p-2 rounded-lg bg-stone-950/40">
                    {additionalImages.map((imgUrl, index) => (
                      <div key={index} className="relative aspect-square border border-stone-850 rounded-lg overflow-hidden bg-stone-900 group">
                        <img src={imgUrl} className="h-full w-full object-cover" alt={`gallery-${index}`} referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setAdditionalImages(prev => prev.filter((_, idx) => idx !== index))}
                          className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-lg transition-all scale-90"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-mono text-stone-400">
                          #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form to append image */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[9px] font-mono text-stone-500 uppercase mb-1">Upload de Foto Extra</label>
                    <div
                      onClick={() => additionalImageInputRef.current?.click()}
                      className="border border-dashed border-stone-850 hover:border-yellow-500/40 bg-stone-950 rounded-lg py-2.5 text-center cursor-pointer transition-all duration-300"
                    >
                      <input
                        type="file"
                        ref={additionalImageInputRef}
                        onChange={handleMultiplePhotoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      {isUploadingAdditionalImage ? (
                        <div className="flex items-center justify-center gap-1.5 py-1">
                          <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
                          <span className="text-[10px] font-mono text-stone-400 animate-pulse">Enviando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 py-1 text-stone-400 hover:text-white transition">
                          <Plus className="w-3.5 h-3.5 text-stone-500" />
                          <span className="text-2xs font-sans">Carregar arquivo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-stone-500 uppercase mb-1">Adicionar por Link (URL)</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newUrlInput}
                        onChange={(e) => setNewUrlInput(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 rounded-lg border border-stone-850 bg-stone-950 px-2.5 py-1.5 text-[11px] text-stone-100 placeholder-stone-800 font-mono focus:outline-none focus:border-yellow-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddAdditionalImageByUrl}
                        className="bg-yellow-500 hover:bg-yellow-400 text-[#0a0a0a] font-mono font-black text-[10px] px-3.5 py-1.5 rounded-lg transition"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-yellow-550 via-amber-400 to-yellow-500 text-[#0a0a0a] font-mono text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-98 transition text-center"
                >
                  {isEditingProduct ? "Gravar Alterações" : "Adicionar ao Catálogo"}
                </button>
                {isEditingProduct && (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="px-4 py-2 border border-stone-800 hover:border-stone-700 bg-[#121212] rounded-lg text-stone-400 hover:text-white font-mono text-2xs uppercase font-semibold"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right Panel - Active Products list */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="font-mono text-[9px] text-[#f5a623] uppercase block font-bold font-black">Produtos no Catálogo</span>
                <h3 className="font-serif text-lg font-light text-stone-100 mt-0.5">Estoque de Produtos Atuais ({products.length})</h3>
                <p className="text-xs text-stone-500">Esses produtos aparecem em tempo real no mostruário principal da sua landing page.</p>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-850 py-20 text-center text-stone-500 bg-[#0b0b0b]/60">
                <p className="text-xs font-mono uppercase font-bold text-stone-400">Nenhum produto cadastrado</p>
                <p className="text-[10px] text-stone-605 mt-1">Insira um produto novo no formulário ao lado para começar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((prod) => (
                  <div key={prod.id} className="group/bncv rounded-2xl border border-stone-900 bg-stone-950/40 overflow-hidden text-left flex flex-col justify-between">
                    <div>
                      <div className="aspect-[16/10] w-full relative bg-stone-900">
                        <img 
                          src={prod.imageUrl || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80"} 
                          alt={prod.name} 
                          className="h-full w-full object-cover brightness-75 group-hover/bncv:scale-[1.02] duration-500 transition" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                          <span className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 rounded font-mono text-[8px] px-1.5 py-0.5 uppercase tracking-widest self-start mb-2.5 font-bold">
                            {prod.category}
                          </span>
                          <h4 className="font-sans text-xs font-bold text-stone-100 max-w-full truncate">{prod.name}</h4>
                          <p className="text-[10px] text-[#d4af37] font-bold font-mono">{formatBRL(prod.price)}</p>
                        </div>
                      </div>
                      <div className="p-3 text-[10px] text-stone-400 space-y-1">
                        <p className="line-clamp-2">{prod.description}</p>
                        <div className="flex flex-wrap gap-1 pt-1 text-[8px] font-mono">
                          {prod.sizes?.map((s: string, idx: number) => {
                            const sc = prod.sizeStock && typeof prod.sizeStock[s] === 'number' ? prod.sizeStock[s] : 15;
                            return (
                              <span key={`${s}-${idx}`} className={`px-1 rounded border ${sc > 0 ? 'bg-stone-900 border-stone-850 text-stone-300' : 'bg-red-950/20 border-red-900/30 text-red-400'}`}>
                                {s}: {sc}
                              </span>
                            );
                          })}
                          {prod.colors?.map((c: string, idx: number) => (
                            <span key={`${c}-${idx}`} className="bg-stone-900 px-1 py-0.5 rounded text-stone-500">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-stone-900/60 flex items-center justify-between text-[11px] font-mono select-none bg-stone-950 text-stone-300">
                      <span className="text-[10px] text-stone-500 font-bold uppercase font-mono">
                        Qtd: {prod.stock || 0} un
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleLoadEditProduct(prod)}
                          className="p-1.5 rounded-lg border border-stone-850 bg-stone-900 hover:border-stone-700 text-stone-300 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {deletingProductId === prod.id ? (
                          <div className="flex items-center gap-1.5 bg-red-950/20 border border-red-500/20 p-1 rounded-lg">
                            <span className="text-[9px] text-red-400 font-bold font-sans">Excluir?</span>
                            <button
                              onClick={() => {
                                handleDeleteProduct(prod.id);
                                setDeletingProductId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold transition text-[9px]"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeletingProductId(null)}
                              className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition text-[9px]"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingProductId(prod.id)}
                            className="p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:border-red-500/30 text-red-400 transition"
                            title="Deletar produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. CUSTOMIZATION BRANDING SETTINGS                  */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'customization' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Form Settings */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-4">
            <div>
              <span className="font-mono text-[9px] text-yellow-400 uppercase block font-bold">Personalização do Site</span>
              <h3 className="font-serif text-lg font-light text-stone-100 mt-0.5">Customização de Conteúdos</h3>
              <p className="text-xs text-stone-500">Modifique títulos, slogans corporativos e dados de contato que refletem em tempo real no site.</p>
            </div>

            <form onSubmit={handleSaveStoreSettings} className="bg-stone-950/45 border border-stone-900 rounded-xl p-5 space-y-4">
              <div className="space-y-4 font-sans text-xs">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1 font-bold">Nome da Loja (Logo Header) *</label>
                    <input
                      type="text"
                      required
                      value={settings?.storeName ?? 'TRIARC Store'}
                      onChange={(e) => updateSettingField('storeName', e.target.value)}
                      className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-100 placeholder-stone-700 focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1 font-bold">Paleta de Cor Tint (Bordas e Detalhes)</label>
                    <select
                      value={settings?.themeColor ?? 'gold'}
                      onChange={(e: any) => updateSettingField('themeColor', e.target.value)}
                      className="w-full rounded-lg border border-stone-850 bg-stone-950 px-2 py-2 text-stone-300 font-mono focus:outline-none focus:border-yellow-500"
                    >
                      <option value="gold">Preto & Ouro (Matriz Original)</option>
                      <option value="cyberpunk">Cyber Red (Neon Força)</option>
                      <option value="monochrome">Monochrome Apple (Aço Minimal)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1 font-bold">Slogan Principal (Destaque do Cabeçalho)</label>
                  <input
                    type="text"
                    value={settings?.heroTitle ?? 'ALTA PERFORMANCE & TECNOLOGIA'}
                    onChange={(e) => updateSettingField('heroTitle', e.target.value)}
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-100 focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1 font-bold">Subtítulo Secundário (Atraente)</label>
                  <textarea
                    value={settings?.heroSubtitle ?? 'Vista a força física e a mentalidade de elite militar.'}
                    onChange={(e) => updateSettingField('heroSubtitle', e.target.value)}
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-150 focus:outline-none focus:border-yellow-500 text-xs leading-relaxed"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1 font-bold">E-mail para Ajuda / FAQ</label>
                    <input
                      type="email"
                      value={settings?.supportEmail ?? 'triarcstore1@gmail.com'}
                      onChange={(e) => updateSettingField('supportEmail', e.target.value)}
                      className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-200 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1 font-bold">Número de WhatsApp (Ex: +55 (18) 99703-4546)</label>
                    <input
                      type="text"
                      value={settings?.supportPhone ?? '+55 (18) 99703-4546'}
                      onChange={(e) => updateSettingField('supportPhone', e.target.value)}
                      className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-200 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                {/* PIX CREDENTIALS */}
                <div className="border-t border-stone-900 pt-4 mt-2 space-y-3">
                  <span className="block font-mono text-[9px] text-yellow-400 uppercase tracking-widest font-bold">
                    Recebimento e Chaves Pix (Checkout)
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1">Chave Pix (Ex: CNPJ, Telefones)</label>
                      <input
                        type="text"
                        value={settings?.pixKey ?? '25.279.079/0001-65'}
                        onChange={(e) => updateSettingField('pixKey', e.target.value)}
                        className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-200 focus:outline-none focus:border-yellow-500"
                        placeholder="Ex: 25.279.079/0001-65"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1">QR Code Pix (Flyer Imagem)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings?.pixQrCodeUrl ?? ''}
                          className="flex-1 rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-200 text-xs font-mono"
                          placeholder="Link ou upload rápido..."
                          readOnly
                        />
                        <input
                          type="file"
                          accept="image/*"
                          ref={pixQrCodeInputRef}
                          onChange={(e) => handlePhotoFileChange(e, 'pix_qrcode')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={isUploadingPixQrCode}
                          onClick={() => pixQrCodeInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-300 font-mono text-[9px] hover:text-white transition duration-200"
                        >
                          {isUploadingPixQrCode ? 'Enviando...' : 'Carregar'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1">Código Pix Copia e Cola</label>
                    <textarea
                      value={settings?.pixCopyPaste ?? ''}
                      onChange={(e) => updateSettingField('pixCopyPaste', e.target.value)}
                      className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-200 font-mono text-[10px] focus:outline-none focus:border-yellow-500"
                      rows={2}
                      placeholder="Cole aqui a linha completa copia-e-cola gerada no seu banco..."
                    />
                  </div>
                </div>

              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 py-3 font-mono text-xs font-extrabold text-stone-950 uppercase tracking-widest hover:brightness-110"
              >
                <Palette className="w-4 h-4" />
                <span>Salvar Configurações do Site</span>
              </button>
            </form>
          </div>

          {/* Institutional custom pages panel */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-4">
            <div>
              <span className="font-mono text-[9px] text-yellow-400 uppercase block font-bold font-black">Rodapé Suplementar</span>
              <h3 className="font-serif text-lg font-light text-stone-100 mt-0.5">Páginas Institucionais</h3>
              <p className="text-xs text-stone-500">Escreva conteúdos estendidos no rodapé do site usando texto em Markdown simples.</p>
            </div>

            <form onSubmit={handleAddCustomPage} className="bg-stone-950/40 border border-stone-900 rounded-xl p-4 space-y-3 font-sans">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[8px] font-mono uppercase text-stone-400 mb-1">Título da Página *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tecnologia Têxtil"
                    value={newPageForm.title}
                    onChange={(e) => setNewPageForm({ ...newPageForm, title: e.target.value })}
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase text-stone-400 mb-1">Caminho amigável (Slug)</label>
                  <input
                    type="text"
                    placeholder="Ex: tecnologia-textil"
                    value={newPageForm.slug}
                    onChange={(e) => setNewPageForm({ ...newPageForm, slug: e.target.value })}
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 text-stone-100 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-[8px] font-mono uppercase text-stone-400 mb-1">Conteúdo da Página (Suporta Markdown)</label>
                <textarea
                  required
                  placeholder="Ex: # Sobre Nós... Fundada em Presidente Prudente para revolucionar o conforto térmico..."
                  value={newPageForm.content}
                  onChange={(e) => setNewPageForm({ ...newPageForm, content: e.target.value })}
                  className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-100 focus:outline-none text-xs leading-relaxed"
                  rows={4}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-white font-mono text-[10px] py-2 uppercase tracking-wider font-extrabold transition"
              >
                Vincular Nova Página ao Rodapé
              </button>
            </form>

            <div className="space-y-2">
              <span className="block font-mono text-[9px] text-stone-500 uppercase font-black">Páginas Cadastradas ({settings?.customPages?.length || 0})</span>
              {(!settings?.customPages || settings.customPages.length === 0) ? (
                <div className="rounded bg-stone-900/10 border border-stone-900 p-8 text-center text-stone-600 font-mono text-2xs uppercase">Nenhuma página suplementar registrada.</div>
              ) : (
                settings.customPages.map((pg) => (
                  <div key={pg.id} className="rounded-xl border border-stone-900 bg-[#0d0d0d] px-4 py-2.5 flex items-center justify-between">
                    <div className="text-left">
                      <span className="font-sans text-xs font-semibold text-stone-200">📄 {pg.title}</span>
                      <span className="ml-2 font-mono text-[9px] text-stone-550 block sm:inline">slug: /{pg.slug}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomPage(pg.id)}
                      className="text-stone-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. SHOWROOM BEHAVIOR & CRO OPTIMIZATION             */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'showroom' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          <div className="lg:col-span-12 xl:col-span-8 space-y-6">
            <div>
              <span className="font-mono text-[9px] text-[#d4af37] uppercase block font-bold font-black">Configuração do Showroom</span>
              <h3 className="font-serif text-lg font-light text-stone-100 mt-0.5">Customizar Showroom & Pedidos WhatsApp</h3>
              <p className="text-xs text-stone-500">Configure como o mostruário de produtos do seu showroom interage com os clientes e direciona os leads para o seu WhatsApp.</p>
            </div>

            <form onSubmit={handleSaveStoreSettings} className="bg-stone-950/45 border border-stone-900 rounded-xl p-5 space-y-6">
              <div className="space-y-6 font-sans text-xs">
                
                {/* WHATSAPP DIRECT REDIRECT TOGGLE */}
                <div className="p-4 rounded-xl border border-stone-900 bg-stone-950/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="block font-mono text-[10px] text-yellow-400 uppercase tracking-widest font-black">
                        🟢 Redirecionamento Direto para o WhatsApp
                      </span>
                      <p className="text-2xs text-stone-400">
                        Pule a etapa do carrinho de compras e envie o cliente diretamente para a central.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings?.showroomRedirectToWhatsApp ?? false}
                        onChange={(e) => updateSettingField('showroomRedirectToWhatsApp', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-stone-400 after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    Se <strong>ativado</strong>, ao clicar no botão de comprar em qualquer produto, o sistema abre imediatamente o seu WhatsApp com uma mensagem exclusiva do produto, permitindo fechar o negócio no ato sem precisar passar pelo carrinho de compras.
                  </p>
                </div>

                {/* VISUAL LAYOUT & INFOS CONFIGS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SHOW PRICES TOGGLE */}
                  <div className="p-4 rounded-xl border border-stone-900 bg-stone-950/50 space-y-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="block font-mono text-[10px] text-stone-300 uppercase tracking-widest font-bold">
                          Exibir Preços
                        </span>
                        <p className="text-2xs text-stone-500">Mostrar preços dos produtos.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={settings?.showroomShowPrice ?? true}
                          onChange={(e) => updateSettingField('showroomShowPrice', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-stone-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-stone-500 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500 peer-checked:after:bg-black"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-stone-500 leading-relaxed">
                      Se desmarcado, os preços reais do estoque serão ocultados e os produtos exibirão uma chamada "Sob Consulta" ou "Consultar via WhatsApp".
                    </p>
                  </div>

                  {/* SHOW STOCK TOGGLE */}
                  <div className="p-4 rounded-xl border border-stone-900 bg-stone-950/50 space-y-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="block font-mono text-[10px] text-stone-300 uppercase tracking-widest font-bold">
                          Exibir Estoque
                        </span>
                        <p className="text-2xs text-stone-500">Mostrar detalhes de grade.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={settings?.showroomShowStock ?? true}
                          onChange={(e) => updateSettingField('showroomShowStock', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-stone-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-stone-500 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500 peer-checked:after:bg-black"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-stone-500 leading-relaxed">
                      Se desmarcado, o mostruário não exibirá os contadores de unidades restantes por tamanho (escondendo a escassez explícita).
                    </p>
                  </div>
                </div>

                {/* SHOWROOM LAYOUT STYLE */}
                <div className="p-4 rounded-xl border border-stone-900 bg-stone-950/50 space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 font-bold">Estilo de Layout do Showroom</label>
                    <p className="text-2xs text-stone-500 mb-2">Selecione o estilo visual que o catálogo de produtos adotará no mostruário principal.</p>
                    <select
                      value={settings?.showroomLayoutStyle ?? 'grid'}
                      onChange={(e: any) => updateSettingField('showroomLayoutStyle', e.target.value)}
                      className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-2 text-stone-300 font-mono focus:outline-none focus:border-yellow-500"
                    >
                      <option value="grid">Grade de Alta Compressão (Grid Clássico)</option>
                      <option value="carousel">Carrossel Deslizante Swiper (Luxo Dinâmico)</option>
                      <option value="bento">Bento Grid Assimétrico (Vanguarda Premium)</option>
                    </select>
                  </div>
                </div>

                {/* WHATSAPP CUSTOM MESSAGE */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 font-bold">Mensagem Personalizada de Lead do WhatsApp</label>
                  <p className="text-2xs text-stone-500 mb-2">Texto pré-preenchido que o usuário envia para você ao iniciar o pedido. Pode usar as tags `{"{productName}"}` e `{"{productPrice}"}`.</p>
                  <textarea
                    value={settings?.showroomCustomMessage ?? 'Olá! Vi o produto *{productName}* de *{productPrice}* no seu showroom e gostaria de encomendar.'}
                    onChange={(e) => updateSettingField('showroomCustomMessage', e.target.value)}
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3.5 py-2.5 text-stone-100 font-mono text-2xs focus:outline-none focus:border-yellow-500"
                    rows={3}
                    placeholder="Ex: Olá! Tenho interesse no item {productName} que vi no showroom..."
                  />
                </div>

              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-yellow-550 via-amber-400 to-yellow-500 py-3 font-mono text-xs font-extrabold text-stone-950 uppercase tracking-widest hover:brightness-110"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Salvar Configurações do Showroom</span>
              </button>
            </form>
          </div>

          {/* SIDE INFORMATION ABOUT WHATSAPP FLOW */}
          <div className="lg:col-span-12 xl:col-span-4 space-y-4">
            <div className="rounded-xl border border-stone-900 bg-stone-950 p-5 space-y-4 text-xs">
              <span className="block font-mono text-[9px] text-[#d4af37] uppercase tracking-wider font-extrabold">Como funciona o redirecionamento?</span>
              <p className="text-stone-400 leading-relaxed font-sans text-[11px]">
                O showroom da TRIARC é otimizado para fechar vendas rápidas e maximizar as taxas de conversão (CRO). 
              </p>
              
              <div className="p-3 bg-[#0d0d0d] rounded-lg border border-stone-900 font-mono text-[10px] text-stone-300 space-y-2">
                <div className="flex gap-2">
                  <span className="text-[#d4af37]">📞</span>
                  <span><strong>WhatsApp Configurado:</strong> {settings?.supportPhone || '+55 (18) 99703-4546'}</span>
                </div>
                <div className="text-[9px] text-stone-500 leading-normal pl-4">
                  * Você pode alterar seu WhatsApp a qualquer momento na aba <strong>CUSTOMIZAR LAYOUT</strong>.
                </div>
              </div>

              <div className="space-y-2 text-stone-500 text-[10px] leading-relaxed">
                <p>
                  <strong>1. Adicione os Produtos:</strong> Cadastre novos itens na aba <strong>GERENCIAR PRODUTOS</strong>. Cada produto pode ter tamanhos, cores, imagens extras, preço e descrição completa.
                </p>
                <p>
                  <strong>2. Configure a Ação:</strong> Se o "Redirecionamento Direto" estiver ativado, o clique no botão de compra em qualquer lugar do site levará o cliente diretamente para conversar com você já sabendo exatamente qual produto ele deseja comprar.
                </p>
                <p>
                  <strong>3. Feche o Negócio:</strong> Responda o cliente no WhatsApp, combine a entrega e forneça a chave Pix institucional gerada para consolidar o pagamento!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. CAROUSEL/SLIDES BANNER MANAGE                    */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Left Panel - Banner Editor */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-6" id="banner-form-anchor">
            <div>
              <span className="font-mono text-[9px] tracking-widest text-[#a3a3a3] uppercase mb-1 block">
                {isEditingBanner ? `Editando Banner: ${isEditingBanner}` : "Slide de Publicidade"}
              </span>
              <h3 className="font-serif text-xl font-light text-stone-100">
                {isEditingBanner ? "Editar Slide de Carrossel" : "Novo Slide de Wallpaper"}
              </h3>
              <p className="text-xs text-stone-500">Envie ilustrações, fotos organizadas ou novos wallpapers para rodar em destaque no topo.</p>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold">Título Principal *</label>
                <input
                  type="text"
                  required
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="Ex: ULTRA-COMPRESSÃO EXCLUSIVA"
                  className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold">Subtítulo do Slide</label>
                <input
                  type="text"
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  placeholder="Descreva o material esportivo ou doação estética..."
                  className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold">Legenda do Botão</label>
                  <input
                    type="text"
                    value={bannerForm.buttonText}
                    onChange={(e) => setBannerForm({ ...bannerForm, buttonText: e.target.value })}
                    placeholder="Ex: Ver Coleção"
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 text-stone-200 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold">Link de Destino</label>
                  <input
                    type="text"
                    value={bannerForm.buttonLink}
                    onChange={(e) => setBannerForm({ ...bannerForm, buttonLink: e.target.value })}
                    placeholder="Ex: #produtos"
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 text-stone-200 font-mono focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold">Ordenação (Prioridade)</label>
                  <input
                    type="number"
                    value={bannerForm.priority}
                    onChange={(e) => setBannerForm({ ...bannerForm, priority: e.target.value })}
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 font-mono text-stone-100 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1 font-semibold font-bold">Situação Inicial</label>
                  <select
                    value={bannerForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.value === 'active' })}
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-2 py-1.5 text-stone-300 font-mono focus:outline-none focus:border-yellow-500"
                  >
                    <option value="active">Roda ativo de imediato</option>
                    <option value="inactive">Rascunho / Invisível</option>
                  </select>
                </div>
              </div>

              {/* Banner wallpaper image upload */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase mb-1.5 font-bold">Wallpaper de Fundo Comercial</label>
                <div
                  onClick={() => bannerImageInputRef.current?.click()}
                  className="group/bnu border border-dashed border-stone-800 hover:border-yellow-500/40 bg-stone-950 rounded-xl px-4 py-5 text-center cursor-pointer transition-all duration-300"
                >
                  <input
                    type="file"
                    ref={bannerImageInputRef}
                    onChange={(e) => handlePhotoFileChange(e, 'banner')}
                    accept="image/*"
                    className="hidden"
                  />
                  {isUploadingBannerImage ? (
                    <div className="flex flex-col items-center justify-center space-y-2 py-2">
                      <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                      <span className="text-2xs font-mono text-stone-400">Transferindo imagem para armazenamento global...</span>
                    </div>
                  ) : bannerForm.imageUrl ? (
                    <div className="flex flex-col items-center space-y-1.5">
                      <img src={bannerForm.imageUrl} className="h-20 w-36 object-cover rounded-lg border border-stone-850 shadow-md" alt="banner-wallpaper" referrerPolicy="no-referrer" />
                      <span className="text-[9px] font-mono text-green-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Arquivo carregado
                      </span>
                    </div>
                  ) : (
                    <div className="py-2 flex flex-col items-center justify-center space-y-1.5">
                      <Upload className="w-6 h-6 text-stone-700 group-hover/bnu:text-yellow-500 transition duration-300" />
                      <span className="text-2xs text-stone-400 font-sans">Carregar Arquivo de Foto (Recomendado aspecto horizontal 16:9)</span>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <span className="text-[9px] font-mono text-stone-500 block uppercase mb-1">Ou informe link manual alternativo (Ex: Unsplash):</span>
                  <input
                    type="url"
                    value={bannerForm.imageUrl}
                    onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full rounded-lg border border-stone-850 bg-stone-950 px-3 py-1.5 text-[11px] text-stone-100 placeholder-stone-800 font-mono focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-yellow-550 via-amber-400 to-yellow-500 text-[#0a0a0a] font-mono text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-98 transition text-center"
                >
                  {isEditingBanner ? "Gravar Edição" : "Salvar e Publicar Slide"}
                </button>
                {isEditingBanner && (
                  <button
                    type="button"
                    onClick={resetBannerForm}
                    className="px-4 py-2 border border-stone-800 hover:border-stone-700 bg-[#121212] rounded-lg text-stone-400 hover:text-white font-mono text-2xs uppercase font-semibold"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right Panel - Active Slides list */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] text-[#f5a623] uppercase block font-bold font-black">História Visual</span>
                <h3 className="font-serif text-lg font-light text-stone-100 mt-0.5">Slides Ativos do Carrossel ({banners.length})</h3>
              </div>

              {banners.length === 0 && (
                <button
                  onClick={handleSeedDefaultBanners}
                  className="px-3 py-1.5 bg-stone-900 border border-stone-850 hover:bg-stone-850 text-[9px] text-amber-400 font-mono font-bold rounded-lg transition uppercase tracking-widest"
                >
                  Carregar Demonstrações Padrão
                </button>
              )}
            </div>

            {banners.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-850 py-20 text-center text-stone-500 bg-[#0b0b0b]/60">
                <ImageIcon className="w-10 h-10 text-stone-800 mx-auto mb-3" />
                <p className="text-xs font-mono uppercase font-bold text-stone-400">Nenhum slide visual carregado</p>
                <p className="text-[10px] text-stone-605 mt-1">Crie um slide novo à esquerda ou utilize o botão acima para injetar demonstrações.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {banners.map((bn) => (
                  <div key={bn.id} className="group/bncv rounded-2xl border border-stone-900 bg-stone-950/40 overflow-hidden text-left flex flex-col justify-between">
                    <div>
                      {/* Banner Visual Cover Preview */}
                      <div className="aspect-[16/9] w-full relative bg-stone-900">
                        <img 
                          src={bn.imageUrl} 
                          alt={bn.title} 
                          className="h-full w-full object-cover brightness-75 group-hover/bncv:scale-[1.02] duration-500 transition" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                          <span className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 rounded font-mono text-[8px] px-1.5 py-0.5 uppercase tracking-widest self-start mb-2.5 font-bold">
                            Prioridade: {bn.priority || 1}
                          </span>
                          <h4 className="font-sans text-xs font-bold text-stone-100 max-w-full truncate">{bn.title}</h4>
                          <p className="text-[10px] text-stone-400 font-light max-w-full truncate">{bn.subtitle}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-stone-900/60 flex items-center justify-between text-[11px] font-mono select-none bg-stone-950">
                      <button
                        onClick={() => handleToggleBannerActive(bn)}
                        className={`font-semibold tracking-wider text-[9px] px-2 py-1 rounded border uppercase ${
                          bn.isActive 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                            : 'bg-stone-900 text-stone-500 border-stone-850 hover:bg-stone-800'
                        }`}
                      >
                        {bn.isActive ? '● Ativo no Site' : '○ Rascunho'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleLoadEditBanner(bn)}
                          className="p-1.5 rounded-lg border border-stone-850 bg-stone-900 hover:border-stone-700 text-stone-300 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {deletingBannerId === bn.id ? (
                          <div className="flex items-center gap-1.5 bg-red-950/20 border border-red-500/20 p-1 rounded-lg">
                            <span className="text-[9px] text-red-400 font-bold font-sans">Excluir?</span>
                            <button
                              onClick={() => {
                                handleDeleteBanner(bn.id);
                                setDeletingBannerId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold transition text-[9px]"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeletingBannerId(null)}
                              className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition text-[9px]"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingBannerId(bn.id)}
                            className="p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:border-red-500/30 text-red-400 transition"
                            title="Deletar banner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-900 bg-stone-950 p-6">
            <h3 className="font-serif text-lg font-light text-stone-100 mb-2">🔑 Contas de Administrador Autorizadas</h3>
            <p className="text-xs text-stone-400 leading-relaxed max-w-2xl mb-6">
              Gerencie as contas do Firebase Authentication autorizadas a acessar este painel administrativo. 
              O e-mail principal <strong className="text-amber-400 font-bold">gustavoncoimbra@gmail.com</strong> possui acesso de proprietário vitalício.
            </p>

            {/* Add New Admin Form */}
            <form onSubmit={handleAddAdmin} className="max-w-xl p-4 rounded-xl border border-stone-900 bg-stone-900/25 space-y-4 mb-8">
              <span className="block font-mono text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                ⚡ AUTORIZAR NOVA CONTA
              </span>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    placeholder="exemplo@corporativo.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    required
                    className="w-full rounded-lg bg-black border border-stone-850 px-3.5 py-2.5 text-xs text-stone-200 focus:border-yellow-500 focus:outline-none placeholder-stone-600 font-sans"
                  />
                </div>
                <div className="w-full sm:w-44">
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value)}
                    className="w-full rounded-lg bg-black border border-stone-850 px-3.5 py-2.5 text-xs text-stone-200 focus:border-yellow-500 focus:outline-none font-sans"
                  >
                    <option value="admin">Administrador</option>
                    <option value="manager">Gerente de Vendas</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2.5 text-xs font-mono font-bold tracking-wider transition uppercase shrink-0 cursor-pointer"
                >
                  AUTORIZAR
                </button>
              </div>
              <p className="text-[10px] text-stone-500 leading-normal">
                Nota: O usuário deve se autenticar ou criar sua conta usando este e-mail no Firebase Authentication para obter acesso ao painel.
              </p>
            </form>

            {/* Admins List Table */}
            <div className="border border-stone-900 rounded-xl bg-black overflow-hidden">
              <div className="p-4 border-b border-stone-900 bg-stone-950 flex items-center justify-between">
                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                  E-mails Cadastrados e Autorizados
                </span>
                <button
                  type="button"
                  onClick={fetchAdmins}
                  className="p-1.5 rounded bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-850 transition flex items-center gap-1 cursor-pointer font-sans text-[10px]"
                  title="Atualizar lista"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="text-[9px] font-mono">ATUALIZAR</span>
                </button>
              </div>

              {isAdminsLoading ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
                  <span className="text-xs text-stone-400 font-mono">Carregando lista de administradores...</span>
                </div>
              ) : adminsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 font-mono">
                  Nenhuma conta adicional cadastrada. Apenas o proprietário principal possui acesso.
                </div>
              ) : (
                <div className="divide-y divide-stone-900">
                  {/* Primary Owner Row */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-950/20">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-mono text-xs font-bold">
                        P
                      </div>
                      <div>
                        <span className="block text-xs font-sans text-stone-200 font-semibold">gustavoncoimbra@gmail.com</span>
                        <span className="text-[9px] font-mono text-amber-400 font-bold tracking-wider uppercase bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Proprietário Principal (Super Admin)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono">Acesso Vitalício</span>
                  </div>

                  {/* Dynamic Admins Rows */}
                  {adminsList.filter(adm => adm.email !== 'gustavoncoimbra@gmail.com').map((adm) => (
                    <div key={adm.email} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-950/10 transition">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400 font-mono text-xs font-bold">
                          A
                        </div>
                        <div>
                          <span className="block text-xs font-sans text-stone-200">{adm.email}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono text-stone-400 bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded uppercase tracking-wide">
                              Regra: {adm.role || 'admin'}
                            </span>
                            {adm.addedAt && (
                              <span className="text-[9px] font-mono text-stone-600">
                                Autorizado em: {new Date(adm.addedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        {deletingAdminEmail === adm.email ? (
                          <div className="flex items-center gap-1.5 bg-red-950/20 border border-red-500/20 p-1.5 rounded-lg">
                            <span className="text-[10px] text-red-400 font-bold font-sans">Revogar acesso?</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteAdmin(adm.email);
                                setDeletingAdminEmail(null);
                              }}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold transition text-[10px]"
                            >
                              Sim, Revogar
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingAdminEmail(null)}
                              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition text-[10px]"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingAdminEmail(adm.email)}
                            className="text-red-400 hover:text-red-300 text-[10px] font-mono uppercase bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer font-sans"
                          >
                            <Trash2 className="w-3 h-3" />
                            Revogar Acesso
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
