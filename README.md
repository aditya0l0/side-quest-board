# ⚔️ The Side-Quest Board

Turn your daily habits and to-dos into RPG-style side-quests. Earn XP, level up, and conquer your day one quest at a time.

---

## 📋 Prerequisites

| Tool | Version |
|------|---------|
| Java | 17+ |
| Maven | 3.8+ |
| Node.js | 18+ |
| MySQL | 8.0+ |

---

## 🗄️ Database Setup

1. Start your MySQL server.
2. Create the database:

```sql
CREATE DATABASE IF NOT EXISTS sidequest_board
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

3. Update credentials in `backend/src/main/resources/application.properties` if your MySQL username/password differ from `root`/`root`.

---

## 🚀 Running the Backend

```bash
cd backend
mvn spring-boot:run
```

The API will be available at **http://localhost:8080**.

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/quests` | Create a new quest |
| `GET` | `/api/quests?date=YYYY-MM-DD` | Get quests for a date (default: today) |
| `GET` | `/api/quests/xp-total` | Get lifetime XP total |
| `PUT` | `/api/quests/{id}` | Edit quest (only if ACTIVE) |
| `PATCH` | `/api/quests/{id}/complete` | Claim XP — mark quest completed |
| `PATCH` | `/api/quests/{id}/abandon` | Abandon quest (soft delete) |

### Create Quest Example

```bash
curl -X POST http://localhost:8080/api/quests \
  -H "Content-Type: application/json" \
  -d '{"title": "Read 5 pages of a design book", "difficulty": "SILVER"}'
```

---

## 🎮 Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## 🏗️ Architecture

```
side-quest-board/
├── backend/                          # Spring Boot 3.x (Java 17)
│   └── src/main/java/com/sidequest/board/
│       ├── config/                   # CORS configuration
│       ├── controller/               # REST endpoints
│       ├── dto/                      # Request/Response DTOs
│       ├── entity/                   # JPA entities & enums
│       ├── exception/                # Global error handling
│       ├── repository/               # Spring Data JPA repos
│       ├── service/                  # Business logic layer
│       └── SideQuestBoardApplication.java
└── frontend/                         # React 18 (Vite)
    └── src/
        ├── api/questApi.js           # Axios API client
        ├── components/               # React components
        │   ├── QuestBoard.jsx        # Main orchestrator
        │   ├── XPCounter.jsx         # HUD-style XP display
        │   ├── NewQuestForm.jsx      # Quest creation form
        │   ├── QuestList.jsx         # Active/Completed sections
        │   ├── QuestCard.jsx         # Individual quest card
        │   ├── DifficultyBadge.jsx   # Tier-colored badge
        │   └── Toast.jsx             # XP notification toasts
        ├── App.jsx
        ├── main.jsx
        └── index.css                 # Design system & styles
```

---

## 🎯 Key Business Rules

- **XP is server-controlled**: Derived from difficulty (Bronze=10, Silver=25, Gold=50). The client cannot inject XP values.
- **Completed quests are locked**: Editing title/description/difficulty is only allowed while status is ACTIVE.
- **Soft delete**: Abandoning a quest sets `status = ABANDONED` rather than deleting the row.
- **Lifetime XP**: Only COMPLETED quests count toward the total.
- **Levels**: Every 100 XP = 1 level (displayed in the HUD).

---

## 🎨 Visual Theme

- Dark fantasy RPG aesthetic with glassmorphism card effects
- Tier-colored badges and card borders (Bronze / Silver / Gold)
- "Press Start 2P" pixel font for headings
- Pulse animations on XP changes
- Slide-in card animations and completion flash effects
- Floating toast notifications for quest actions
