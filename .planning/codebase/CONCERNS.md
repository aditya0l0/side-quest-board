# Codebase Concerns

**Analysis Date:** 2026-08-07

## Tech Debt

**Database Configuration:**
- Issue: Uses `spring.jpa.hibernate.ddl-auto=update` in the primary application properties without environment profiles.
- Files: `backend/src/main/resources/application.properties`
- Impact: Highly dangerous in production, as Hibernate may automatically modify database schemas in unpredictable ways.
- Fix approach: Introduce separate `application-dev.properties` and `application-prod.properties`, setting `ddl-auto=validate` or `none` in production and use a tool like Flyway/Liquibase for schema migrations.

## Known Bugs

**Not detected:**
- Symptoms: No overt bugs found during static analysis.
- Files: `Not applicable`
- Trigger: N/A
- Workaround: N/A

## Security Considerations

**Hardcoded Credentials:**
- Risk: Root user and passwords for MySQL are hardcoded in application properties and Docker Compose files.
- Files: `backend/src/main/resources/application.properties`, `docker-compose.yml`
- Current mitigation: None.
- Recommendations: Replace hardcoded strings with environment variables (e.g. `${DB_PASSWORD}`) and manage them securely via secrets manager or `.env` files not checked into Git.

**Missing Authentication / Authorization:**
- Risk: No user context or authentication. Anyone with network access can create, update, complete, or abandon quests.
- Files: `backend/src/main/java/com/sidequest/board/controller/QuestController.java`, `frontend/src/api/questApi.js`
- Current mitigation: None.
- Recommendations: Add an auth layer (e.g., JWT via Spring Security or an external provider like Auth0/Supabase) to identify users and restrict mutation endpoints.

## Performance Bottlenecks

**Lifetime XP Calculation:**
- Problem: The `/quests/xp-total` endpoint calculates lifetime XP dynamically by summing all `xpValue` columns of completed quests.
- Files: `backend/src/main/java/com/sidequest/board/repository/QuestRepository.java`, `backend/src/main/java/com/sidequest/board/service/QuestService.java`
- Cause: Using `SELECT SUM(q.xpValue) FROM Quest q WHERE q.status = 'COMPLETED'`.
- Improvement path: Create a separate `UserStats` table or cache to incrementally update and store the total XP value instead of computing it from scratch on every request.

**Lack of Pagination:**
- Problem: The main quests endpoint fetches all quests for a date without pagination or limits.
- Files: `backend/src/main/java/com/sidequest/board/controller/QuestController.java`
- Cause: Unbounded list return on `getQuestsForDate`.
- Improvement path: Implement pagination for the API and frontend to ensure UI and server do not lock up with too many quests per day.

## Fragile Areas

**State Synchronization in Frontend:**
- Files: `frontend/src/components/QuestBoard.jsx`
- Why fragile: The `handleComplete` updates local quest list and then independently refetches total XP from the server. This may result in race conditions where the returned XP isn't correctly synced if requests overlap.
- Safe modification: Return the new total XP alongside the updated quest in the backend `PATCH` response so the frontend doesn't need to re-fetch the XP manually.
- Test coverage: Missing integration tests verifying this state interaction.

## Scaling Limits

**Relational Database Capacity (MySQL):**
- Current capacity: Sufficient for small scale.
- Limit: Using a single untuned MySQL container with default settings may bottleneck on high read/write concurrency.
- Scaling path: Decouple database from `docker-compose` in production, utilize a managed database service (RDS/Aurora), and implement connection pooling (HikariCP).

## Dependencies at Risk

**Not detected:**
- Risk: No significantly outdated or vulnerable dependencies identified in `package.json` or visible backend config.
- Impact: Not applicable.
- Migration plan: Not applicable.

## Missing Critical Features

**User Context Isolation:**
- Problem: The board is global. All quests created are seen by everyone, and XP is a global total.
- Blocks: Prevents multi-tenant usage or personal quest boards.

## Test Coverage Gaps

**Frontend Test Suite:**
- What's not tested: The entire React component tree is largely untested. The existing tests are placeholder/dummy assertions.
- Files: `frontend/src/App.test.jsx`, `frontend/src/components/*.jsx`
- Risk: UI changes could easily break core user flows (creation, completion, abandoning) without failing any tests.
- Priority: High. Need to introduce React Testing Library tests for `QuestBoard.jsx` and other components.

---

*Concerns audit: 2026-08-07*
