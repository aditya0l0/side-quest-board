<!-- GSD:project-start source:PROJECT.md -->

## Project

**Side-Quest Board Project**

A gamified "Side-Quest Board" application that transforms daily habits and to-dos into RPG-style quests, allowing users to earn XP and level up as they complete tasks. The project already has a working full-stack implementation with a React frontend, Spring Boot backend, MySQL database, and Jenkins CI/CD pipeline. The current focus is on expanding its features and modernizing the DevOps stack by migrating infrastructure provisioning to Terraform.

**Core Value:** Transforming mundane tasks into rewarding quests while maintaining a robust, automated infrastructure pipeline.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- Java 17 - Backend application code
- JavaScript - Frontend application code and Webhook server
- Groovy - Jenkins CI/CD pipeline definitions

## Runtime

- Java 17 - Backend (Spring Boot)
- Node.js >=20 - Frontend build & Webhook Server
- Maven - Backend (mvnw 3.9+)
- npm - Frontend & Webhook Server (package-lock.json present)

## Frameworks

- Spring Boot 3.3.0 - Backend Web Framework
- React 19 (19.2.7) - Frontend UI Framework
- Express 4.19.2 - Webhook Server Web Framework
- Spring Boot Starter Test (JUnit) - Backend unit/integration tests
- Vitest 4.1.10 - Frontend tests
- H2 Database - Backend in-memory test database
- Vite 8.1.1 - Frontend bundler/dev server
- Spotless 2.43.0 - Backend code formatting
- Checkstyle 3.3.1 - Backend code linting
- Oxlint 1.71.0 - Frontend linting

## Key Dependencies

- Spring Data JPA - Backend database access/ORM
- mysql-connector-j - Backend MySQL driver
- axios (v1.x) - Frontend & Webhook Server HTTP client
- dotenv 16.4.5 - Webhook Server environment variable management
- lombok - Backend boilerplate reduction

## Configuration

- Environment Variables - Webhook server configured via `.env` files (e.g. `webhook-server/.env`)
- Docker Compose Variables - Backend and Database configured via `docker-compose.yml`
- `pom.xml` - Maven project configuration
- `package.json` & `vite.config.js` - Frontend project and build configuration
- `Jenkinsfile` - Jenkins CI/CD master pipeline configuration

## Platform Requirements

- Docker - Required for running local MySQL database and optionally full stack via `docker-compose`
- Java 17, Node.js >=20 - Local development execution
- Jenkins - CI/CD orchestration
- Target Host - EC2 instance for deployment (Docker containers)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Frontend Components: PascalCase (`QuestCard.jsx`, `QuestBoard.jsx`)
- Frontend APIs/Utils: camelCase (`questApi.js`)
- Backend Classes: PascalCase standard Java naming (`QuestController.java`, `QuestRequest.java`)
- Frontend: camelCase (`handleSaveEdit`, `createQuest`)
- Backend: camelCase (`createQuest`, `updateQuest`)
- Local variables and properties: camelCase
- Constants: CONSTANT_CASE (`TIERS`)
- Java Classes/Enums: PascalCase (`Difficulty`, `QuestStatus`)

## Code Style

- Backend: Spotless Maven Plugin (`googleJavaFormat`)
- Frontend: Prettier-like defaults (using Vite out of the box), no explicit formatter configured but generally 2 spaces.
- Backend: Checkstyle Maven Plugin (`google_checks.xml`)
- Frontend: oxlint (`.oxlintrc.json`), with rules for `react/rules-of-hooks` and `react/only-export-components`.

## Import Organization

- Frontend: React imports first (`import React, { useState } from 'react';`), then local components (`import DifficultyBadge from './DifficultyBadge';`), then CSS.
- Backend: Standard Java import ordering (static imports first, then java.*, then third-party, then project classes), enforced by Spotless/Checkstyle.
- Not explicitly configured. Relative paths are used in frontend (`../api/questApi`).

## Error Handling

