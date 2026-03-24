# Cosmic Slime (Vue 3 + TypeScript + Vite)

## Firebase setup from scratch (CLI)

1. Install dependencies:

```bash
npm install
```

2. Login to Firebase:

```bash
npm run firebase:login
```

3. Run Firebase init:

```bash
npm run firebase:init
```

4. During `firebase init`, select these services as needed:
- `Realtime Database` (for chat data/rules)
- `Hosting` (to deploy Vite build)
- `Emulators` (optional, for local testing)

5. Recommended answers for Vue + Vite hosting:
- Public directory: `dist`
- Single-page app rewrite: `Yes`
- Automatic GitHub deploys: `No` (or your preference)

6. Create app env file and fill your Firebase web config values:

```powershell
Copy-Item .env.example .env.local
```

7. Run the app:

```bash
npm run dev
```

8. Build + deploy hosting:

```bash
npm run build
npm run firebase:deploy:hosting
```
