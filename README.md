# Docker Lab: Containerize a Full-Stack PERN Taskboard

**Time:** 2–3 hours (plus optional production bonus)  
**Stack:** React + TypeScript + Vite, Express + TypeScript, PostgreSQL  
**Goal:** Run this entire application using Docker Compose, without requiring Node.js or PostgreSQL on the host machine.

## The application

Taskboard is a working full-stack task tracker. Users can add tasks, mark tasks complete, delete tasks, and refresh the list. Tasks live in PostgreSQL, **not** in browser storage. The API automatically creates its `tasks` table when it connects to the database.

The application source code is already written. **Do not rewrite the app. Your assignment is to containerize it.**

### Project structure

```text
.
├── client/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── db.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

**Intentionally missing:** Dockerfiles, `.dockerignore` files, `compose.yaml` / `docker-compose.yml`, and a configured `.env`. You will create them.

## Before you start

1. Install Docker Desktop (Windows/Mac) or Docker Engine with the Compose plugin (Linux).
2. Verify Docker is running with `docker version` and `docker compose version`.
3. Open the project root in VS Code.
4. Review `client/package.json`, `server/package.json`, `server/src/db.ts`, and `client/src/App.tsx` to understand how the pieces fit together.
5. You do **not** need to install Node.js or PostgreSQL on your host computer to complete this lab.

### How the app communicates

- Browser → Vite frontend: `http://localhost:5173`
- Browser → Express API: `http://localhost:3000`
- Express API → PostgreSQL: database hostname comes from `DB_HOST`.
- The React app reads `VITE_API_URL` for its API address. **The browser makes these requests**, so the URL must be reachable from the browser, not just from a container.
- API health endpoint: `GET /health` (also checks database connectivity).

> Important: `localhost` inside a container refers to that container. Containers should reach each other by Compose **service name**. The browser on your computer can reach published ports through `localhost`.

## Part 1 — Dockerfiles (30–40 minutes)

Create a Dockerfile inside **each** of `client/` and `server/`.

Requirements:

- Choose an appropriate official Node.js base image.
- Set the working directory.
- Copy the dependency manifests and install packages before copying application source.
- Copy the rest of the source files.
- Start each app using its existing npm scripts.
- Expose the container's listening port (`5173` or `3000`).
- Create a `.dockerignore` in each directory. Exclude `node_modules`, build output, `.env`, and other unnecessary files.
- Do not copy locally installed `node_modules` into images.

**Think about:** Why should `COPY package*.json` happen before `COPY . .`? What does `EXPOSE` do, and does it actually publish a port?

## Part 2 — Docker Compose (25–35 minutes)

Create a Compose file in the **project root** with three services:

| Service | Purpose | Internal port |
|---|---|---|
| `frontend` | React/Vite | 5173 |
| `backend` | Express API | 3000 |
| `database` | PostgreSQL | 5432 |

Requirements:

1. Build frontend and backend from their own directories.
2. Use an official PostgreSQL image (pin a major version, e.g. `postgres:17`).
3. Publish frontend port `5173` and backend port `3000` to the host.
4. Make all services able to communicate over a Compose network.
5. Configure the database username, password, and database name.
6. Use a **named volume** mounted at PostgreSQL's data directory (`/var/lib/postgresql/data` for PostgreSQL 17).
7. Add a PostgreSQL health check using `pg_isready`.
8. Make the backend wait until the database is **healthy**, not merely started.
9. Ensure the Vite development server listens on `0.0.0.0` (the project is already configured for this).

**Hint:** Look up `build`, `ports`, `environment`, `volumes`, `healthcheck`, and `depends_on` with `condition: service_healthy` in the Compose documentation.

## Part 3 — Environment variables (15–20 minutes)

Copy `.env.example` to `.env` and update values as needed. The file is already ignored by Git.

| Variable | Used by | Meaning |
|---|---|---|
| `DB_HOST` | Backend | PostgreSQL hostname inside the Compose network |
| `DB_PORT` | Backend | PostgreSQL internal port |
| `DB_USER` | Backend | PostgreSQL username |
| `DB_PASSWORD` | Backend + database | PostgreSQL password |
| `DB_NAME` | Backend + database | PostgreSQL database name |
| `PORT` | Backend | Express listening port |
| `VITE_API_URL` | Frontend | Browser-accessible API URL |

