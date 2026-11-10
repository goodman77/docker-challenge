import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { pool, initializeDatabase } from './db.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.get('/api/tasks', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC, id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { title, description = '' } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim() || title.length > 200 || typeof description !== 'string') {
    res.status(400).json({ error: 'A title (1–200 characters) and valid description are required' });
    return;
  }
  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
      [title.trim(), description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create task' });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0 || typeof req.body?.completed !== 'boolean') {
    res.status(400).json({ error: 'Valid task ID and completed boolean required' });
    return;
  }
  try {
    const result = await pool.query('UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *', [req.body.completed, id]);
    if (!result.rows[0]) { res.status(404).json({ error: 'Task not found' }); return; }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid task ID' }); return; }
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) { res.status(404).json({ error: 'Task not found' }); return; }
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete task' });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

async function start() {
  await initializeDatabase();
  app.listen(port, '0.0.0.0', () => console.log(`API listening on ${port}`));
}

start().catch(error => {
  console.error('API startup failed. Check PostgreSQL connection settings:', error);
  process.exit(1);
});
