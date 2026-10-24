/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, jsonb, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull(),
  userId: uuid("user_id").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("group_members_group_user_key").on(table.groupId, table.userId),
  index("idx_group_members_user").on(table.userId),
  foreignKey({
    columns: [table.groupId],
    foreignColumns: [groups.id],
    name: "group_members_group_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "group_members_user_id_fkey",
  }).onDelete("cascade"),
]);

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  value: text("value").notNull(),
}, (table) => [
  uniqueIndex("settings_key_key").on(table.key),
  index("idx_settings_key").on(table.key),
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id"),
  action: varchar("action", { length: 50 }).notNull(),
  target: varchar("target", { length: 200 }),
  detail: text("detail"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_audit_logs_created").on(table.createdAt),
  index("idx_audit_logs_operator").on(table.operatorId),
  foreignKey({
    columns: [table.operatorId],
    foreignColumns: [users.id],
    name: "audit_logs_operator_id_fkey",
  }),
]);

export const history = pgTable("history", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetCollection: varchar("target_collection", { length: 50 }).notNull(),
  targetRecordId: uuid("target_record_id").notNull(),
  targetTitle: varchar("target_title", { length: 200 }),
  projectId: uuid("project_id"),
  /**
   * @type { Record<string, any> }
   */
  snapshot: jsonb("snapshot").notNull().default('{}'),
  action: varchar("action", { length: 20 }).notNull(),
  operatorId: uuid("operator_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_history_target").on(table.targetCollection, table.targetRecordId),
  index("idx_history_project_id").on(table.projectId),
  foreignKey({
    columns: [table.operatorId],
    foreignColumns: [users.id],
    name: "history_operator_id_fkey",
  }),
]);

export const jizhangRecords = pgTable("jizhang_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordDate: date("record_date").notNull(),
  incomeExpense: varchar("income_expense", { length: 10 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  amount: numeric("amount").notNull(),
  remark: varchar("remark", { length: 500 }),
  recorderId: uuid("recorder_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  ownerId: uuid("owner_id"),
  projectId: uuid("project_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_jizhang_project_id").on(table.projectId),
  index("idx_jizhang_record_date").on(table.recordDate),
  index("idx_jizhang_is_deleted").on(table.isDeleted),
  foreignKey({
    columns: [table.recorderId],
    foreignColumns: [users.id],
    name: "jizhang_records_recorder_id_fkey",
  }),
  foreignKey({
    columns: [table.ownerId],
    foreignColumns: [users.id],
    name: "jizhang_records_owner_id_fkey",
  }),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [appData.id],
    name: "jizhang_records_project_id_fkey",
  }).onDelete("cascade"),
]);

export const appData = pgTable("app_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  app: varchar("app", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  /**
   * @type { Record<string, any> }
   */
  content: jsonb("content").notNull().default('{}'),
  ownerId: uuid("owner_id"),
  readScope: varchar("read_scope", { length: 20 }).notNull().default('owner'),
  readUserIds: uuid("read_user_ids").array().notNull().default([]),
  editScope: varchar("edit_scope", { length: 20 }).notNull().default('owner'),
  editUserIds: uuid("edit_user_ids").array().notNull().default([]),
  parentId: uuid("parent_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_app_data_app").on(table.app),
  index("idx_app_data_owner_id").on(table.ownerId),
  index("idx_app_data_parent_id").on(table.parentId),
  index("idx_app_data_updated").on(table.updatedAt),
  foreignKey({
    columns: [table.ownerId],
    foreignColumns: [users.id],
    name: "app_data_owner_id_fkey",
  }),
  foreignKey({
    columns: [table.parentId],
    foreignColumns: [appData.id],
    name: "app_data_parent_id_fkey",
  }),
]);

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 100 }),
  type: varchar("type", { length: 20 }).notNull().default('html'),
  url: varchar("url", { length: 500 }),
  htmlContent: text("html_content"),
  visibility: varchar("visibility", { length: 20 }).notNull().default('all'),
  visibleUserIds: uuid("visible_user_ids").array().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  groupId: uuid("group_id"),
  ownerId: uuid("owner_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  appMode: boolean("app_mode").notNull().default(false),
  templateId: uuid("template_id"),
  visibleGroupIds: uuid("visible_group_ids").array().notNull().default([]),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("pages_slug_key").on(table.slug),
  index("idx_pages_slug").on(table.slug),
  index("idx_pages_visibility").on(table.visibility),
  index("idx_pages_owner_id").on(table.ownerId),
  index("idx_pages_group_id").on(table.groupId),
  index("idx_pages_is_deleted").on(table.isDeleted),
  index("idx_pages_sort_order").on(table.sortOrder, table.createdAt),
  foreignKey({
    columns: [table.groupId],
    foreignColumns: [groups.id],
    name: "pages_group_id_fkey",
  }),
  foreignKey({
    columns: [table.ownerId],
    foreignColumns: [users.id],
    name: "pages_owner_id_fkey",
  }),
  foreignKey({
    columns: [table.templateId],
    foreignColumns: [templates.id],
    name: "pages_template_id_fkey",
  }),
]);

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default('html'),
  icon: varchar("icon", { length: 100 }),
  description: text("description"),
  htmlContent: text("html_content"),
  url: varchar("url", { length: 500 }),
  visibility: varchar("visibility", { length: 20 }).notNull().default('all'),
  visibleUserIds: uuid("visible_user_ids").array().notNull().default([]),
  visibleGroupIds: uuid("visible_group_ids").array().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  ownerId: uuid("owner_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_templates_visibility").on(table.visibility),
  foreignKey({
    columns: [table.ownerId],
    foreignColumns: [users.id],
    name: "templates_owner_id_fkey",
  }),
]);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  remark: varchar("remark", { length: 500 }),
  leaderId: uuid("leader_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_groups_leader_id").on(table.leaderId),
  foreignKey({
    columns: [table.leaderId],
    foreignColumns: [users.id],
    name: "groups_leader_id_fkey",
  }),
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  avatar: varchar("avatar", { length: 500 }),
  level: varchar("level", { length: 20 }).notNull().default('level_3'),
  groupId: uuid("group_id"),
  approved: boolean("approved").notNull().default(false),
  resetToken: varchar("reset_token", { length: 255 }),
  resetTokenExpires: customTimestamptz("reset_token_expires", { precision: 6 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("users_email_key").on(table.email),
  index("idx_users_email").on(table.email),
  index("idx_users_level").on(table.level),
  index("idx_users_approved").on(table.approved),
  index("idx_users_group_id").on(table.groupId),
]);

// table aliases
export const appDataTable = appData;
export const auditLogsTable = auditLogs;
export const groupMembersTable = groupMembers;
export const groupsTable = groups;
export const historyTable = history;
export const jizhangRecordsTable = jizhangRecords;
export const pagesTable = pages;
export const settingsTable = settings;
export const templatesTable = templates;
export const usersTable = users;