- Backend: Global `@RestControllerAdvice` (`GlobalExceptionHandler.java`) handles custom domain exceptions (`QuestNotFoundException`, `IllegalQuestStateException`) and maps them to clean JSON responses. Returns `404 Not Found` for missing resources and `409 Conflict` for illegal state transitions. Bean Validation errors (`@Valid`) map to `400 Bad Request`.
- Frontend: API calls wrapped in `try/catch`. Errors are typically propagated to a Toast component or handled via inline state (`saving`/`completing` boolean flags).

## Logging

- Errors are logged when caught in `try/catch` in API helpers.
- Standard Spring Boot startup and request logging.

## Comments

- Use class-level Javadoc to describe responsibilities (`/** REST controller for the Side-Quest Board... */`).
- Use method-level Javadoc for public API methods.
- Inline comments used sparingly to explain non-obvious states (e.g., `// Keep completing true for animation duration`).
- Frontend: Lightweight JSDoc for React component responsibilities (`/** A single quest card... */`).
- Backend: Standard Javadoc (`/** ... @param ... @return ... */`).

## Function Design

## Module Design

- Frontend uses `export default function ComponentName()` for main components.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## Pattern Overview

- **Backend**: Monolithic RESTful API (Spring Boot).
- **Frontend**: Single Page Application (SPA) using React and Vite.
- **Automation/Integration**: Dedicated webhook server for GitHub to Jenkins integration.
- **Infrastructure**: Ansible for provisioning/deployment, Docker Compose for orchestration.

## Layers

- Purpose: Handles business logic, data persistence, and serves the REST API.
- Contains: Spring Boot Controllers, Services, Repositories, Entities.
- Location: `backend/src/main/java/com/sidequest/board/`
- Depends on: Internal database (typically mapped via JPA/Hibernate).
- Used by: Frontend application.
- Purpose: Provides the user interface and client-side interactions.
- Contains: React components, API wrappers (Axios/Fetch), UI assets.
- Location: `frontend/src/`
- Depends on: Backend API.
- Used by: End users.
- Purpose: Receives GitHub events (Issues) and triggers Jenkins pipelines.
- Contains: Node.js Express server.
- Location: `webhook-server/server.js`
- Depends on: GitHub Webhooks, Jenkins REST API.

## Data Flow

## Key Abstractions

- **Controller**: Exposes REST endpoints (`@RestController`).
- **Service**: Core business logic and transaction boundaries (`@Service`).
- **Repository**: Data access layer abstraction (`@Repository`, Spring Data JPA).
- **Entity/DTO**: Data models mapped to DB / Data Transfer Objects for API boundaries.
- **Component**: Reusable UI elements (`QuestCard`, `QuestList`).
- **API Wrapper**: Centralized HTTP calls (`questApi.js`).

## Entry Points

- Location: `backend/src/main/java/com/sidequest/board/SideQuestBoardApplication.java`
- Triggers: Java process startup (`mvn spring-boot:run` or `java -jar`).
- Location: `frontend/src/main.jsx`
- Triggers: Browser loading the application.
- Location: `webhook-server/server.js`
- Triggers: Node process startup (`npm start`).

## Error Handling

- **Strategy**: Global exception handling.
- **Patterns**: `GlobalExceptionHandler.java` (`@ControllerAdvice`) catches specific exceptions (`QuestNotFoundException`, `IllegalQuestStateException`) and maps them to appropriate HTTP status codes and error responses.
- **Strategy**: Error boundaries and UI feedback.
- **Patterns**: Showing error messages/toasts (`Toast.jsx`) on API failures.

## Cross-Cutting Concerns

- Backend: Standard Spring Boot logging (SLF4J/Logback).
- Webhook Server: `console.log` and basic Express error logging.
- Backend: `application.properties` or `application.yml` (implied in standard Spring Boot).
- Frontend: `vite.config.js` and `.env` files.
- Webhook Server: `.env` file configuration.

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.agents/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
