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
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  groupId?: string;
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
}

export interface TaskList {
  id: string;
  name: string;
  createdAt: number;
}
