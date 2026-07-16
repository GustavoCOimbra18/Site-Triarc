import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  text: string;
}

interface NotificationProps {
  message: ToastMessage | null;
  onClose: () => void;
}

export default function Notification({ message, onClose }: NotificationProps) {
  return (
    <AnimatePresence>
      {message && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-black/95 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.8)] ${
              message.type === 'success' 
                ? 'border-yellow-500/50 shadow-yellow-500/10' 
                : message.type === 'error'
                ? 'border-red-500/40 shadow-red-500/10'
                : 'border-white/10 shadow-white/5'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {message.type === 'success' && (
                <CheckCircle className="w-5 h-5 text-yellow-400" />
              )}
              {message.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              {(message.type === 'info' || message.type === 'loading') && (
                message.type === 'loading' ? (
                  <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-yellow-500" />
                )
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium text-stone-100 font-sans leading-relaxed">
                {message.text}
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 text-stone-400 hover:text-stone-200 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
