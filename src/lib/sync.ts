import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { Note, NoteGroup, Task, TaskList, UserProfile } from '../types';

// Helper to save user profile to cloud
export async function saveProfileToCloud(userId: string, profile: UserProfile) {
  try {
    await setDoc(doc(db, 'users', userId, 'profile', 'info'), profile);
  } catch (err) {
    console.error('Error saving profile to cloud:', err);
  }
}


// Helper to write a single note to Firestore
export async function saveNoteToCloud(userId: string, note: Note) {
  try {
    const sanitized = JSON.parse(JSON.stringify(note));
    await setDoc(doc(db, 'users', userId, 'notes', note.id), sanitized);
  } catch (err) {
    console.error('Error saving note to cloud:', err);
  }
}

// Helper to delete a single note from Firestore
export async function deleteNoteFromCloud(userId: string, noteId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId, 'notes', noteId));
  } catch (err) {
    console.error('Error deleting note from cloud:', err);
  }
}

// Helper to write a single group to Firestore
export async function saveGroupToCloud(userId: string, group: NoteGroup) {
  try {
    const sanitized = JSON.parse(JSON.stringify(group));
    await setDoc(doc(db, 'users', userId, 'groups', group.id), sanitized);
  } catch (err) {
    console.error('Error saving group to cloud:', err);
  }
}

// Helper to delete a single group from Firestore
export async function deleteGroupFromCloud(userId: string, groupId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId, 'groups', groupId));
  } catch (err) {
    console.error('Error deleting group from cloud:', err);
  }
}

// Helper to write a single task to Firestore
export async function saveTaskToCloud(userId: string, task: Task) {
  try {
    const sanitized = JSON.parse(JSON.stringify(task));
    await setDoc(doc(db, 'users', userId, 'tasks', task.id), sanitized);
  } catch (err) {
    console.error('Error saving task to cloud:', err);
  }
}

// Helper to delete a single task from Firestore
export async function deleteTaskFromCloud(userId: string, taskId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
  } catch (err) {
    console.error('Error deleting task from cloud:', err);
  }
}

// Helper to write a single task list to Firestore
export async function saveTaskListToCloud(userId: string, list: TaskList) {
  try {
    const sanitized = JSON.parse(JSON.stringify(list));
    await setDoc(doc(db, 'users', userId, 'taskLists', list.id), sanitized);
  } catch (err) {
    console.error('Error saving task list to cloud:', err);
  }
}

// Helper to delete a single task list from Firestore
export async function deleteTaskListFromCloud(userId: string, listId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId, 'taskLists', listId));
  } catch (err) {
    console.error('Error deleting task list from cloud:', err);
  }
}

// Merge function to resolve conflicts (taking the newest updatedAt/createdAt)
export function mergeLocalAndCloud<T extends { id: string; updatedAt?: number; createdAt?: number }>(
  localItems: T[],
  cloudItems: T[]
): { merged: T[]; toUpload: T[] } {
  const mergedMap = new Map<string, T>();
  const toUpload: T[] = [];

  // Index local items
  localItems.forEach(item => {
    mergedMap.set(item.id, item);
  });

  // Merge with cloud items
  cloudItems.forEach(cloudItem => {
    const localItem = mergedMap.get(cloudItem.id);
    if (!localItem) {
      // Exist only on cloud, add to merged
      mergedMap.set(cloudItem.id, cloudItem);
    } else {
      // Exists in both, compare timestamps
      const localTime = localItem.updatedAt || localItem.createdAt || 0;
      const cloudTime = cloudItem.updatedAt || cloudItem.createdAt || 0;

      if (cloudTime >= localTime) {
        // Cloud is newer or same
        mergedMap.set(cloudItem.id, cloudItem);
      } else {
        // Local is newer, upload to cloud
        toUpload.push(localItem);
      }
    }
  });

  // Local items not in cloud should be uploaded
  localItems.forEach(localItem => {
    const hasCloud = cloudItems.some(c => c.id === localItem.id);
    if (!hasCloud) {
      toUpload.push(localItem);
    }
  });

  return {
    merged: Array.from(mergedMap.values()),
    toUpload
  };
}

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
  
  // Encrypt or encode in base64 to make it a custom private format
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
