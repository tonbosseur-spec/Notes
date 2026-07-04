import React, { useState, useEffect } from 'react';
import { Task, TaskList, SubTask } from '../types';
import { generateUUID } from '../lib/utils';
import { Plus, Check, Calendar, ChevronDown, ChevronRight, CheckCircle2, Circle, MoreVertical, Clock, X, Trash2, Home, Bot, CheckSquare, Menu, GripVertical } from 'lucide-react';

interface TasksViewProps {
  tasks: Task[];
  taskLists: TaskList[];
  onAddList: (name: string, color?: string) => void;
  onAddTask: (listId: string, title: string, priority?: 'high' | 'medium' | 'low') => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onGoHome: () => void;
  onOpenRudi: () => void;
  onUpdateTaskListsOrder?: (taskLists: TaskList[]) => void;
  onOpenNote: (noteId: string) => void;
}

export default function TasksView({
  tasks,
  taskLists,
  onAddList,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onGoHome,
  onOpenRudi,
  onUpdateTaskListsOrder
}: TasksViewProps) {
  const [activeListId, setActiveListId] = useState<string | null>(taskLists.length > 0 ? taskLists[0].id : null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#6366f1');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Drag and drop states for task lists
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);

  const handleListDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedListId(id);
  };

  const handleListDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedListId === id) return;
    setDragOverListId(id);
  };

  const handleListDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedListId || draggedListId === targetId) return;

    const draggedIdx = taskLists.findIndex(l => l.id === draggedListId);
    const targetIdx = taskLists.findIndex(l => l.id === targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const updatedLists = [...taskLists];
      const [removed] = updatedLists.splice(draggedIdx, 1);
      updatedLists.splice(targetIdx, 0, removed);
      if (onUpdateTaskListsOrder) {
        onUpdateTaskListsOrder(updatedLists);
      }
    }

    setDraggedListId(null);
    setDragOverListId(null);
  };

  const handleListDragEnd = () => {
    setDraggedListId(null);
    setDragOverListId(null);
  };

  // Automatically select the first list if none is active but lists exist
  useEffect(() => {
    if (!activeListId && taskLists.length > 0) {
      setActiveListId(taskLists[0].id);
    }
  }, [taskLists, activeListId]);

  const handleAddList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      onAddList(newListName.trim(), newListColor);
      setNewListName('');
      setNewListColor('#6366f1');
      setIsAddingList(false);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() && activeListId) {
      const targetListId = activeListId === 'all' ? (taskLists[0]?.id || 'default-list') : activeListId;
      onAddTask(targetListId, newTaskTitle.trim(), newTaskPriority);
      setNewTaskTitle('');
      setNewTaskPriority('medium');
    }
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleAddSubTask = (taskId: string, title: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubTasks = [...task.subTasks, { id: generateUUID(), title, completed: false }];
    onUpdateTask(taskId, { subTasks: newSubTasks });
  };

  const handleToggleSubTask = (taskId: string, subTaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubTasks = task.subTasks.map(st => 
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask(taskId, { subTasks: newSubTasks });
  };

  const priorityWeight = { high: 3, medium: 2, low: 1 };

  const activeTasks = tasks
    .filter(t => (activeListId === 'all' || t.listId === activeListId) && !t.completed)
    .sort((a, b) => {
      const pA = priorityWeight[a.priority || 'medium'];
      const pB = priorityWeight[b.priority || 'medium'];
      if (pB !== pA) return pB - pA;
      return b.createdAt - a.createdAt;
    });

  const completedTasks = tasks
    .filter(t => (activeListId === 'all' || t.listId === activeListId) && t.completed)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex h-screen bg-stone-50 dark:bg-stone-950 overflow-hidden relative">
      {/* Sidebar Backdrop on mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-72 bg-stone-100/90 dark:bg-stone-900/95 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-transform duration-300 fixed inset-y-0 left-0 z-40 md:static md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 flex items-center justify-between border-b border-stone-200 dark:border-stone-800">
          <button 
            onClick={onGoHome}
            className="p-2 -ml-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
            title="Retour à l'accueil"
          >
            <Home className="w-5 h-5" />
          </button>
          <span className="font-semibold text-stone-700 dark:text-stone-300">Listes</span>
          <button 
            onClick={onOpenRudi}
            className="p-2 -mr-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
            title="Assistant Rudi"
          >
            <Bot className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => {
              setActiveListId('all');
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 mb-2 ${
              activeListId === 'all'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/30 shadow-xs'
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
            }`}
          >
            <CheckSquare className="w-4.5 h-4.5 text-indigo-500" />
            Toutes les tâches
          </button>

          <div className="h-px bg-stone-200 dark:bg-stone-800 my-2" />

          {taskLists.map(list => {
            const isDragged = draggedListId === list.id;
            const isDragOver = dragOverListId === list.id;
            return (
              <div
                key={list.id}
                draggable
                onDragStart={(e) => handleListDragStart(e, list.id)}
                onDragOver={(e) => handleListDragOver(e, list.id)}
                onDrop={(e) => handleListDrop(e, list.id)}
                onDragEnd={handleListDragEnd}
                className={`relative group/list transition-all duration-200 rounded-lg ${
                  isDragged ? 'opacity-35 scale-95 border-dashed border border-stone-300 dark:border-stone-700' : ''
                } ${
                  isDragOver ? 'border-t-2 border-indigo-500 pt-1' : ''
                }`}
              >
                <button
                  onClick={() => {
                    setActiveListId(list.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors pr-8 flex items-center justify-between ${
                    activeListId === list.id 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="truncate">{list.name}</span>
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/list:opacity-100 transition-opacity pointer-events-none cursor-grab active:cursor-grabbing text-stone-400">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
          
          {isAddingList ? (
            <form onSubmit={handleAddList} className="mt-2 px-1 flex gap-2">
              <input
                type="text"
                autoFocus
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="Nouvelle liste..."
                className="w-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="color"
                value={newListColor}
                onChange={e => setNewListColor(e.target.value)}
                className="w-10 h-9 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                title="Choisir une couleur"
              />
            </form>
          ) : (
            <button
              onClick={() => setIsAddingList(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg mt-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle liste
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {activeListId ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full">
            <header className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors md:hidden"
                  title="Ouvrir les listes"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50">
                  {activeListId === 'all' ? "Toutes les tâches" : taskLists.find(l => l.id === activeListId)?.name}
                </h1>
              </div>

              <div className="flex items-center gap-2 md:hidden">
                <button 
                  onClick={onGoHome}
                  className="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
                  title="Retour à l'accueil"
                >
                  <Home className="w-5 h-5" />
                </button>
                <button 
                  onClick={onOpenRudi}
                  className="p-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                  title="Assistant Rudi"
                >
                  <Bot className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Statistiques de progrès */}
            {(activeTasks.length > 0 || completedTasks.length > 0) && (
              <div className="mb-8 p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Progression globale</span>
                    <span className="text-xs text-stone-400 dark:text-stone-500">• {completedTasks.length} sur {activeTasks.length + completedTasks.length} tâche{activeTasks.length + completedTasks.length > 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {Math.round((completedTasks.length / (activeTasks.length + completedTasks.length)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.round((completedTasks.length / (activeTasks.length + completedTasks.length)) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
                    En cours : {activeTasks.length}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Terminées : {completedTasks.length}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleAddTask} className="mb-8 space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Ajouter une tâche..."
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 pl-12 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 placeholder-stone-400"
                />
                <Plus className="w-5 h-5 text-stone-400 absolute left-4 top-3.5" />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Priorité :</span>
                <button
                  type="button"
                  onClick={() => setNewTaskPriority('low')}
                  className={`px-2.5 py-1 rounded-full border transition-all ${
                    newTaskPriority === 'low'
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/25 dark:border-blue-900 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                  }`}
                >
                  Basse
                </button>
                <button
                  type="button"
                  onClick={() => setNewTaskPriority('medium')}
                  className={`px-2.5 py-1 rounded-full border transition-all ${
                    newTaskPriority === 'medium'
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/25 dark:border-amber-900 text-amber-600 dark:text-amber-400 font-semibold'
                      : 'border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                  }`}
                >
                  Moyenne
                </button>
                <button
                  type="button"
                  onClick={() => setNewTaskPriority('high')}
                  className={`px-2.5 py-1 rounded-full border transition-all ${
                    newTaskPriority === 'high'
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/25 dark:border-red-900 text-red-600 dark:text-red-400 font-semibold'
                      : 'border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
                  }`}
                >
                  Haute
                </button>
              </div>
            </form>

            <div className="space-y-6">
              {/* Active Tasks */}
              <div className="space-y-3">
                {activeTasks.length === 0 ? (
                  <p className="text-stone-500 dark:text-stone-400 text-sm">Aucune tâche en cours.</p>
                ) : (
                  activeTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      listName={taskLists.find(l => l.id === task.listId)?.name}
                      listColor={taskLists.find(l => l.id === task.listId)?.color}
                      isExpanded={!!expandedTasks[task.id]}
                      onToggleExpand={() => toggleTaskExpanded(task.id)}
                      onUpdate={(updates) => onUpdateTask(task.id, updates)}
                      onDelete={() => onDeleteTask(task.id)}
                      onAddSubTask={(title) => handleAddSubTask(task.id, title)}
                      onToggleSubTask={(stId) => handleToggleSubTask(task.id, stId)}
                    />
                  ))
                )}
              </div>

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="pt-8">
                  <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Terminées ({completedTasks.length})
                  </h3>
                  <div className="space-y-3 opacity-75">
                    {completedTasks.map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        listName={taskLists.find(l => l.id === task.listId)?.name}
                        listColor={taskLists.find(l => l.id === task.listId)?.color}
                        isExpanded={!!expandedTasks[task.id]}
                        onToggleExpand={() => toggleTaskExpanded(task.id)}
                        onUpdate={(updates) => onUpdateTask(task.id, updates)}
                        onDelete={() => onDeleteTask(task.id)}
                        onAddSubTask={(title) => handleAddSubTask(task.id, title)}
                        onToggleSubTask={(stId) => handleToggleSubTask(task.id, stId)}
                        onOpenNote={onOpenNote}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-500 dark:text-stone-400">
            Sélectionnez ou créez une liste pour commencer.
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({ 
  task, 
  isExpanded, 
  onToggleExpand, 
  onUpdate, 
  onDelete,
  onAddSubTask,
  onToggleSubTask,
  listName,
  listColor,
  onOpenNote
}: { 
  task: Task; 
  isExpanded: boolean; 
  onToggleExpand: () => void; 
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onAddSubTask: (title: string) => void;
  onToggleSubTask: (id: string) => void;
  listName?: string;
  listColor?: string;
  onOpenNote?: (noteId: string) => void;
}) {
  const [newSubTask, setNewSubTask] = useState('');

  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubTask.trim()) {
      onAddSubTask(newSubTask.trim());
      setNewSubTask('');
    }
  };

  return (
    <div className={`bg-white dark:bg-stone-900 border ${task.completed ? 'border-transparent' : 'border-stone-200 dark:border-stone-800'} rounded-xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow`}>
      <div className="flex items-center p-4 gap-3">
        <button 
          onClick={() => onUpdate({ completed: !task.completed })}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.completed 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : 'border-stone-300 dark:border-stone-600 hover:border-emerald-500'
          }`}
        >
          {task.completed && <Check className="w-4 h-4" />}
        </button>
        
        <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={onToggleExpand}>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 
              className={`text-base font-medium ${isExpanded ? 'w-full whitespace-pre-wrap break-words' : 'truncate'} ${task.completed ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-stone-900 dark:text-stone-100'}`}
              style={{ color: !task.completed && listColor ? listColor : undefined }}
            >
              {task.title}
            </h4>
            {task.linkedNoteId && onOpenNote && (
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenNote(task.linkedNoteId!); }}
                className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md border border-emerald-200/50 dark:border-emerald-900/30 hover:bg-emerald-100 transition-colors"
              >
                Voir Note
              </button>
            )}
            {task.priority === 'high' && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-md border border-red-200/50 dark:border-red-900/30">
                Haute
              </span>
            )}
            {task.priority === 'medium' && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 rounded-md border border-amber-200/50 dark:border-amber-900/30">
                Moyenne
              </span>
            )}
            {task.priority === 'low' && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 rounded-md border border-blue-200/50 dark:border-blue-900/30">
                Basse
              </span>
            )}
            {listName && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-stone-100 text-stone-600 dark:bg-stone-850 dark:text-stone-300 rounded-md border border-stone-200/50 dark:border-stone-800/50">
                {listName}
              </span>
            )}
          </div>
          {(task.dueDate || task.subTasks.length > 0) && (
            <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
              {task.dueDate && !isNaN(new Date(task.dueDate).getTime()) && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(task.dueDate).toLocaleString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {task.subTasks.length > 0 && (
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5" />
                  {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onToggleExpand} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-stone-100 dark:border-stone-800 mt-2 space-y-4">
          <div>
            <textarea
              value={task.details}
              onChange={(e) => onUpdate({ details: e.target.value })}
              placeholder="Détails de la tâche..."
              className="w-full text-sm bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg p-3 min-h-[80px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-400" />
              <input 
                type="datetime-local"
                value={task.dueDate ? new Date(new Date(task.dueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                onChange={(e) => onUpdate({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="bg-transparent text-stone-600 dark:text-stone-300 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500">Priorité :</span>
              <select
                value={task.priority || 'medium'}
                onChange={(e) => onUpdate({ priority: e.target.value as 'high' | 'medium' | 'low' })}
                className="text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg px-2 py-1 focus:outline-none text-stone-700 dark:text-stone-300"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            
            <button 
              onClick={onDelete}
              className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
          </div>

          <div className="pt-2">
            <h5 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Sous-tâches</h5>
            <div className="space-y-2">
              {task.subTasks.map(st => (
                <div key={st.id} className="flex items-center gap-2 text-sm group">
                  <button 
                    onClick={() => onToggleSubTask(st.id)}
                    className="text-stone-400 hover:text-emerald-500"
                  >
                    {st.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4" />}
                  </button>
                  <span className={`flex-1 ${st.completed ? 'text-stone-400 line-through' : 'text-stone-700 dark:text-stone-300'}`}>
                    {st.title}
                  </span>
                </div>
              ))}
              <form onSubmit={handleAddSubTask} className="flex items-center gap-2 pt-1">
                <Plus className="w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={newSubTask}
                  onChange={e => setNewSubTask(e.target.value)}
                  placeholder="Nouvelle sous-tâche..."
                  className="flex-1 bg-transparent text-sm focus:outline-none text-stone-700 dark:text-stone-300 placeholder-stone-400"
                />
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
