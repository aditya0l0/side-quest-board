# Architecture

**Analysis Date:** 2026-08-07

## Pattern Overview

**Overall:** Full-stack Application with CI/CD Automation

**Key Characteristics:**
- **Backend**: Monolithic RESTful API (Spring Boot).
- **Frontend**: Single Page Application (SPA) using React and Vite.
- **Automation/Integration**: Dedicated webhook server for GitHub to Jenkins integration.
- **Infrastructure**: Ansible for provisioning/deployment, Docker Compose for orchestration.

## Layers

**Backend Application Layer:**
- Purpose: Handles business logic, data persistence, and serves the REST API.
- Contains: Spring Boot Controllers, Services, Repositories, Entities.
- Location: `backend/src/main/java/com/sidequest/board/`
- Depends on: Internal database (typically mapped via JPA/Hibernate).
- Used by: Frontend application.

**Frontend Application Layer:**
- Purpose: Provides the user interface and client-side interactions.
- Contains: React components, API wrappers (Axios/Fetch), UI assets.
- Location: `frontend/src/`
- Depends on: Backend API.
- Used by: End users.

**CI/CD Integration Layer (Webhook Server):**
- Purpose: Receives GitHub events (Issues) and triggers Jenkins pipelines.
- Contains: Node.js Express server.
- Location: `webhook-server/server.js`
- Depends on: GitHub Webhooks, Jenkins REST API.

## Data Flow

**Typical User Request (Frontend -> Backend):**
1. User interacts with a React component (e.g., `QuestBoard.jsx`).
2. Frontend calls the API utility (`api/questApi.js`).
3. HTTP request is routed to the Backend's `QuestController.java`.
4. Controller delegates logic to `QuestService.java`.
5. Service queries/updates data via `QuestRepository.java`.
6. Result mapped to a DTO and returned as a JSON response.
7. Frontend updates state and re-renders UI.

**CI/CD Webhook Flow:**
1. Developer creates/updates an issue in GitHub.
2. GitHub sends a webhook payload to the `webhook-server`.
3. Express parses the payload and determines which Jenkins job to trigger.
4. `webhook-server` calls Jenkins API.
5. Jenkins executes pipelines (defined in `Jenkinsfile*`).

## Key Abstractions

**Backend:**
- **Controller**: Exposes REST endpoints (`@RestController`).
- **Service**: Core business logic and transaction boundaries (`@Service`).
- **Repository**: Data access layer abstraction (`@Repository`, Spring Data JPA).
- **Entity/DTO**: Data models mapped to DB / Data Transfer Objects for API boundaries.

**Frontend:**
- **Component**: Reusable UI elements (`QuestCard`, `QuestList`).
- **API Wrapper**: Centralized HTTP calls (`questApi.js`).

## Entry Points

**Backend:**
- Location: `backend/src/main/java/com/sidequest/board/SideQuestBoardApplication.java`
- Triggers: Java process startup (`mvn spring-boot:run` or `java -jar`).

**Frontend:**
- Location: `frontend/src/main.jsx`
- Triggers: Browser loading the application.

**Webhook Server:**
- Location: `webhook-server/server.js`
- Triggers: Node process startup (`npm start`).

## Error Handling

**Backend:**
- **Strategy**: Global exception handling.
- **Patterns**: `GlobalExceptionHandler.java` (`@ControllerAdvice`) catches specific exceptions (`QuestNotFoundException`, `IllegalQuestStateException`) and maps them to appropriate HTTP status codes and error responses.

**Frontend:**
- **Strategy**: Error boundaries and UI feedback.
- **Patterns**: Showing error messages/toasts (`Toast.jsx`) on API failures.

## Cross-Cutting Concerns

**Logging:**
- Backend: Standard Spring Boot logging (SLF4J/Logback).
- Webhook Server: `console.log` and basic Express error logging.

**Configuration:**
- Backend: `application.properties` or `application.yml` (implied in standard Spring Boot).
- Frontend: `vite.config.js` and `.env` files.
- Webhook Server: `.env` file configuration.

---

*Architecture analysis: 2026-08-07*
*Update when major patterns change*
