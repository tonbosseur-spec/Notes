import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { Note, NoteGroup, Task, TaskList, UserProfile } from '../types';

interface RudiChatProps {
  isOpen: boolean;
  onClose: () => void;
  contextId: string;
  notes: Note[];
  groups: NoteGroup[];
  userProfile: UserProfile | null;
  tasks?: Task[];
  taskLists?: TaskList[];
  apiKey: string;
  geminiModel?: string;
  chatThreads: Record<string, any[]>;
  setChatThreads: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  onCreateNote: (title: string, content: string, groupName?: string) => void;
  onOrganizeNotes: (assignments: { noteId: string, groupName: string }[]) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onModifyNote: (noteId: string, content: string) => void;
  onCreateTask?: (listName: string, title: string, dueDate?: string, priority?: 'high' | 'medium' | 'low') => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onAddTaskList?: (name: string) => string | void; // returns listId ideally, but we can manage inside App.tsx or here
}

export default function RudiChat({
  isOpen,
  onClose,
  contextId,
  notes,
  groups,
  userProfile,
  tasks = [],
  taskLists = [],
  apiKey,
  geminiModel,
  chatThreads,
  setChatThreads,
  onCreateNote,
  onOrganizeNotes,
  onRenameNote,
  onModifyNote,
  onCreateTask,
  onUpdateTask,
  onAddTaskList
}: RudiChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = chatThreads[contextId] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const activeNote = notes.find(n => n.id === contextId);
  const title = activeNote ? `Note : ${activeNote.title}` : 'Général';

  const sendMessageToApi = async (currentMessages: any[]) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      };
      if (geminiModel) {
        headers['x-gemini-model'] = geminiModel;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: currentMessages,
          contextId,
          notes,
          groups,
          tasks,
          taskLists,
          model: geminiModel
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Network response was not ok');
      }

      return data;
    } catch (error: any) {
      console.error("Erreur:", error);
      return { error: true, message: error.message || "Désolé, une erreur s'est produite lors de la communication." };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', parts: [{ text: input.trim() }] };
    const updatedMessages = [...messages, userMessage];
    
    setChatThreads(prev => ({
      ...prev,
      [contextId]: updatedMessages
    }));
    setInput('');
    setIsLoading(true);

    let currentMessages = updatedMessages;
    let isDone = false;

    while (!isDone) {
      const data = await sendMessageToApi(currentMessages);

      if (data.error) {
        const errorMsg = data.message || "Désolé, une erreur s'est produite lors de la communication.";
        currentMessages = [...currentMessages, { role: 'model', parts: [{ text: errorMsg }] }];
        setChatThreads(prev => ({ ...prev, [contextId]: currentMessages }));
        isDone = true;
        break;
      }

      if (data.functionCalls && data.functionCalls.length > 0) {
        // Add model's function call message, preserving exact parts from API if available to keep thought_signature and functionCall id intact
        const modelFuncMsg = { 
          role: 'model', 
          parts: data.parts && data.parts.length > 0 
            ? data.parts 
            : data.functionCalls.map((fc: any) => ({ functionCall: fc })) 
        };
        currentMessages = [...currentMessages, modelFuncMsg];
        setChatThreads(prev => ({ ...prev, [contextId]: currentMessages }));

        // Execute functions and collect responses
        const functionResponses = [];
        for (const fc of data.functionCalls) {
          const { name, args, id } = fc;
          let result = { success: true };
          try {
            if (name === 'createNote') {
              onCreateNote(args.title, args.content, args.groupName);
              result = { success: true, message: `Note '${args.title}' créée avec succès.` } as any;
            } else if (name === 'organizeNotes') {
              onOrganizeNotes(args.assignments);
              result = { success: true, message: `Notes organisées avec succès.` } as any;
            } else if (name === 'renameNote') {
              onRenameNote(args.noteId, args.newTitle);
              result = { success: true, message: `Note renommée avec succès.` } as any;
            } else if (name === 'modifyNote') {
              onModifyNote(args.noteId, args.content);
              result = { success: true, message: `Note modifiée avec succès.` } as any;
            } else if (name === 'createTask' && onCreateTask) {
              onCreateTask(args.listName, args.title, args.dueDate, args.priority);
              result = { success: true, message: `Tâche '${args.title}' créée avec succès.` } as any;
            } else if (name === 'updateTask' && onUpdateTask) {
              onUpdateTask(args.taskId, { 
                ...(args.completed !== undefined ? { completed: args.completed } : {}),
                ...(args.dueDate !== undefined ? { dueDate: args.dueDate } : {}),
                ...(args.title !== undefined ? { title: args.title } : {}),
                ...(args.priority !== undefined ? { priority: args.priority } : {})
              });
              result = { success: true, message: `Tâche modifiée avec succès.` } as any;
            } else {
              result = { success: false, error: 'Unknown function' } as any;
            }
          } catch (e: any) {
             result = { success: false, error: e.message } as any;
          }
          functionResponses.push({
            functionResponse: {
              name,
              response: result,
              ...(id ? { id } : {})
            }
          });
        }

        // Add user's function response message
        const userFuncResMsg = { role: 'user', parts: functionResponses };
        currentMessages = [...currentMessages, userFuncResMsg];
        setChatThreads(prev => ({ ...prev, [contextId]: currentMessages }));
        
        // Loop again with the new messages to get the model's text response
      } else if (data.text) {
        // Add model's text response
        currentMessages = [...currentMessages, { role: 'model', parts: [{ text: data.text }] }];
        setChatThreads(prev => ({ ...prev, [contextId]: currentMessages }));
        isDone = true;
      } else {
        isDone = true;
      }
    }

    setIsLoading(false);
  };

  const renderMessageContent = (msg: any) => {
    // Only render text parts. We hide the function calls and responses from the user to keep it clean,
    // like standard Gemini interface.
    const textParts = msg.parts.filter((p: any) => p.text);
    if (textParts.length === 0) return null;

    return (
      <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
          {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>
        <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'bg-transparent text-stone-800 dark:text-stone-200 prose prose-sm dark:prose-invert max-w-none'}`}>
          {textParts.map((p: any, i: number) => (
             <div key={i} className="markdown-body">
               <Markdown>{p.text}</Markdown>
             </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 w-full md:w-[400px] h-full md:h-[600px] md:max-h-[calc(100vh-3rem)] md:max-w-[calc(100vw-3rem)] bg-white dark:bg-stone-950 md:border border-stone-200 dark:border-stone-800 rounded-none md:rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">Rudi</h3>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wider">{title}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-white dark:bg-stone-950">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 px-4 pt-12">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
              <Bot className="w-6 h-6" />
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Bonjour {userProfile?.preferredName || userProfile?.firstName || 'utilisateur'} ! Je suis Rudi, votre assistant maniaque du rangement. Je peux vous aider à organiser vos notes ou répondre à vos questions.
            </p>
          </div>
        )}
        
        {messages.map((msg: any, idx: number) => (
          <React.Fragment key={idx}>
            {renderMessageContent(msg)}
          </React.Fragment>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
             <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="px-4 py-3 flex items-center text-stone-500">
               <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-950">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Demandez à Rudi d'organiser vos notes..."
            className="w-full bg-stone-100 dark:bg-stone-900 border-none rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-stone-900 dark:text-stone-100 placeholder:text-stone-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
