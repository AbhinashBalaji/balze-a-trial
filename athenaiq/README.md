# AthenaIQ

AI document intelligence platform — semantic search, chat with a document,
brief/detailed summaries, translation, knowledge graphs, and document
comparison. Backend is FastAPI + SQLite, AI calls go through the **Groq**
API, frontend is React + Vite + Tailwind.

```
athenaiq/
  backend/     FastAPI app (Python)
  frontend/    React app (Vite)
```

---

## 1. Get a free Groq API key

1. Go to https://console.groq.com/keys and sign up (it's free).
2. Create an API key and copy it — you'll need it in step 2.

## 2. Set up the backend

Requires **Python 3.10+**.

```bash
cd athenaiq/backend

# create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# create your .env file
cp .env.example .env
```

Now open `backend/.env` and paste your Groq key into `GROQ_API_KEY`.
You can leave everything else as-is — the app uses a local SQLite database
(`athenaiq.db`) and a local `uploads/` folder by default, so there's nothing
else to configure to run it.

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

The first time you upload a file, the backend downloads a small (~80MB)
local embedding model (`all-MiniLM-L6-v2`) used for semantic search — this
happens once and is cached afterwards. Leave it running at
`http://localhost:8000`. You can open `http://localhost:8000/docs` to see
the interactive API docs.

## 3. Set up the frontend

Requires **Node.js 18+**. In a new terminal:

```bash
cd athenaiq/frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The frontend is already
configured to talk to the backend at `http://localhost:8000` (see
`frontend/src/api.js` if you ever need to change that).

## 4. Use it

1. Click **Sign in** in the nav → **Create an account**.
2. Go to **Workspace**, upload a PDF / DOCX / TXT / MD / CSV file.
3. Once it shows "ready", click it to open the viewer:
   - **Summarize** → Brief or Detailed
   - **Translate** → pick or type any language
   - **Knowledge graph** → visual map of entities & relationships
   - **Compare** → pick a second document to compare against
   - Chat bubble bottom-right → ask questions about that document
4. Use the search bar at the top of Workspace for semantic search across
   all your documents.
5. **Dashboard** shows word/character/chunk counts per document.

---

## About the database

This ships with **SQLite** (a single `athenaiq.db` file, zero setup) so you
can run the whole thing immediately after unzipping. If you'd rather use a
Google Cloud database (Cloud SQL for Postgres, or AlloyDB) instead:

1. Create the instance in Google Cloud and get its connection string.
2. In `backend/.env`, set:
   ```
   DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DBNAME
   ```
3. `pip install psycopg2-binary` in the backend virtual environment.

No other code changes are needed — the app reads `DATABASE_URL` through
SQLAlchemy either way.

If you specifically want **Firestore** (Google's NoSQL document database)
instead of a SQL database, that requires swapping the SQLAlchemy models in
`backend/app/models.py` for Firestore collection reads/writes — a bigger
change than a config edit, so it's not wired up out of the box here.

## Editing the UI in Google Stitch

The frontend is plain React + Tailwind (`frontend/src`), one component per
file, so it's straightforward to bring individual screens
(`src/pages/*.jsx`, `src/components/*.jsx`) into Stitch and reshape them —
the design tokens (colors, fonts) live in `frontend/tailwind.config.js` and
`frontend/src/index.css` if you want to restyle everything at once.

## Notes & known limits (MVP)

- Auth tokens are stored in `localStorage` — fine for local use, swap for
  httpOnly cookies before any real deployment.
- Semantic search re-scores all your chunks in Python at query time
  (no vector index) — fast enough for personal use, not built for scale.
- The Products, Contact, and About pages are frontend-only, as requested —
  no backend calls behind them yet.
- Groq's free tier has rate limits; if a request fails, wait a few seconds
  and try again.
