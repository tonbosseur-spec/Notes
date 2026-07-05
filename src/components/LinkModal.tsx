import React, { useState, useEffect } from 'react';
import { X, Globe, FileText, CheckSquare, Search } from 'lucide-react';
import { Note, Task } from '../types';

interface LinkModalProps {
  isOpen: boolean;
  initialText: string;
  initialUrl: string;
  notes: Note[];
  tasks: Task[];
  onClose: () => void;
  onSave: (text: string, url: string) => void;
  onRemove: () => void;
}

export default function LinkModal({
  isOpen,
  initialText,
  initialUrl,
  notes,
  tasks,
  onClose,
  onSave,
  onRemove
}: LinkModalProps) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);
  const [tab, setTab] = useState<'url' | 'note' | 'task'>('url');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setUrl(initialUrl);
      
      const safeDecode = (str: string) => {
        try { return decodeURIComponent(str); } catch { return str; }
      };

      if (initialUrl.startsWith('task:') || tasks.some(t => t.title.toLowerCase() === safeDecode(initialUrl).toLowerCase() || t.id === initialUrl)) {
        setTab('task');
        setSearchQuery(initialUrl.startsWith('task:') ? safeDecode(initialUrl.substring(5)) : safeDecode(initialUrl));
      } else if (initialUrl.startsWith('note:') || notes.some(n => n.title.toLowerCase() === safeDecode(initialUrl).toLowerCase() || n.id === initialUrl)) {
        setTab('note');
        setSearchQuery(initialUrl.startsWith('note:') ? safeDecode(initialUrl.substring(5)) : safeDecode(initialUrl));
      } else {
        setTab('url');
        setSearchQuery(initialUrl);
      }
    }
  }, [isOpen, initialText, initialUrl, notes]);

  if (!isOpen) return null;

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSave = () => {
    let finalUrl = '';
    if (tab === 'url') {
      finalUrl = url || searchQuery;
      // Add https:// if it doesn't have a protocol
      if (finalUrl && !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
    } else if (tab === 'note') {
      finalUrl = `note:${searchQuery}`;
    } else if (tab === 'task') {
      finalUrl = `task:${searchQuery}`;
    }
    
    // Fallback to text if no text is provided
    const finalText = text || searchQuery || url;
    onSave(finalText, finalUrl);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-800">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100">Ajouter un lien</h3>
          <button onClick={onClose} className="p-1 rounded-md text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Texte du lien
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Texte à afficher"
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div>
            <div className="flex p-1 bg-stone-100 dark:bg-stone-800/50 rounded-lg mb-3">
              <button
                onClick={() => { setTab('url'); setSearchQuery(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'url' ? 'bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
              >
                <Globe className="w-3.5 h-3.5" /> URL
              </button>
              <button
                onClick={() => { setTab('note'); setSearchQuery(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'note' ? 'bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
              >
                <FileText className="w-3.5 h-3.5" /> Note
              </button>
              <button
                onClick={() => { setTab('task'); setSearchQuery(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'task' ? 'bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Tâche
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (tab === 'url') setUrl(e.target.value);
                }}
                placeholder={tab === 'url' ? 'https://example.com' : tab === 'note' ? 'Rechercher ou créer une note...' : 'Rechercher une tâche...'}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {tab === 'note' && searchQuery && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-900">
                {filteredNotes.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSearchQuery(n.title);
                      if (!text) setText(n.title);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border-b border-stone-100 dark:border-stone-800 last:border-0"
                  >
                    {n.title}
                  </button>
                ))}
                {filteredNotes.length === 0 && (
                  <div className="px-3 py-2 text-sm text-stone-500 dark:text-stone-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Créer "{searchQuery}"
                  </div>
                )}
              </div>
            )}

            {tab === 'task' && searchQuery && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-900">
                {filteredTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSearchQuery(t.title);
                      if (!text) setText(t.title);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border-b border-stone-100 dark:border-stone-800 last:border-0 flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${t.completed ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                    {t.title}
                  </button>
                ))}
                {filteredTasks.length === 0 && (
                  <div className="px-3 py-2 text-sm text-stone-500 dark:text-stone-400">
                    Aucune tâche trouvée.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 bg-stone-50 dark:bg-stone-950/50 border-t border-stone-100 dark:border-stone-800 flex justify-between gap-3">
          {initialUrl ? (
            <button
              onClick={onRemove}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              Supprimer le lien
            </button>
          ) : (
            <div></div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!searchQuery && !url}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
