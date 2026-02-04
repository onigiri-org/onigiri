import {
  sqliteTable,
  text,
  integer,
  real,
  unique
} from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  handle: text('handle').unique(), // ユニークなID（URL用）。未設定時はidでアクセス
  name: text('name').notNull(),
  avatarUrl: text('avatarUrl'),
  bio: text('bio'),
  createdAt: integer('createdAt').notNull()
})

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: integer('createdAt').notNull()
})

export const shops = sqliteTable('shops', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  placeId: text('placeId'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  createdAt: integer('createdAt').notNull()
})

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull().references(() => users.id),
  content: text('content').notNull(),
  imageUrl: text('imageUrl'), // 後方互換用（imageUrls を優先）
  /** JSON array of image URLs, max 4 items (e.g. ["/images/...","/images/..."]) */
  imageUrls: text('imageUrls'),
  /** JSON array of tag strings, max 5 items (e.g. ["ランチ","和食"]) */
  tags: text('tags'),
  shopId: text('shopId').references(() => shops.id),
  commentToId: integer('commentToId'),
  repostOfId: integer('repostOfId'),
  createdAt: integer('createdAt').notNull()
})

export const follows = sqliteTable('follows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  followerId: text('followerId').notNull().references(() => users.id),
  followingId: text('followingId').notNull().references(() => users.id),
  createdAt: integer('createdAt').notNull()
}, (table) => [
  unique().on(table.followerId, table.followingId)
])

export const likes = sqliteTable('likes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull().references(() => users.id),
  postId: integer('postId').notNull().references(() => posts.id),
  createdAt: integer('createdAt').notNull()
}, (table) => [
  unique().on(table.userId, table.postId)
])

export const userCredentials = sqliteTable('user_credentials', {
  userId: text('userId').primaryKey().references(() => users.id),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull()
})
