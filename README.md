# ⚔️ The Side-Quest Board

[![Java](https://img.shields.io/badge/Java-17%2B-orange?logo=openjdk)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen?logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple?logo=vite)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-blue?logo=mysql)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-27%2B-blue?logo=docker)](https://www.docker.com/)
[![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD-red?logo=jenkins)](https://www.jenkins.io/)
[![Ansible](https://img.shields.io/badge/Ansible-Automation-black?logo=ansible)](https://www.ansible.com/)
[![Terraform](https://img.shields.io/badge/Terraform-1.9%2B-623CE4?logo=terraform)](https://www.terraform.io/)
[![Packer](https://img.shields.io/badge/Packer-1.11%2B-02A8EF?logo=packer)](https://www.packer.io/)
[![AWS](https://img.shields.io/badge/AWS-EC2%20%7C%20EIP-232F3E?logo=amazon-aws)](https://aws.amazon.com/)

> **Turn your daily habits and to-dos into RPG-style side-quests.**  
> Earn XP, level up, and conquer your day one quest at a time — powered by a full-stack Spring Boot + React architecture, automated multi-job Jenkins CI/CD, GitOps-driven infrastructure lifecycle, and immutable golden AMI provisioning.

---

## 📑 Table of Contents

- [🎮 Features & RPG Mechanics](#-features--rpg-mechanics)
- [🏗️ System Architecture & Structure](#️-system-architecture--structure)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Local Development Quickstart](#-local-development-quickstart)
  - [Option A: Full-Stack with Docker Compose](#option-a-full-stack-with-docker-compose)
  - [Option B: Bare-Metal / Manual Run](#option-b-bare-metal--manual-run)
- [📡 REST API Specification](#-rest-api-specification)
- [🎨 Visual Theme & Design](#-visual-theme--design)
- [🔧 Continuous Integration & Delivery (CI/CD)](#-continuous-integration--delivery-cicd)
  - [Pipeline Topology (`sidequest-master`)](#pipeline-topology-sidequest-master)
  - [Gating Logic & Stage Matrix](#gating-logic--stage-matrix)
  - [Trigger Modes & ChatOps Webhooks](#trigger-modes--chatops-webhooks)
  - [Job Specifications](#job-specifications)
- [☁️ Infrastructure as Code & Golden AMI (Terraform & Packer)](#️-infrastructure-as-code--golden-ami-terraform--packer)
  - [Architecture & Immutable Infra Model](#architecture--immutable-infra-model)
  - [Infrastructure Pipeline (`Jenkinsfile.infra`)](#infrastructure-pipeline-jenkinsfileinfra)
  - [Manual Terraform & Packer Workflows](#manual-terraform--packer-workflows)
- [⚙️ Server Provisioning & Configuration (Ansible)](#️-server-provisioning--configuration-ansible)
- [🔐 Credentials & Secrets Management](#-credentials--secrets-management)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)

---

## 🎮 Features & RPG Mechanics

- **Quest Lifecycle Management:**
  - `ACTIVE` — In-progress quests that can be dynamically updated or completed.
  - `COMPLETED` — Quests completed and locked from edits; awards XP to lifetime total.
  - `ABANDONED` — Soft-deleted quests preserved in history without permanent record loss.
- **Server-Authoritative XP Calculation:**
  - XP rewards are strictly calculated on the backend to prevent client-side manipulation:
    - 🥉 **BRONZE:** `10 XP`
    - 🥈 **SILVER:** `25 XP`
    - 🥇 **GOLD:** `50 XP`
- **Dynamic Level Progression:**
  - `Level = Floor(Lifetime XP / 100) + 1`
  - HUD displays dynamic progress bars and percentage till next level.
- **Date & Streak Tracking:**
  - View daily quests by specific dates with seamless calendar switching (default: today).
- **Responsive RPG HUD:**
  - Glassmorphic retro RPG cards, pixel art headers, real-time completion pulse animations, and interactive toast notifications.

---

## 🏗️ System Architecture & Structure

```
side-quest-board/
├── backend/                          # Java 17 + Spring Boot 3.x REST API
│   ├── src/main/java/com/sidequest/board/
│   │   ├── config/                   # CORS and Web MVC configuration
│   │   ├── controller/               # REST Endpoints (QuestController)
│   │   ├── dto/                      # Request/Response DTO contracts
│   │   ├── entity/                   # JPA Entities (Quest, Difficulty, QuestStatus)
│   │   ├── exception/                # Global exception handler & custom exceptions
│   │   ├── repository/               # Spring Data JPA Repositories
│   │   └── service/                  # Business Logic Layer
│   ├── src/main/resources/           # application.properties & SQL schemas
│   ├── pom.xml                       # Maven build configuration & dependencies
│   └── checkstyle.xml                # Checkstyle lint rules
├── frontend/                         # React 18 + Vite Frontend
│   ├── src/
│   │   ├── api/questApi.js           # Axios API client (relative `/api` base)
│   │   ├── components/               # Modular UI Components
│   │   │   ├── QuestBoard.jsx        # Main orchestrator view
│   │   │   ├── XPCounter.jsx         # HUD XP & Level progress bar
│   │   │   ├── NewQuestForm.jsx      # Quest creation interface
│   │   │   ├── QuestList.jsx         # Active & completed quest accordion
│   │   │   ├── QuestCard.jsx         # Individual quest item with action buttons
│   │   │   ├── DifficultyBadge.jsx   # Tier-colored difficulty badge
│   │   │   └── Toast.jsx             # Action notifications
│   │   ├── App.jsx                   # Root React component
│   │   ├── main.jsx                  # React entrypoint
│   │   └── index.css                 # Dark fantasy glassmorphism theme
│   ├── index.html                    # HTML entrypoint ("Press Start 2P" font)
│   └── vite.config.js                # Vite config & dev reverse proxy (`/api` -> 8080)
├── webhook-server/                   # Express.js GitHub Webhook / ChatOps Gateway
│   ├── server.js                     # GitHub Issue labels & PR comment event handler
│   ├── package.json                  # Node.js dependencies
│   └── .env.example                  # Environment variables template
├── ansible/                          # Server Provisioning & Deployment Playbooks
│   ├── deploy.yml                    # App container continuous deployment playbook
│   ├── provision.yml                 # Server bootstrap playbook (Docker, Nginx, UFW)
│   ├── inventory.ini                 # Dynamic inventory (runtime host injection)
│   ├── ansible.cfg                   # SSH connection & playbook defaults
│   ├── group_vars/webservers.yml     # Variable defaults (ports, directory paths)
│   └── templates/                    # Jinja2 templates (docker-compose, Nginx site)
├── terraform/                        # AWS Infrastructure as Code (Terraform 1.9+)
│   ├── main.tf                       # EC2 Instance, Security Group, and Elastic IP
│   ├── variables.tf                  # Region, Instance Type, AMI ID, SSH CIDR definitions
│   ├── outputs.tf                    # Public IP and Instance ID outputs
│   ├── backend.tf                    # Local backend (S3 migration guide included)
│   ├── terraform.tfvars              # Git-tracked non-secret variable values
│   └── terraform.tfvars.example      # Example variable template
├── packer/                           # Golden AMI Builder (Packer 1.11+)
│   ├── sidequest-ami.pkr.hcl         # HCL2 AMI template invoking Ansible provisioner
│   ├── variables.pkr.hcl             # Packer input variables
│   └── localhost.ini                 # Static inventory for local AMI provisioning
├── scripts/                          # DevOps & Maintenance Scripts
│   ├── terraform_import.sh           # Import existing AWS resources into Terraform state
│   └── ec2_cleanup.sh                # Utility to clean old snap revisions & docker cache
├── Jenkinsfile                       # Master CI/CD Pipeline Orchestrator (sidequest-master)
├── Jenkinsfile.lint                  # Linting downstream stage (Checkstyle + oxlint)
├── Jenkinsfile.test                  # Unit & Integration test downstream stage (Surefire + Vitest)
├── Jenkinsfile.build                 # Docker image build & registry push stage
├── Jenkinsfile.deploy                # Ansible continuous deployment to EC2 stage
├── Jenkinsfile.infra                 # 10-Stage Golden AMI & Infrastructure Pipeline
└── docker-compose.yml                # Local orchestration for Full Stack + Webhook Server
```

---

## 📋 Prerequisites

| Tool / Technology | Minimum Version | Purpose |
|-------------------|-----------------|---------|
| **Java (JDK)** | `17+` (Eclipse Temurin) | Backend service runtime & compilation |
| **Maven** | `3.8+` | Backend dependency management & testing |
| **Node.js** | `18+` (LTS) | Frontend & Webhook Server runtime |
| **MySQL Server** | `8.0+` | Relational database storage |
| **Docker & Compose** | `24+` / Compose v2 | Containerisation & local orchestration |
| **Terraform** | `1.9+` | Cloud Infrastructure as Code |
| **Packer** | `1.11+` | Automated Golden AMI generation |
| **Ansible** | `2.15+` / `ansible-core 9+` | Host configuration & container deployment |
| **AWS CLI** | `2.x` | AWS cloud authentication and verification |

---

## 🚀 Local Development Quickstart

### Option A: Full-Stack with Docker Compose

Spin up the entire application ecosystem (MySQL, Backend, Frontend, and Webhook Server) in one command:

1. **Configure Webhook Server environment:**
   ```bash
   cp webhook-server/.env.example webhook-server/.env
   # Edit webhook-server/.env with your secrets (or leave defaults for local mock)
   ```

2. **Launch all containers:**
   ```bash
   docker compose up --build -d
   ```

3. **Access Services:**
   - 🌐 **Frontend:** [http://localhost](http://localhost) (Port `80`)
   - ⚙️ **Backend REST API:** [http://localhost:8080](http://localhost:8080) (Port `8080`)
   - 🪝 **Webhook Server:** [http://localhost:3000](http://localhost:3000) (Port `3000`)
   - 🗄️ **MySQL Database:** `localhost:3307` (`root` / `aditya123123`)

---

### Option B: Bare-Metal / Manual Run

#### 1. Database Initialization
Start your local MySQL service and run:
```sql
CREATE DATABASE IF NOT EXISTS sidequest_board
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

#### 2. Start the Backend API
```bash
cd backend
mvn clean spring-boot:run
```
*API runs on `http://localhost:8080` with auto-migration of JPA tables.*

#### 3. Start the Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`. Vite automatically proxies `/api` calls to `http://localhost:8080`.*

#### 4. (Optional) Start the Webhook Server
```bash
cd webhook-server
npm install
cp .env.example .env
node server.js
```

---

## 📡 REST API Specification

| HTTP Method | Endpoint | Description | Request Body / Parameters | Response Status |
|:---|:---|:---|:---|:---|
| `POST` | `/api/quests` | Create a new quest | `{"title": "...", "description": "...", "difficulty": "BRONZE\|SILVER\|GOLD"}` | `201 Created` |
| `GET` | `/api/quests` | Get quests for a date | `?date=YYYY-MM-DD` *(optional, defaults to current date)* | `200 OK` |
| `GET` | `/api/quests/xp-total` | Get lifetime accumulated XP | *None* | `200 OK` (JSON integer) |
| `PUT` | `/api/quests/{id}` | Update quest details | `{"title": "...", "description": "...", "difficulty": "..."}` *(only allowed if `ACTIVE`)* | `200 OK` |
| `PATCH` | `/api/quests/{id}/complete` | Mark quest as completed & award XP | *None* | `200 OK` |
| `PATCH` | `/api/quests/{id}/abandon` | Abandon quest (soft delete) | *None* | `200 OK` |

### Example: Create a Quest
```bash
curl -X POST http://localhost:8080/api/quests \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Slay the Refactoring Dragon",
    "description": "Refactor legacy controller into clean service layers",
    "difficulty": "GOLD"
  }'
```

---

## 🎨 Visual Theme & Design

The frontend implements a dark fantasy RPG aesthetic inspired by classic 8-bit and 16-bit role-playing games:
- **Typography:** Google Fonts `"Press Start 2P"` for 8-bit headers and retro HUD elements.
- **Glassmorphic HUD:** Translucent backdrops, subtle glow borders, and tiered color palettes:
  - 🥉 **Bronze:** `#cd7f32` / Amber glow
  - 🥈 **Silver:** `#c0c0c0` / Slate crystal glow
  - 🥇 **Gold:** `#ffd700` / Radiant solar flare
- **Micro-Animations:** Pure CSS XP pulse counters, smooth card entrance transitions, and completion flash states.

---

## 🔧 Continuous Integration & Delivery (CI/CD)

The CI/CD workflow uses a **Jenkins multi-job architecture** executed inside Docker containers (**Docker-outside-of-Docker / DooD** pattern). Each run creates an isolated ephemeral Docker bridge network (`sidequest-ci-<BUILD_NUMBER>`).

### Pipeline Topology (`sidequest-master`)

```
sidequest-master  (Jenkinsfile)
│
├── [always]    Trigger Lint   →  sidequest-lint   (Jenkinsfile.lint)
│                                    ├─ Backend: Checkstyle (maven:3.9.7-eclipse-temurin-17)
│                                    └─ Frontend: oxlint (node:20-alpine)
│
├── [lint pass] Trigger Test   →  sidequest-test   (Jenkinsfile.test)
│                                    ├─ Backend: Maven Surefire + H2 DB
│                                    └─ Frontend: Vitest Component Tests
│
├── [test !fail] Trigger Build →  sidequest-build  (Jenkinsfile.build)
│                                    └─ Docker Build & Push to Docker Hub:
│                                         • aditya0l0/sidequest-backend:<build#>
│                                         • aditya0l0/sidequest-frontend:<build#>
│
└── [build pass] Trigger Deploy → sidequest-deploy (Jenkinsfile.deploy)
                                     └─ Ansible Playbook (deploy.yml) → EC2 Target
                                          (cytopia/ansible:latest-tools)
```

---

### Gating Logic & Stage Matrix

When `PIPELINE_STAGES=all`, strict failure gates protect downstream environments:

| Stage Status | Master Pipeline Action | Downstream Impact |
|---|---|---|
| Lint **FAILURE** | Aborts Pipeline as `FAILURE` | Test, Build, and Deploy are **skipped** |
| Lint **SUCCESS** | Proceeds | Triggers `sidequest-test` |
| Test **UNSTABLE** | Marks Pipeline `UNSTABLE` | Build proceeds; Deploy triggered if requested |
| Test **FAILURE** | Aborts Pipeline as `FAILURE` | Build and Deploy are **skipped** |
| Build **FAILURE** | Aborts Pipeline as `FAILURE` | Deploy is **skipped** |
| Build **SUCCESS** | Proceeds | Triggers `sidequest-deploy` |

> *Tip: Selective execution (`PIPELINE_STAGES=lint,test` or `test,build`) runs selected jobs independently without full pipeline gating.*

---

### Trigger Modes & ChatOps Webhooks

The master pipeline accepts multi-source triggers via `TRIGGERED_BY`:

| `TRIGGERED_BY` Mode | Trigger Source | Git Checkout Strategy |
|:---|:---|:---|
| `manual` | Jenkins UI Execution | Active configured branch (`feature-jenkins` or `main`) |
| `github-issue-webhook` | GitHub Issue Labels | Target default branch |
| `github-pr-webhook` | Pull Request Opened / Synchronized | PR Head SHA commit (`GITHUB_PR_SHA`) |
| `github-comment-webhook` | PR Comment Slash Commands | PR Head SHA commit (`GITHUB_PR_SHA`) |

#### Webhook Server ChatOps Integration (`webhook-server/`)
- **Issue Label Dispatcher:** Adding labels like `ci:lint`, `ci:test`, `ci:build`, or `ci:all` debounces events for 15 seconds to merge multi-label edits into a single pipeline invocation.
- **PR Slash Commands:** Commenting `/lint`, `/test`, `/build`, or `/all` triggers targeted builds directly from PR discussions.
- **Automated Feedback:** Pipeline completion formats and posts comprehensive Markdown CI summary reports directly as comments on the originating GitHub PR/Issue using GitHub API authentication (`github-pat-issue-comment`).

---

### Job Specifications

#### 1. `sidequest-master` (`Jenkinsfile`)
- Central orchestration coordinator.
- Generates ephemeral Docker bridge network per run.
- Formats CI execution metrics and posts GitHub feedback comments.

#### 2. `sidequest-lint` (`Jenkinsfile.lint`)
- Runs `mvn checkstyle:check` for Java source rules.
- Runs `npm run lint` (`oxlint`) for frontend JSX/JS standards.

#### 3. `sidequest-test` (`Jenkinsfile.test`)
- Runs backend Surefire unit/integration tests with in-memory H2 database.
- Runs Vitest component unit test suites.
- Captures and archives JUnit XML test results.

#### 4. `sidequest-build` (`Jenkinsfile.build`)
- Connects to `/var/run/docker.sock`.
- Builds production-optimized multi-stage Docker images.
- Pushes uniquely tagged build images (`:<BUILD_NUMBER>`) and `:latest` tags to Docker Hub.

#### 5. `sidequest-deploy` (`Jenkinsfile.deploy`)
- Executes containerized Ansible (`cytopia/ansible:latest-tools`).
- Connects to the target EC2 instance (default: `13.61.111.131`).
- Deploys container stack via Docker Compose, sets up Nginx reverse proxy, and validates `/health` endpoints.

---

## ☁️ Infrastructure as Code & Golden AMI (Terraform & Packer)

The project adheres to an **Immutable Infrastructure** strategy on AWS:

```
                  ┌────────────────────────────────────────┐
                  │          AWS Cloud (eu-north-1)        │
                  │                                        │
                  │  ┌──────────────────────────────────┐  │
                  │  │ aws_eip.sidequest                │  │
                  │  │ (13.61.111.131)                  │  │
                  │  └───────────────┬──────────────────┘  │
                  │                  │ (bound via EIP Assoc)
                  │                  ▼                     │
                  │  ┌──────────────────────────────────┐  │
                  │  │ aws_instance.sidequest           │  │
                  │  │ (t3.small / 20GB gp3 EBS)        │  │
                  │  │ Launched from: var.ami_id        │  │
                  │  └───────────────┬──────────────────┘  │
                  │                  │                     │
                  │  ┌───────────────▼──────────────────┐  │
                  │  │ aws_security_group.sidequest     │  │
                  │  │ Inbound: 22 (SSH), 80, 443       │  │
                  │  └──────────────────────────────────┘  │
                  └────────────────────────────────────────┘
```

---

### Infrastructure Pipeline (`Jenkinsfile.infra`)

The `sidequest-infra` pipeline automates the complete provisioning and Golden AMI lifecycle through 10 deterministic stages:

```
[1] TF Init & Validate  ──►  [2] TF Plan  ──►  [3] TF Apply (Base EC2)
                                                        │
[6] Packer Bake Golden AMI ◄── [5] Ansible Provision ◄── [4] Wait for EC2 SSH
            │
            ▼
[7] TF Apply (Golden AMI) ──► [8] Commit AMI ID to Git ──► [9] Smoke Test
```

1. **Terraform Init & Validate:** Initializes AWS provider plugins and checks HCL configuration syntax.
2. **Terraform Plan:** Previews infrastructure state diff without making changes.
3. **Terraform Apply (Base EC2):** Provisions base EC2 (`t3.small`), Security Group, and attaches Elastic IP.
4. **Wait for EC2 SSH:** Polls SSH reachability using an explicit sentinel verification loop.
5. **Ansible Provision:** Bootstraps base instance with Docker Engine, Docker Compose, Nginx, and UFW firewall.
6. **Packer Bake Golden AMI:** Launches builder instance, executes `ansible/provision.yml` via `ansible-local`, captures EBS snapshot, and outputs Golden AMI ID.
7. **Terraform Apply (Golden AMI):** Re-launches the live instance from the newly baked Golden AMI (Docker/Nginx pre-installed) and re-attaches the Elastic IP with zero public IP drift.
8. **Commit AMI ID to Git:** Updates `terraform/terraform.tfvars` with the new `ami_id` and pushes to git using standard Git HTTP Basic Authorization headers (`http.extraheader`) and `--force-with-lease`.
9. **Smoke Test:** Validates SSH access and checks HTTP status codes on the live Elastic IP.

---

### Manual Terraform & Packer Workflows

#### Terraform Local Execution
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

#### Importing Existing AWS Resources into State
If you already have running AWS resources, use the automated import helper:
```bash
bash scripts/terraform_import.sh
```

#### Packer Golden AMI Manual Bake
```bash
cd packer
packer init .
packer validate .
packer build -var "aws_region=eu-north-1" sidequest-ami.pkr.hcl
```

---

## ⚙️ Server Provisioning & Configuration (Ansible)

### Playbooks Reference

- **`ansible/provision.yml` (Server Initialization):**
  - Installs system packages, Docker CE, Docker Compose CLI plugin, and Nginx.
  - Configures UFW firewall (Allows ports `22`, `80`, `443`).
  - Creates deployment directory `/opt/sidequest`.

- **`ansible/deploy.yml` (Continuous Deployment):**
  - Pulls latest container images (`sidequest-backend:<BUILD_NUMBER>`, `sidequest-frontend:<BUILD_NUMBER>`).
  - Renders templated `docker-compose.yml` and Nginx reverse proxy configurations.
  - Launches container stack via Docker Compose with health checks.
  - Restarts/reloads Nginx and verifies upstream `/health` endpoints.

### Manual Playbook Execution
```bash
ansible-playbook -i ansible/inventory.ini ansible/deploy.yml \
  -e "ansible_host=13.61.111.131" \
  -e "docker_hub_user=your_user" \
  -e "docker_hub_password=your_pass" \
  -e "db_password=your_db_pass" \
  -e "build_version=latest" \
  --private-key /path/to/ec2-key.pem
```

---

## 🔐 Credentials & Secrets Management

All production secrets and keys are injected dynamically at runtime via Jenkins Credentials:

| Credential ID | Jenkins Credential Type | Consumed By | Description / Purpose |
|:---|:---|:---|:---|
| `docker-hub-credentials` | Username with password | `sidequest-build`, `sidequest-deploy` | Docker Hub registry authentication |
| `ec2-ssh-key` | SSH Username with private key | `sidequest-deploy`, `sidequest-infra` | Private key for EC2 instance access |
| `sidequest-db-password` | Secret text | `sidequest-deploy` | Production MySQL root database password |
| `github-pat-issue-comment` | Secret text | `sidequest-master` | GitHub PAT to post CI summary comments |
| `aws-access-key-id` | Secret text | `sidequest-infra` | AWS Access Key ID for Terraform & Packer |
| `aws-secret-access-key`| Secret text | `sidequest-infra` | AWS Secret Access Key for Terraform & Packer |
| `github-pat` | Username with password | `sidequest-infra` | GitHub credentials to commit updated AMI IDs |

---

## 🧪 Testing & Quality Assurance

### Backend Tests (Java / Spring Boot)
- **Frameworks:** JUnit 5, Spring Boot Test, Mockito, AssertJ, H2 in-memory DB.
- **Execution:**
  ```bash
  cd backend
  mvn test
  ```
- **Linter Check:**
  ```bash
  mvn checkstyle:check
  ```

### Frontend Tests (React / JavaScript)
- **Frameworks:** Vitest, React Testing Library, jsdom.
- **Execution:**
  ```bash
  cd frontend
  npm test -- --run
  ```
- **Linter Check:**
  ```bash
  npm run lint
  ```
