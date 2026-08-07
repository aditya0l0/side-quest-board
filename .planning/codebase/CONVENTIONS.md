# Coding Conventions

**Analysis Date:** 2026-08-07

## Naming Patterns

**Files:**
- Frontend Components: PascalCase (`QuestCard.jsx`, `QuestBoard.jsx`)
- Frontend APIs/Utils: camelCase (`questApi.js`)
- Backend Classes: PascalCase standard Java naming (`QuestController.java`, `QuestRequest.java`)

**Functions:**
- Frontend: camelCase (`handleSaveEdit`, `createQuest`)
- Backend: camelCase (`createQuest`, `updateQuest`)

**Variables:**
- Local variables and properties: camelCase
- Constants: CONSTANT_CASE (`TIERS`)

**Types:**
- Java Classes/Enums: PascalCase (`Difficulty`, `QuestStatus`)

## Code Style

**Formatting:**
- Backend: Spotless Maven Plugin (`googleJavaFormat`)
- Frontend: Prettier-like defaults (using Vite out of the box), no explicit formatter configured but generally 2 spaces.

**Linting:**
- Backend: Checkstyle Maven Plugin (`google_checks.xml`)
- Frontend: oxlint (`.oxlintrc.json`), with rules for `react/rules-of-hooks` and `react/only-export-components`.

## Import Organization

**Order:**
- Frontend: React imports first (`import React, { useState } from 'react';`), then local components (`import DifficultyBadge from './DifficultyBadge';`), then CSS.
- Backend: Standard Java import ordering (static imports first, then java.*, then third-party, then project classes), enforced by Spotless/Checkstyle.

**Path Aliases:**
- Not explicitly configured. Relative paths are used in frontend (`../api/questApi`).

## Error Handling

**Patterns:**
- Backend: Global `@RestControllerAdvice` (`GlobalExceptionHandler.java`) handles custom domain exceptions (`QuestNotFoundException`, `IllegalQuestStateException`) and maps them to clean JSON responses. Returns `404 Not Found` for missing resources and `409 Conflict` for illegal state transitions. Bean Validation errors (`@Valid`) map to `400 Bad Request`.
- Frontend: API calls wrapped in `try/catch`. Errors are typically propagated to a Toast component or handled via inline state (`saving`/`completing` boolean flags).

## Logging

**Framework:** Spring Boot SLF4J/Logback (implied by `spring-boot-starter-parent`), frontend `console.log/error`.

**Patterns:**
- Errors are logged when caught in `try/catch` in API helpers.
- Standard Spring Boot startup and request logging.

## Comments

**When to Comment:**
- Use class-level Javadoc to describe responsibilities (`/** REST controller for the Side-Quest Board... */`).
- Use method-level Javadoc for public API methods.
- Inline comments used sparingly to explain non-obvious states (e.g., `// Keep completing true for animation duration`).

**JSDoc/TSDoc:**
- Frontend: Lightweight JSDoc for React component responsibilities (`/** A single quest card... */`).
- Backend: Standard Javadoc (`/** ... @param ... @return ... */`).

## Function Design

**Size:** Small, focused functions. Controller methods delegate business logic to the service layer.

**Parameters:** Prefer DTOs for complex inputs (`QuestRequest`).

**Return Values:** Return DTOs (`QuestResponse`), never expose raw JPA entities to the presentation layer. Use `ResponseEntity` for HTTP status control.

## Module Design

**Exports:** 
- Frontend uses `export default function ComponentName()` for main components.

**Barrel Files:** Not currently used.

---

*Convention analysis: 2026-08-07*
