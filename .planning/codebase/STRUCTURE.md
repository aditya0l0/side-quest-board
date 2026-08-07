# Codebase Structure

**Analysis Date:** 2026-08-07

## High-Level Layout

```
.
├── .agents/                # GSD orchestration and agent workflow files
├── .planning/              # Generated project management and codebase intel documents
├── backend/                # Spring Boot Java application
├── frontend/               # React and Vite SPA
├── webhook-server/         # Node.js Express server for GitHub/Jenkins integration
├── ansible/                # Infrastructure provisioning playbooks
├── Jenkinsfile*            # CI/CD pipeline definitions
├── docker-compose.yml      # Local development multi-container setup
├── PROGRESS.md             # Living documentation of current state and tasks
└── README.md               # Main project overview
```

## Key Directories

**`backend/src/main/java/com/sidequest/board/`**
- Purpose: The core backend application code.
- Key files: `SideQuestBoardApplication.java`
- Important subdirectories:
  - `controller/`: REST endpoints
  - `service/`: Business logic
  - `repository/`: Database access
  - `entity/`, `dto/`: Data models

**`frontend/src/`**
- Purpose: The user interface.
- Key files: `main.jsx`, `App.jsx`
- Important subdirectories:
  - `components/`: React UI pieces
  - `api/`: Axios HTTP client configuration

**`webhook-server/`**
- Purpose: Minimal microservice for receiving GitHub Webhooks and triggering Jenkins.
- Key files: `server.js`

## File Naming Conventions

**Backend:**
- Classes and Files: PascalCase (`QuestController.java`, `Difficulty.java`)
- Configuration: kebab-case (`application.properties`)

**Frontend:**
- React Components: PascalCase (`QuestCard.jsx`)
- Utilities/Services: camelCase (`questApi.js`, `main.jsx`)

**Documentation:**
- Markdown Files: UPPERCASE for root and `.planning/` (`README.md`, `PROGRESS.md`, `ARCHITECTURE.md`)

## Where to Find...

- **Environment variables**: Noted in `.env` files within `frontend` and `webhook-server`. Backend uses `application.properties` and docker environment variables.
- **Dependency definitions**: `backend/pom.xml`, `frontend/package.json`, `webhook-server/package.json`.
- **Database schema**: Implicit via JPA in `backend/src/main/java/com/sidequest/board/entity/`.
- **Deployment logic**: `Jenkinsfile.deploy`, `ansible/deploy.yml`, `ec2_cleanup.sh`.

---

*Structure analysis: 2026-08-07*
