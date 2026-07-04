import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Monitor, 
  Moon, 
  Sun, 
  Key, 
  Folder, 
  Plus, 
  Trash2, 
  Upload, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  MessageCircle, 
  Bell, 
  BellOff, 
  Cloud, 
  RefreshCw, 
  User, 
  Sparkles, 
  Download, 
  LogOut, 
  LogIn 
} from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppSettings, NoteGroup, Note, UserProfile } from '../types';
import ConfirmModal from './ConfirmModal';
import { importFromNtsContent } from '../lib/sync';
import UserProfileBlock from './UserProfileBlock';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  groups: NoteGroup[];
  onAddGroup: (name: string) => void;
  onDeleteGroup: (id: string) => void;
  onGoHome: () => void;
  onImportNotes: (notes: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  userProfile: UserProfile | null;
  onUpdateUserProfile: (updates: Partial<UserProfile>) => void;
  
  // Sync & Cloud props
  currentUser: any | null;
  onSignOut: () => void;
  onSignInWithCloud: () => void;
  onExportNts: () => void;
  onImportNts: (data: {
    notes: any[];
    groups: any[];
    tasks: any[];
    taskLists: any[];
    settings: any;
  }) => void;
}

type SettingsTab = 'profil' | 'appearance' | 'folders' | 'rudi' | 'notifications' | 'backup';

