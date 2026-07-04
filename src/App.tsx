/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Note, AppSettings, NoteGroup, ChatThread, Task, TaskList } from './types';
import NotesView from './components/NotesView';
import Home from './components/Home';
import Settings from './components/Settings';
import RudiChat from './components/RudiChat';
import TasksView from './components/TasksView';
import LoginScreen from './components/LoginScreen';
import { get, set } from 'idb-keyval';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
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
  exportToNts
} from './lib/sync';

type ViewState = 'home' | 'notes' | 'settings' | 'tasks';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ theme: 'system', apiKey: '', enableNotifications: true, authChoice: null });
  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase Auth and Live Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Rudi Chat state
  const [isRudiOpen, setIsRudiOpen] = useState(false);
  const [chatThreads, setChatThreads] = useState<Record<string, any[]>>({});

  // Load from IndexedDB
  useEffect(() => {
    Promise.all([
      get('notes'),
      get('settings'),
      get('groups'),
      get('chatThreads'),
      get('tasks'),
      get('taskLists')
    ]).then(([savedNotes, savedSettings, savedGroups, savedChatThreads, savedTasks, savedTaskLists]) => {
      if (savedNotes && savedNotes.length > 0) {
        setNotes(savedNotes);
        setActiveNoteId(savedNotes[0].id);
      }
      
      if (savedSettings) setSettings(savedSettings);
      if (savedGroups) setGroups(savedGroups);
      if (savedChatThreads) setChatThreads(savedChatThreads);
      if (savedTasks) setTasks(savedTasks);
      
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
    }
  }, [notes, settings, groups, chatThreads, tasks, taskLists, isLoading]);

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
    setView('home');
  };

  // State modifiers with Firestore backup triggers
  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
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
    const newId = crypto.randomUUID();
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
          const newGroup = { id: crypto.randomUUID(), name: groupName };
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
        const newId = crypto.randomUUID();
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
              const newGroup = { id: crypto.randomUUID(), name: assignment.groupName };
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
        id: crypto.randomUUID(),
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

  const handleAddTaskList = (name: string) => {
    const newList = { id: crypto.randomUUID(), name, createdAt: Date.now() };
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
      id: crypto.randomUUID(),
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

  const handleRudiCreateTask = (listName: string, title: string, dueDate?: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
    let listId = taskLists.find(l => l.name.toLowerCase() === listName.toLowerCase())?.id;
    if (!listId) {
      listId = crypto.randomUUID();
      const newList = { id: listId, name: listName, createdAt: Date.now() };
      setTaskLists(prev => [...prev, newList]);
      if (currentUser) {
        saveTaskListToCloud(currentUser.uid, newList);
      }
    }
    const newTask: Task = {
      id: crypto.randomUUID(),
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
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const checkTasks = () => {
      const now = Date.now();
      tasks.forEach((task) => {
        if (task.completed || !task.dueDate || task.notified) return;

        const dueTime = new Date(task.dueDate).getTime();
        if (dueTime <= now) {
          try {
            const listName = taskLists.find(l => l.id === task.listId)?.name || 'Ma liste';
            new Notification(`Tâche urgente : ${task.title}`, {
              body: `L'heure limite est atteinte ! Liste : ${listName}.${task.details ? `\n\nDétails : ${task.details}` : ''}`,
              icon: '/favicon.ico',
              requireInteraction: true
            });
          } catch (err) {
            console.error("Failed to show task notification:", err);
          }

          // Mark task as notified
          handleUpdateTask(task.id, { notified: true });
        }
      });
    };

    // Check immediately and then every 15 seconds
    checkTasks();
    const interval = setInterval(checkTasks, 15000);

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

  return (
    <>
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
          groups={groups}
          onAddGroup={handleAddGroup}
          onSetActiveNoteId={setActiveNoteId}
          onCreateNote={handleCreateNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onGoHome={() => setView('home')}
          onOpenRudi={() => setIsRudiOpen(true)}
          onUpdateNotes={setNotes}
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
        chatThreads={chatThreads}
        setChatThreads={setChatThreads}
        onCreateNote={handleRudiCreateNote}
        onOrganizeNotes={handleOrganizeNotes}
        onRenameNote={handleRenameNote}
        onCreateTask={handleRudiCreateTask}
        onUpdateTask={handleUpdateTask}
      />
    </>
  );
}
