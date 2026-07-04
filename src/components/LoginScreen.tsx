import React, { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from '../lib/firebase';
import { Book, CheckSquare, Mail, Lock, ArrowRight, Database, Chrome, AlertCircle, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (userId: string | null) => void; // null for local mode
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if we are running in an iframe (AI Studio preview iframe)
  const isInIframe = window.self !== window.top;
  const isAndroid = /Android/i.test(navigator.userAgent);

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          onLoginSuccess(result.user.uid);
        }
      } catch (err: any) {
        console.error("Redirect Result Error:", err);
        // Don't show error immediately as getRedirectResult can fire on normal loads
        if (err.code && err.code !== 'auth/no-recent-login') {
          setError(`Erreur redirection (${err.code}) : ${err.message}`);
        }
      }
    };
    checkRedirect();
  }, [onLoginSuccess]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      // Skill: Prefer signInWithPopup because AI Studio environment allowlists the javascript URL
      // but doesn't automatically update redirect URLs for signInWithRedirect.
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onLoginSuccess(result.user.uid);
      }
    } catch (err: any) {
      console.error("Google Auth Popup Error Details:", {
        code: err.code,
        message: err.message,
        customData: err.customData,
        email: err.customData?.email
      });
      
      if (err.code === 'auth/popup-blocked') {
        setError("La fenêtre de connexion Google a été bloquée. Veuillez autoriser les popups ou utiliser la connexion par 'Redirection' ci-dessous.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("La connexion Google n'est pas activée dans votre console Firebase (Authentification > Sign-in method).");
      } else if (err.code === 'auth/web-storage-unsupported' || err.message?.includes('storage')) {
        setError("Le stockage web/cookies tiers sont bloqués. Vous DEVEZ ouvrir l'application dans un NOUVEL ONGLET pour vous connecter.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domaine non autorisé : ${window.location.hostname}. Ajoutez-le dans : Console Firebase > Authentification > Paramètres > Domaines autorisés.`);
      } else {
        setError(`Erreur Firebase (${err.code || 'inconnue'}) : ${err.message}. Assurez-vous que le domaine est autorisé et que Google Auth est activé.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInRedirect = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Auth Redirect Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Domaine non autorisé : ${window.location.hostname}.`);
      } else {
        setError(`Erreur de redirection : ${err.message} (${err.code})`);
      }
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (result.user) {
          onLoginSuccess(result.user.uid);
        }
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (result.user) {
          onLoginSuccess(result.user.uid);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Email ou mot de passe incorrect.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Cette adresse email est déjà associée à un compte.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Format d'adresse email invalide.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("La connexion par Email/Mot de passe n'est pas activée dans votre console Firebase. Veuillez l'activer dans : Console Firebase > Authentication > Sign-in method > Email/Password.");
      } else {
        setError(`Erreur d'authentification par email : ${err.message || err} (Code: ${err.code || 'inconnu'}).`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden select-none">
      {/* Decorative subtle ambient lights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-8 shadow-2xl space-y-8 relative z-10 transition-all">
        {/* App Logo & Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-inner mb-2">
            <Book className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            Notes Copilot
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Votre espace d'écriture intelligent, synchronisé partout en temps réel.
          </p>
        </div>

        {/* Warning about Iframe/Android limitations */}
        {(isInIframe || isAndroid || error) && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50 rounded-2xl flex flex-col gap-2 text-xs leading-relaxed animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold mb-1">Guide de résolution :</p>
                <ul className="list-disc pl-4 space-y-1 opacity-90">
                  <li><b>Web :</b> Ouvrez l'application dans un <b>nouvel onglet</b> (bouton en haut à droite).</li>
                  <li><b>Android (APK) :</b> Enregistrez le certificat <b>SHA-1</b> dans votre console Firebase.</li>
                  <li><b>Firebase :</b> Vérifiez que <b>{window.location.hostname}</b> est dans les "Domaines autorisés".</li>
                  <li><b>Activation :</b> Vérifiez que "Google" est activé dans "Sign-in methods".</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 rounded-2xl flex items-start gap-3 text-xs animate-fadeIn text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Erreur rencontrée :</p>
                <p className="opacity-90 break-words">{error}</p>
              </div>
            </div>
            
            {/* Fallback for redirection if popup fails */}
            {!isEmailMode && (
              <button
                onClick={handleGoogleSignInRedirect}
                className="w-full py-2.5 px-4 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-all cursor-pointer"
              >
                Essayer la connexion par redirection
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-sm text-stone-500 dark:text-stone-400">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span>Authentification en cours...</span>
          </div>
        ) : !isEmailMode ? (
          /* Main OAuth / Mode selection */
          <div className="space-y-4">
            {/* Google Login */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-4 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 text-stone-700 dark:text-stone-200 font-semibold rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              {/* Custom SVG Google logo */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.93 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.86 3C6.27 7.55 8.91 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.45c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.73-4.92 3.73-8.54z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.36 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.5 6.9c-.83 1.66-1.3 3.53-1.3 5.5s.47 3.84 1.3 5.5l3.86-3.4z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.68-2.33 1.09-4.27 1.09-3.09 0-5.73-2.51-6.66-5.46l-3.86 3c1.89 3.85 5.85 6.5 10.5 6.5z"
                />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            {/* Email Login/Register trigger */}
            <button
              onClick={() => setIsEmailMode(true)}
              className="w-full py-3.5 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-5 h-5" />
              <span>Se connecter par Email</span>
            </button>

            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200 dark:border-stone-800" />
              </div>
              <span className="relative px-3 bg-white dark:bg-stone-900 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Ou sans compte
              </span>
            </div>

            {/* Local Sign in */}
            <button
              onClick={() => onLoginSuccess(null)}
              className="w-full py-3.5 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Database className="w-4 h-4 text-stone-500" />
              <span>Utiliser en local (hors ligne)</span>
              <ArrowRight className="w-4 h-4 text-stone-400" />
            </button>

            <p className="text-[11px] text-center text-stone-400 pt-2">
              Le mode local enregistre vos données sur cet appareil uniquement. Vous pourrez lier un compte cloud plus tard.
            </p>
          </div>
        ) : (
          /* Email / Password Form */
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                Adresse email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800 focus:border-indigo-500 focus:outline-none rounded-xl text-sm transition-colors"
                  required
                />
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                Mot de passe (6+ caractères)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800 focus:border-indigo-500 focus:outline-none rounded-xl text-sm transition-colors"
                  required
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              <span>{isSignUp ? "Créer mon compte" : "Se connecter"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-2 pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-indigo-500 hover:underline font-semibold"
              >
                {isSignUp ? "Déjà un compte ? Connectez-vous" : "Pas encore de compte ? Inscrivez-vous"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEmailMode(false);
                  setError(null);
                }}
                className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
              >
                Retour aux options de connexion
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
