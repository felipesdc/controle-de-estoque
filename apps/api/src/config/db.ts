import dotenv from "dotenv";
import { DatabaseSync, SQLInputValue } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import bcrypt from "bcryptjs";
import { schema } from "./schema";

dotenv.config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("Defina JWT_SECRET com pelo menos 32 caracteres.");
}
const filename = process.env.SQLITE_PATH || resolve("data/estoque.sqlite");
if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
const db = new DatabaseSync(filename);
const calendarioSP = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
db.function('dia_sao_paulo', {deterministic:true}, value => {
  if (typeof value !== 'string') return null;
  // Legacy dates without an offset are interpreted as UTC, independently of the host timezone.
  const day = value.slice(0,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10) !== day) return null;
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value + (value.length === 10 ? 'T00:00:00Z' : 'Z');
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = calendarioSP.formatToParts(date);
  return ['year','month','day'].map(type => parts.find(p => p.type === type)!.value).join('-');
});
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
if (Number((db.prepare("PRAGMA user_version").get() as any).user_version) < 1) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(schema);
    db.exec("PRAGMA user_version = 1; COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// Incremental migration preserves the existing database and legacy history.
if (Number((db.prepare("PRAGMA user_version").get() as any).user_version) < 2) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      ALTER TABLE pi2_movimentos_estoque ADD COLUMN movimento_usuario_id INTEGER REFERENCES pi2_usuarios(usuario_id);
      ALTER TABLE pi2_movimentos_estoque ADD COLUMN movimento_estorno_de INTEGER REFERENCES pi2_movimentos_estoque(movimento_id);
      ALTER TABLE pi2_movimentos_estoque ADD COLUMN movimento_saldo_anterior REAL;
      ALTER TABLE pi2_movimentos_estoque ADD COLUMN movimento_saldo_posterior REAL;
      ALTER TABLE pi2_movimentos_estoque ADD COLUMN movimento_chave TEXT;
      CREATE UNIQUE INDEX idx_movimento_estorno ON pi2_movimentos_estoque(movimento_estorno_de);
      CREATE UNIQUE INDEX idx_movimento_chave ON pi2_movimentos_estoque(movimento_chave);
      PRAGMA user_version = 2;
      COMMIT;
    `);
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

if (Number((db.prepare("PRAGMA user_version").get() as any).user_version) < 3) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      INSERT INTO pi2_perfis (perfil_id,perfil_nome) VALUES (1,'Administrador'),(2,'Gerente'),(3,'Consulta')
      ON CONFLICT(perfil_id) DO UPDATE SET perfil_nome=excluded.perfil_nome;
      CREATE TABLE pi2_sessoes (sessao_id TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES pi2_usuarios(usuario_id), expira_em INTEGER NOT NULL);
      CREATE INDEX idx_sessao_usuario ON pi2_sessoes(usuario_id);
      CREATE INDEX idx_sessao_expiracao ON pi2_sessoes(expira_em);
      PRAGMA user_version=3;
      COMMIT;
    `);
  } catch(error) { db.exec("ROLLBACK"); throw error; }
}

