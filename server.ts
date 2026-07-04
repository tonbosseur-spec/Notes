import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' })); // Increase limit for notes data

const PORT = 3000;

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

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

// AI Summarize API
app.post("/api/ai/summarize", async (req, res) => {
  let customApiKey = req.headers['x-api-key'] as string;
  if (customApiKey === 'undefined' || customApiKey === 'null') {
    customApiKey = '';
  }
  customApiKey = (customApiKey || '').trim();
  const activeAi = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : ai;

  if (!activeAi) {
    return res.status(500).json({ error: "Gemini API key is missing. Veuillez configurer la clé API dans les paramètres." });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided." });
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
    console.error("Erreur lors de la génération du résumé :", error);
    res.status(500).json({ error: error.message || "Erreur lors de la génération du résumé." });
  }
});

// AI Organize/Structure API
app.post("/api/ai/organize", async (req, res) => {
  let customApiKey = req.headers['x-api-key'] as string;
  if (customApiKey === 'undefined' || customApiKey === 'null') {
    customApiKey = '';
  }
  customApiKey = (customApiKey || '').trim();
  const activeAi = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : ai;

  if (!activeAi) {
    return res.status(500).json({ error: "Gemini API key is missing. Veuillez configurer la clé API dans les paramètres." });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided." });
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
    console.error("Erreur lors de l'organisation :", error);
    res.status(500).json({ error: error.message || "Erreur lors de l'organisation." });
  }
});

// AI Rewrite API
app.post("/api/ai/rewrite", async (req, res) => {
  let customApiKey = req.headers['x-api-key'] as string;
  if (customApiKey === 'undefined' || customApiKey === 'null') {
    customApiKey = '';
  }
  customApiKey = (customApiKey || '').trim();
  const activeAi = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : ai;

  if (!activeAi) {
    return res.status(500).json({ error: "Gemini API key is missing. Veuillez configurer la clé API dans les paramètres." });
  }

  const { text, prompt } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided." });
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
    console.error("Erreur lors de la réécriture :", error);
    res.status(500).json({ error: error.message || "Erreur lors de la réécriture." });
  }
});

// Rudi Chat API
app.post("/api/ai/chat", async (req, res) => {
  let customApiKey = req.headers['x-api-key'] as string;
  if (customApiKey === 'undefined' || customApiKey === 'null') {
    customApiKey = '';
  }
  customApiKey = (customApiKey || '').trim();
  const activeAi = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : ai;

  if (!activeAi) {
    return res.status(500).json({ error: "Gemini API key is missing. Veuillez configurer la clé API dans les paramètres." });
  }

  const { messages, contextId, notes, groups, tasks = [], taskLists = [] } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format." });
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
2. Créer des notes avec \`createNote\`, organiser les notes avec \`organizeNotes\`, renommer les notes avec \`renameNote\`.
3. Créer de nouvelles tâches (avec titre et liste cible) en utilisant \`createTask\`. Si la liste cible n'existe pas, elle sera créée automatiquement. Tu peux définir le niveau de priorité de la tâche ('high', 'medium', 'low').
4. Modifier les tâches (marquer comme terminée, changer la date/heure limite, les détails, changer le niveau de priorité) en utilisant \`updateTask\`.
5. Reste dans ton personnage de maniaque du rangement, sois courtois mais pointilleux sur l'organisation.`;

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
    res.status(500).json({ error: error.message || "Erreur lors de la conversation avec Rudi." });
  }
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
}

startServer();
