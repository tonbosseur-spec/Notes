import React, { useState, useEffect, useRef } from 'react';
import { 
  MoreHorizontal, 
  Trash2, 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  Wand2,
  Sparkles,
  Loader2,
  Check,
  Folder,
  Plus,
  Copy,
  Scissors,
  Tag,
  Calendar,
  Lock,
  Unlock,
  Shield,
  Key,
  ShieldAlert
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Note, NoteGroup, UserProfile } from '../types';

import ConfirmModal from './ConfirmModal';

interface EditorProps {
  note: Note;
  apiKey: string;
  geminiModel?: string;
  groups: NoteGroup[];
  onAddGroup: (name: string) => string;
  onUpdate: (updates: Partial<Note>) => void;
  onDelete: () => void;
  userProfile: UserProfile | null;
}

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
};

const MenuBar = ({ 
  editor, 
  onSummarize, 
  onOrganize, 
  onRewrite, 
  isProcessingAi,
  hasSelection
}: { 
  editor: any, 
  onSummarize: () => void, 
  onOrganize: () => void, 
  onRewrite: () => void, 
  isProcessingAi: boolean,
  hasSelection: boolean
}) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4 border-b border-stone-200/50 dark:border-stone-800/50 pb-3">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
        title="Gras"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
        title="Italique"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('strike') ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
        title="Barré"
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      
      <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
        title="Titre 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
        title="Titre 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      
      <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />
      
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('bulletList') ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
        title="Liste à puces"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded-md transition-colors ${editor.isActive('orderedList') ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
        title="Liste numérotée"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      {/* Barre de sélection contextuelle intégrée : évite les conflits de popups sur Android */}
      {hasSelection && (
        <>
          <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />
          <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-lg border border-indigo-100/40 dark:border-indigo-900/40 transition-all duration-200 animate-fadeIn">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider px-1 hidden xs:inline">
              Sélection
            </span>
            <button
              onClick={() => {
                const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
                navigator.clipboard.writeText(text);
              }}
              className="p-1 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
              title="Copier la sélection"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
                navigator.clipboard.writeText(text);
                editor.chain().focus().deleteSelection().run();
              }}
              className="p-1 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
              title="Couper la sélection"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRewrite}
              disabled={isProcessingAi}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors disabled:opacity-50"
              title="Améliorer la sélection avec Rudi"
            >
              {isProcessingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              <span>Rudi</span>
            </button>
          </div>
        </>
      )}

      <div className="flex-1 min-w-[8px]" />

      <button
        onClick={onOrganize}
        disabled={isProcessingAi || editor.isEmpty}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Organiser avec l'IA"
      >
        {isProcessingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">Organiser</span>
      </button>
      <button
        onClick={onSummarize}
        disabled={isProcessingAi || editor.isEmpty}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Résumer avec l'IA"
      >
        {isProcessingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">Résumer</span>
      </button>
    </div>
  );
};

