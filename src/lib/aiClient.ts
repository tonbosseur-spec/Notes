import { GoogleGenAI, Type } from "@google/genai";
import { Note, NoteGroup, Task, TaskList, UserProfile } from "../types";

// Helper to determine if we should call the server or run directly on the client
async function callApi<T>(
  endpoint: string,
  body: any,
  headers: Record<string, string>
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    console.error("Non-JSON response from server:", text);
    throw new Error("Le serveur a renvoyé une réponse invalide (HTML au lieu de JSON).");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Une erreur est survenue.");
  }
  return data as T;
}

// Format Gemini errors nicely
function formatClientGeminiError(error: any): string {
  const message = error.message || String(error);
  console.error("Client Gemini Error Details:", error);

  if (message.includes("API key not valid") || (message.includes("INVALID_ARGUMENT") && message.includes("key"))) {
    return "La clé API Gemini est invalide ou expirée. Veuillez vérifier votre clé API dans les paramètres.";
  }
  if (message.includes("quota") || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
    return "Le quota de votre clé API Gemini est dépassé. Veuillez réessayer plus tard ou vérifier vos limites de facturation.";
  }
  if (message.includes("Safety") || message.includes("finishReason: SAFETY") || message.includes("SAFETY")) {
    return "La réponse a été bloquée par les filtres de sécurité de Google Gemini (contenu potentiellement sensible).";
  }
  if (message.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("ETIMEDOUT") || message.includes("ECONNREFUSED") || message.includes("NetworkError") || message.includes("Failed to fetch")) {
    return "Impossible de se connecter aux serveurs Google Gemini. Veuillez vérifier votre connexion Internet.";
  }
  return "Erreur d'IA (client-direct) : " + (message.length > 150 ? message.substring(0, 150) + "..." : message);
}

// Function to get active model name
function getModelName(model?: string): string {
  const cleanModel = (model || "").trim();
  const validModels = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash"
  ];
  if (validModels.includes(cleanModel)) {
    return cleanModel;
  }
  return "gemini-3.5-flash";
}

// AI SUMMARIZE
export async function summarizeNote(
  text: string,
  userProfile: UserProfile | null,
  apiKey: string,
  model?: string
): Promise<{ summary: string }> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  if (model) headers["x-gemini-model"] = model;

  try {
    // 1. Try to call the server API
    return await callApi<{ summary: string }>("/api/ai/summarize", { text, userProfile, model }, headers);
  } catch (error: any) {
    // If the server is unreachable (typical in standalone Android, iOS, or PC packaging),
    // OR if we get an API route not found (404), fall back to direct client GenAI call!
    const isNetworkError = error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("not found");
    
    if (isNetworkError && apiKey) {
      console.log("Server unreachable or 404, falling back to client-side Gemini call for summarize...");
      try {
        const ai = new GoogleGenAI({ apiKey });
        const modelName = getModelName(model);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Tu es un assistant IA intégré dans une application de prise de notes. Ta tâche est de fournir un résumé concis et clair de la note suivante. L'utilisateur s'appelle ${userProfile?.preferredName || userProfile?.firstName || 'utilisateur'} et son pronom est ${userProfile?.pronoun || 'il'}.

Note :
"""
${text}
"""

Fournis uniquement le résumé en format texte brut ou markdown très basique, sans introduction ou conclusion du type "Voici le résumé".`,
        });
        return { summary: response.text || "Aucun résumé n'a pu être généré." };
      } catch (clientErr: any) {
        throw new Error(formatClientGeminiError(clientErr));
      }
    }
    
    // If we can't fall back, rethrow original error
    if (isNetworkError && !apiKey) {
      throw new Error("Le serveur est injoignable et aucune clé API n'est configurée dans vos paramètres. Veuillez ajouter votre propre clé API Gemini dans les Paramètres de l'application pour l'utiliser sur cet appareil.");
    }
    throw error;
  }
}

// AI ORGANIZE
export async function organizeNote(
  text: string,
  userProfile: UserProfile | null,
  apiKey: string,
  model?: string
): Promise<{ organizedContent: string }> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  if (model) headers["x-gemini-model"] = model;

  try {
    return await callApi<{ organizedContent: string }>("/api/ai/organize", { text, userProfile, model }, headers);
  } catch (error: any) {
    const isNetworkError = error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("not found");
    
    if (isNetworkError && apiKey) {
      console.log("Server unreachable, falling back to client-side Gemini call for organize...");
      try {
        const ai = new GoogleGenAI({ apiKey });
        const modelName = getModelName(model);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Tu es un assistant IA intégré dans une application de prise de notes. Ta tâche est de réorganiser, reformuler et formater la note suivante pour qu'elle soit claire, structurée et professionnelle (utilise des listes à puces, du gras, des titres si nécessaire). L'utilisateur s'appelle ${userProfile?.preferredName || userProfile?.firstName || 'utilisateur'} et son pronom est ${userProfile?.pronoun || 'il'}.

Note brute :
"""
${text}
"""

Renvoie uniquement le texte formaté en HTML basique compatible avec Tiptap (ex: <h1>, <p>, <ul>, <li>, <strong>, <em>). N'inclus PAS de balises \`\`\`html ou body. Renvoie le code HTML directement.`,
        });

        let htmlResult = response.text || "";
        if (htmlResult.startsWith("```html")) {
          htmlResult = htmlResult.replace(/```html\n?/, "").replace(/\n?```$/, "");
        } else if (htmlResult.startsWith("```")) {
          htmlResult = htmlResult.replace(/```\n?/, "").replace(/\n?```$/, "");
        }

        return { organizedContent: htmlResult.trim() };
      } catch (clientErr: any) {
        throw new Error(formatClientGeminiError(clientErr));
      }
    }

    if (isNetworkError && !apiKey) {
      throw new Error("Le serveur est injoignable et aucune clé API n'est configurée dans vos paramètres. Veuillez ajouter votre propre clé API Gemini dans les Paramètres pour l'utiliser sur cet appareil.");
    }
    throw error;
  }
}

