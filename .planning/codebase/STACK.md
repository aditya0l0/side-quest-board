# Technology Stack

**Analysis Date:** 2026-08-07

## Languages

**Primary:**
- Java 17 - Backend application code
- JavaScript - Frontend application code and Webhook server

**Secondary:**
- Groovy - Jenkins CI/CD pipeline definitions

## Runtime

**Environment:**
- Java 17 - Backend (Spring Boot)
- Node.js >=20 - Frontend build & Webhook Server

**Package Manager:**
- Maven - Backend (mvnw 3.9+)
- npm - Frontend & Webhook Server (package-lock.json present)

## Frameworks

**Core:**
- Spring Boot 3.3.0 - Backend Web Framework
- React 19 (19.2.7) - Frontend UI Framework
- Express 4.19.2 - Webhook Server Web Framework

**Testing:**
- Spring Boot Starter Test (JUnit) - Backend unit/integration tests
- Vitest 4.1.10 - Frontend tests
- H2 Database - Backend in-memory test database

**Build/Dev:**
- Vite 8.1.1 - Frontend bundler/dev server
- Spotless 2.43.0 - Backend code formatting
- Checkstyle 3.3.1 - Backend code linting
- Oxlint 1.71.0 - Frontend linting

## Key Dependencies

**Critical:**
- Spring Data JPA - Backend database access/ORM
- mysql-connector-j - Backend MySQL driver
- axios (v1.x) - Frontend & Webhook Server HTTP client

**Infrastructure:**
- dotenv 16.4.5 - Webhook Server environment variable management
- lombok - Backend boilerplate reduction

## Configuration

**Environment:**
- Environment Variables - Webhook server configured via `.env` files (e.g. `webhook-server/.env`)
- Docker Compose Variables - Backend and Database configured via `docker-compose.yml`

**Build:**
- `pom.xml` - Maven project configuration
- `package.json` & `vite.config.js` - Frontend project and build configuration
- `Jenkinsfile` - Jenkins CI/CD master pipeline configuration

## Platform Requirements

**Development:**
- Docker - Required for running local MySQL database and optionally full stack via `docker-compose`
- Java 17, Node.js >=20 - Local development execution

**Production:**
- Jenkins - CI/CD orchestration
- Target Host - EC2 instance for deployment (Docker containers)

---

*Stack analysis: 2026-08-07*
*Update after major dependency changes*
