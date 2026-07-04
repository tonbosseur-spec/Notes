import React, { useState, useEffect } from 'react';
import { Book, Settings as SettingsIcon, FileText, ArrowRight, Bot, CheckSquare, Maximize2, Minimize2 } from 'lucide-react';
import { Note, UserProfile } from '../types';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import UserProfileBlock from './UserProfileBlock';

interface HomeProps {
  onNavigate: (view: 'notes' | 'settings' | 'tasks') => void;
  recentNote: Note | null;
  onOpenNote: (id: string) => void;
  onOpenRudi: () => void;
  userProfile: UserProfile | null;
}

export default function Home({ onNavigate, recentNote, onOpenNote, onOpenRudi, userProfile }: HomeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch((err) => {
        console.warn("Could not set overlaysWebView:", err);
      });
    }

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const nextFullscreen = !isFullscreen;
    setIsFullscreen(nextFullscreen);

    if (nextFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn("Standard fullscreen failed or blocked:", err);
        });
      }
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.hide();
        } catch (err) {
          console.warn("Capacitor StatusBar hide failed:", err);
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn("Standard exit fullscreen failed:", err);
        });
      }
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.show();
        } catch (err) {
          console.warn("Capacitor StatusBar show failed:", err);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center p-4 sm:p-6 md:p-12">
      {/* Top Header / Navigation Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center py-4 mb-6 sm:mb-8 border-b border-stone-200/40 dark:border-stone-800/40">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-indigo-500" />
          <span className="font-extrabold text-base sm:text-lg text-stone-800 dark:text-stone-100 tracking-tight">Notes Copilot</span>
        </div>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}
          className="py-2 px-3 sm:py-2.5 sm:px-4 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 rounded-xl sm:rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-md hover:bg-stone-50 dark:hover:bg-stone-850 transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4.5 h-4.5 text-indigo-500" />
              <span className="hidden sm:inline">Quitter plein écran</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4.5 h-4.5 text-indigo-500" />
              <span className="hidden sm:inline">Plein écran</span>
            </>
          )}
        </button>
      </div>

      <div className="max-w-4xl w-full space-y-6 sm:space-y-10 my-auto">
        {userProfile && (
          <UserProfileBlock profile={userProfile} />
        )}

        <header className="space-y-2 sm:space-y-4 text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            Bienvenue sur Notes
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-stone-500 dark:text-stone-400 max-w-xl">
            Votre espace de pensée et d'organisation, disponible partout, même hors-ligne.
          </p>
        </header>

        {/* Tiles: compact 2x2 grid on mobile, elegant 1x4 row on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <button 
            onClick={() => onNavigate('notes')}
            className="flex flex-col text-left p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-6">
              <Book className="w-5 h-5 sm:w-6 h-6" />
            </div>
            <h2 className="text-sm sm:text-lg font-bold text-stone-900 dark:text-stone-50">Notes</h2>
            <p className="text-stone-500 dark:text-stone-400 mt-2 flex-1 text-xs sm:text-sm hidden sm:block">Accédez à l'ensemble de votre carnet.</p>
            <div className="hidden sm:flex items-center text-indigo-600 dark:text-indigo-400 font-medium text-sm group-hover:gap-2 transition-all mt-4">
              Ouvrir <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>

          <button 
            onClick={() => onNavigate('tasks')}
            className="flex flex-col text-left p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-6">
              <CheckSquare className="w-5 h-5 sm:w-6 h-6" />
            </div>
            <h2 className="text-sm sm:text-lg font-bold text-stone-900 dark:text-stone-50">Tâches</h2>
            <p className="text-stone-500 dark:text-stone-400 mt-2 flex-1 text-xs sm:text-sm hidden sm:block">Gérez vos tâches et to-do lists.</p>
            <div className="hidden sm:flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-sm group-hover:gap-2 transition-all mt-4">
              Gérer <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>

          <button 
            onClick={onOpenRudi}
            className="flex flex-col text-left p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900 border border-indigo-200 dark:border-indigo-800/50 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-6">
              <Bot className="w-5 h-5 sm:w-6 h-6" />
            </div>
            <h2 className="text-sm sm:text-lg font-bold text-stone-900 dark:text-stone-50">Rudi</h2>
            <p className="text-stone-500 dark:text-stone-400 mt-2 flex-1 text-xs sm:text-sm hidden sm:block">Posez des questions à votre assistant IA.</p>
            <div className="hidden sm:flex items-center text-indigo-700 dark:text-indigo-400 font-medium text-sm group-hover:gap-2 transition-all mt-4">
              Discuter <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>

          <button 
            onClick={() => onNavigate('settings')}
            className="flex flex-col text-left p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-6">
              <SettingsIcon className="w-5 h-5 sm:w-6 h-6" />
            </div>
            <h2 className="text-sm sm:text-lg font-bold text-stone-900 dark:text-stone-50">Paramètres</h2>
            <p className="text-stone-500 dark:text-stone-400 mt-2 flex-1 text-xs sm:text-sm hidden sm:block">Personnalisez votre espace.</p>
            <div className="hidden sm:flex items-center text-stone-600 dark:text-stone-400 font-medium text-sm group-hover:gap-2 transition-all mt-4">
              Configurer <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>

        {recentNote && (
          <div className="mt-12">
            <h3 className="text-sm font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-4">Note récente</h3>
            <button
              onClick={() => onOpenNote(recentNote.id)}
              className="w-full flex items-start p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors text-left"
            >
              <div className="mt-1 mr-4 text-stone-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                  {recentNote.title || 'Nouvelle note'}
                </h4>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 truncate">
                  {recentNote.content.replace(/<[^>]*>?/gm, '').substring(0, 80) || 'Pas de contenu...'}
                </p>
              </div>
              <div className="text-xs text-stone-400 whitespace-nowrap ml-4">
                {new Intl.DateTimeFormat('fr-FR', { month: 'short', day: 'numeric' }).format(new Date(recentNote.updatedAt))}
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
