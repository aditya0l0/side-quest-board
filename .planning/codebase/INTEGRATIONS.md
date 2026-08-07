# External Integrations

**Analysis Date:** 2026-08-07

## APIs & External Services

**External APIs:**
- GitHub API - Webhook server posts CI statuses back to PRs/Issues
  - Integration method: REST API via `curl` in Jenkins CI
  - Auth: Personal Access Token (PAT) in `GH_TOKEN` env var / `github-pat-issue-comment` credential
- Jenkins API - Webhook server triggers Jenkins jobs
  - Integration method: REST API via `axios`
  - Auth: Credentials from `webhook-server/.env`

## Data Storage

**Databases:**
- MySQL 8.0 - Primary relational data store
  - Connection: `SPRING_DATASOURCE_URL` (e.g., `jdbc:mysql://db:3306/sidequest_board`)
  - Client: Spring Data JPA (Hibernate)
- H2 Database - In-memory DB for automated testing
  - Connection: Embedded
  - Client: Spring Data JPA

**File Storage:**
- None identified in the basic codebase.

**Caching:**
- None currently configured.

## Authentication & Identity

**Auth Provider:**
- TBD (No external auth provider identified in current basic configuration)

## Monitoring & Observability

**Error Tracking:**
- None explicitly configured via external service.

**Analytics:**
- None currently configured.

**Logs:**
- Standard stdout/stderr via Docker container logs
- Jenkins CI build logs

## CI/CD & Deployment

**Hosting:**
- Target Server - Deploys to EC2 instance (default `16.171.34.41` configurable via `EC2_HOST` pipeline parameter)
  - Deployment: Triggered via Jenkins pipelines
  - Execution: Docker containers via `docker-compose`

**CI Pipeline:**
- Jenkins - Main CI/CD orchestration
  - Workflows: `Jenkinsfile` (Master), `Jenkinsfile.lint`, `Jenkinsfile.test`, `Jenkinsfile.build`, `Jenkinsfile.deploy`
  - Secrets: Stored in Jenkins credentials manager (e.g., `github-pat-issue-comment`)

## Environment Configuration

**Development:**
- Required env vars: Database credentials, webhook server tokens
- Secrets location: `webhook-server/.env`
- Mock/stub services: H2 database used for automated tests instead of MySQL

**Production:**
- Secrets management: Docker-compose environment variables for db/backend on the deployment host
- Deployment logic relies on SSHing into EC2 and deploying containers via standard docker commands

## Webhooks & Callbacks

**Incoming:**
- GitHub Issues Webhook - `/api/webhooks/github` (or similar on webhook-server:3000)
  - Events: `issues.labeled`
  - Triggers: Matching Jenkins CI job via Jenkins REST API

**Outgoing:**
- Jenkins CI - Outgoing HTTP calls to GitHub API
  - Endpoint: GitHub repository issues/comments API
  - Triggers: After CI pipeline completion (Success, Failure, Unstable)
  - Action: Posts build summary and link to Jenkins log

---

*Integration audit: 2026-08-07*
*Update when adding/removing external services*
