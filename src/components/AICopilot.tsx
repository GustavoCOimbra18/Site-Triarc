import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, MessageSquare, Trash2, HelpCircle } from 'lucide-react';
import { Product, formatBRL } from '../types';

interface AICopilotProps {
  products: Product[];
  onOpenProductDetail?: (product: Product) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "Quais as novidades tecnológicas?",
  "Camisetas para alta performance",
  "Quais as formas de pagamento?",
  "Como funciona o frete?"
];

export default function AICopilot({ products, onOpenProductDetail }: AICopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá, atleta de elite! ⚡ Eu sou o **Triarc AI Copilot**, seu assistente de compras de alta performance.\n\nEstou aqui para ajudar você a encontrar as melhores peças tecnológicas, sugerir tamanhos ideais e responder a qualquer dúvida. Como posso potencializar seu treino hoje?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Send message history along with the list of current products
      const payloadMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: payloadMessages,
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category,
            stock: p.stock,
            description: p.description,
            colors: p.colors || [],
            sizes: p.sizes || []
          }))
        })
      });

      if (!res.ok) {
        throw new Error('Falha ao comunicar com o Copilot.');
      }

      const data = await res.json();
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text || 'Desculpe, tive um pequeno problema para processar essa informação. Como posso te ajudar?',
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("AI Copilot Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, nosso servidor de Inteligência Artificial está sob alta demanda. Por favor, tente novamente em instantes.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Histórico limpo! Como posso te ajudar a encontrar seu próximo equipamento de alta performance?',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          id="ai-copilot-trigger"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all cursor-pointer ${
            isOpen 
              ? 'bg-stone-900 text-amber-400 border border-amber-400/30' 
              : 'bg-gradient-to-tr from-amber-500 to-amber-300 text-black font-bold'
          }`}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <div className="relative">
              <Sparkles className="h-6 w-6 animate-pulse" />
              <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-black text-amber-400 border border-amber-400/20">
                IA
              </span>
            </div>
          )}
        </motion.button>
      </div>

      {/* Chat window panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-copilot-window"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-120px)] flex flex-col rounded-2xl border border-stone-850 bg-stone-950/95 backdrop-blur-md shadow-2xl overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="p-4 border-b border-stone-850 bg-gradient-to-r from-stone-900 to-stone-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-300/20 border border-amber-400/30 flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold tracking-wider text-stone-100 uppercase flex items-center gap-1.5">
                    TRIARC AI COPILOT
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <span className="text-[10px] text-stone-500">Inteligência de Compra de Elite</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleClearHistory}
                  title="Limpar histórico"
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-900 transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-900 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-sans leading-relaxed ${
                      isUser 
                        ? 'bg-stone-900 border border-stone-800 text-stone-100 rounded-tr-none' 
                        : 'bg-stone-950 border border-amber-950/30 text-stone-300 rounded-tl-none font-sans'
                    }`}>
                      {/* Render custom styled markdown-like elements simply */}
                      <p className="whitespace-pre-wrap">
                        {m.content.split('\n').map((line, lIdx) => {
                          // Very basic bold replacement **text**
                          const parts = line.split(/\*\*(.*?)\*\*/g);
                          return (
                            <span key={lIdx} className="block min-h-[4px]">
                              {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-amber-400 font-bold">{p}</strong> : p)}
                            </span>
                          );
                        })}
                      </p>
                      <span className="block mt-1.5 text-[8px] font-mono text-stone-600 text-right">
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-950 border border-stone-900 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-stone-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Chips & Footer Input */}
            <div className="p-3 border-t border-stone-850 bg-stone-950/40">
              {/* Suggetions */}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-[10px] font-sans px-2.5 py-1.5 rounded-lg bg-stone-900/60 border border-stone-850 text-stone-400 hover:text-amber-400 hover:border-amber-400/20 transition text-left cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(input);
                }} 
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte ao Copilot..."
                  className="flex-1 rounded-xl border border-stone-850 bg-stone-900/50 px-3.5 py-2.5 text-stone-200 placeholder-stone-600 outline-none focus:border-amber-400 focus:bg-stone-900 transition text-xs font-sans"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black font-bold disabled:opacity-30 disabled:pointer-events-none hover:opacity-90 transition cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
