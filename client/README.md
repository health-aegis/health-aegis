# Aegis Health — Client

React SPA built with **Vite + JSX** and **Axios**. Matches the Finance-Flowapp frontend structure.

## Stack

| Tool | Version |
|---|---|
| React | 18 |
| Vite | 5 |
| Axios | 1.6 |
| Lucide React | 0.368 |
| CSS | Vanilla (Glassmorphism) |

## Structure

```
src/
├── api/
│   └── api.js          ← Axios domain API client (all backend calls)
├── components/
│   ├── Header.jsx
│   ├── AlertBanner.jsx
│   ├── ChatWindow.jsx
│   ├── MedicationChecklist.jsx
│   ├── HistorySection.jsx
│   ├── AppointmentSection.jsx
│   └── SettingsSection.jsx
├── pages/
│   └── Dashboard.jsx   ← Main page view
├── App.jsx             ← Lean root shell
├── index.css           ← Global premium styles
└── main.jsx            ← Entry point
```

## Development

```bash
npm install
npm run dev         # Dev server on http://localhost:3000
npm run build       # Production build
npm run preview     # Preview production build
```

The Vite dev server proxies `/api` requests to `http://localhost:5000` (api-gateway).
