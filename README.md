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

## 🐳 Running with Docker Compose

You can run the entire stack (Database, Backend, Frontend, and Webhook Server) locally using Docker Compose:

```bash
docker-compose up --build -d
```

The services will be exposed as follows:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8080
- **Webhook Server**: http://localhost:3000
- **MySQL Database**: localhost:3307

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

```text
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
├── frontend/                         # React 18 (Vite)
│   └── src/
│       ├── api/questApi.js           # Axios API client
│       ├── components/               # React components
│       │   ├── QuestBoard.jsx        # Main orchestrator
│       │   ├── XPCounter.jsx         # HUD-style XP display
│       │   ├── NewQuestForm.jsx      # Quest creation form
│       │   ├── QuestList.jsx         # Active/Completed sections
│       │   ├── QuestCard.jsx         # Individual quest card
│       │   ├── DifficultyBadge.jsx   # Tier-colored badge
│       │   └── Toast.jsx             # XP notification toasts
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css                 # Design system & styles
└── webhook-server/                   # Node.js Express webhook listener
    ├── server.js                     # GitHub → Jenkins orchestrator
    └── .env.example                  # Environment variables template
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

---

## 🔧 CI/CD Pipeline

The project uses a **Jenkins multi-job pipeline** composed of one master orchestrator and four downstream specialist jobs. All jobs run inside isolated Docker containers (Docker-outside-of-Docker pattern) and share a single ephemeral Docker bridge network per build.

### Pipeline Overview

```
sidequest-master  (Jenkinsfile)
│
├── [always]    Trigger Lint   →  sidequest-lint   (Jenkinsfile.lint)
│                                    ├─ Lint Backend  (Checkstyle via maven:3.9.7-eclipse-temurin-17)
│                                    └─ Lint Frontend (oxlint via node:20-alpine)
│
├── [lint pass] Trigger Test   →  sidequest-test   (Jenkinsfile.test)
│                                    ├─ Test Backend  (Maven/H2 in-memory DB)
│                                    └─ Test Frontend (Vitest via node:20-alpine)
│
├── [test !fail] Trigger Build →  sidequest-build  (Jenkinsfile.build)
│                                    └─ Build & Push Docker images to Docker Hub
│                                         aditya0l0/sidequest-backend:<build#>
│                                         aditya0l0/sidequest-frontend:<build#>
│
└── [build pass] Trigger Deploy → sidequest-deploy (Jenkinsfile.deploy)
                                     └─ Ansible playbook → EC2 instance
                                          (cytopia/ansible:latest-tools)
