/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Loader2, Bell, Check, Clock, X } from 'lucide-react';
import { StatusBar } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { motion, AnimatePresence } from 'motion/react';
import { generateUUID } from './lib/utils';
import { Note, AppSettings, NoteGroup, ChatThread, Task, TaskList, UserProfile } from './types';
import NotesView from './components/NotesView';
import Home from './components/Home';
import Settings from './components/Settings';
import RudiChat from './components/RudiChat';
import TasksView from './components/TasksView';
import LoginScreen from './components/LoginScreen';
import FirstTimeProfileModal from './components/FirstTimeProfileModal';
import { get, set } from 'idb-keyval';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { 
  saveNoteToCloud, 
  deleteNoteFromCloud, 
  saveGroupToCloud, 
  deleteGroupFromCloud, 
  saveTaskToCloud, 
  deleteTaskFromCloud, 
  saveTaskListToCloud, 
  deleteTaskListFromCloud, 
  mergeLocalAndCloud,
  exportToNts,
  saveProfileToCloud
} from './lib/sync';

type ViewState = 'home' | 'notes' | 'settings' | 'tasks';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ theme: 'system', apiKey: '', enableNotifications: true, authChoice: null, geminiModel: 'gemini-3.5-flash' });
  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User Profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Firebase Auth and Live Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Rudi Chat state
  const [isRudiOpen, setIsRudiOpen] = useState(false);
  const [chatThreads, setChatThreads] = useState<Record<string, any[]>>({});

  // Floating elegant notification alerts state
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);

  // Listen to test notification triggers from Settings
  useEffect(() => {
    const handleTestNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setActiveNotifications(prev => {
          // Prevent duplicates of the same test if multiple events are fired quickly
          const exists = prev.some(n => n.title === detail.title && n.body === detail.body);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: 'test-' + Date.now() + Math.random(),
              title: detail.title || "Notes Copilot",
              body: detail.body || "",
              listName: detail.listName,
              isTest: detail.isTest,
              createdAt: Date.now()
            }
          ];
        });
      }
    };

    window.addEventListener('app-trigger-test-notification', handleTestNotification);
    return () => {
      window.removeEventListener('app-trigger-test-notification', handleTestNotification);
    };
  }, []);

  // Hide StatusBar for Android immersive mode
  useEffect(() => {
    const enableImmersiveMode = async () => {
      try {
        await StatusBar.hide();
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch (err) {
        // Ignored when running outside a Capacitor Android environment (e.g. browser preview)
        console.log('Immersive mode (StatusBar.hide) not supported in this environment.', err);
      }
    };
    enableImmersiveMode();
  }, []);

  // Load from IndexedDB
  useEffect(() => {
    Promise.all([
      get('notes'),
      get('settings'),
      get('groups'),
      get('chatThreads'),
      get('tasks'),
      get('taskLists'),
      get('userProfile')
    ]).then(([savedNotes, savedSettings, savedGroups, savedChatThreads, savedTasks, savedTaskLists, savedProfile]) => {
      if (savedNotes && savedNotes.length > 0) {
        setNotes(savedNotes);
        setActiveNoteId(savedNotes[0].id);
      }
      
      if (savedSettings) setSettings(savedSettings);
      if (savedGroups) setGroups(savedGroups);
      if (savedChatThreads) setChatThreads(savedChatThreads);
      if (savedTasks) setTasks(savedTasks);
      if (savedProfile) setUserProfile(savedProfile);
      
      let loadedTaskLists = savedTaskLists;
      if (!loadedTaskLists || loadedTaskLists.length === 0) {
        loadedTaskLists = [{ id: 'default-list', name: 'Ma liste', createdAt: Date.now() }];
      }
      setTaskLists(loadedTaskLists);
      
      setIsLoading(false);
    });
  }, []);

  // Save to IndexedDB on change
  useEffect(() => {
    if (!isLoading) {
      set('notes', notes);
      set('settings', settings);
      set('groups', groups);
      set('chatThreads', chatThreads);
      set('tasks', tasks);
      set('taskLists', taskLists);
      set('userProfile', userProfile);
    }
  }, [notes, settings, groups, chatThreads, tasks, taskLists, userProfile, isLoading]);

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-ocean', 'theme-forest', 'theme-rose');

    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme);
    }
    
    if (settings.colorPalette && settings.colorPalette !== 'default') {
      root.classList.add(`theme-${settings.colorPalette}`);
    }
  }, [settings.theme, settings.colorPalette]);

  // Firebase Authentication State Listener & Live Sync
  useEffect(() => {
    if (isLoading) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Automatically ensure setting matches cloud auth state
        if (settings.authChoice !== 'cloud') {
          setSettings(prev => ({ ...prev, authChoice: 'cloud' }));
        }

        // Set up User Profile
        const isGoogle = user.providerData?.some(p => p.providerId === 'google.com') || false;
        if (isGoogle) {
          const displayName = user.displayName || '';
          const parts = displayName.trim().split(/\s+/);
          const fName = parts[0] || 'Utilisateur';
          const lName = parts.slice(1).join(' ') || '';
          const photoUrl = user.photoURL || null;

          const googleProfile: UserProfile = {
            firstName: fName,
            lastName: lName,
            photoUrl,
            isGoogle: true
          };
          setUserProfile(googleProfile);
          set('userProfile', googleProfile);
          await saveProfileToCloud(user.uid, googleProfile);
        } else {
          try {
            const profileSnap = await getDoc(doc(db, 'users', user.uid, 'profile', 'info'));
            if (profileSnap.exists()) {
              const cloudProfile = profileSnap.data() as UserProfile;
              setUserProfile(cloudProfile);
              set('userProfile', cloudProfile);
            } else {
              const localProfile = await get('userProfile');
              if (localProfile) {
                const updatedProfile = { ...localProfile, isGoogle: false };
                setUserProfile(updatedProfile);
                await saveProfileToCloud(user.uid, updatedProfile);
              } else {
                setUserProfile(null);
              }
            }
          } catch (err) {
            console.error("Failed to load user profile:", err);
          }
        }

        try {
          // 1. Fetch initial remote data for a quick merge on login
          const [notesSnap, groupsSnap, tasksSnap, taskListsSnap] = await Promise.all([
            getDocs(collection(db, 'users', user.uid, 'notes')),
            getDocs(collection(db, 'users', user.uid, 'groups')),
            getDocs(collection(db, 'users', user.uid, 'tasks')),
            getDocs(collection(db, 'users', user.uid, 'taskLists'))
          ]);

          const remoteNotes = notesSnap.docs.map(d => d.data() as Note);
          const remoteGroups = groupsSnap.docs.map(d => d.data() as NoteGroup);
          const remoteTasks = tasksSnap.docs.map(d => d.data() as Task);
          const remoteTaskLists = taskListsSnap.docs.map(d => d.data() as TaskList);

          // Merge local and remote
          const mergedNotes = mergeLocalAndCloud(notes, remoteNotes);
          const mergedGroups = mergeLocalAndCloud(groups, remoteGroups);
          const mergedTasks = mergeLocalAndCloud(tasks, remoteTasks);
          const mergedTaskLists = mergeLocalAndCloud(taskLists, remoteTaskLists);

          // Update local state with merged contents
          setNotes(mergedNotes.merged);
          setGroups(mergedGroups.merged);
          setTasks(mergedTasks.merged);
          setTaskLists(mergedTaskLists.merged);

          if (mergedNotes.merged.length > 0) {
            setActiveNoteId(mergedNotes.merged[0].id);
          }

          // Upload newer local items to cloud
          mergedNotes.toUpload.forEach(n => saveNoteToCloud(user.uid, n));
          mergedGroups.toUpload.forEach(g => saveGroupToCloud(user.uid, g));
          mergedTasks.toUpload.forEach(t => saveTaskToCloud(user.uid, t));
          mergedTaskLists.toUpload.forEach(l => saveTaskListToCloud(user.uid, l));

        } catch (err) {
          console.error("Error during initial Cloud synchronization:", err);
        }

        // 2. Set up real-time listener subscriptions
        const unsubNotes = onSnapshot(collection(db, 'users', user.uid, 'notes'), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data() as Note;
            if (change.type === 'added' || change.type === 'modified') {
              setNotes(prev => {
                const existing = prev.find(n => n.id === docData.id);
                if (!existing || docData.updatedAt > (existing.updatedAt || 0)) {
                  const filtered = prev.filter(n => n.id !== docData.id);
                  return [docData, ...filtered];
                }
                return prev;
              });
            } else if (change.type === 'removed') {
              setNotes(prev => prev.filter(n => n.id !== change.doc.id));
            }
          });
        });

        const unsubGroups = onSnapshot(collection(db, 'users', user.uid, 'groups'), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data() as NoteGroup;
            if (change.type === 'added' || change.type === 'modified') {
              setGroups(prev => {
                const existing = prev.find(g => g.id === docData.id);
                if (!existing) return [...prev, docData];
                return prev.map(g => g.id === docData.id ? docData : g);
              });
            } else if (change.type === 'removed') {
              setGroups(prev => prev.filter(g => g.id !== change.doc.id));
            }
          });
        });

        const unsubTasks = onSnapshot(collection(db, 'users', user.uid, 'tasks'), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data() as Task;
            if (change.type === 'added' || change.type === 'modified') {
              setTasks(prev => {
                const existing = prev.find(t => t.id === docData.id);
                if (!existing || docData.updatedAt > (existing.updatedAt || 0)) {
                  const filtered = prev.filter(t => t.id !== docData.id);
                  return [...filtered, docData];
                }
                return prev;
              });
            } else if (change.type === 'removed') {
              setTasks(prev => prev.filter(t => t.id !== change.doc.id));
            }
          });
        });

        const unsubTaskLists = onSnapshot(collection(db, 'users', user.uid, 'taskLists'), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data() as TaskList;
            if (change.type === 'added' || change.type === 'modified') {
              setTaskLists(prev => {
                const existing = prev.find(l => l.id === docData.id);
                if (!existing) return [...prev, docData];
                return prev.map(l => l.id === docData.id ? docData : l);
              });
            } else if (change.type === 'removed') {
              setTaskLists(prev => prev.filter(l => l.id !== change.doc.id));
            }
          });
        });

        return () => {
          unsubNotes();
          unsubGroups();
          unsubTasks();
          unsubTaskLists();
        };
      } else {
        // Logged out
        if (settings.authChoice === 'cloud') {
          setSettings(prev => ({ ...prev, authChoice: null }));
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser === null, isLoading]);

  // Auth helper handlers
  const handleLoginChoice = (uid: string | null) => {
    if (uid) {
      setSettings(prev => ({ ...prev, authChoice: 'cloud' }));
    } else {
      setSettings(prev => ({ ...prev, authChoice: 'local' }));
    }
    setView('home');
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSettings(prev => ({ ...prev, authChoice: null }));
    setCurrentUser(null);
    setUserProfile(null);
    set('userProfile', null);
    setView('home');
  };

  const handleSaveFirstTimeProfile = async (profileData: { firstName: string; lastName: string; photoUrl: string | null }) => {
    const newProfile: UserProfile = {
      ...profileData,
      isGoogle: false
    };
    setUserProfile(newProfile);
    set('userProfile', newProfile);
    if (currentUser) {
      await saveProfileToCloud(currentUser.uid, newProfile);
    }
  };

  const handleUpdateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updatedProfile = { ...userProfile, ...updates };
    setUserProfile(updatedProfile);
    set('userProfile', updatedProfile);
    if (currentUser && !userProfile.isGoogle) {
      await saveProfileToCloud(currentUser.uid, updatedProfile);
    }
  };

  // State modifiers with Firestore backup triggers
  const handleCreateNote = () => {
    const newNote: Note = {
      id: generateUUID(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setView('notes');
    if (currentUser) {
      saveNoteToCloud(currentUser.uid, newNote);
    }
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note => {
      if (note.id === id) {
        const nextNote = { ...note, ...updates, updatedAt: Date.now() };

        if (updates.dueDate && !nextNote.linkedTaskId) {
            const listId = taskLists.length > 0 ? taskLists[0].id : generateUUID();
            if (taskLists.length === 0) {
              const newList: TaskList = { id: listId, name: 'Tâches', createdAt: Date.now() };
              setTaskLists(prev => [...prev, newList]);
              if (currentUser) saveTaskListToCloud(currentUser.uid, newList);
            }
            
            const newTask: Task = {
                id: generateUUID(),
                listId: listId,
                title: `Tâche pour: ${nextNote.title}`,
                details: '',
                dueDate: nextNote.dueDate,
                subTasks: [],
                completed: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                linkedNoteId: nextNote.id
            };
            nextNote.linkedTaskId = newTask.id;
            setTasks(prev => [...prev, newTask]);
            if (currentUser) saveTaskToCloud(currentUser.uid, newTask);
        }

        if (currentUser) {
          saveNoteToCloud(currentUser.uid, nextNote);
        }
        return nextNote;
      }
      return note;
    }));
  };

  const handleDeleteNote = (id: string) => {
    const newNotes = notes.filter(n => n.id !== id);
    setNotes(newNotes);
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    if (currentUser) {
      deleteNoteFromCloud(currentUser.uid, id);
    }
  };

  const handleAddGroup = (name: string) => {
    const newId = generateUUID();
    const newGroup = { id: newId, name };
    setGroups([...groups, newGroup]);
    if (currentUser) {
      saveGroupToCloud(currentUser.uid, newGroup);
    }
    return newId;
  };

  const handleDeleteGroup = (id: string) => {
    setGroups(groups.filter(g => g.id !== id));
    if (currentUser) {
      deleteGroupFromCloud(currentUser.uid, id);
    }
  };

  const handleRudiCreateNote = (title: string, content: string, groupName?: string) => {
    setGroups(prevGroups => {
      let groupId: string | undefined;
      let newGroups = [...prevGroups];
      if (groupName) {
        let group = newGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
        if (!group) {
          const newGroup = { id: generateUUID(), name: groupName };
          newGroups.push(newGroup);
          groupId = newGroup.id;
          if (currentUser) {
            saveGroupToCloud(currentUser.uid, newGroup);
          }
        } else {
          groupId = group.id;
        }
      }
      
      setNotes(prevNotes => {
        const newId = generateUUID();
        const newNote = {
          id: newId,
          title,
          content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          groupId
        };
        if (currentUser) {
          saveNoteToCloud(currentUser.uid, newNote);
        }
        return [...prevNotes, newNote];
      });

      return newGroups;
    });
  };

  const handleOrganizeNotes = (assignments: { noteId: string, groupName: string }[]) => {
    setGroups(prevGroups => {
      let currentGroups = [...prevGroups];
      let groupMap = new Map<string, string>(); // name to id

      setNotes(prevNotes => {
        let currentNotes = [...prevNotes];
        for (const assignment of assignments) {
          let groupId = groupMap.get(assignment.groupName.toLowerCase());
          
          if (!groupId) {
            let group = currentGroups.find(g => g.name.toLowerCase() === assignment.groupName.toLowerCase());
            if (!group) {
              const newGroup = { id: generateUUID(), name: assignment.groupName };
              currentGroups.push(newGroup);
              groupId = newGroup.id;
              if (currentUser) {
                saveGroupToCloud(currentUser.uid, newGroup);
              }
            } else {
              groupId = group.id;
            }
            groupMap.set(assignment.groupName.toLowerCase(), groupId!);
          }

          const noteIndex = currentNotes.findIndex(n => n.id === assignment.noteId);
          if (noteIndex >= 0) {
            const updatedNote = { ...currentNotes[noteIndex], groupId, updatedAt: Date.now() };
            currentNotes[noteIndex] = updatedNote;
            if (currentUser) {
              saveNoteToCloud(currentUser.uid, updatedNote);
            }
          }
        }
        return currentNotes;
      });

      return currentGroups;
    });
  };

  const handleRenameNote = (noteId: string, newTitle: string) => {
    setNotes(prevNotes => 
      prevNotes.map(n => {
        if (n.id === noteId) {
          const updatedNote = { ...n, title: newTitle, updatedAt: Date.now() };
          if (currentUser) {
            saveNoteToCloud(currentUser.uid, updatedNote);
          }
          return updatedNote;
        }
        return n;
      })
    );
  };

  const handleImportNotes = (importedNotes: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const newNotes = importedNotes.map(n => {
      const created = {
        ...n,
        id: generateUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      if (currentUser) {
        saveNoteToCloud(currentUser.uid, created);
      }
      return created;
    });
    setNotes(prev => [...newNotes, ...prev]);
  };

  const handleAddTaskList = (name: string, color?: string) => {
    const newList: TaskList = { id: generateUUID(), name, color, createdAt: Date.now() };
    setTaskLists(prev => [...prev, newList]);
    if (currentUser) {
      saveTaskListToCloud(currentUser.uid, newList);
    }
  };

  const handleUpdateTaskListsOrder = (updatedLists: TaskList[]) => {
    setTaskLists(updatedLists);
    if (currentUser) {
      updatedLists.forEach(l => saveTaskListToCloud(currentUser.uid, l));
    }
  };

  const handleAddTask = (listId: string, title: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
    const newTask: Task = {
      id: generateUUID(),
      listId,
      title,
      details: '',
      dueDate: null,
      subTasks: [],
      completed: false,
      priority,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setTasks(prev => [...prev, newTask]);
    if (currentUser) {
      saveTaskToCloud(currentUser.uid, newTask);
    }
  };

  const handleRudiModifyNote = (noteId: string, content: string) => {
    handleUpdateNote(noteId, { content, updatedAt: Date.now() });
  };

  const handleRudiCreateTask = (listName: string, title: string, dueDate?: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
    let listId = taskLists.find(l => l.name.toLowerCase() === listName.toLowerCase())?.id;
    if (!listId) {
      listId = generateUUID();
      const newList = { id: listId, name: listName, createdAt: Date.now() };
      setTaskLists(prev => [...prev, newList]);
      if (currentUser) {
        saveTaskListToCloud(currentUser.uid, newList);
      }
    }
    const newTask: Task = {
      id: generateUUID(),
      listId: listId,
      title,
      details: '',
      dueDate: dueDate || null,
      subTasks: [],
      completed: false,
      priority,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setTasks(prev => [...prev, newTask]);
    if (currentUser) {
      saveTaskToCloud(currentUser.uid, newTask);
    }
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextTask = { ...t, ...updates, updatedAt: Date.now() };
        if ('dueDate' in updates && updates.dueDate !== t.dueDate) {
          nextTask.notified = false;
        }
        if (currentUser) {
          saveTaskToCloud(currentUser.uid, nextTask);
        }
        return nextTask;
      }
      return t;
    }));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (currentUser) {
      deleteTaskFromCloud(currentUser.uid, id);
    }
  };

  const handleDeleteTaskList = (listId: string) => {
    setTaskLists(prev => prev.filter(l => l.id !== listId));
    const tasksToDelete = tasks.filter(t => t.listId === listId);
    setTasks(prev => prev.filter(t => t.listId !== listId));
    if (currentUser) {
      deleteTaskListFromCloud(currentUser.uid, listId);
      tasksToDelete.forEach(t => deleteTaskFromCloud(currentUser.uid, t.id));
    }
  };

  const handleMergeLists = (sourceListId: string, targetListId: string) => {
    setTasks(prev => prev.map(t => t.listId === sourceListId ? { ...t, listId: targetListId } : t));
    setTaskLists(prev => prev.filter(l => l.id !== sourceListId));
    if (currentUser) {
      deleteTaskListFromCloud(currentUser.uid, sourceListId);
      tasks.filter(t => t.listId === sourceListId).forEach(t => {
          saveTaskToCloud(currentUser.uid, { ...t, listId: targetListId });
      });
    }
  };

  // .nts Backup Handlers
  const handleExportNts = () => {
    exportToNts({
      notes,
      groups,
      tasks,
      taskLists,
      settings
    });
  };

  const handleImportNts = async (data: {
    notes: Note[];
    groups: NoteGroup[];
    tasks: Task[];
    taskLists: TaskList[];
    settings: any;
  }) => {
    setNotes(data.notes);
    setGroups(data.groups);
    setTasks(data.tasks);
    setTaskLists(data.taskLists);
    
    const nextSettings = { ...settings, ...data.settings, authChoice: currentUser ? 'cloud' : 'local' };
    setSettings(nextSettings);

    // If logged in, upload all these imported documents to cloud database
    if (currentUser) {
      await Promise.all([
        ...data.notes.map(n => saveNoteToCloud(currentUser.uid, n)),
        ...data.groups.map(g => saveGroupToCloud(currentUser.uid, g)),
        ...data.tasks.map(t => saveTaskToCloud(currentUser.uid, t)),
        ...data.taskLists.map(l => saveTaskListToCloud(currentUser.uid, l))
      ]);
    }
  };

  // Local task notifications scheduler
  useEffect(() => {
    if (!settings.enableNotifications) return;

    const checkTasks = () => {
      const now = Date.now();
      tasks.forEach(async (task) => {
        if (task.completed || !task.dueDate || task.notified) return;

        const dueTime = new Date(task.dueDate).getTime();
        if (dueTime <= now) {
          const listName = taskLists.find(l => l.id === task.listId)?.name || 'Ma liste';

          // 1. Trigger beautiful custom Android-style in-app notification Toast
          setActiveNotifications(prev => {
            const exists = prev.some(n => n.id === task.id);
            if (exists) return prev;
            return [
              ...prev,
              {
                id: task.id,
                title: `Tâche urgente : ${task.title}`,
                body: task.details || `L'heure limite est atteinte ! Liste : ${listName}.`,
                listName: listName,
                taskId: task.id,
                createdAt: Date.now()
              }
            ];
          });

          // 2. Trigger native Capacitor LocalNotification if supported
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.floor(Math.random() * 100000),
                  title: `Tâche urgente : ${task.title}`,
                  body: `Liste : ${listName}.${task.details ? ` - ${task.details}` : ''}`,
                  schedule: { at: new Date(Date.now() + 200) }
                }
              ]
            });
          } catch (e) {
            console.log("Capacitor local notification schedule skipped or unsupported on this platform.");
          }

          // 3. Trigger standard web Notification if supported and granted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Tâche urgente : ${task.title}`, {
                body: `L'heure limite est atteinte ! Liste : ${listName}.${task.details ? `\n\nDétails : ${task.details}` : ''}`,
                icon: '/favicon.ico',
                requireInteraction: true
              });
            } catch (err) {
              console.error("Failed to show web notification:", err);
            }
          }

          // Mark task as notified
          handleUpdateTask(task.id, { notified: true });
        }
      });
    };

    // Check immediately and then every 10 seconds (more responsive!)
    checkTasks();
    const interval = setInterval(checkTasks, 10000);

    return () => clearInterval(interval);
  }, [tasks, settings.enableNotifications, taskLists]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-stone-50 dark:bg-stone-950 animate-pulse">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  // Show login screen at the very first launch if no authChoice is chosen
  if (!settings.authChoice) {
    return <LoginScreen onLoginSuccess={handleLoginChoice} />;
  }

  const rudiContextId = view === 'notes' && activeNoteId ? activeNoteId : 'general';

  const shouldShowFirstTime = !isLoading && 
                              settings.authChoice !== null && 
                              !userProfile && 
                              !(currentUser?.providerData?.some(p => p.providerId === 'google.com'));

  return (
    <>
      {shouldShowFirstTime && (
        <FirstTimeProfileModal onSave={handleSaveFirstTimeProfile} />
      )}
      {view === 'home' && (
        <Home 
          onNavigate={(v) => {
            if (v === 'notes') setActiveNoteId(null);
            setView(v);
          }}
          recentNote={notes.length > 0 ? notes.reduce((prev, current) => (prev.updatedAt > current.updatedAt) ? prev : current) : null}
          onOpenNote={(id) => {
            setActiveNoteId(id);
            setView('notes');
          }}
          onOpenRudi={() => setIsRudiOpen(true)}
          userProfile={userProfile}
        />
      )}

      {view === 'settings' && (
        <Settings 
          settings={settings}
          onUpdateSettings={setSettings}
          groups={groups}
          onAddGroup={handleAddGroup}
          onDeleteGroup={handleDeleteGroup}
          onGoHome={() => setView('home')}
          onImportNotes={handleImportNotes}
          
          userProfile={userProfile}
          onUpdateUserProfile={handleUpdateUserProfile}
          
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onSignInWithCloud={() => {
            setSettings(prev => ({ ...prev, authChoice: null }));
          }}
          onExportNts={handleExportNts}
          onImportNts={handleImportNts}
        />
      )}

      {view === 'notes' && (
        <NotesView 
          notes={notes}
          activeNoteId={activeNoteId}
          apiKey={settings.apiKey}
          geminiModel={settings.geminiModel}
          groups={groups}
          onAddGroup={handleAddGroup}
          onSetActiveNoteId={setActiveNoteId}
          onCreateNote={handleCreateNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onGoHome={() => setView('home')}
          onOpenRudi={() => setIsRudiOpen(true)}
          onUpdateNotes={setNotes}
          userProfile={userProfile}
        />
      )}

      {view === 'tasks' && (
        <TasksView 
          tasks={tasks}
          taskLists={taskLists}
          onAddList={handleAddTaskList}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onGoHome={() => setView('home')}
          onOpenRudi={() => setIsRudiOpen(true)}
          onUpdateTaskListsOrder={handleUpdateTaskListsOrder}
          onOpenNote={(noteId) => {
            setActiveNoteId(noteId);
            setView('notes');
          }}
        />
      )}

      <RudiChat 
        isOpen={isRudiOpen}
        onClose={() => setIsRudiOpen(false)}
        contextId={rudiContextId}
        notes={notes}
        groups={groups}
        tasks={tasks}
        taskLists={taskLists}
        apiKey={settings.apiKey}
        geminiModel={settings.geminiModel}
        chatThreads={chatThreads}
        setChatThreads={setChatThreads}
        onCreateNote={handleRudiCreateNote}
        onOrganizeNotes={handleOrganizeNotes}
        onRenameNote={handleRenameNote}
        onModifyNote={handleRudiModifyNote}
        userProfile={userProfile}
        onCreateTask={handleRudiCreateTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onDeleteTaskList={handleDeleteTaskList}
        onMergeLists={handleMergeLists}
      />

      {/* Floating Elegant Android-style Notification Stack */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {activeNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto w-full backdrop-blur-xl bg-stone-900/90 text-white dark:bg-white/95 dark:text-stone-900 shadow-2xl rounded-2xl border border-white/10 dark:border-stone-200/50 p-4 flex flex-col gap-3 transition-colors duration-200"
            >
              {/* Header section (resembles Android status bar notification pill) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center shadow-inner">
                    <Bell className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase opacity-80 dark:opacity-90">
                    Notes Copilot • Rappel
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] opacity-50">maintenant</span>
                  <button 
                    onClick={() => setActiveNotifications(prev => prev.filter(n => n.id !== notif.id))}
                    className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-stone-200/50 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Message section */}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold tracking-tight">{notif.title}</h4>
                <p className="text-xs opacity-80 dark:opacity-75 leading-relaxed">{notif.body}</p>
                {notif.listName && (
                  <span className="inline-block mt-1 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 dark:bg-indigo-100 dark:text-indigo-600 px-2 py-0.5 rounded-full">
                    {notif.listName}
                  </span>
                )}
              </div>

              {/* Actions section (gorgeous custom action pills representing modern Android interactive notifications) */}
              {!notif.isTest && notif.taskId && (
                <div className="flex items-center gap-2 pt-1.5 border-t border-white/10 dark:border-stone-200/40">
                  <button
                    onClick={() => {
                      handleUpdateTask(notif.taskId, { completed: true });
                      setActiveNotifications(prev => prev.filter(n => n.id !== notif.id));
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-50 dark:hover:bg-emerald-100 dark:text-emerald-700 text-[11px] font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Terminer
                  </button>
                  <button
                    onClick={() => {
                      // Snooze: delay task due date by 5 minutes
                      const currentTask = tasks.find(t => t.id === notif.taskId);
                      if (currentTask && currentTask.dueDate) {
                        const newDueDate = new Date(new Date(currentTask.dueDate).getTime() + 5 * 60 * 1000).toISOString();
                        handleUpdateTask(notif.taskId, { dueDate: newDueDate, notified: false });
                      }
                      setActiveNotifications(prev => prev.filter(n => n.id !== notif.id));
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-800 text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    <Clock className="w-3 h-3" />
                    Snoozer 5m
                  </button>
                </div>
              )}

              {notif.isTest && (
                <div className="flex items-center gap-2 pt-1.5 border-t border-white/10 dark:border-stone-200/40">
                  <div className="flex-1 py-1 text-center text-[10px] italic text-indigo-300 dark:text-indigo-600 bg-indigo-500/10 dark:bg-indigo-50 rounded-lg">
                    Ceci est une prévisualisation interactive !
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