export default function Editor({ note, apiKey, geminiModel, groups, onAddGroup, onUpdate, onDelete, userProfile }: EditorProps) {
  const [title, setTitle] = useState(note.title);
  const [showMenu, setShowMenu] = useState(false);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [lockPassword, setLockPassword] = useState('');
  const [isLockingModalOpen, setIsLockingModalOpen] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const currentNoteId = useRef(note.id);

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content,
    editorProps: {
      attributes: {
        class: 'text-base md:text-lg leading-relaxed text-stone-700 dark:text-stone-300 bg-transparent border-none outline-none resize-none',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate({ content: editor.getHTML() });
    },
    onSelectionUpdate: ({ editor }) => {
      setHasSelection(!editor.state.selection.empty);
    },
  });

  // Sync state when note changes from external (e.g. sidebar click)
  useEffect(() => {
    if (note.id !== currentNoteId.current) {
      setTitle(note.title);
      setShowMenu(false);
      setSummary(null);
      setIsProcessingAi(false);
      setIsCreatingGroup(false);
      setNewGroupName('');
      setHasSelection(false);
      setIsSessionUnlocked(false);
      setUnlockPassword('');
      setLockError(null);
      currentNoteId.current = note.id;
      
      if (editor) {
        editor.commands.setContent(note.content);
      }
    }
  }, [note.id, note.title, note.content, editor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onUpdate({ title: newTitle });
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      const newId = onAddGroup(newGroupName.trim());
      onUpdate({ groupId: newId });
      setNewGroupName('');
      setIsCreatingGroup(false);
    }
  };

  const handleUnlock = () => {
    if (unlockPassword === note.password) {
      setIsSessionUnlocked(true);
      setLockError(null);
    } else {
      setLockError('Mot de passe incorrect');
    }
  };

  const handleLock = () => {
    if (!lockPassword) {
      setLockError('Veuillez saisir un mot de passe');
      return;
    }
    onUpdate({ 
      isLocked: true, 
      password: lockPassword 
    });
    setIsSessionUnlocked(true);
    setIsLockingModalOpen(false);
    setLockPassword('');
    setLockError(null);
  };

  const handleToggleLock = () => {
    if (note.isLocked) {
      onUpdate({ isLocked: false, password: undefined });
      setIsSessionUnlocked(false);
    } else {
      setLockError(null);
      setIsLockingModalOpen(true);
    }
  };

  const handleSummarize = async () => {
    if (!editor || editor.isEmpty) return;
    
    setIsProcessingAi(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }
      if (geminiModel) {
        headers['x-gemini-model'] = geminiModel;
      }
      
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: editor.getText(), userProfile }),
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Le serveur a renvoyé une réponse invalide (HTML au lieu de JSON).');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération du résumé');
      }
      
      setSummary(data.summary);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erreur lors de la génération du résumé');
    } finally {
      setIsProcessingAi(false);
    }
  };

  const handleOrganize = async () => {
    if (!editor || editor.isEmpty) return;
    
    setIsProcessingAi(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }
      if (geminiModel) {
        headers['x-gemini-model'] = geminiModel;
      }
      
      const response = await fetch('/api/ai/organize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: editor.getText(), userProfile }),
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Le serveur a renvoyé une réponse invalide (HTML au lieu de JSON).');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réorganisation');
      }
      
      editor.commands.setContent(data.organizedContent);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erreur lors de la réorganisation');
    } finally {
      setIsProcessingAi(false);
    }
  };

  const handleRewrite = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText) return;

    setIsProcessingAi(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }
      if (geminiModel) {
        headers['x-gemini-model'] = geminiModel;
      }
      
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: selectedText, userProfile }),
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Le serveur a renvoyé une réponse invalide (HTML au lieu de JSON).');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réécriture');
      }
      
      editor.chain().focus().deleteSelection().insertContent(data.text).run();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erreur lors de la réécriture');
    } finally {
      setIsProcessingAi(false);
    }
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('fr-FR', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(new Date(ts));
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col px-6 py-8 md:px-12 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <span className="text-xs font-medium text-stone-400 tracking-wider uppercase">
          {formatDate(note.updatedAt)}
        </span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleLock}
            className={`p-1.5 rounded-md transition-all duration-300 ${
              note.isLocked 
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' 
                : 'text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title={note.isLocked ? "Supprimer la protection" : "Protéger par mot de passe"}
          >
            {note.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl py-2 z-10">
              
              <div className="px-2 pb-2 mb-2 border-b border-stone-100 dark:border-stone-800">
                <div className="text-[10px] font-bold text-stone-400 dark:text-stone-500 mb-1.5 px-2 uppercase tracking-wider">
                  Dossier
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5 mb-1.5">
                  {groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => {
                        onUpdate({ groupId: group.id === note.groupId ? undefined : group.id });
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg flex items-center justify-between transition-colors"
                    >
                      <span className="truncate pr-2">{group.name}</span>
                      {note.groupId === group.id && <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
                
                {isCreatingGroup ? (
                  <div className="px-1 mt-1">
                    <input 
                      autoFocus
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateGroup();
                        if (e.key === 'Escape') setIsCreatingGroup(false);
                      }}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Nouveau dossier..."
                    />
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsCreatingGroup(true)}
                    className="w-full text-left px-2 py-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg flex items-center gap-2 transition-colors mt-0.5"
                  >
                    <Plus className="w-4 h-4" /> Ajouter un dossier
                  </button>
                )}
              </div>

              <div className="px-2">
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer la note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {(note.isLocked && !isSessionUnlocked) ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/30 rounded-3xl flex items-center justify-center mb-6 animate-pulse shadow-sm">
            <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">Note Verrouillée</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-8 max-w-xs leading-relaxed">
            Cette note contient des informations sensibles et nécessite un mot de passe pour être consultée.
          </p>
          
          <div className="w-full max-w-xs space-y-3">
            <div className="relative group">
              <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-amber-500 transition-colors" />
              <input
                type="password"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                placeholder="Mot de passe..."
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-stone-900 dark:text-stone-100 shadow-sm"
                autoFocus
              />
            </div>
            
            {lockError && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30 animate-shake">
                <ShieldAlert className="w-3.5 h-3.5" />
                {lockError}
              </div>
            )}
            
            <button
              onClick={handleUnlock}
              className="w-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-bold py-3.5 rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-stone-900/10 dark:shadow-stone-100/5 mt-2"
            >
              Déverrouiller la note
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
        placeholder="Titre de la note"
        className="text-3xl md:text-4xl font-semibold text-stone-900 dark:text-stone-100 bg-transparent border-none outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600 mb-2"
      />
      
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-2 py-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <input
                type="date"
                value={note.dueDate || ''}
                onChange={(e) => onUpdate({ dueDate: e.target.value })}
                className="text-xs text-stone-600 dark:text-stone-300 bg-transparent border-none outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2 px-2 py-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg flex-1 min-w-[140px] max-w-[200px]">
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={note.tag || ''}
                onChange={(e) => onUpdate({ tag: e.target.value })}
                placeholder="Catégorie..."
                className="text-xs text-stone-600 dark:text-stone-300 bg-transparent border-none outline-none w-full placeholder:text-stone-300 dark:placeholder:text-stone-600"
              />
            </div>

            {note.isLocked && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider animate-fadeIn">
                <Shield className="w-3 h-3" />
                Protégé
              </div>
            )}
          </div>
      
      <MenuBar 
        editor={editor} 
        onSummarize={handleSummarize} 
        onOrganize={handleOrganize} 
        onRewrite={handleRewrite}
        isProcessingAi={isProcessingAi} 
        hasSelection={hasSelection}
      />
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 prose-dark">
        {summary && (
          <div className="mb-6 p-4 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl relative">
            <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Résumé IA</h3>
            </div>
            <p className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">{summary}</p>
            <button 
              onClick={() => setSummary(null)}
              className="absolute top-3 right-3 text-emerald-400 dark:text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        {editor && !isMobileDevice() && (
          <BubbleMenu editor={editor} className="flex items-center gap-1 p-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
              title="Gras"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
              title="Italique"
            >
              <Italic className="w-4 h-4" />
            </button>
            
            <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />
            
            <button
              onClick={() => {
                const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
                navigator.clipboard.writeText(text);
              }}
              className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"
              title="Copier"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
                navigator.clipboard.writeText(text);
                editor.chain().focus().deleteSelection().run();
              }}
              className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"
              title="Couper"
            >
              <Scissors className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

            <button
              onClick={handleRewrite}
              disabled={isProcessingAi}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Améliorer le texte"
            >
              {isProcessingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Rudi</span>
            </button>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>
    </>
  )}

    {/* Lock Setup Modal */}
    {isLockingModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-scaleIn">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Protéger cette note</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Définissez un mot de passe pour verrouiller l'accès.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase px-1">Nouveau mot de passe</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  value={lockPassword}
                  onChange={(e) => setLockPassword(e.target.value)}
                  placeholder="Saisissez un mot de passe..."
                  className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 transition-all text-stone-900 dark:text-stone-100"
                  autoFocus
                />
              </div>
            </div>

            {lockError && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30">{lockError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsLockingModalOpen(false)}
                className="flex-1 py-3 text-sm font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleLock}
                className="flex-1 py-3 text-sm font-bold bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 rounded-xl hover:opacity-90 transition-opacity"
              >
                Verrouiller
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <ConfirmModal
      isOpen={showDeleteConfirm}
      title="Supprimer la note"
      message="Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible."
      confirmText="Supprimer"
      onConfirm={() => {
        setShowDeleteConfirm(false);
        onDelete();
      }}
      onCancel={() => setShowDeleteConfirm(false)}
    />
  </div>
);
}