```

### Stage Gating Logic (Full Pipeline)

| Stage result | Effect on next stage |
|---|---|
| Lint **FAILURE** | Test and Build are **skipped**; master marked FAILURE |
| Lint **SUCCESS** | Test is triggered |
| Test **UNSTABLE** | Build still runs; master marked UNSTABLE |
| Test **FAILURE** | Build is **skipped**; master marked FAILURE |
| Test **SUCCESS** | Build is triggered |
| Build **FAILURE** | Deploy is **skipped**; master marked FAILURE |
| Build **SUCCESS** | Deploy is triggered (if requested) |

> Gating only applies when `PIPELINE_STAGES=all`. Partial runs (e.g. `lint,test`) execute the requested stages **independently** with no cross-stage gating.

### Trigger Modes

The master job (`Jenkinsfile`) accepts three trigger sources via the `TRIGGERED_BY` parameter:

| `TRIGGERED_BY` value | Source | PR checkout behaviour |
|---|---|---|
| `manual` | Jenkins UI | Uses default branch |
| `github-issue-webhook` | GitHub Issue webhook | Uses default branch |
| `github-pr-webhook` | GitHub PR opened/updated | Checks out PR head commit (`GITHUB_PR_SHA`) |
| `github-comment-webhook` | GitHub PR comment webhook | Checks out PR head commit (`GITHUB_PR_SHA`) |

After every webhook-triggered run, the master posts a formatted Markdown CI report as a comment on the originating GitHub Issue or Pull Request (via the `github-pat-issue-comment` credential).

#### Webhook Server (`webhook-server/`)

The repository includes a custom Node.js Express webhook server that translates GitHub events into parameterized Jenkins builds:
- **Issue Labels:** Applies `ci:lint`, `ci:test`, `ci:build`, or `ci:all` labels to trigger the corresponding pipeline stages. Events are debounced for 15 seconds to allow batching multiple labels into a single Jenkins trigger.
- **PR Comments:** Listens for slash commands (e.g., `/lint`, `/test`, `/build`, `/all`) in PR comments to trigger builds on PR branches.
- **PR Events:** Automatically triggers full `all` pipeline on PR open/synchronize/reopen against `main`.

### Selective Stage Execution

Set the `PIPELINE_STAGES` parameter on `sidequest-master` to run only the stages you need:

| Value | Stages run |
|---|---|
| `all` *(default)* | lint → test → build → deploy |
| `lint` | lint only |
| `test` | test only |
| `build` | build only |
| `deploy` | deploy only |
| `lint,test` | lint + test |
| `test,build` | test + build |
| `build,deploy` | build + deploy |

### Job Reference

#### `sidequest-master` — `Jenkinsfile`

The sole entry point for the CI system.

- **Timeout:** 60 minutes
- **Concurrency:** disabled (`disableConcurrentBuilds`)
- **Network:** creates `sidequest-ci-<BUILD_NUMBER>` Docker bridge at start; destroys it in `post.always`
- **Logs kept:** last 10 builds
- **Post-run:** always emits a pipeline summary; posts a GitHub comment on webhook-triggered runs

#### `sidequest-lint` — `Jenkinsfile.lint`

Runs both linters sequentially; either failure marks the job FAILURE.

- **Timeout:** 10 minutes
- **Backend linter:** Checkstyle (`mvn checkstyle:check`) — image `maven:3.9.7-eclipse-temurin-17`
- **Frontend linter:** oxlint (`npm run lint`) — image `node:20-alpine`
- **Network isolation:** each container joined to `PIPELINE_NETWORK`

#### `sidequest-test` — `Jenkinsfile.test`

Runs unit tests for both services. Test failures produce **UNSTABLE** (not FAILURE) so the Build job can still run.

- **Timeout:** 15 minutes
- **Backend tests:** Maven Surefire (`mvn test`) with H2 in-memory database — image `maven:3.9.7-eclipse-temurin-17`
- **Frontend tests:** Vitest (`npm test -- --run`) — image `node:20-alpine`
- **Test reports:** JUnit XML results from `backend/target/surefire-reports/*.xml` are published to the job's build page
- **Failure mode:** `catchError(buildResult: 'UNSTABLE')` — a test failure marks the stage UNSTABLE rather than aborting

#### `sidequest-build` — `Jenkinsfile.build`

Builds and pushes Docker images to Docker Hub using the Docker-outside-of-Docker (DooD) pattern.

- **Timeout:** 20 minutes
- **Worker image:** `docker:27-cli` (mounts `/var/run/docker.sock`)
- **Image tags:** `aditya0l0/sidequest-backend:<UPSTREAM_BUILD_NUMBER>` and `aditya0l0/sidequest-frontend:<UPSTREAM_BUILD_NUMBER>`
- **Credentials required:** `docker-hub-credentials` (username + password)
- **Steps:** login → build backend → build frontend → push backend → push frontend

#### `sidequest-deploy` — `Jenkinsfile.deploy`

Deploys the images built in the previous stage to an EC2 instance via Ansible.

- **Timeout:** 20 minutes (accounts for Docker install + image pulls + MySQL + Spring Boot cold start)
- **Worker image:** `cytopia/ansible:latest-tools` (Ansible, OpenSSH, and `community.docker` collection pre-baked)
- **Ansible config:** `ansible/ansible.cfg`; playbook: `ansible/deploy.yml`
- **EC2 target:** controlled by the `EC2_HOST` parameter (default: `13.48.57.103`)
- **Silent-failure guards:** the log is captured and grepped for three Ansible failure signatures even when exit code is 0:
  - `skipping: no hosts matched` → inventory parse error
  - `UNREACHABLE` → SSH / network failure
  - `FAILED!` → individual task failure
- **Post-run:** archives `ansible-deploy-<BUILD_NUMBER>.log` as a build artifact

### Required Jenkins Credentials

| Credential ID | Type | Used by |
|---|---|---|
| `docker-hub-credentials` | Username + Password | sidequest-build, sidequest-deploy |
| `ec2-ssh-key` | SSH private key | sidequest-deploy |
| `sidequest-db-password` | Secret text | sidequest-deploy |
| `github-pat-issue-comment` | Secret text (PAT) | sidequest-master (GitHub comments) |

### Docker Network Strategy

Each master build creates a uniquely named bridge network (`sidequest-ci-<BUILD_NUMBER>`). All downstream worker containers are attached to this network, providing build isolation and allowing inter-container communication without exposing ports to the host. The network is unconditionally removed in the master's `post.always` block.

---

## ⚙️ Server Provisioning & Deployment (Ansible)

The project includes Ansible playbooks to automate the provisioning of a raw EC2 instance and the continuous deployment of the application stack.

### Directory Structure

- `ansible/`: Production-ready playbooks for the application.
- `ansible-demo/`: A simple demonstration playbook that sets up a basic Nginx web server with a custom "Ansible Success" HTML page.

### Provisioning (`ansible/provision.yml`)

A one-time setup playbook designed to bootstrap a fresh Ubuntu EC2 instance. It handles:
- Updating the system and installing prerequisites.
- Installing Docker Engine and the Docker Compose plugin.
- Installing Nginx.
- Configuring the UFW firewall (allowing ports 22, 80, and 443).
- Creating the application directory (`/opt/sidequest`).

**Usage (manual):**
```bash
ansible-playbook -i ansible/inventory.ini ansible/provision.yml \
  -e "ansible_host=<EC2_HOST>" \
  --private-key /path/to/ec2-key.pem
```

### Deployment (`ansible/deploy.yml`)

The deployment playbook is executed automatically by the `sidequest-deploy` Jenkins pipeline after a successful build. It is idempotent and performs the following:
- Cleans up dangling Docker images and volumes.
- Verifies/installs dependencies.
- Logs into Docker Hub using credentials injected by Jenkins.
- Pulls the newly built backend and frontend images tagged with the Jenkins `build_version`.
- Renders the `docker-compose.yml` and Nginx reverse proxy configurations using Jinja2 templates (`ansible/templates/`).
- Deploys the stack using Docker Compose.
- Performs health checks to ensure the API and frontend are successfully running.

### Configuration (`ansible/group_vars/webservers.yml`)

Shared variables for the environment are managed here, including:
- Application identity (`app_name`, `app_dir`).
- Docker Hub repository configuration.
- Port mappings for frontend (80), backend (8080), and database (3306).
- Nginx configuration settings.

*Note: Sensitive variables (e.g., `db_password`, `docker_hub_password`) are intentionally omitted from version control and injected at runtime via Jenkins credentials using the `-e` flag.*

### Utilities

- `ec2_cleanup.sh`: A utility script provided to clean up old snap revisions and free up disk space on the EC2 instance.
