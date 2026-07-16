import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, X, Sparkles, LogIn, UserPlus, Smartphone, ShieldAlert, Copy, Check } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';

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

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowNotification: (type: 'success' | 'error' | 'info' | 'loading', text: string) => void;
  onSuccess: (user: any) => void;
}

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onShowNotification,
  onSuccess
}: CustomerAuthModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'phone'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Phone authentication states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);

  // Domain authorization error diagnostic helper
  const [domainErrorAlert, setDomainErrorAlert] = useState<{ isOpen: boolean; domain: string } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPhoneNumber('');
    setVerificationCode('');
    setConfirmationResult(null);
    setIsOtpSent(false);
    setErrorMessage('');
  };

  const handleToggleMode = (mode: 'login' | 'register' | 'phone') => {
    setAuthMode(mode);
    setErrorMessage('');
  };

  // Helper to initialize invisible Recaptcha safety verifier
  const setupRecaptcha = () => {
    try {
      // Return existing instance to avoid duplicate initialization errors
      if ((window as any).recaptchaVerifier) {
        return (window as any).recaptchaVerifier;
      }
      
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log("ReCAPTCHA resolvido com sucesso.");
        },
        'expired-callback': () => {
          onShowNotification('error', "ReCAPTCHA expirado. Recarregue e tente novamente.");
        }
      });
      (window as any).recaptchaVerifier = verifier;
      return verifier;
    } catch (err: any) {
      console.error("Erro ReCAPTCHA:", err);
      return null;
    }
  };

  // Sends authentication SMS to high-performance customer's phone
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage("Por favor, digite um número de celular válido com DDD.");
      return;
    }
    
    // Auto-prepending Brazil country code +55
    const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;
    
    setIsLoading(true);
    onShowNotification('loading', "Enviando código SMS operacional via Firebase...");
    
    try {
      const verifier = setupRecaptcha();
      if (!verifier) {
        throw new Error("Erro de infraestrutura: ReCAPTCHA não inicializado.");
      }
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      onShowNotification('success', "Código SMS de acesso enviado com sucesso!");
    } catch (err: any) {
      console.error("Erro SMS:", err);
      let friendlyMessage = "Não foi possível enviar o código SMS.";
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setDomainErrorAlert({
          isOpen: true,
          domain: window.location.hostname
        });
        friendlyMessage = "Erro de Domínio Não Autorizado no Firebase.";
      } else if (err.code === 'auth/invalid-phone-number') {
        friendlyMessage = "O número de telefone inserido é inválido.";
      } else if (err.message?.includes('reCAPTCHA')) {
        friendlyMessage = "Erro no carregamento do ReCAPTCHA de segurança do Google.";
      } else {
        friendlyMessage = err.message || friendlyMessage;
      }
      setErrorMessage(friendlyMessage);
      onShowNotification('error', friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Verifies the operational SMS verification code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (verificationCode.trim().length !== 6) {
      setErrorMessage("Por favor, forneça o código de 6 dígitos recebido por SMS.");
      return;
    }
    
    setIsLoading(true);
    onShowNotification('loading', "Verificando autenticidade do PIN SMS...");
    
    try {
      if (!confirmationResult) {
        throw new Error("Sessão SMS expirada. Reenvie o SMS.");
      }
      const credential = await confirmationResult.confirm(verificationCode);
      onShowNotification('success', `Acesso autorizado! Bem-vindo(a).`);
      onSuccess(credential.user);
      onClose();
      resetForm();
    } catch (err: any) {
      console.error("Erro OTP Code Confirm:", err);
      let friendlyMessage = "Código incorreto ou expirado. Tente novamente.";
      setErrorMessage(friendlyMessage);
      onShowNotification('error', friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle traditional Email logins and Registrations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (authMode === 'phone') {
      if (isOtpSent) {
        handleVerifyOtp(e);
      } else {
        handleSendOtp(e);
      }
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (authMode === 'register') {
      if (!fullName.trim()) {
        setErrorMessage("Por favor, insira o seu nome completo.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("As senhas inseridas não coincidem.");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("Por segurança, a senha deve conter pelo menos 6 caracteres.");
        return;
      }
    }

    setIsLoading(true);
    onShowNotification('loading', authMode === 'login' ? "Autenticando sua conta de atleta..." : "Criando seu perfil de alta performance...");

    try {
      if (authMode === 'login') {
        const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        onShowNotification('success', `Bem-vindo de volta, ${credential.user.displayName || credential.user.email}!`);
        onSuccess(credential.user);
        onClose();
        resetForm();
      } else {
        const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(credential.user, {
          displayName: fullName.trim()
        });
        
        const updatedUser = auth.currentUser || credential.user;
        onShowNotification('success', `Perfil criado com sucesso! Seja bem-vindo, ${fullName}!`);
        onSuccess(updatedUser);
        onClose();
        resetForm();
      }
    } catch (error: any) {
      console.error("Erro na autenticação de cliente:", error);
      let friendlyMessage = "Ocorreu um erro ao processar. Tente novamente.";
      
      switch (error.code) {
        case 'auth/user-not-found':
          friendlyMessage = "Nenhum atleta localizado com este e-mail.";
          break;
        case 'auth/wrong-password':
          friendlyMessage = "A senha operacional fornecida está incorreta.";
          break;
        case 'auth/invalid-credential':
          friendlyMessage = "E-mail ou senha incorretos.";
          break;
        case 'auth/email-already-in-use':
          friendlyMessage = "Este endereço de e-mail já está sendo utilizado por outro perfil.";
          break;
        case 'auth/invalid-email':
          friendlyMessage = "O formato do e-mail inserido é inválido.";
          break;
        case 'auth/weak-password':
          friendlyMessage = "A senha escolhida é fraca. Use pelo menos 6 caracteres.";
          break;
        default:
          if (error.message?.includes('invalid-credential') || error.message?.includes('wrong-password')) {
            friendlyMessage = "Credenciais incorretas.";
          } else {
            friendlyMessage = `Erro: ${error.message || friendlyMessage}`;
          }
      }
      setErrorMessage(friendlyMessage);
      onShowNotification('error', friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setIsLoading(true);
    onShowNotification('loading', "Iniciando login seguro via Google...");
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      onShowNotification('success', `Bem-vindo, ${userCredential.user.displayName || userCredential.user.email}!`);
      onSuccess(userCredential.user);
      onClose();
      resetForm();
    } catch (err: any) {
      console.error("Erro Google login cliente:", err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setDomainErrorAlert({
          isOpen: true,
          domain: window.location.hostname
        });
      } else {
        onShowNotification('error', "Não foi possível autenticar via Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (!domainErrorAlert) return;
    safeCopyToClipboard(domainErrorAlert.domain);
    setCopiedDomain(true);
    onShowNotification('success', "Domínio copiado para a área de transferência!");
    setTimeout(() => setCopiedDomain(false), 3000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/95 backdrop-blur-md"
        />

        {/* Modal content dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative w-full max-w-md rounded-2xl border border-stone-850 bg-[#0c0c0c] p-6 sm:p-8 space-y-5 text-left shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* ReCAPTCHA container hidden for invisible recaptcha verification flow */}
          <div id="recaptcha-container"></div>

          {/* CLOSE AND EXIT BUTTONS */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg border border-stone-855 bg-stone-900/40 text-stone-400 hover:text-white transition z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* DIAGNOSTIC DOMAIN AUTHORIZATION HELP VIEW OVERLAY */}
          {domainErrorAlert && domainErrorAlert.isOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-20 bg-stone-950 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-red-500">
                  <span className="p-2 bg-red-550/10 border border-red-550/20 rounded-xl">
                    <ShieldAlert className="w-6 h-6 text-red-400" />
                  </span>
                  <div>
                    <span className="block font-mono text-[9px] text-red-400 uppercase tracking-widest font-bold">Diagnóstico Firebase</span>
                    <h4 className="font-serif text-base font-bold text-stone-100 uppercase">Domínio Não Autorizado</h4>
                  </div>
                </div>

                <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                  O Firebase Auth restringe logins externos em ambientes de Sandbox. Para permitir acessos seguros nessa versão de teste (Preview), adicione esse domínio na lista de hosts válidos do seu console.
                </p>

                {/* COPY DOMAIN CONTAINER */}
                <div className="bg-stone-900 border border-stone-850 p-3 rounded-xl space-y-1.5">
                  <span className="block text-[8px] font-mono text-stone-400 uppercase tracking-wider">Copie o Domínio do App:</span>
                  <div className="flex items-center justify-between gap-2.5 bg-black rounded p-2 border border-stone-850">
                    <code className="text-xs text-yellow-450 font-mono break-all select-all">{domainErrorAlert.domain}</code>
                    <button 
                      onClick={handleCopyDomain}
                      className="p-1.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 transition shrink-0 border border-stone-800"
                    >
                      {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* STEP-BY-STEP INSTRUCTIONS */}
                <div className="space-y-2 text-[10.5px] text-stone-300 font-sans">
                  <span className="block font-mono text-[9px] text-stone-400 uppercase tracking-wider font-extrabold pb-0.5">Siga as Etapas de Configuração:</span>
                  
                  <div className="flex gap-2 items-start leading-relaxed">
                    <span className="font-mono font-bold text-yellow-450 bg-stone-900 rounded h-4 w-4 flex items-center justify-center shrink-0 border border-stone-850 text-[9px] mt-0.5">1</span>
                    <p>Acesse o <a href={`https://console.firebase.google.com/project/${auth.app.options.projectId || 'triarc-store'}/authentication/settings`} target="_blank" rel="noreferrer" className="text-yellow-405 hover:underline font-bold">Firebase Console ↗</a> e selecione seu projeto.</p>
                  </div>

                  <div className="flex gap-2 items-start leading-relaxed">
                    <span className="font-mono font-bold text-yellow-450 bg-stone-900 rounded h-4 w-4 flex items-center justify-center shrink-0 border border-stone-850 text-[9px] mt-0.5">2</span>
                    <p>Entre em **Build** &gt; **Authentication** no menu esquerdo.</p>
                  </div>

                  <div className="flex gap-2 items-start leading-relaxed">
                    <span className="font-mono font-bold text-yellow-450 bg-stone-900 rounded h-4 w-4 flex items-center justify-center shrink-0 border border-stone-850 text-[9px] mt-0.5">3</span>
                    <p>Clique em **Configurações** (Settings) e avance até **Domínios Autorizados** (Authorized domains).</p>
                  </div>

                  <div className="flex gap-2 items-start leading-relaxed">
                    <span className="font-mono font-bold text-yellow-450 bg-stone-900 rounded h-4 w-4 flex items-center justify-center shrink-0 border border-stone-850 text-[9px] mt-0.5">4</span>
                    <p>Adicione um novo registro e cole o domínio copiado acima.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setDomainErrorAlert(null)}
                  className="w-full py-2.5 bg-yellow-500 text-stone-950 font-mono text-[10px] uppercase font-bold tracking-widest rounded-lg transition active:scale-[0.98]"
                >
                  Entendi, vou configurar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDomainErrorAlert(null);
                    setAuthMode('login');
                  }}
                  className="w-full py-2 bg-stone-900/50 hover:bg-stone-900 text-stone-400 text-[10px] font-mono uppercase tracking-wide rounded-lg transition border border-stone-850"
                >
                  Usar e-mail e senha (Não requer domínio)
                </button>
              </div>
            </motion.div>
          )}

          {/* HEADING HEADER SECTIONS */}
          <div className="text-center space-y-2">
            <span className="inline-flex rounded-full bg-amber-500/10 p-2 border border-amber-500/20 text-amber-400">
              {authMode === 'phone' ? (
                <Smartphone className="w-5 h-5 animate-pulse" />
              ) : (
                <Lock className="w-5 h-5 animate-pulse" />
              )}
            </span>
            <div>
              <span className="block font-mono text-[9px] tracking-[0.3em] text-amber-500 uppercase font-black">
                {authMode === 'login' ? "Entrada de Membro" : authMode === 'register' ? "Novo Perfil Atleta" : "Conexão via Celular"}
              </span>
              <h3 className="font-serif text-2xl font-bold text-stone-100 tracking-tight uppercase mt-1">
                {authMode === 'login' ? "Conecte sua Conta" : authMode === 'register' ? "Crie sua Conta" : "Login via SMS"}
              </h3>
              <p className="text-[11px] text-stone-500 font-sans leading-relaxed mt-1">
                Ative seu perfil seguro para comprar, ganhar cupons automáticos e acompanhar a expedição das suas roupas de compressão.
              </p>
            </div>
          </div>

          {/* COMPACT SEGMENTED SWITCH METHOD TABS */}
          <div className="grid grid-cols-3 gap-1 bg-stone-950 p-1 rounded-xl border border-stone-900 text-center text-[9px] font-mono uppercase font-black">
            <button
              onClick={() => handleToggleMode('login')}
              className={`rounded-lg py-1.5 transition duration-200 cursor-pointer ${
                authMode === 'login' 
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => handleToggleMode('register')}
              className={`rounded-lg py-1.5 transition duration-200 cursor-pointer ${
                authMode === 'register' 
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              REGISTRAR
            </button>
            <button
              onClick={() => handleToggleMode('phone')}
              className={`rounded-lg py-1.5 transition duration-200 cursor-pointer ${
                authMode === 'phone' 
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              CELULAR/SMS
            </button>
          </div>

          {/* FORM CONTAINER */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 text-[11px] rounded-lg bg-red-950/40 border border-red-500/15 text-red-400 font-sans"
              >
                ⚠️ {errorMessage}
              </motion.div>
            )}

            {/* FIELD SEGMENTS DEPENDING ON MODE */}
            <div className="space-y-3.5">
              
              {/* REGISTER EXTRAS */}
              {authMode === 'register' && (
                <div className="space-y-1.5 animate-[fadeIn_0.3s_ease]">
                  <label className="block text-[9px] font-mono uppercase text-stone-550 tracking-wider">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-stone-650" />
                    <input
                      type="text"
                      placeholder="Ex: Guilherme Santos"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs rounded-xl border border-stone-850 bg-stone-950/80 pl-9 pr-4 py-2.5 text-stone-200 placeholder-stone-700 font-sans focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/10 transition-all duration-300"
                    />
                  </div>
                </div>
              )}

              {/* EMAIL/PASSWORD FORMS */}
              {authMode !== 'phone' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono uppercase text-stone-550 tracking-wider">Endereço de E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-650" />
                      <input
                        type="email"
                        required
                        placeholder="atleta@triarc.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs rounded-xl border border-stone-850 bg-stone-950/80 pl-9 pr-4 py-2.5 text-stone-200 placeholder-stone-700 font-sans focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/10 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono uppercase text-stone-550 tracking-wider">Senha de Segurança</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-650" />
                      <input
                        type="password"
                        required
                        placeholder={authMode === 'login' ? "Insira sua senha" : "Crie uma senha forte (mín. 6 dígitos)"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs rounded-xl border border-stone-850 bg-stone-950/80 pl-9 pr-4 py-2.5 text-stone-200 placeholder-stone-700 font-sans focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/10 transition-all duration-300"
                      />
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <div className="space-y-1.5 animate-[fadeIn_0.3s_ease]">
                      <label className="block text-[9px] font-mono uppercase text-stone-550 tracking-wider">Confirmar Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-stone-650" />
                        <input
                          type="password"
                          required
                          placeholder="Repita a senha longa"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full text-xs rounded-xl border border-stone-850 bg-stone-950/80 pl-9 pr-4 py-2.5 text-stone-200 placeholder-stone-700 font-sans focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/10 transition-all duration-300"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* PHONE NUMBER AUTHS & SMS VERIFICATION INPUTS */
                <div className="space-y-3.5">
                  {!isOtpSent ? (
                    <div className="space-y-1.5 animate-[fadeIn_0.3s_ease]">
                      <label className="block text-[9px] font-mono uppercase text-stone-550 tracking-wider">Número de Celular</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-stone-650" />
                        <input
                          type="tel"
                          required
                          placeholder="DDD + Celular (ex: 11 99999-9999)"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full text-xs rounded-xl border border-stone-850 bg-stone-950/80 pl-9 pr-4 py-2.5 text-stone-200 placeholder-stone-700 font-sans focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/10 transition-all duration-300"
                        />
                      </div>
                      <span className="block text-[9px] text-stone-550 leading-relaxed font-sans mt-1">
                        Utilizaremos o framework seguro do Firebase Phone Auth para autenticar de forma instantânea sem requerer senhas. Preencha corretamente com o DDD nacional.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-[fadeIn_0.3s_ease]">
                      <div className="bg-stone-950 border border-stone-900 rounded-xl p-3 flex justify-between items-center text-xs">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-stone-500 uppercase">SMS enviado para:</span>
                          <span className="font-mono text-stone-300 font-bold">{phoneNumber}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOtpSent(false);
                            setVerificationCode('');
                          }}
                          className="text-[9px] font-mono text-yellow-450 uppercase underline font-bold"
                        >
                          Alterar Celular
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-mono uppercase text-stone-550 tracking-wider">Código de Confirmação (6 Dígitos)</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="Digite os 6 dígitos recebidos"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full text-xs rounded-xl border border-stone-850 bg-stone-950/80 px-4 py-2.5 text-stone-200 placeholder-stone-700 font-mono tracking-[0.6em] text-center focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/10 transition-all duration-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* MASTER SUBMIT ACTION BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-mono text-[11px] uppercase font-black tracking-widest rounded-xl transition duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {authMode === 'phone' ? (
                isOtpSent ? (
                  <>
                    <LogIn className="w-4 h-4 text-stone-950" />
                    <span>CONFIRMAR AGORA</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 text-stone-950" />
                    <span>ENVIAR CÓDIGO SMS</span>
                  </>
                )
              ) : authMode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4 text-stone-950" />
                  <span>CONECTAR SESSÃO</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-stone-950" />
                  <span>REGISTRAR PERFIL</span>
                </>
              )}
            </button>
          </form>

          {/* Separation divider line */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-900" />
            </div>
            <div className="relative flex justify-center text-[9px] uppercase font-mono tracking-wider">
              <span className="bg-[#0c0c0c] px-3 text-stone-600">Ou use conectores estendidos</span>
            </div>
          </div>

          {/* Social login option */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-2.5 bg-stone-950 hover:bg-stone-900 border border-stone-850 text-stone-300 hover:text-white font-mono text-[10px] uppercase font-bold rounded-xl tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer animate-[fadeIn_0.5s_ease]"
          >
            <svg className="w-3.5 h-3.5 mr-0.5" viewBox="0 0 24 24" width="100%" height="100%">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com o Google
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
