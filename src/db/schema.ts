import { pgTable, text, timestamp, boolean, integer, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const noteGroups = pgTable('note_groups', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
});

export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  groupId: text('group_id').references(() => noteGroups.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  linkedTaskId: text('linked_task_id'),
  dueDate: text('due_date'),
  tag: text('tag'),
  isLocked: boolean('is_locked').default(false).notNull(),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskLists = pgTable('task_lists', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  listId: text('list_id').references(() => taskLists.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  details: text('details').notNull(),
  dueDate: text('due_date'),
  subTasks: jsonb('sub_tasks').default([]).notNull(),
  completed: boolean('completed').default(false).notNull(),
  priority: text('priority').default('medium'), // 'high', 'medium', 'low'
  notified: boolean('notified').default(false).notNull(),
  linkedNoteId: text('linked_note_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  noteGroups: many(noteGroups),
  notes: many(notes),
  taskLists: many(taskLists),
  tasks: many(tasks),
}));

export const noteGroupsRelations = relations(noteGroups, ({ one, many }) => ({
  user: one(users, { fields: [noteGroups.userId], references: [users.id] }),
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, { fields: [notes.userId], references: [users.id] }),
  group: one(noteGroups, { fields: [notes.groupId], references: [noteGroups.id] }),
}));

export const taskListsRelations = relations(taskLists, ({ one, many }) => ({
  user: one(users, { fields: [taskLists.userId], references: [users.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  list: one(taskLists, { fields: [tasks.listId], references: [taskLists.id] }),
}));
