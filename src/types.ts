export interface NoteGroup {
  id: string;
  name: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  colorPalette?: 'default' | 'ocean' | 'forest' | 'rose';
  apiKey: string;
  enableNotifications?: boolean;
  authChoice?: 'local' | 'cloud' | null;
  geminiModel?: 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview' | 'gemini-2.5-flash';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  groupId?: string;
  linkedTaskId?: string;
  dueDate?: string;
}

export interface ChatThread {
  messages: any[]; // Google GenAI format parts
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  details: string;
  dueDate: string | null;
  subTasks: SubTask[];
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  createdAt: number;
  updatedAt: number;
  notified?: boolean;
  linkedNoteId?: string;
}

export interface TaskList {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  preferredName?: string;
  pronoun?: 'il' | 'elle';
  photoUrl: string | null;
  isGoogle: boolean;
}
