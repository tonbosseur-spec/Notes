import { auth } from './firebase';
import { Note, NoteGroup, Task, TaskList, UserProfile } from '../types';

async function getAuthHeader() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// User Profile Sync
export async function saveProfileToCloud(userId: string, profile: UserProfile) {
  try {
    const headers = await getAuthHeader();
    await fetch('/api/auth/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: auth.currentUser?.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        photoUrl: profile.photoUrl
      })
    });
  } catch (err) {
    console.error('Error saving profile to cloud:', err);
  }
}

// Notes Sync
export async function fetchNotesFromCloud() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/notes', { headers });
    return await res.json();
  } catch (err) {
    console.error('Error fetching notes:', err);
    return [];
  }
}

export async function saveNoteToCloud(userId: string, note: Note) {
  try {
    const headers = await getAuthHeader();
    await fetch('/api/notes', {
      method: 'POST',
      headers,
      body: JSON.stringify(note)
    });
  } catch (err) {
    console.error('Error saving note to cloud:', err);
  }
}

export async function deleteNoteFromCloud(userId: string, noteId: string) {
  try {
    const headers = await getAuthHeader();
    await fetch(`/api/notes/${noteId}`, {
      method: 'DELETE',
      headers
    });
  } catch (err) {
    console.error('Error deleting note from cloud:', err);
  }
}

// Groups Sync
export async function fetchGroupsFromCloud() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/groups', { headers });
    return await res.json();
  } catch (err) {
    console.error('Error fetching groups:', err);
    return [];
  }
}

export async function saveGroupToCloud(userId: string, group: NoteGroup) {
  try {
    const headers = await getAuthHeader();
    await fetch('/api/groups', {
      method: 'POST',
      headers,
      body: JSON.stringify(group)
    });
  } catch (err) {
    console.error('Error saving group to cloud:', err);
  }
}

export async function deleteGroupFromCloud(userId: string, groupId: string) {
  try {
    const headers = await getAuthHeader();
    await fetch(`/api/groups/${groupId}`, {
      method: 'DELETE',
      headers
    });
  } catch (err) {
    console.error('Error deleting group from cloud:', err);
  }
}

// Tasks Sync
export async function fetchTasksFromCloud() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/tasks', { headers });
    return await res.json();
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return [];
  }
}

export async function saveTaskToCloud(userId: string, task: Task) {
  try {
    const headers = await getAuthHeader();
    await fetch('/api/tasks', {
      method: 'POST',
      headers,
      body: JSON.stringify(task)
    });
  } catch (err) {
    console.error('Error saving task to cloud:', err);
  }
}

export async function deleteTaskFromCloud(userId: string, taskId: string) {
  try {
    const headers = await getAuthHeader();
    await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers
    });
  } catch (err) {
    console.error('Error deleting task from cloud:', err);
  }
}

// Task Lists Sync
export async function fetchTaskListsFromCloud() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/task-lists', { headers });
    return await res.json();
  } catch (err) {
    console.error('Error fetching task lists:', err);
    return [];
  }
}

export async function saveTaskListToCloud(userId: string, list: TaskList) {
  try {
    const headers = await getAuthHeader();
    await fetch('/api/task-lists', {
      method: 'POST',
      headers,
      body: JSON.stringify(list)
    });
  } catch (err) {
    console.error('Error saving task list to cloud:', err);
  }
}

export async function deleteTaskListFromCloud(userId: string, listId: string) {
  try {
    const headers = await getAuthHeader();
    await fetch(`/api/task-lists/${listId}`, {
      method: 'DELETE',
      headers
    });
  } catch (err) {
    console.error('Error deleting task list from cloud:', err);
  }
}

// Merge function to resolve conflicts
export function mergeLocalAndCloud<T extends { id: string; updatedAt?: number | string | Date; createdAt?: number | string | Date }>(
  localItems: T[],
  cloudItems: T[]
): { merged: T[]; toUpload: T[] } {
  const mergedMap = new Map<string, T>();
  const toUpload: T[] = [];

  const getTime = (val: any) => {
    if (!val) return 0;
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'string') return new Date(val).getTime();
    return val;
  };

  // Index local items
  localItems.forEach(item => {
    mergedMap.set(item.id, item);
  });

  // Merge with cloud items
  cloudItems.forEach(cloudItem => {
    const localItem = mergedMap.get(cloudItem.id);
    if (!localItem) {
      mergedMap.set(cloudItem.id, cloudItem);
    } else {
      const localTime = getTime(localItem.updatedAt || localItem.createdAt);
      const cloudTime = getTime(cloudItem.updatedAt || cloudItem.createdAt);

      if (cloudTime >= localTime) {
        mergedMap.set(cloudItem.id, cloudItem);
      } else {
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