// AI REWRITE
export async function rewriteText(
  text: string,
  prompt: string | undefined,
  userProfile: UserProfile | null,
  apiKey: string,
  model?: string
): Promise<{ text: string }> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  if (model) headers["x-gemini-model"] = model;

  try {
    return await callApi<{ text: string }>("/api/ai/rewrite", { text, prompt, userProfile, model }, headers);
  } catch (error: any) {
    const isNetworkError = error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("not found");
    
    if (isNetworkError && apiKey) {
      console.log("Server unreachable, falling back to client-side Gemini call for rewrite...");
      try {
        const ai = new GoogleGenAI({ apiKey });
        const modelName = getModelName(model);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Tu es Rudi, un assistant IA intégré dans une application de prise de notes. Ta tâche est de réécrire, corriger ou améliorer le texte sélectionné par l'utilisateur. L'utilisateur s'appelle ${userProfile?.preferredName || userProfile?.firstName || 'utilisateur'} et son pronom est ${userProfile?.pronoun || 'il'}.

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

        return { text: htmlResult.trim() };
      } catch (clientErr: any) {
        throw new Error(formatClientGeminiError(clientErr));
      }
    }

    if (isNetworkError && !apiKey) {
      throw new Error("Le serveur est injoignable et aucune clé API n'est configurée dans vos paramètres. Veuillez ajouter votre propre clé API Gemini dans les Paramètres pour l'utiliser sur cet appareil.");
    }
    throw error;
  }
}

// AI CHAT (RUDI)
export async function chatWithRudi(
  messages: any[],
  contextId: string,
  notes: Note[],
  groups: NoteGroup[],
  tasks: Task[],
  taskLists: TaskList[],
  apiKey: string,
  model?: string,
  userProfile?: UserProfile | null
): Promise<any> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  if (model) headers["x-gemini-model"] = model;

  try {
    return await callApi<any>("/api/ai/chat", {
      messages,
      contextId,
      notes,
      groups,
      tasks,
      taskLists,
      model
    }, headers);
  } catch (error: any) {
    const isNetworkError = error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("not found");
    
    if (isNetworkError && apiKey) {
      console.log("Server unreachable, falling back to client-side Gemini call for chat...");
      try {
        const ai = new GoogleGenAI({ apiKey });
        const modelName = getModelName(model);

        const activeNote = notes.find((n: any) => n.id === contextId);
        const contextName = activeNote ? `Note active: "${activeNote.title}"` : "Contexte général (Accueil/Tâches)";

        const systemInstruction = `Tu es Rudi, un agent IA intégré dans une application de prise de notes et de gestion de tâches.
Tu es un maniaque du rangement, tu aimes quand tout est extrêmement bien organisé, classé, et structuré.
Tu as accès à toutes les notes, dossiers (groupes), listes de tâches et tâches de l'utilisateur.
Le contexte actuel de l'utilisateur est : ${contextName}

Voici la liste des dossiers existants :
${JSON.stringify(groups, null, 2)}

Voici la liste des listes de tâches :
${JSON.stringify(taskLists, null, 2)}

Voici la liste des tâches :
${JSON.stringify(tasks.map((t: any) => ({ id: t.id, title: t.title, completed: t.completed, listId: t.listId, dueDate: t.dueDate, priority: t.priority || "medium" })), null, 2)}

Voici la liste de toutes les notes (id, titre, contenu extrait, groupId) :
${JSON.stringify(notes.map((n: any) => ({ id: n.id, title: n.title, content: n.content.substring(0, 500) + (n.content.length > 500 ? "..." : ""), groupId: n.groupId })), null, 2)}

Tes capacités :
1. Répondre aux questions sur les notes et les tâches.
2. Gérer les notes : \`createNote\`, \`organizeNotes\`, \`renameNote\`, \`modifyNote\`, \`deleteNotes\`.
3. Gérer les tâches : \`createTask\`, \`createTasks\`.
4. Actions diverses : \`updateTask\`, \`deleteTask\`, \`deleteTaskList\`, \`renameTaskList\`, \`mergeLists\`.
5. Reste dans ton personnage de maniaque du rangement.`;

        const response = await ai.models.generateContent({
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
          return {
            functionCalls: response.functionCalls,
            parts: response.candidates?.[0]?.content?.parts || []
          };
        } else {
          return { text: response.text };
        }
      } catch (clientErr: any) {
        throw new Error(formatClientGeminiError(clientErr));
      }
    }

    if (isNetworkError && !apiKey) {
      throw new Error("Le serveur est injoignable et aucune clé API n'est configurée dans vos paramètres. Veuillez ajouter votre propre clé API Gemini dans les Paramètres de l'application pour l'utiliser sur cet appareil.");
    }
    throw error;
  }
}
