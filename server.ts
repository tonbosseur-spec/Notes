import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { 
  getOrCreateUser, 
  getUserNotes, 
  saveNote, 
  deleteNote, 
  getUserGroups, 
  saveGroup, 
  deleteGroup, 
  getUserTasks, 
  saveTask, 
  deleteTask, 
  getUserTaskLists, 
  saveTaskList, 
  deleteTaskList 
} from "./src/db/queries.ts";

dotenv.config();

const app = express();
app.use(cors({
  origin: [/localhost/, /\.google\.com$/, /\.run\.app$/],
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Increase limit for notes data

const PORT = 3000;

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

function getModelName(req: any): string {
  let model = (req.headers['x-gemini-model'] as string) || req.body.model || '';
  if (model === 'undefined' || model === 'null') {
    model = '';
  }
  model = (model || '').trim();
  const validModels = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash'
  ];
  if (validModels.includes(model)) {
    return model;
  }
  return 'gemini-3.5-flash';
}

function formatGeminiError(error: any) {
  const message = error.message || String(error);
  console.error("Gemini Error Details:", error);
  
  if (message.includes("API key not valid") || message.includes("INVALID_ARGUMENT") && message.includes("key")) {
    return "La clé API Gemini est invalide ou expirée. Veuillez vérifier votre configuration dans les paramètres.";
  }
  if (message.includes("quota") || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
    return "Le quota de l'API Gemini est dépassé pour aujourd'hui. Vous pourrez réessayer demain ou utiliser votre propre clé API dans les paramètres pour plus de limites.";
  }
  if (message.includes("Safety") || message.includes("finishReason: SAFETY") || message.includes("SAFETY")) {
    return "La réponse a été bloquée par les filtres de sécurité de Google Gemini (contenu potentiellement sensible ou inapproprié).";
  }
  if (message.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("ETIMEDOUT") || message.includes("ECONNREFUSED")) {
    return "Impossible de contacter les serveurs de Google Gemini. Vérifiez votre connexion internet ou réessayez dans quelques instants.";
  }
  if (message.includes("model not found") || message.includes("404")) {
    return "Le modèle d'IA sélectionné est introuvable ou n'est pas encore disponible dans votre région.";
  }
  
  return "Rudi a rencontré une erreur technique : " + (message.length > 100 ? message.substring(0, 100) + "..." : message);
}

// AI Summarize API
app.post("/api/ai/summarize", async (req, res) => {
  let customApiKey = req.headers['x-api-key'] as string;
  if (customApiKey === 'undefined' || customApiKey === 'null') {
    customApiKey = '';
  }
  customApiKey = (customApiKey || '').trim();
  const activeAi = customApiKey ? new GoogleGenAI({ 
    apiKey: customApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : ai;

  if (!activeAi) {
    return res.status(500).json({ error: "Clé API Gemini manquante. Veuillez la configurer dans les paramètres pour utiliser les fonctions IA." });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Aucun texte fourni pour le résumé." });
  }

  try {
    const modelName = getModelName(req);
    const response = await activeAi.models.generateContent({
      model: modelName,
      contents: `Tu es un assistant IA intégré dans une application de prise de notes. Ta tâche est de fournir un résumé concis et clair de la note suivante. L'utilisateur s'appelle ${req.body.userProfile?.preferredName || req.body.userProfile?.firstName || 'utilisateur'} et son pronom est ${req.body.userProfile?.pronoun || 'il'}.

Note :
"""
${text}
"""

Fournis uniquement le résumé en format texte brut ou markdown très basique, sans introduction ou conclusion du type "Voici le résumé".`,
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Erreur résumé :", error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

// AI Organize/Structure API
app.post("/api/ai/organize", async (req, res) => {
  let customApiKey = req.headers['x-api-key'] as string;
  if (customApiKey === 'undefined' || customApiKey === 'null') {
    customApiKey = '';
  }
  customApiKey = (customApiKey || '').trim();
  const activeAi = customApiKey ? new GoogleGenAI({ 
    apiKey: customApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : ai;

  if (!activeAi) {
    return res.status(500).json({ error: "Clé API Gemini manquante. Veuillez la configurer dans les paramètres." });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Aucun texte fourni." });
  }

  try {
    const modelName = getModelName(req);
    const response = await activeAi.models.generateContent({
      model: modelName,
      contents: `Tu es un assistant IA intégré dans une application de prise de notes. Ta tâche est de réorganiser, reformuler et formater la note suivante pour qu'elle soit claire, structurée et professionnelle (utilise des listes à puces, du gras, des titres si nécessaire). L'utilisateur s'appelle ${req.body.userProfile?.preferredName || req.body.userProfile?.firstName || 'utilisateur'} et son pronom est ${req.body.userProfile?.pronoun || 'il'}.

Note brute :
"""
${text}
"""

Renvoie uniquement le texte formaté en HTML basique compatible avec Tiptap (ex: <h1>, <p>, <ul>, <li>, <strong>, <em>). N'inclus PAS de balises \`\`\`html ou body. Renvoie le code HTML directement.`,
    });

    // Remove markdown code blocks if the model insists on adding them
    let htmlResult = response.text || "";
    if (htmlResult.startsWith("```html")) {
        htmlResult = htmlResult.replace(/```html\n?/, "").replace(/\n?```$/, "");
    } else if (htmlResult.startsWith("```")) {
        htmlResult = htmlResult.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    res.json({ organizedContent: htmlResult.trim() });
  } catch (error: any) {
    console.error("Erreur organisation :", error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

// AI Rewrite API
app.post("/api/ai/rewrite", async (req, res) => {
  let customApiKey = req.headers['x-api-key'] as string;
  if (customApiKey === 'undefined' || customApiKey === 'null') {
    customApiKey = '';
  }
  customApiKey = (customApiKey || '').trim();
  const activeAi = customApiKey ? new GoogleGenAI({ 
    apiKey: customApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : ai;

  if (!activeAi) {
    return res.status(500).json({ error: "Clé API Gemini manquante. Veuillez la configurer dans les paramètres." });
  }

  const { text, prompt } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Aucun texte sélectionné." });
  }

  try {
    const modelName = getModelName(req);
    const response = await activeAi.models.generateContent({
      model: modelName,
      contents: `Tu es Rudi, un assistant IA intégré dans une application de prise de notes. Ta tâche est de réécrire, corriger ou améliorer le texte sélectionné par l'utilisateur. L'utilisateur s'appelle ${req.body.userProfile?.preferredName || req.body.userProfile?.firstName || 'utilisateur'} et son pronom est ${req.body.userProfile?.pronoun || 'il'}.

Texte sélectionné :
"""
${text}
"""

Instructions supplémentaires (optionnel) : ${prompt || "Améliore la grammaire, le style et la clarté du texte."}

Renvoie uniquement le texte modifié en HTML basique compatible avec Tiptap (ex: <p>, <strong>, <em>, <ul>). N'inclus PAS de balises \`\`\`html ou body. Renvoie le code HTML directement sans texte introductif.`,
    });

    let htmlResult = response.text || "";
    if (htmlResult.startsWith("```html")) {
        htmlResult = htmlResult.replace(/```html\n?/, "").replace(/\n?```$/, "");
    } else if (htmlResult.startsWith("```")) {
        htmlResult = htmlResult.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    res.json({ text: htmlResult.trim() });
  } catch (error: any) {
    console.error("Erreur réécriture :", error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

// Rudi Chat API
app.post("/api/ai/chat", async (req, res) => {
  let customApiKey = req.headers['x-api-key'] as string;
  if (customApiKey === 'undefined' || customApiKey === 'null') {
    customApiKey = '';
  }
  customApiKey = (customApiKey || '').trim();
  const activeAi = customApiKey ? new GoogleGenAI({ 
    apiKey: customApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : ai;

  if (!activeAi) {
    return res.status(500).json({ error: "Clé API Gemini manquante. Veuillez la configurer dans les paramètres." });
  }

  const { messages, contextId, notes, groups, tasks = [], taskLists = [] } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Format de messages invalide." });
  }

  const activeNote = notes.find((n: any) => n.id === contextId);
  const contextName = activeNote ? `Note active: "${activeNote.title}"` : 'Contexte général (Accueil/Tâches)';

  const systemInstruction = `Tu es Rudi, un agent IA intégré dans une application de prise de notes et de gestion de tâches.
Tu es un maniaque du rangement, tu aimes quand tout est extrêmement bien organisé, classé, et structuré.
Tu as accès à toutes les notes, dossiers (groupes), listes de tâches et tâches de l'utilisateur.
Le contexte actuel de l'utilisateur est : ${contextName}

Voici la liste des dossiers existants :
${JSON.stringify(groups, null, 2)}

Voici la liste des listes de tâches :
${JSON.stringify(taskLists, null, 2)}

Voici la liste des tâches :
${JSON.stringify(tasks.map((t: any) => ({ id: t.id, title: t.title, completed: t.completed, listId: t.listId, dueDate: t.dueDate, priority: t.priority || 'medium' })), null, 2)}

Voici la liste de toutes les notes (id, titre, contenu extrait, groupId) :
${JSON.stringify(notes.map((n: any) => ({ id: n.id, title: n.title, content: n.content.substring(0, 500) + (n.content.length > 500 ? '...' : ''), groupId: n.groupId })), null, 2)}

Tes capacités :
1. Répondre aux questions sur les notes et les tâches.
2. Gérer les notes : \`createNote\`, \`organizeNotes\`, \`renameNote\`, \`modifyNote\`, \`deleteNotes\`.
3. Gérer les tâches : \`createTask\`, \`createTasks\`.
4. Actions diverses : \`updateTask\`, \`deleteTask\`, \`deleteTaskList\`, \`renameTaskList\`, \`mergeLists\`.
5. Reste dans ton personnage de maniaque du rangement.`;

  try {
    const modelName = getModelName(req);
    const response = await activeAi.models.generateContent({
      model: modelName,
      contents: messages,
      config: {
        systemInstruction,
        tools: [{
          functionDeclarations: [
            {
              name: "createNote",
              description: "Crée une nouvelle note dans l'application.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Le titre de la note" },
                  content: { type: Type.STRING, description: "Le contenu de la note (HTML basique autorisé pour la structure)" },
                  groupName: { type: Type.STRING, description: "Nom du dossier dans lequel placer la note (optionnel)" }
                },
                required: ["title", "content"]
              }
            },
            {
              name: "organizeNotes",
              description: "Déplace une ou plusieurs notes existantes vers un dossier (qui sera créé si le nom n'existe pas).",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  assignments: {
                    type: Type.ARRAY,
                    description: "Liste des assignations de notes à des dossiers.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        noteId: { type: Type.STRING, description: "L'ID de la note à déplacer" },
                        groupName: { type: Type.STRING, description: "Le nom du dossier cible" }
                      },
                      required: ["noteId", "groupName"]
                    }
                  }
                },
                required: ["assignments"]
              }
            },
            {
              name: "renameNote",
              description: "Renomme le titre d'une note existante.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  noteId: { type: Type.STRING, description: "L'ID de la note à renommer" },
                  newTitle: { type: Type.STRING, description: "Le nouveau titre de la note" }
                },
                required: ["noteId", "newTitle"]
              }
            },
            {
              name: "modifyNote",
              description: "Modifie le contenu d'une note existante.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  noteId: { type: Type.STRING, description: "L'ID de la note à modifier" },
                  content: { type: Type.STRING, description: "Le nouveau contenu de la note (HTML basique autorisé pour la structure)" }
                },
                required: ["noteId", "content"]
              }
            },
            {
              name: "createTask",
              description: "Crée une nouvelle tâche.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Le titre de la tâche" },
                  listName: { type: Type.STRING, description: "Le nom de la liste de tâches où la placer" },
                  dueDate: { type: Type.STRING, description: "Date et heure limite au format ISO (optionnel)" },
                  priority: { type: Type.STRING, description: "Niveau de priorité de la tâche: 'high', 'medium', 'low' (optionnel, par défaut 'medium')" }
                },
                required: ["title", "listName"]
              }
            },
            {
              name: "createTasks",
              description: "Crée plusieurs tâches d'un coup.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  tasks: {
                    type: Type.ARRAY,
                    description: "Liste des tâches à créer",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING, description: "Le titre de la tâche" },
                        listName: { type: Type.STRING, description: "Le nom de la liste de tâches où la placer" },
                        dueDate: { type: Type.STRING, description: "Date et heure limite au format ISO (optionnel)" },
                        priority: { type: Type.STRING, description: "Priorité: 'high', 'medium', 'low' (optionnel)" }
                      },
                      required: ["title", "listName"]
                    }
                  }
                },
                required: ["tasks"]
              }
            },
            {
              name: "deleteNotes",
              description: "Supprime une ou plusieurs notes.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  noteIds: {
                    type: Type.ARRAY,
                    description: "Liste des IDs de notes à supprimer",
                    items: { type: Type.STRING }
                  }
                },
                required: ["noteIds"]
              }
            },
            {
              name: "updateTask",
              description: "Modifie une tâche existante (ex: la marquer comme terminée, changer la date, changer la priorité).",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING, description: "L'ID de la tâche à modifier" },
                  completed: { type: Type.BOOLEAN, description: "Si la tâche est terminée (true) ou non (false)" },
                  dueDate: { type: Type.STRING, description: "Nouvelle date limite au format ISO (optionnel)" },
                  title: { type: Type.STRING, description: "Nouveau titre (optionnel)" },
                  priority: { type: Type.STRING, description: "Nouveau niveau de priorité de la tâche: 'high', 'medium', 'low' (optionnel)" }
                },
                required: ["taskId"]
              }
            },
            {
              name: "deleteTask",
              description: "Supprime une tâche.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING, description: "L'ID de la tâche à supprimer" }
                },
                required: ["taskId"]
              }
            },
            {
              name: "deleteTaskList",
              description: "Supprime une liste de tâches.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  listId: { type: Type.STRING, description: "L'ID de la liste à supprimer" }
                },
                required: ["listId"]
              }
            },
            {
              name: "renameTaskList",
              description: "Renomme une liste de tâches existante.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  listId: { type: Type.STRING, description: "L'ID de la liste à renommer" },
                  newName: { type: Type.STRING, description: "Le nouveau nom de la liste" }
                },
                required: ["listId", "newName"]
              }
            },
            {
              name: "mergeLists",
              description: "Fusionne deux listes de tâches.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  sourceListId: { type: Type.STRING, description: "L'ID de la liste à fusionner" },
                  targetListId: { type: Type.STRING, description: "L'ID de la liste cible" }
                },
                required: ["sourceListId", "targetListId"]
              }
            }
          ]
        }]
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      res.json({ 
        functionCalls: response.functionCalls,
        parts: response.candidates?.[0]?.content?.parts || []
      });
    } else {
      res.json({ text: response.text });
    }
  } catch (error: any) {
    console.error("Erreur Rudi Chat:", error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

// --- Database API Routes ---

// Auth sync endpoint
app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email, firstName, lastName, photoUrl } = req.body;
    const user = await getOrCreateUser(req.user!.uid, email, firstName, lastName, photoUrl);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Notes endpoints
app.get("/api/notes", requireAuth, async (req: AuthRequest, res) => {
  try {
    const notes = await getUserNotes(req.user!.uid);
    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notes", requireAuth, async (req: AuthRequest, res) => {
  try {
    const note = await saveNote(req.user!.uid, req.body);
    res.json(note[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/notes/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await deleteNote(req.user!.uid, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Groups endpoints
app.get("/api/groups", requireAuth, async (req: AuthRequest, res) => {
  try {
    const groups = await getUserGroups(req.user!.uid);
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/groups", requireAuth, async (req: AuthRequest, res) => {
  try {
    const group = await saveGroup(req.user!.uid, req.body);
    res.json(group[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/groups/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await deleteGroup(req.user!.uid, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tasks endpoints
app.get("/api/tasks", requireAuth, async (req: AuthRequest, res) => {
  try {
    const tasks = await getUserTasks(req.user!.uid);
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tasks", requireAuth, async (req: AuthRequest, res) => {
  try {
    const task = await saveTask(req.user!.uid, req.body);
    res.json(task[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await deleteTask(req.user!.uid, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// TaskLists endpoints
app.get("/api/task-lists", requireAuth, async (req: AuthRequest, res) => {
  try {
    const lists = await getUserTaskLists(req.user!.uid);
    res.json(lists);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/task-lists", requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await saveTaskList(req.user!.uid, req.body);
    res.json(list[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/task-lists/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await deleteTaskList(req.user!.uid, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API 404 handler
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler to ensure JSON response
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error:", err);
    res.status(500).json({ 
      error: "Une erreur interne du serveur s'est produite.",
      details: err.message || String(err)
    });
  });
}

startServer();
