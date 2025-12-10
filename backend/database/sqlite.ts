import initSqlJs, { Database } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;
let SQL: any = null;

const getDbPath = () => {
  if (app && app.getPath) {
    return path.join(app.getPath('userData'), 'projects.db');
  }
  // Fallback for development/testing
  return path.join(process.cwd(), 'projects.db');
};

const DB_PATH = getDbPath();

export class DatabaseManager {
  private db: Database;

  constructor() {
    // Constructor is sync, but we'll initialize async
    // This is a placeholder that will be replaced by initialize()
    this.db = null as any;
  }

  async initialize() {
    try {
      // Ensure directory exists
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Initialize SQL.js
      if (!SQL) {
        SQL = await initSqlJs();
      }

      // Load existing database or create new one
      if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
      }

      // Run schema
      const schema = fs.readFileSync(
        path.join(__dirname, 'schema.sql'),
        'utf-8'
      );
      this.db.run(schema);

      // Save to disk
      this.save();

      db = this.db;
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private save() {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (error) {
      console.error('Database save error:', error);
    }
  }

  // Project CRUD operations (replace Supabase calls)
  getProjects(userId?: string): any[] {
    try {
      const query = userId
        ? 'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
        : 'SELECT * FROM projects ORDER BY updated_at DESC';

      const stmt = this.db.prepare(query);
      const rows = userId ? stmt.getAsObject([userId]) : stmt.getAsObject([]);
      stmt.free();

      // sql.js returns a different format, need to collect all rows
      const results: any[] = [];
      if (userId) {
        stmt.bind([userId]);
        while (stmt.step()) {
          const row = stmt.getAsObject();
          results.push({
            ...row,
            nodes: JSON.parse((row.nodes as string) || '[]'),
            edges: JSON.parse((row.edges as string) || '[]'),
          });
        }
      } else {
        while (stmt.step()) {
          const row = stmt.getAsObject();
          results.push({
            ...row,
            nodes: JSON.parse((row.nodes as string) || '[]'),
            edges: JSON.parse((row.edges as string) || '[]'),
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Get projects error:', error);
      return [];
    }
  }

  createProject(project: { id: string; name: string; userId?: string }): any {
    try {
      this.db.run(
        `INSERT INTO projects (id, user_id, name, nodes, edges) VALUES (?, ?, ?, '[]', '[]')`,
        [project.id, project.userId || 'default', project.name]
      );
      this.save();
      return this.getProject(project.id);
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  updateProject(
    projectId: string,
    updates: { name?: string; nodes?: any; edges?: any }
  ): any {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.name) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.nodes) {
        fields.push('nodes = ?');
        values.push(JSON.stringify(updates.nodes));
      }
      if (updates.edges) {
        fields.push('edges = ?');
        values.push(JSON.stringify(updates.edges));
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(projectId);

      const query = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
      this.db.run(query, values);
      this.save();

      return this.getProject(projectId);
    } catch (error) {
      console.error('Update project error:', error);
      throw error;
    }
  }

  deleteProject(projectId: string): void {
    try {
      this.db.run('DELETE FROM projects WHERE id = ?', [projectId]);
      this.save();
    } catch (error) {
      console.error('Delete project error:', error);
      throw error;
    }
  }

  getProject(projectId: string): any | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
      stmt.bind([projectId]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return {
          ...row,
          nodes: JSON.parse((row.nodes as string) || '[]'),
          edges: JSON.parse((row.edges as string) || '[]'),
        };
      }

      stmt.free();
      return null;
    } catch (error) {
      console.error('Get project error:', error);
      return null;
    }
  }

  close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

// Export singleton instance (will be initialized in main process)
let dbInstance: DatabaseManager | null = null;

export const getDb = async (): Promise<DatabaseManager> => {
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
    await dbInstance.initialize();
  }
  return dbInstance;
};

export { db };
