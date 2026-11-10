import { useEffect, useState, type FormEvent } from 'react';

type Task = { id: number; title: string; description: string; completed: boolean; created_at: string };
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadTasks() {
    try {
      const res = await fetch(`${API}/api/tasks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks(await res.json());
      setError('');
    } catch { setError('Could not reach the API. Check that the backend and database are running.'); }
  }
  useEffect(() => { void loadTasks(); }, []);

  async function createTask(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description }) });
      if (!res.ok) throw new Error('Failed to create task');
      setTitle(''); setDescription(''); await loadTasks();
    } catch { setError('Unable to create task.'); } finally { setBusy(false); }
  }

  async function toggle(task: Task) {
    try {
      const res = await fetch(`${API}/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: !task.completed }) });
      if (!res.ok) throw new Error('Failed to update');
      await loadTasks();
    } catch { setError('Unable to update task.'); }
  }

  async function remove(id: number) {
    try {
      const res = await fetch(`${API}/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await loadTasks();
    } catch { setError('Unable to delete task.'); }
  }

  const done = tasks.filter(t => t.completed).length;
  return <main className="shell">
    <header><div className="eyebrow">PERN • DOCKER LAB</div><h1>Taskboard<span>.</span></h1><p>A small task tracker with a real PostgreSQL database.</p></header>
    <section className="stats"><div><strong>{tasks.length}</strong><span>Total tasks</span></div><div><strong>{done}</strong><span>Completed</span></div><div><strong>{tasks.length - done}</strong><span>Remaining</span></div></section>
    <section className="panel"><h2>Create a task</h2><form onSubmit={createTask}><label htmlFor="title">Title</label><input id="title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Containerize the API" required /><label htmlFor="desc">Description</label><textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details" rows={3}/><button disabled={busy}>{busy ? 'Adding...' : '+ Add task'}</button></form></section>
    <section className="panel"><div className="heading"><h2>Your tasks</h2><button className="secondary" onClick={() => void loadTasks()}>Refresh</button></div>{error && <p className="error" role="alert">{error}</p>}{tasks.length === 0 ? <p className="empty">No tasks yet. Add your first one above.</p> : <ul>{tasks.map(t => <li key={t.id}><input aria-label={`Mark ${t.title} completed`} type="checkbox" checked={t.completed} onChange={() => void toggle(t)} /><div className="task"><strong className={t.completed ? 'done' : ''}>{t.title}</strong>{t.description && <p>{t.description}</p>}</div><button className="delete" aria-label={`Delete ${t.title}`} onClick={() => void remove(t.id)}>Delete</button></li>)}</ul>}</section>
    <footer>React + TypeScript · Express · PostgreSQL</footer>
  </main>;
}
