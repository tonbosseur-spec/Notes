import { Plus, Search, Folder, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { Note, NoteGroup } from '../types';

interface SidebarProps {
  notes: Note[];
  groups: NoteGroup[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onUpdateNotes: (notes: Note[]) => void;
}

export default function Sidebar({ 
  notes, 
  groups, 
  activeNoteId, 
  onSelectNote, 
  onCreateNote,
  onUpdateNotes
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // Drag and drop states for notes
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const filteredNotes = notes.filter(note => {
    const query = searchQuery.toLowerCase();
    return note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query);
  });

  const ungroupedNotes = filteredNotes.filter(n => !n.groupId);
  
  // Keep all groups visible so that empty groups can also accept note drops
  const groupsWithNotes = groups.map(g => ({
    ...g,
    notes: filteredNotes.filter(n => n.groupId === g.id)
  }));

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Drag handlers for individual notes
  const handleNoteDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNoteId(noteId);
  };

  const handleNoteDragOver = (e: React.DragEvent, noteId: string) => {
    e.preventDefault();
    if (draggedNoteId === noteId) return;
    setDragOverNoteId(noteId);
  };

  const handleNoteDrop = (e: React.DragEvent, targetNoteId: string) => {
    e.preventDefault();
    if (!draggedNoteId || draggedNoteId === targetNoteId) return;

    const draggedIdx = notes.findIndex(n => n.id === draggedNoteId);
    const targetIdx = notes.findIndex(n => n.id === targetNoteId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const updatedNotes = [...notes];
      const draggedNote = { ...updatedNotes[draggedIdx] };
      const targetNote = updatedNotes[targetIdx];

      // Update the group of the dragged note to match the target note
      draggedNote.groupId = targetNote.groupId;
      draggedNote.updatedAt = Date.now();

      // Remove from old position and insert at new position
      updatedNotes.splice(draggedIdx, 1);
      
      const newTargetIdx = updatedNotes.findIndex(n => n.id === targetNoteId);
      updatedNotes.splice(newTargetIdx, 0, draggedNote);

      onUpdateNotes(updatedNotes);
    }

    setDraggedNoteId(null);
    setDragOverNoteId(null);
  };

  const handleNoteDragEnd = () => {
    setDraggedNoteId(null);
    setDragOverNoteId(null);
    setDragOverGroupId(null);
  };

  // Drag handlers for group headers (dropping note directly to a group)
  const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDragOverGroupId(groupId);
  };

  const handleGroupDrop = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    if (!draggedNoteId) return;

    // Check if the note is already in this group to avoid unnecessary state changes
    const note = notes.find(n => n.id === draggedNoteId);
    if (note && note.groupId === groupId) {
      setDraggedNoteId(null);
      setDragOverGroupId(null);
      return;
    }

    const updatedNotes = notes.map(n => {
      if (n.id === draggedNoteId) {
        return { ...n, groupId, updatedAt: Date.now() };
      }
      return n;
    });

    onUpdateNotes(updatedNotes);
    setDraggedNoteId(null);
    setDragOverGroupId(null);
  };

  // Drag handlers for root header (dropping to ungroup a note)
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverGroupId('root');
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNoteId) return;

    const note = notes.find(n => n.id === draggedNoteId);
    if (note && !note.groupId) {
      setDraggedNoteId(null);
      setDragOverGroupId(null);
      return;
    }

    const updatedNotes = notes.map(n => {
      if (n.id === draggedNoteId) {
        const { groupId, ...rest } = n;
        return { ...rest, updatedAt: Date.now() };
      }
      return n;
    });

    onUpdateNotes(updatedNotes);
    setDraggedNoteId(null);
    setDragOverGroupId(null);
  };

  const renderNote = (note: Note) => (
    <div
      key={note.id}
      draggable
      onDragStart={(e) => handleNoteDragStart(e, note.id)}
      onDragOver={(e) => handleNoteDragOver(e, note.id)}
      onDrop={(e) => handleNoteDrop(e, note.id)}
      onDragEnd={handleNoteDragEnd}
      className={`relative group/item transition-all duration-200 rounded-lg ${
        draggedNoteId === note.id ? 'opacity-35 scale-95 border-dashed border border-stone-300 dark:border-stone-700' : ''
      } ${
        dragOverNoteId === note.id ? 'border-t-2 border-indigo-500 pt-1' : ''
      }`}
    >
      <button
        onClick={() => onSelectNote(note.id)}
        className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col gap-1 pr-8
          ${activeNoteId === note.id 
            ? 'bg-white dark:bg-stone-800 shadow-xs border border-stone-200/50 dark:border-stone-700/50' 
            : 'hover:bg-stone-200/30 dark:hover:bg-stone-800/30 border border-transparent'
          }`}
      >
        <span className={`font-medium text-sm truncate ${activeNoteId === note.id ? 'text-stone-900 dark:text-stone-100' : 'text-stone-700 dark:text-stone-300'}`}>
          {note.title || 'Nouvelle note'}
        </span>
        <span className="text-xs text-stone-400 dark:text-stone-500 truncate">
          {note.content.replace(/<[^>]*>?/gm, '').substring(0, 40) || 'Pas de contenu...'}
        </span>
      </button>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none cursor-grab active:cursor-grabbing text-stone-400">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-xl">
      <div 
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
        className={`p-4 flex items-center justify-between border-b transition-colors ${
          dragOverGroupId === 'root' 
            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500' 
            : 'border-b-stone-200/50 dark:border-stone-800/50'
        }`}
      >
        <h1 className="font-semibold text-lg text-stone-800 dark:text-stone-200 tracking-tight flex items-center gap-2">
          Notes
          {dragOverGroupId === 'root' && (
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-normal normal-case italic">Déposer pour dissocier</span>
          )}
        </h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={onCreateNote}
            className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 rounded-md transition-colors"
            title="New Note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 focus:border-stone-400 dark:focus:border-stone-600 transition-shadow text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 no-scrollbar">
        {filteredNotes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            {searchQuery ? 'Aucune note ne correspond à votre recherche.' : 'Aucune note. Cliquez sur + pour en créer une.'}
          </div>
        ) : (
          <>
            {ungroupedNotes.length > 0 && (
              <div className="space-y-0.5">
                {ungroupedNotes.map(renderNote)}
              </div>
            )}
            
            {groupsWithNotes.map(group => {
              const isCollapsed = collapsedGroups[group.id];
              const isDragOverGroup = dragOverGroupId === group.id;
              return (
                <div key={group.id} className="space-y-1">
                  <div
                    onDragOver={(e) => handleGroupDragOver(e, group.id)}
                    onDrop={(e) => handleGroupDrop(e, group.id)}
                    className={`rounded-lg transition-colors p-1 ${
                      isDragOverGroup 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500' 
                        : 'border border-transparent'
                    }`}
                  >
                    <button 
                      onClick={() => toggleGroup(group.id)}
                      className="w-full px-2 py-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center justify-between hover:bg-stone-200/50 dark:hover:bg-stone-800/50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5" />
                        {group.name}
                        {isDragOverGroup && (
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-normal italic normal-case ml-1">Déposer ici</span>
                        )}
                      </div>
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {!isCollapsed && (
                      <div className="space-y-0.5 pl-2 border-l border-stone-200 dark:border-stone-800 ml-3 min-h-[24px]">
                        {group.notes.length === 0 ? (
                          <div className="text-[10px] text-stone-400 dark:text-stone-500 py-2 px-1 italic">
                            Glissez une note ici
                          </div>
                        ) : (
                          group.notes.map(renderNote)
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
