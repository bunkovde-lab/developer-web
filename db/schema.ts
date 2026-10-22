import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const onlineRooms=sqliteTable('online_rooms',{code:text('code').primaryKey(),revision:integer('revision').notNull(),data:text('data').notNull(),updatedAt:integer('updated_at').notNull()});
