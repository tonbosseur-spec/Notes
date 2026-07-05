import { Note, NoteGroup, Task, TaskList } from '../types';

// Export / Import helper for .nts file
export function exportToNts(data: {
  notes: Note[];
  groups: NoteGroup[];
  tasks: Task[];
  taskLists: TaskList[];
  settings: any;
}) {
  const jsonString = JSON.stringify({
    version: '1.0',
    timestamp: Date.now(),
    ...data
  }, null, 2);
  
  const encoded = btoa(unescape(encodeURIComponent(jsonString)));
  const blob = new Blob([encoded], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `notes_copilot_backup_${dateStr}.nts`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importFromNtsContent(fileContent: string): {
  notes: Note[];
  groups: NoteGroup[];
  tasks: Task[];
  taskLists: TaskList[];
  settings: any;
} {
  try {
    const decoded = decodeURIComponent(escape(atob(fileContent.trim())));
    const data = JSON.parse(decoded);
    
    if (!data.notes || !Array.isArray(data.notes)) {
      throw new Error("Format .nts invalide : notes manquantes.");
    }
    
    return {
      notes: data.notes || [],
      groups: data.groups || [],
      tasks: data.tasks || [],
      taskLists: data.taskLists || [],
      settings: data.settings || {}
    };
  } catch (err) {
    throw new Error("Impossible de lire le fichier .nts. Assurez-vous qu'il s'agit d'une sauvegarde valide.");
  }
}