**Important distinction:** Compose can read `.env` for variable substitution, but a container only receives variables you explicitly pass via `environment` or `env_file`. Also, Vite's `VITE_` variables are exposed to browser code; **never put secrets in them**.

Make sure the backend and PostgreSQL service agree on credentials. Do not commit `.env`.

## Part 4 — Run and test (15–20 minutes)

Once you've created the configuration, run:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

Visit `http://localhost:5173`. Create three tasks, mark one complete, and delete another.

Verify API health:

```bash
curl http://localhost:3000/health
```

Expected when everything works:

```json
{"status":"ok","database":"connected"}
```

If the app fails, inspect logs before changing random configuration values.

## Part 5 — Persistence challenge (20–25 minutes)

1. Create at least three tasks through the UI.
2. Run `docker compose down`.
3. Run `docker compose up -d`.
4. Refresh the page and verify your tasks are still there.
5. Identify the volume using `docker volume ls` and `docker volume inspect`.
6. Explain why a named volume preserves records even when the database container is recreated.
7. **Do not run `docker compose down -v` unless you intend to delete your database data.**

## Part 6 — Troubleshooting (25–35 minutes)

For each scenario, explain **how you would diagnose it**, **which command you would run**, and **what change would fix it**. Your instructor may introduce one or more faults in your Compose file.

1. Backend logs show `ECONNREFUSED` while connecting to PostgreSQL.
2. React renders, but fetching tasks fails in the browser.
3. React code changes do not appear without rebuilding the image.
4. The backend container exits immediately.
5. Host port `5432` is already in use by a local PostgreSQL installation.

**Optional development improvement:** Configure bind mounts for live source-code editing. If mounting `client/` or `server/`, avoid replacing container-installed `node_modules` with an empty host directory. Investigate anonymous/named mounts for dependency directories.

## Part 7 — Docker command demonstration (15–20 minutes)

Demonstrate each task in the terminal and record the command in your submission:

- [ ] Build all project images.
- [ ] Start all services in detached mode.
- [ ] List running containers.
- [ ] Follow only backend logs.
- [ ] Open a shell in the backend container.
- [ ] Run a SQL query from inside the PostgreSQL container.
- [ ] Restart only the backend.
- [ ] Rebuild only the frontend.
- [ ] Stop and remove containers while preserving database records.
- [ ] List Docker images and identify unused ones.

## Bonus — Production-ready images (30–45 minutes)

- Create a multi-stage frontend Dockerfile that builds static assets with Node and serves them using Nginx.
- Build the Express TypeScript server with `npm run build`, then run `node dist/index.js` instead of a development watcher.
- Create a production Compose configuration.
- Add a backend health check.
- Ensure the frontend's API URL works in the production setup (remember the browser-vs-container distinction).

## Deliverables

Submit your GitHub repository with:

1. Both Dockerfiles and both `.dockerignore` files.
2. A working Compose configuration.
3. `.env.example` (but **not** `.env`).
4. A `SUBMISSION.md` explaining how to run the app, the commands used in Part 7, and your troubleshooting findings.
5. Evidence that tasks survive `docker compose down` followed by `docker compose up -d` (screenshots or a brief description of the verification steps).

### Acceptance criteria

Your instructor should be able to clone your repository, create `.env` from `.env.example`, and start all three services with one `docker compose up --build -d` command. The browser must load the frontend, CRUD operations must work, the API health endpoint must report a database connection, and records must persist across container recreation.

## Grading (100 points)

| Area | Points |
|---|---:|
| Dockerfiles | 20 |
| Compose configuration | 20 |
| Networking and environment variables | 15 |
| Database persistence | 15 |
| Troubleshooting | 20 |
| Docker operations | 10 |

## Reference docs

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Compose file reference](https://docs.docker.com/reference/compose-file/)
- [Docker volumes](https://docs.docker.com/engine/storage/volumes/)

---

**Instructor note:** This starter intentionally does not include a completed Docker solution. All app code is provided; students are responsible for containerization, networking, persistence, and debugging. The API creates the database table automatically, but PostgreSQL must already have the configured database created (the official PostgreSQL image can do this using `POSTGRES_DB`).
