import {sqliteTable,text,integer,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const boards=sqliteTable('boards',{
  id:text('id').primaryKey(),title:text('title').notNull(),owner:text('owner').notNull(),
  createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),
});
export const elements=sqliteTable('elements',{
  boardId:text('board_id').notNull().references(()=>boards.id),id:text('id').notNull(),
  version:integer('version').notNull(),nonce:integer('nonce').notNull(),data:text('data').notNull(),
},t=>[primaryKey({columns:[t.boardId,t.id]})]);
export const members=sqliteTable('members',{
  boardId:text('board_id').notNull().references(()=>boards.id),userId:text('user_id').notNull(),joinedAt:integer('joined_at').notNull(),
},t=>[primaryKey({columns:[t.boardId,t.userId]}),index('members_user').on(t.userId)]);
export const presence=sqliteTable('presence',{
  boardId:text('board_id').notNull().references(()=>boards.id),clientId:text('client_id').notNull(),
  userId:text('user_id').notNull(),name:text('name').notNull(),data:text('data').notNull(),seenAt:integer('seen_at').notNull(),
},t=>[primaryKey({columns:[t.boardId,t.clientId]})]);
export const usage=sqliteTable('decision_usage',{
  userId:text('user_id').notNull(),day:text('day').notNull(),calls:integer('calls').notNull(),
},t=>[primaryKey({columns:[t.userId,t.day]})]);