export default function Settings({ 
  settings, 
  onUpdateSettings, 
  groups, 
  onAddGroup, 
  onDeleteGroup, 
  onGoHome, 
  onImportNotes,
  userProfile,
  onUpdateUserProfile,
  currentUser,
  onSignOut,
  onSignInWithCloud,
  onExportNts,
  onImportNts
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profil');
  const [profileFirstName, setProfileFirstName] = useState(userProfile?.firstName || '');
  const [profileLastName, setProfileLastName] = useState(userProfile?.lastName || '');
  const [profilePreferredName, setProfilePreferredName] = useState(userProfile?.preferredName || '');
  const [profilePronoun, setProfilePronoun] = useState<'il' | 'elle'>(userProfile?.pronoun || 'il');
  const [newGroupName, setNewGroupName] = useState('');
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ntsFileInputRef = useRef<HTMLInputElement>(null);
  const [ntsError, setNtsError] = useState<string | null>(null);

  // Sync profile fields from props
  useEffect(() => {
    if (userProfile) {
      setProfileFirstName(userProfile.firstName);
      setProfileLastName(userProfile.lastName);
      setProfilePreferredName(userProfile.preferredName || '');
      setProfilePronoun(userProfile.pronoun || 'il');
    }
  }, [userProfile]);
  const [ntsSuccess, setNtsSuccess] = useState<string | null>(null);

  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission>(
    isNotificationSupported ? Notification.permission : 'default'
  );

  // Sync initial notification permissions, checking both Capacitor and browser
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const capPerm = await LocalNotifications.checkPermissions();
        if (capPerm.display === 'granted') {
          setPermission('granted');
          return;
        }
      } catch (err) {
        console.log('Capacitor notifications not initialized or supported in this context.', err);
      }
      
      if (isNotificationSupported) {
        setPermission(Notification.permission);
      }
    };
    checkPermissions();
  }, [isNotificationSupported]);

  const requestPermission = async () => {
    let granted = false;

    // 1. Request Capacitor Local Notification permission on mobile/Android
    try {
      const capPermStatus = await LocalNotifications.requestPermissions();
      if (capPermStatus.display === 'granted') {
        granted = true;
        setPermission('granted');
      }
    } catch (err) {
      console.log('LocalNotifications not supported on this platform, checking standard web notification API:', err);
    }

    // 2. Request standard browser permission as secondary or fallback
    if (isNotificationSupported) {
      try {
        const res = await Notification.requestPermission();
        setPermission(res);
        if (res === 'granted') {
          granted = true;
        }
      } catch (err) {
        console.warn('Failed requesting browser Notification permission:', err);
      }
    }

    if (granted || permission === 'granted') {
      onUpdateSettings({ ...settings, enableNotifications: true });
      
      // Dispatch custom event to trigger elegant in-app Android-style notification banner
      window.dispatchEvent(new CustomEvent('app-trigger-test-notification', {
        detail: {
          title: "Notes Copilot",
          body: "Félicitations ! Les notifications système sont maintenant configurées et prêtes."
        }
      }));

      // Schedule a real native/system local notification
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 999,
              title: "Notes Copilot",
              body: "Les notifications système sont correctement configurées !",
              schedule: { at: new Date(Date.now() + 1000) }
            }
          ]
        });
      } catch (e) {
        console.log("Capacitor LocalNotification schedule skipped or unsupported.");
      }

      // Show standard web notification
      if (isNotificationSupported && Notification.permission === 'granted') {
        try {
          new Notification("Notes Copilot", {
            body: "Notifications activées avec succès ! Vous recevrez des alertes pour vos tâches.",
            icon: "/favicon.ico"
          });
        } catch (err) {
          console.warn("Failed to trigger welcome web notification:", err);
        }
      }
    }
  };

  const handleToggleNotifications = () => {
    const nextValue = !settings.enableNotifications;
    onUpdateSettings({ ...settings, enableNotifications: nextValue });
    if (nextValue && permission !== 'granted') {
      requestPermission();
    }
  };

  const triggerTestNotification = async () => {
    // Force permission check or request
    if (permission !== 'granted') {
      await requestPermission();
    }

    // Dispatch elegant internal Android-style toast immediately
    window.dispatchEvent(new CustomEvent('app-trigger-test-notification', {
      detail: {
        title: "Tâche urgente : Finaliser le design",
        body: "L'heure de l'échéance est dépassée. Veuillez vérifier les détails de votre liste.",
        listName: "Professionnel",
        isTest: true
      }
    }));

    // Trigger system-level native notification too
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 10000),
            title: "Tâche urgente : Finaliser le design",
            body: "L'heure de l'échéance est dépassée. Liste : Professionnel.",
            schedule: { at: new Date(Date.now() + 500) }
          }
        ]
      });
    } catch (e) {
      console.log("Capacitor local notification schedule skipped in browser.");
    }

    if (isNotificationSupported && Notification.permission === 'granted') {
      try {
        new Notification("Tâche urgente : Finaliser le design", {
          body: "L'heure de l'échéance est dépassée. Liste : Professionnel.",
          icon: "/favicon.ico"
        });
      } catch (e) {
        console.warn("Browser notification skipped.");
      }
    }
  };

  const slides = [
    {
      title: "Une IA puissante & gratuite",
      description: "Pour faire fonctionner l'assistant intelligent Rudi (pour organiser vos notes, les résumer ou répondre à vos questions), vous avez besoin d'une clé gratuite d'utilisation."
    },
    {
      title: "Génération en 2 clics",
      description: "Cliquez sur le bouton ci-dessous pour ouvrir Google AI Studio. Connectez-vous avec votre compte Google et générez votre clé en quelques secondes."
    },
    {
      title: "Confidentialité totale",
      description: "Votre clé API est stockée de manière 100% sécurisée en local dans le stockage de votre navigateur. Elle n'est jamais envoyée à d'autres serveurs."
    }
  ];

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      onAddGroup(newGroupName.trim());
      setNewGroupName('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newNotes: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            parsed.forEach(item => {
              if (item.title && item.content) {
                newNotes.push({ title: item.title, content: item.content });
              }
            });
          } else if (parsed.title && parsed.content) {
             newNotes.push({ title: parsed.title, content: parsed.content });
          }
        } catch (err) {
          console.error("Erreur de parsing JSON", err);
          alert(`Erreur lors de la lecture de ${file.name}`);
        }
      } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.html?$/i, '');
        
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const content = bodyMatch ? bodyMatch[1] : text;
        
        newNotes.push({ title, content });
      }
    }

    if (newNotes.length > 0) {
      onImportNotes(newNotes);
      alert(`${newNotes.length} note(s) importée(s) avec succès.`);
    } else {
      alert("Aucune note valide trouvée dans les fichiers.");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNtsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setNtsError(null);
    setNtsSuccess(null);

    try {
      const file = files[0];
      const text = await file.text();
      const importedData = importFromNtsContent(text);
      onImportNts(importedData);
      setNtsSuccess("Fichier de sauvegarde .nts restauré avec succès !");
    } catch (err: any) {
      setNtsError(err.message || "Erreur lors de l'importation de la sauvegarde.");
    }

    if (ntsFileInputRef.current) {
      ntsFileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6 md:p-12 font-sans text-stone-900 dark:text-stone-50">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back and Header */}
        <header className="flex items-center gap-4">
          <button 
            onClick={onGoHome}
            className="p-2 -ml-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">Paramètres</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">Gérez l'apparence, l'IA, vos dossiers et la synchronisation.</p>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 overflow-x-auto gap-2 pb-px scrollbar-none">
          <button
            onClick={() => setActiveTab('profil')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 flex items-center justify-center md:justify-start gap-2 ${
              activeTab === 'profil'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden md:inline">Profil</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 flex items-center justify-center md:justify-start gap-2 ${
              activeTab === 'appearance'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span className="hidden md:inline">Apparence</span>
          </button>

          <button
            onClick={() => setActiveTab('folders')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 flex items-center justify-center md:justify-start gap-2 ${
              activeTab === 'folders'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span className="hidden md:inline">Dossiers</span>
          </button>

          <button
            onClick={() => setActiveTab('rudi')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 flex items-center justify-center md:justify-start gap-2 ${
              activeTab === 'rudi'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden md:inline">Rudi IA</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 flex items-center justify-center md:justify-start gap-2 ${
              activeTab === 'notifications'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span className="hidden md:inline">Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all shrink-0 flex items-center justify-center md:justify-start gap-2 ${
              activeTab === 'backup'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span className="hidden md:inline">Sauvegarde & Synchro</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="py-4 animate-fadeIn">
          
          {/* TAB: PROFIL */}
          {activeTab === 'profil' && (
            <div className="space-y-6">
              {userProfile && (
                <UserProfileBlock 
                  profile={userProfile} 
                  editable={true} 
                  onUpdateProfile={onUpdateUserProfile} 
                />
              )}
              
              <section className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-6 shadow-xs space-y-4">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Modifier vos informations</h3>
                  
                  <div className="space-y-4">
                    {!userProfile?.isGoogle && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Prénom</label>
                          <input
                            type="text"
                            value={profileFirstName}
                            onChange={(e) => setProfileFirstName(e.target.value)}
                            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Nom</label>
                          <input
                            type="text"
                            value={profileLastName}
                            onChange={(e) => setProfileLastName(e.target.value)}
                            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Prénom préféré</label>
                      <input
                        type="text"
                        value={profilePreferredName}
                        onChange={(e) => setProfilePreferredName(e.target.value)}
                        className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Pronom</label>
                      <select
                        value={profilePronoun}
                        onChange={(e) => setProfilePronoun(e.target.value as 'il' | 'elle')}
                        className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                      >
                        <option value="il">Il</option>
                        <option value="elle">Elle</option>
                      </select>
                    </div>
                    <button
                      onClick={() => onUpdateUserProfile({ 
                        ...(!userProfile?.isGoogle ? { firstName: profileFirstName, lastName: profileLastName } : {}),
                        preferredName: profilePreferredName,
                        pronoun: profilePronoun
                      })}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all text-sm"
                    >
                      Enregistrer les modifications
                    </button>
                  </div>
                </section>
            </div>
          )}

          {/* TAB 1: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-stone-800 dark:text-stone-100">
                  Thème de l'application
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Personnalisez le mode d'affichage général pour votre confort.</p>
                <div className="grid grid-cols-3 gap-4">
                  {(['system', 'light', 'dark'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => onUpdateSettings({ ...settings, theme })}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        settings.theme === theme 
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300' 
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-stone-600 dark:text-stone-400 bg-white dark:bg-stone-900/60'
                      }`}
                    >
                      {theme === 'system' && <Monitor className="w-6 h-6 mb-2" />}
                      {theme === 'light' && <Sun className="w-6 h-6 mb-2" />}
                      {theme === 'dark' && <Moon className="w-6 h-6 mb-2" />}
                      <span className="text-xs font-semibold capitalize">{theme === 'system' ? 'Système' : theme === 'light' ? 'Clair' : 'Sombre'}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-stone-800 dark:text-stone-100">
                  Palette de couleurs
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Choisissez une nuance de couleur d'accent pour l'interface.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['default', 'ocean', 'forest', 'rose'].map((palette) => (
                    <button
                      key={palette}
                      onClick={() => onUpdateSettings({ ...settings, colorPalette: palette as any })}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        (settings.colorPalette || 'default') === palette
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-900/60 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <div className="flex gap-1 mb-3">
                        {palette === 'default' && (
                          <>
                            <div className="w-4 h-4 rounded-full bg-stone-900 dark:bg-stone-100" />
                            <div className="w-4 h-4 rounded-full bg-indigo-500" />
                          </>
                        )}
                        {palette === 'ocean' && (
                          <>
                            <div className="w-4 h-4 rounded-full bg-slate-800 dark:bg-slate-200" />
                            <div className="w-4 h-4 rounded-full bg-sky-500" />
                          </>
                        )}
                        {palette === 'forest' && (
                          <>
                            <div className="w-4 h-4 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                            <div className="w-4 h-4 rounded-full bg-emerald-500" />
                          </>
                        )}
                        {palette === 'rose' && (
                          <>
                            <div className="w-4 h-4 rounded-full bg-orange-800 dark:bg-orange-200" />
                            <div className="w-4 h-4 rounded-full bg-rose-500" />
                          </>
                        )}
                      </div>
                      <span className="text-xs font-semibold capitalize">
                        {palette === 'default' ? 'Classique' : palette === 'ocean' ? 'Océan' : palette === 'forest' ? 'Forêt' : 'Rose'}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: FOLDERS */}
          {activeTab === 'folders' && (
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                  Dossiers (Groupes de notes)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Regroupez vos notes par thématique ou projets en créant des dossiers.</p>
                
                <form onSubmit={handleAddGroup} className="flex gap-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex: Projet X, Personnel, Idées..."
                    className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newGroupName.trim()}
                    className="px-4 py-2.5 bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 rounded-xl font-semibold disabled:opacity-50 transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Créer</span>
                  </button>
                </form>

                {groups.length > 0 ? (
                  <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-100 dark:divide-stone-800 shadow-xs">
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-stone-400" />
                          <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{group.name}</span>
                        </div>
                        <button
                          onClick={() => setGroupToDelete(group.id)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 dark:text-stone-500 italic">Aucun dossier créé pour le moment.</p>
                )}
              </section>

              <section className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                  Importation brute de notes
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Importez des notes à partir de fichiers .json ou .html individuels pour les ajouter à votre espace de travail.
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json,.html,.htm"
                    multiple
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 rounded-xl font-semibold transition-colors flex items-center gap-2 text-xs"
                  >
                    <FileText className="w-4 h-4" />
                    Choisir des fichiers (.json, .html)
                  </label>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: RUDI AI */}
          {activeTab === 'rudi' && (
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                  Clé API Google Gemini
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  L'assistant intelligent Rudi a besoin d'une clé API gratuite pour interpréter vos notes et rédiger du contenu.
                </p>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => onUpdateSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="Collez votre clé : AIzaSy..."
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm"
                />
              </section>

              <section className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                    Modèle d'Intelligence Artificielle
                  </h3>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Gestion des Quotas
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Choisissez le modèle d'IA adapté à vos besoins. Pour préserver les quotas d'appels gratuits de votre clé API, privilégiez les versions <b>Flash Lite</b> ou <b>Flash</b>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      id: 'gemini-3.1-flash-lite',
                      name: 'Gemini 3.1 Flash Lite',
                      badge: 'Quota Éco ++',
                      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
                      desc: 'Le plus léger et ultra-rapide. Consomme un minimum de quota. Idéal pour un usage quotidien intensif.',
                    },
                    {
                      id: 'gemini-3.5-flash',
                      name: 'Gemini 3.5 Flash',
                      badge: 'Recommandé',
                      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
                      desc: 'Excellent équilibre entre rapidité, intelligence et quotas. Parfait pour les résumés et la discussion générale.',
                    },
                    {
                      id: 'gemini-3.1-pro-preview',
                      name: 'Gemini 3.1 Pro (Preview)',
                      badge: 'Créatif / Complexe',
                      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                      desc: 'Le plus intelligent pour le raisonnement complexe. Consomme plus de quota et nécessite parfois une clé payante.',
                    },
                    {
                      id: 'gemini-2.5-flash',
                      name: 'Gemini 2.5 Flash',
                      badge: 'Stable',
                      badgeColor: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300',
                      desc: 'Ancien modèle par défaut stable et polyvalent.',
                    },
                  ].map((model) => {
                    const isSelected = (settings.geminiModel || 'gemini-3.5-flash') === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, geminiModel: model.id as any })}
                        className={`flex flex-col text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-900/10'
                            : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-750 bg-white dark:bg-stone-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 w-full">
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-800 dark:text-stone-200'}`}>
                            {model.name}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${model.badgeColor}`}>
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                          {model.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                <div className="bg-stone-100/50 dark:bg-stone-900/40 border border-stone-200/50 dark:border-stone-800/80 rounded-2xl p-5 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Guide Clé API</span>
                    <div className="flex gap-1.5">
                      {slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                            currentSlide === idx ? 'bg-indigo-500 w-3' : 'bg-stone-300 dark:bg-stone-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[72px] flex flex-col justify-center">
                    <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                      {slides[currentSlide].title}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      {slides[currentSlide].description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-200/50 dark:border-stone-800/50">
                    <div className="flex gap-1">
                      <button
                        onClick={handlePrevSlide}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-250 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNextSlide}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-250 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Obtenir ma clé Gemini gratuite
                    </a>
                  </div>
                </div>

                {/* WhatsApp Support Block */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Un problème de configuration ?
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed max-w-md">
                      Je peux vous aider à obtenir et installer gratuitement votre assistant Rudi sur WhatsApp en quelques instants.
                    </p>
                  </div>
                  <a
                    href="https://wa.me/698389030"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Support
                  </a>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-500" />
                  Notifications & Rappels
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Gérez l'autorisation d'accéder aux notifications système sur votre mobile Android ou navigateur web pour ne rater aucune de vos tâches planifiées.
                </p>

                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                        Rappels de tâches
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Envoyer une alerte lorsque l'échéance d'une tâche est atteinte.
                      </p>
                    </div>
                    <button
                      onClick={handleToggleNotifications}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        settings.enableNotifications && permission === 'granted'
                          ? 'bg-emerald-500'
                          : 'bg-stone-200 dark:bg-stone-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.enableNotifications && permission === 'granted' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
                    <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      Statut des permissions :{' '}
                      <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                        permission === 'granted'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                          : permission === 'denied'
                          ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                          : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {permission === 'granted'
                          ? 'Autorisé'
                          : permission === 'denied'
                          ? 'Bloqué'
                          : 'Non demandé'}
                      </span>
                    </span>

                    {permission !== 'granted' && (
                      <button
                        onClick={requestPermission}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg font-semibold transition-colors cursor-pointer"
                      >
                        Autoriser
                      </button>
                    )}
                  </div>
                </div>

                {/* Android Immersive Notification Preview Showcase */}
                <div className="bg-stone-50 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-800/60 rounded-2xl p-5 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                      Design d'apparition Android Éminent
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Les alertes de rappels s'affichent via un design épuré inspiré des dernières notifications d'Android 15, avec un effet de translucidité, une iconographie moderne et des micro-animations fluides.
                    </p>
                  </div>

                  <button
                    onClick={triggerTestNotification}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Tester le design de notification Android
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: BACKUP & SYNC */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Cloud Sync Account Management */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                  Synchronisation Cloud (Firebase)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Connectez-vous à votre compte Google ou Email pour synchroniser vos notes, dossiers et listes de tâches en temps réel sur tous vos appareils.
                </p>

                {currentUser ? (
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/80 dark:border-emerald-900/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold">
                          {currentUser.email ? currentUser.email[0].toUpperCase() : <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Compte connecté</div>
                          <div className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-xs">{currentUser.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={onSignOut}
                        className="p-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 rounded-xl transition-colors text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Se déconnecter</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 py-1 px-3 rounded-lg w-fit">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Synchronisation en temps réel active</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">Mode Local</h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Vos données sont actuellement sauvées uniquement sur cet appareil.</p>
                      </div>
                      <button
                        onClick={onSignInWithCloud}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Se connecter</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Private .NTS Manual Export & Import */}
              <section className="space-y-4 pt-6 border-t border-stone-200 dark:border-stone-800">
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                  Sauvegarde & Restauration manuelle
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Exportez l'intégralité de vos données (notes, dossiers, tâches, configurations) sous la forme d'un fichier privé <span className="font-bold font-mono">.nts</span> que vous pourrez restaurer à tout moment.
                </p>

                {ntsError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 rounded-xl text-xs flex items-center gap-2">
                    <span>{ntsError}</span>
                  </div>
                )}

                {ntsSuccess && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                    <span>{ntsSuccess}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Export Button */}
                  <button
                    onClick={onExportNts}
                    className="flex-1 py-3 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exporter mon espace (.nts)</span>
                  </button>

                  {/* Import Input */}
                  <div className="flex-1 relative">
                    <input
                      type="file"
                      ref={ntsFileInputRef}
                      onChange={handleNtsUpload}
                      accept=".nts"
                      className="hidden"
                      id="nts-upload"
                    />
                    <label
                      htmlFor="nts-upload"
                      className="w-full py-3 px-4 bg-white dark:bg-stone-900 hover:bg-stone-100/50 dark:hover:bg-stone-850 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                    >
                      <Upload className="w-4 h-4 text-stone-400" />
                      <span>Importer / Restaurer un fichier (.nts)</span>
                    </label>
                  </div>
                </div>
              </section>
            </div>
          )}

        </div>
      </div>

      <ConfirmModal
        isOpen={groupToDelete !== null}
        title="Supprimer le dossier"
        message="Êtes-vous sûr de vouloir supprimer ce dossier ? Les notes contenues ne seront pas supprimées mais perdront leur affectation à ce dossier."
        confirmText="Supprimer"
        onConfirm={() => {
          if (groupToDelete) {
            onDeleteGroup(groupToDelete);
            setGroupToDelete(null);
          }
        }}
        onCancel={() => setGroupToDelete(null)}
      />
    </div>
  );
}
