<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:54E3AB,100:1ABC9C&height=200&section=header&text=Zenly%20%E2%80%94%20Mental%20Health%20Support%20Platform&fontSize=40&fontColor=000000&animation=fadeIn&fontAlignY=35" alt="Zenly Banner"/>
</p>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=22&pause=1000&color=54E3AB&background=FFFFFF00&center=true&vCenter=true&width=650&lines=Student+Well-being+Made+Simple;AI+Reflections+%7C+Journaling+%7C+Mood+Tracking;Community+Forums+%7C+Resource+Hub;Built+with+Next.js+%7C+Express+%7C+MongoDB" alt="Typing SVG"/>
</p>

<p align="center">
	<img src="https://img.shields.io/badge/TypeScript-3776AB?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
	<img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"/>
	<img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
	<img src="https://img.shields.io/badge/MongoDB-local-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
	<img src="https://img.shields.io/badge/Socket.IO-realtime-1ABC9C?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO"/>
	<img src="https://img.shields.io/badge/Recharts-data%20viz-54E3AB?style=for-the-badge" alt="Recharts"/>
	<img src="https://img.shields.io/badge/ESLint-9-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint"/>
	<img src="https://img.shields.io/badge/License-MPL%202.0-brightgreen?style=for-the-badge" alt="MPL-2.0 License"/>
</p>

---

## 📌 Overview
**Zenly** is an **open source, full-stack platform** supporting student mental well-being with:
- **AI-powered journaling & reflections (SSE)**
- **Mood tracking** with profile insights and charts
- **Community forum** (posts, comments, real-time updates)
- **Curated resource hub** (live helpful/view counts)
- **Admin dashboard** with moderation, alerts, user management

Built in a modern **Next.js (App Router)** frontend, backed by a robust **Express/MongoDB** API.

---

## ✨ Features
- 📝 **Journals with AI analysis** — Streamed progress and personalized reflections
- 📈 **Mood tracking** — Profile insights, Recharts line graphs, daily ratings
- 🧑‍🤝‍🧑 **Community forum** — Posts, comments, likes, reporting, real-time via Socket.IO
- 🔗 **Curated resources** — Featured, search, live helpful/view counts
- 🛡️ **Admin** — Moderation, risk alerts, secure elevation flow
- 📰 **Recent activity feed** — Journals, resource views, forum posts
- 🚀 **Real-time updates** — Seamless with Socket.IO & SSE

---

## 📦 Installation
```
Fork the repo
git clone https://github.com/YourUsername/Zenly.git
cd Zenly

Copy env file and fill out your secrets
cp backend/.env.example backend/.env

Start both servers (FE + BE, auto-starts MongoDB on Mac)
./start-dev.sh
```

- **Backend** runs at: [http://localhost:5001](http://localhost:5001)
- **Frontend** runs at: [http://localhost:3000](http://localhost:3000)

---

## ▶️ Usage

**Start Development:**
```
./start-dev.sh
```

- Installs dependencies
- Starts MongoDB (if not running)
- Runs backend & frontend servers

**API Endpoints:** See [API Overview](#api-overview-high-level) for routes and usage.

---

## 🐛 Troubleshooting
- MongoDB not running → `brew services start mongodb-community` (Mac) or use Atlas
- CORS errors → Set `FRONTEND_URL` in backend `.env`
- Token issues → Auto-refresh is handled; if stuck, login again
- SSE/Socket.IO not streaming → Ensure proxy allows streaming, CORS whitelists are correct

---

## 🗂️ Monorepo Structure
```
Zenly/
├── backend/ # Express API, Socket.IO, SSE
│ ├── server.js
│ ├── config/
│ ├── controllers/
│ ├── middleware/
│ ├── models/
│ ├── routes/
│ └── services/
├── frontend/ # Next.js 14 app (App Router)
│ ├── app/
│ ├── components/
│ ├── hooks/
│ ├── lib/
│ └── public/
├── start-dev.sh # One-command dev start (FE+BE)
├── package.json # Root scripts (dev, build, lint, bdev)
└── README.md
```

---

## ⚙️ Configuration

### **Backend (`backend/.env`):**
- `MONGO_URI` — Mongo connection URI
- `PORT` — API port
- `FRONTEND_URL` — Allowed CORS origin
- `JWT_ACCESS_SECRET, JWT_REFRESH_SECRET` — JWT secrets
- ...and more for emails, AI, admin, see `.env.example`

### **Frontend (`frontend/.env.local`)**
- `NEXT_PUBLIC_API_URL` — API base

---

## 🌐 API Overview (high-level)

- Auth (`/auth`): Signup, OTP, login, password reset, admin elevation
- Journals (`/journals`): CRUD, stats, analysis (SSE), AI messages
- Moods (`/moods`): Today's update, profile chart
- Forum (`/forum`): Posts, comments, likes, reports
- Resources (`/resources`): Featured, search, helpful/view count, admin CRUD
- Notifications/Activity: Recent events, notifications

**See code for full endpoints and sample payloads.**

---

## 🚦 Real-time & Streaming
- **Socket.IO:** Real-time `forum` & `resources` rooms
- **SSE:** Streaming for journal analysis, AI chat

---

## 📋 Roadmap

- Email flows (password reset, onboarding)
- File uploads (avatars, attachments)
- Production deployment guides (Vercel, Railway, Render, Fly.io)
- Monitoring, error tracking

---

## 🔒 License

Zenly is open source under the **MPL-2.0 License** (Mozilla Public License Version 2.0).  
See [`LICENSE`](./LICENSE) for details.

> While commercial use is technically allowed under MPL-2.0, we kindly discourage commercialization of Zenly. Please use this project for learning, personal growth, and community benefit.

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:54E3AB,100:1ABC9C&height=100&section=footer"/>
</p>





