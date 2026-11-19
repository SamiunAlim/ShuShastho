# ShuShastho (সুস্বাস্থ্য)

**Bangla-first healthcare coordination app.** A patient describes symptoms (Bangla or English) → AI triage with safety rules → the right hospital, department and doctor → live serial queue → e-prescription → medicine → report → recovery check-in, all in one connected journey.

Roles: **Patient · Doctor · Receptionist · Pharmacist · Hospital admin · Super admin** (admin dashboards are web-only).

> ⚠️ Demo project for a competition. All doctors, patients and medical data are fictional. The AI gives guidance only. It never diagnoses or prescribes, and emergencies always point to **999**.

---

## Project structure

```
ShuShastho/
├── src/                 ← the React Native (Expo) app — THIS is the live frontend
│   ├── app/             ← screens (Expo Router): splash, login, (tabs), (doctor), (receptionist), ...
│   ├── components/      ← shared UI (headers, cards, alpana motif, role switcher)
│   ├── context/         ← language, auth, queue, journey state
│   ├── services/        ← API client (api.ts), data layer, mock/demo data
│   └── constants/       ← colors, i18n (Bangla + English text)
├── assets/              ← fonts (Hind Siliguri) and images
├── backend/             ← Python FastAPI backend
│   ├── app/             ← main.py, accounts, clinic (doctors/booking/queue), emergency, triage (AI)
│   ├── requirements.txt
│   └── reset_demo.py    ← resets the demo queue/data
├── docs/                ← backend integration notes
├── Frontend/            ← older copy of the app (not used — run the app from the repo root)
├── CLAUDE.md / AGENTS.md← rules for AI coding assistants
└── app.json, package.json
```

---

## 1. Install these first (once per computer)

| Tool | Version | Check |
|---|---|---|
| [Node.js](https://nodejs.org) | LTS (20+) | `node --version` |
| [Python](https://www.python.org/downloads/) — tick **"Add Python to PATH"** | 3.11+ | `python --version` |
| [Git](https://git-scm.com) | any | `git --version` |
| **Expo Go** app on your phone | latest | Play Store / App Store |

Windows one-liners (optional): `winget install OpenJS.NodeJS.LTS` · `winget install Python.Python.3.13` · `winget install Git.Git`

---

## 2. Get the code

```bash
git clone https://github.com/SamiunAlim/ShuShastho.git
cd ShuShastho
git checkout finalupdate        # or: main
```

---

## 3. Run the app (frontend) — works on its own in demo mode

```bash
npm install
npx expo start -c
```

- **Phone:** scan the QR code with **Expo Go** (phone and computer on the same Wi-Fi).
- **Browser:** press **w** in the terminal (opens `http://localhost:8081`).
- Without a backend the app runs in **demo mode** (a small yellow "Offline demo" badge appears). Everything still works with demo data.

---

## 4. Run the backend (optional — real database + real AI)

### 4.1 Create `backend/.env` (never commit this file)

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/shushastho?retryWrites=true&w=majority
GEMINI_API_KEY=<your Gemini API key from https://aistudio.google.com>
# optional
GEMINI_MODEL=gemini-2.5-flash
```

- **MongoDB:** free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) (M0) → Database Access (create user) → Network Access (add your IP or `0.0.0.0/0`) → Connect → Drivers → Python → copy the connection string.
- **Gemini key** is optional. Without it, the AI uses safe scripted replies.
- Ask the team lead for the shared demo values. Don't post them in public chats.

### 4.2 Install and start

**Windows (Command Prompt):**
```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install --no-cache-dir -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**macOS / Linux:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --no-cache-dir -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Check:
- `http://localhost:8000/health` → `{"status":"ok","mongo":"ok"}`
- `http://localhost:8000/docs` → interactive API page (Try it out → Execute)

The demo data (hospitals, doctors, queue, demo accounts) is seeded automatically on first start.
Reset the demo before a presentation: `python reset_demo.py` (inside `backend`, with the venv active).

### 4.3 Connect the app to the backend

1. Find your computer's Wi-Fi IP: `ipconfig` (Windows) → **IPv4 Address**, or `ipconfig getifaddr en0` (macOS).
2. Create `.env` in the **repo root** (never commit it):
   ```env
   EXPO_PUBLIC_API_URL=http://<your-IP>:8000
   ```
3. Restart the app: `npx expo start -c`
4. If the phone can't reach the backend, open `http://<your-IP>:8000/health` in the phone's browser. If it doesn't load, allow **Python** through **Windows Firewall (Private networks)**.

---

## 5. Demo accounts (password for all: `demo123`)

| Role | Phone |
|---|---|
| Patient | 01711000001 |
| Doctor | 01711000002 |
| Receptionist | 01711000003 |
| Pharmacist | 01711000004 |
| Hospital admin (web) | 01711000005 |
| Super admin (web) | 01711000006 |

- **Log in:** Splash → Log in → choose role → phone + password (or "Use demo account").
- **Sign up:** Create new account → choose role → details → OTP **`123456`** (mock).
- **Switch role quickly:** long-press the logo → role switcher (also has Reset demo).

---

## 6. Demo flow (5 minutes)

1. **Patient** → AI assistant: tick consent → "৩ দিন ধরে জ্বর, মাথা ব্যথা" → Medium risk, Medicine specialist.
2. Book: hospital → department → doctor → slot → patient info → confirm → serial **#17** → live queue.
3. **Receptionist** (laptop browser): check in #17.
4. **Doctor**: Call next → consultation → e-prescription → Send & finish.
5. **Patient**: prescription → reserve medicine → health timeline → report (AI summary) → recovery check-in.
6. **SOS** on the phone → 999 opens first → red alert appears on the **Hospital admin** dashboard.
7. Switch **বাংলা / EN** at any point.

---

## 7. Deploy (web) on Vercel

- `vercel.json` / build: `npx expo export -p web` → output `dist`, with a rewrite of all routes to `/index.html`.
- Connect the GitHub repo in Vercel. Every push to `main` redeploys automatically.
- The Vercel site can't reach a backend on your laptop. It runs in demo mode unless the backend is deployed publicly and `EXPO_PUBLIC_API_URL` is set in Vercel (then redeploy).

---

## 8. Common problems

| Problem | Fix |
|---|---|
| `localhost refused to connect` | The Expo or backend server isn't running. Start it and keep that terminal open |
| `Port 8081 is being used` | Press **y** to use 8082, or close the other Expo terminal |
| `JavaScript heap out of memory` | Close other apps / Chrome tabs, then `set NODE_OPTIONS=--max-old-space-size=2048` and start again |
| `ENOSPC: no space left on device` | Free disk space (Disk Cleanup, `%temp%`), and use `pip install --no-cache-dir` |
| `mongo` not ok on /health | Check `MONGODB_URI` in `backend/.env` and your IP in Atlas → Network Access, then restart the backend |
| AI answers look scripted | `GEMINI_API_KEY` missing or invalid. Check the backend terminal for the error |
| Phone can't connect | Same Wi-Fi, correct IP in `.env`, firewall allows Python, then `npx expo start -c` |

---

## Team workflow

```bash
git checkout -b <your-branch>
git add -A
git commit -m "what you changed"
git push -u origin <your-branch>
```
Open a Pull Request on GitHub, and the lead merges it. Always run `git status` before committing and make sure **no `.env` file** is listed.

## Tech

Expo · React Native · Expo Router · TypeScript · FastAPI · MongoDB Atlas · Gemini API · react-native-svg · Hind Siliguri (OFL)
