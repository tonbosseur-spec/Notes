import { db } from './index.ts';
import { users, notes, noteGroups, taskLists, tasks } from './schema.ts';
import { eq, and } from 'drizzle-orm';

// User queries
export async function getOrCreateUser(uid: string, email: string, firstName?: string, lastName?: string, photoUrl?: string | null) {
  try {
    const result = await db.insert(users)
      .values({
        id: uid,
        email,
        firstName,
        lastName,
        photoUrl: photoUrl || null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          firstName,
          lastName,
          photoUrl: photoUrl || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Failed to get or create user:", error);
    throw new Error("User synchronization failed", { cause: error });
  }
}

// Note queries
export async function getUserNotes(userId: string) {
  return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(notes.updatedAt);
}

export async function saveNote(userId: string, data: any) {
  return db.insert(notes)
    .values({
      ...data,
      userId,
      createdAt: new Date(data.createdAt || Date.now()),
      updatedAt: new Date(data.updatedAt || Date.now()),
    })
    .onConflictDoUpdate({
      target: notes.id,
      set: {
        ...data,
        userId,
        updatedAt: new Date(data.updatedAt || Date.now()),
      },
    })
    .returning();
}

export async function deleteNote(userId: string, noteId: string) {
  return db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
}

// Group queries
export async function getUserGroups(userId: string) {
  return db.select().from(noteGroups).where(eq(noteGroups.userId, userId));
}

export async function saveGroup(userId: string, data: any) {
  return db.insert(noteGroups)
    .values({ ...data, userId })
    .onConflictDoUpdate({
      target: noteGroups.id,
      set: { ...data, userId },
    })
    .returning();
}

export async function deleteGroup(userId: string, groupId: string) {
  return db.delete(noteGroups).where(and(eq(noteGroups.id, groupId), eq(noteGroups.userId, userId)));
}

// Task queries
export async function getUserTasks(userId: string) {
  return db.select().from(tasks).where(eq(tasks.userId, userId));
}

export async function saveTask(userId: string, data: any) {
  return db.insert(tasks)
    .values({
      ...data,
      userId,
      createdAt: new Date(data.createdAt || Date.now()),
      updatedAt: new Date(data.updatedAt || Date.now()),
    })
    .onConflictDoUpdate({
      target: tasks.id,
      set: {
        ...data,
        userId,
        updatedAt: new Date(data.updatedAt || Date.now()),
      },
    })
    .returning();
}

export async function deleteTask(userId: string, taskId: string) {
  return db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

// TaskList queries
export async function getUserTaskLists(userId: string) {
  return db.select().from(taskLists).where(eq(taskLists.userId, userId));
}

export async function saveTaskList(userId: string, data: any) {
  return db.insert(taskLists)
    .values({
      ...data,
      userId,
      createdAt: new Date(data.createdAt || Date.now()),
    })
    .onConflictDoUpdate({
      target: taskLists.id,
      set: { ...data, userId },
    })
    .returning();
}

export async function deleteTaskList(userId: string, listId: string) {
  return db.delete(taskLists).where(and(eq(taskLists.id, listId), eq(taskLists.userId, userId)));
}
