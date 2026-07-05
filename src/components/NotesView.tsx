import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bot, FileText, Folder, PenTool, Plus, ChevronRight, Activity, Calendar, Home as HomeIcon, Tag, Lock } from 'lucide-react';
import { Note, NoteGroup, UserProfile, Task } from '../types';
import Sidebar from './Sidebar';
import Editor from './Editor';
import { generateUUID } from '../lib/utils';

interface NotesViewProps {
  notes: Note[];
  tasks: Task[];
  activeNoteId: string | null;
  apiKey: string;
  geminiModel?: string;
  groups: NoteGroup[];
  onAddGroup: (name: string) => string;
  onSetActiveNoteId: (id: string | null) => void;
  onCreateNote: () => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onGoHome: () => void;
  onOpenRudi: () => void;
  onUpdateNotes: (notes: Note[]) => void;
  userProfile: UserProfile | null;
}

export default function NotesView({
  notes,
  tasks,
  activeNoteId,
  apiKey,
  geminiModel,
  groups,
  onAddGroup,
  onSetActiveNoteId,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onGoHome,
  onOpenRudi,
  onUpdateNotes,
  userProfile
}: NotesViewProps) {
  const [mobileTab, setMobileTab] = useState<'dashboard' | 'notes'>('dashboard');
  const activeNote = notes.find((n) => n.id === activeNoteId) || null;

  // KPI Calculations
  const totalNotes = notes.length;
  const totalGroups = groups.length;

  const totalWords = notes.reduce((acc, note) => {
    const textOnly = note.content ? note.content.replace(/<[^>]*>?/gm, '') : '';
    const words = textOnly.trim().split(/\s+/).filter(Boolean);
    return acc + words.length;
  }, 0);

  const averageWords = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0;

  const recentNotes = [...notes]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  const groupStats = groups.map(g => {
    const count = notes.filter(n => n.groupId === g.id).length;
    return {
      name: g.name,
      count,
      percentage: totalNotes > 0 ? Math.round((count / totalNotes) * 100) : 0
    };
  }).filter(g => g.count > 0);

  const tagStats = Array.from(new Set(notes.map(n => n.tag).filter(Boolean))).map(tag => {
    const count = notes.filter(n => n.tag === tag).length;
    return {
      name: tag as string,
      count,
      percentage: totalNotes > 0 ? Math.round((count / totalNotes) * 100) : 0
    };
  });

  const ungroupedCount = notes.filter(n => !n.groupId).length;

  return (
    <div className="flex fixed inset-0 w-full overflow-hidden bg-stone-50 dark:bg-stone-950 flex-col md:flex-row">
      {/* Mobile subheader when no note is selected */}
      {!activeNote && (
        <div className="flex md:hidden bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 p-2 gap-2 shrink-0 items-center">
          <button
            onClick={onGoHome}
            className="flex items-center justify-center p-2 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-50 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-all cursor-pointer"
            title="Retour à l'accueil"
          >
            <HomeIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-stone-200 dark:bg-stone-800" />
          <button
            onClick={() => setMobileTab('dashboard')}
            className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mobileTab === 'dashboard'
                ? 'bg-white dark:bg-stone-800 shadow-xs text-stone-900 dark:text-stone-100'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            Tableau de bord
          </button>
          <button
            onClick={() => setMobileTab('notes')}
            className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mobileTab === 'notes'
                ? 'bg-white dark:bg-stone-800 shadow-xs text-stone-900 dark:text-stone-100'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            Mes Notes ({notes.length})
          </button>
        </div>
      )}

      {/* Sidebar (List) */}
      <div className={`
        ${activeNote ? 'hidden md:flex' : (mobileTab === 'notes' ? 'flex' : 'hidden md:flex')}
        flex-col w-full md:w-72 bg-stone-100 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex-1 md:h-full shrink-0 min-h-0
      `}>
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50/80 dark:bg-stone-900/80">
          <button 
            onClick={onGoHome}
            className="text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Accueil
          </button>
        </div>
        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
          <Sidebar 
            notes={notes} 
            groups={groups}
            activeNoteId={activeNoteId} 
            onSelectNote={onSetActiveNoteId}
            onCreateNote={onCreateNote}
            onUpdateNotes={onUpdateNotes}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className={`
        ${activeNote ? 'flex' : (mobileTab === 'dashboard' ? 'flex' : 'hidden md:flex')}
        flex-1 flex-col min-w-0 min-h-0 relative bg-white dark:bg-stone-950
      `}>
        {/* Mobile Header for back navigation */}
        {activeNote && (
          <header className="md:hidden flex items-center justify-between p-4 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-950">
            <button 
              onClick={() => onSetActiveNoteId(null)}
              className="p-2 -ml-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Notes</span>
            </button>
            <span className="font-medium text-sm text-stone-600 dark:text-stone-400 truncate px-4">
              {activeNote?.title || 'Note'}
            </span>
            <button
              onClick={onOpenRudi}
              className="p-2 -mr-2 text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Bot className="w-5 h-5" />
            </button>
          </header>
        )}

        {/* Editor or Dashboard Area */}
        <main className="flex-1 overflow-hidden relative">
          {/* Desktop Rudi Button */}
          {activeNote && (
            <div className="hidden md:block absolute top-6 right-6 z-10">
              <button
                onClick={onOpenRudi}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium text-sm transition-all shadow-xs border border-indigo-100/50 dark:border-indigo-800/50"
              >
                <Bot className="w-4 h-4" />
                Rudi
              </button>
            </div>
          )}

          {activeNote ? (
            <Editor 
              note={activeNote} 
              notes={notes}
              tasks={tasks}
              apiKey={apiKey}
              geminiModel={geminiModel}
              groups={groups}
              onAddGroup={onAddGroup}
              onUpdate={(updates) => onUpdateNote(activeNote.id, updates)} 
              onDelete={() => onDeleteNote(activeNote.id)}
              userProfile={userProfile}
            />
          ) : (
            <div className="h-full overflow-y-auto bg-stone-50/40 dark:bg-stone-950/20">
              <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50">
                      Tableau de bord des notes
                    </h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                      Visualisez, organisez et suivez vos pensées au quotidien.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onGoHome}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-semibold hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
                    >
                      <HomeIcon className="w-4 h-4" />
                      Accueil
                    </button>
                    <button
                      onClick={onCreateNote}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Nouvelle note
                    </button>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* KPI 1: Total Notes */}
                  <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] md:text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Total Notes</span>
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 rounded-xl">
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-stone-900 dark:text-stone-50">{totalNotes}</span>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">notes rédigées</p>
                    </div>
                  </div>

                  {/* KPI 2: Dossiers */}
                  <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] md:text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Dossiers</span>
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 rounded-xl">
                        <Folder className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-stone-900 dark:text-stone-50">{totalGroups}</span>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">groupes de classement</p>
                    </div>
                  </div>

                  {/* KPI 3: Volume de mots */}
                  <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] md:text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Volume</span>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 rounded-xl">
                        <PenTool className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-stone-900 dark:text-stone-50">{totalWords}</span>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">mots au total</p>
                    </div>
                  </div>

                  {/* KPI 4: Moyenne */}
                  <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] md:text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Moyenne</span>
                      <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 rounded-xl">
                        <Activity className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-stone-900 dark:text-stone-50">{averageWords}</span>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">mots par note</p>
                    </div>
                  </div>
                </div>

                {/* Grid Section for Recent Notes and Folders */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Column 1: Recent Notes */}
                  <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      Notes modifiées récemment
                    </h3>
                    {recentNotes.length === 0 ? (
                      <p className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center">Aucune note pour le moment.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentNotes.map(note => (
                          <button
                            key={note.id}
                            onClick={() => onSetActiveNoteId(note.id)}
                            className="w-full text-left p-3 border border-stone-100 dark:border-stone-800 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors flex items-center justify-between group"
                          >
                            <div className="min-w-0 pr-4">
                              <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                {note.isLocked && <Lock className="w-3 h-3 text-amber-500" />}
                                {note.title || 'Nouvelle note'}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">
                                  {new Date(note.updatedAt).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {note.tag && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-800/50">
                                    {note.tag}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Column 2: Répartition par dossier */}
                  <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-amber-500" />
                      Répartition par dossier
                    </h3>
                    {groupStats.length === 0 && ungroupedCount === 0 ? (
                      <p className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center">Aucun classement disponible.</p>
                    ) : (
                      <div className="space-y-4">
                        {groupStats.map(stat => (
                          <div key={stat.name} className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-stone-700 dark:text-stone-300">{stat.name}</span>
                              <span className="text-stone-400 dark:text-stone-500">{stat.count} note{stat.count > 1 ? 's' : ''} ({stat.percentage}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${stat.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                        {ungroupedCount > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-stone-700 dark:text-stone-300">Sans dossier</span>
                              <span className="text-stone-400 dark:text-stone-500">
                                {ungroupedCount} note{ungroupedCount > 1 ? 's' : ''} ({totalNotes > 0 ? Math.round((ungroupedCount / totalNotes) * 100) : 0}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-stone-400 dark:bg-stone-600 rounded-full"
                                style={{ width: `${totalNotes > 0 ? Math.round((ungroupedCount / totalNotes) * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Column 3: Répartition par catégorie (Tags) */}
                  <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-500" />
                      Répartition par catégorie
                    </h3>
                    {tagStats.length === 0 ? (
                      <p className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center">Aucune catégorie définie.</p>
                    ) : (
                      <div className="space-y-4">
                        {tagStats.map(stat => (
                          <div key={stat.name} className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-stone-700 dark:text-stone-300">{stat.name}</span>
                              <span className="text-stone-400 dark:text-stone-500">{stat.count} note{stat.count > 1 ? 's' : ''} ({stat.percentage}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${stat.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