// New purchasing workflow leaves legacy orders explicitly unconverted.
if (Number((db.prepare("PRAGMA user_version").get() as any).user_version) < 4) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      ALTER TABLE pi2_pedidos ADD COLUMN pedido_fluxo TEXT;
      ALTER TABLE pi2_pedidos ADD COLUMN pedido_versao INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE pi2_pedidos ADD COLUMN pedido_total_centavos INTEGER;
      ALTER TABLE pi2_pedidos ADD COLUMN pedido_chave TEXT;
      ALTER TABLE pi2_pedidos ADD COLUMN pedido_recebimento_chave TEXT;
      CREATE UNIQUE INDEX idx_pedido_chave ON pi2_pedidos(pedido_chave);
      CREATE UNIQUE INDEX idx_pedido_recebimento ON pi2_pedidos(pedido_recebimento_chave);
      ALTER TABLE pi2_itens_pedido ADD COLUMN item_preco_centavos INTEGER;
      ALTER TABLE pi2_itens_pedido ADD COLUMN item_total_centavos INTEGER;
      ALTER TABLE pi2_movimentos_estoque ADD COLUMN movimento_item_pedido_id INTEGER REFERENCES pi2_itens_pedido(item_pedido_id);
      CREATE UNIQUE INDEX idx_movimento_item_pedido ON pi2_movimentos_estoque(movimento_item_pedido_id);
      CREATE TABLE pi2_eventos_pedido (
        evento_id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL REFERENCES pi2_pedidos(pedido_id),
        estado TEXT NOT NULL, data TEXT NOT NULL,
        usuario_id INTEGER NOT NULL REFERENCES pi2_usuarios(usuario_id),
        observacao TEXT NOT NULL
      );
      CREATE INDEX idx_evento_pedido ON pi2_eventos_pedido(pedido_id);
      PRAGMA user_version=4;
      COMMIT;
    `);
  } catch(error) { db.exec("ROLLBACK"); throw error; }
}

// Delivery ledger adds partial receipts without rewriting previous full receipts.
if (Number((db.prepare("PRAGMA user_version").get() as any).user_version) < 5) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      CREATE TABLE pi2_entregas_pedido (
        entrega_id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL REFERENCES pi2_pedidos(pedido_id),
        tipo TEXT NOT NULL CHECK(tipo IN ('receber','devolver')),
        chave TEXT NOT NULL UNIQUE, conteudo TEXT NOT NULL,
        documento TEXT NOT NULL, motivo TEXT NOT NULL,
        usuario_id INTEGER NOT NULL REFERENCES pi2_usuarios(usuario_id), data TEXT NOT NULL
      );
      CREATE TABLE pi2_entrega_itens (
        entrega_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        entrega_id INTEGER NOT NULL REFERENCES pi2_entregas_pedido(entrega_id),
        item_pedido_id INTEGER NOT NULL REFERENCES pi2_itens_pedido(item_pedido_id),
        quantidade_milesimos INTEGER NOT NULL CHECK(quantidade_milesimos>0),
        movimento_id INTEGER NOT NULL UNIQUE REFERENCES pi2_movimentos_estoque(movimento_id),
        UNIQUE(entrega_id,item_pedido_id)
      );
      CREATE INDEX idx_entrega_pedido ON pi2_entregas_pedido(pedido_id);
      CREATE INDEX idx_entrega_item_pedido ON pi2_entrega_itens(item_pedido_id);
      PRAGMA user_version=5;
      COMMIT;
    `);
  } catch(error) { db.exec("ROLLBACK"); throw error; }
}

// Bootstrap only an empty database. Never reset an existing account on restart.
if (!(db.prepare("SELECT 1 FROM pi2_usuarios LIMIT 1").get())) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Defina ADMIN_PASSWORD com pelo menos 12 caracteres para inicializar a base.");
  }
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT OR IGNORE INTO pi2_perfis (perfil_id, perfil_nome) VALUES (1, 'Administrador')").run();
    db.prepare(`INSERT INTO pi2_usuarios
      (usuario_nome, usuario_email, usuario_password, usuario_nome_completo, usuario_inscricao, usuario_perfil_id, usuario_status)
      VALUES (?, ?, ?, ?, ?, 1, 1)`)
      .run("admin", process.env.ADMIN_EMAIL || "admin@localhost", bcrypt.hashSync(password, 12), "Administrador", new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const booleanColumns = new Set(["produto_estado", "usuario_status"]);
const query = (sql: string, values: unknown[] = []): { rows: any[] } => {
    // Preserve the existing model API while binding each placeholder by its number.
    const bindings: SQLInputValue[] = [];
    const statement = db.prepare(sql.replace(/\$(\d+)/g, (_match, index) => {
      const value = values[Number(index) - 1];
      if (value === undefined || value === null) bindings.push(null);
      else if (typeof value === "boolean") bindings.push(value ? 1 : 0);
      else if (value instanceof Date) bindings.push(value.toISOString());
      else if (typeof value === "string" || typeof value === "number") bindings.push(value);
      else throw new TypeError("Parâmetro SQL inválido");
      return "?";
    }));
    if (/^\s*SELECT\b/i.test(sql) || /\bRETURNING\b/i.test(sql)) {
      const rows = statement.all(...bindings).map(row => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, booleanColumns.has(key) && value !== null ? Boolean(value) : value])
      ));
      return { rows };
    }
    statement.run(...bindings);
    return { rows: [] };
};
const pool = {
  query: async (sql: string, values: unknown[] = []) => query(sql, values),
  transaction<T>(operation: (execute: typeof query) => T): T {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation(query);
      if (result instanceof Promise) throw new Error("Transações devem ser síncronas");
      db.exec("COMMIT");
      return result;
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  },
};
export default pool;
