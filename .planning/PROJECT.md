# Side-Quest Board Project

## What This Is
A gamified "Side-Quest Board" application that transforms daily habits and to-dos into RPG-style quests, allowing users to earn XP and level up as they complete tasks. The project already has a working full-stack implementation with a React frontend, Spring Boot backend, MySQL database, and Jenkins CI/CD pipeline. The current focus is on expanding its features and modernizing the DevOps stack by migrating infrastructure provisioning to Terraform.

## Target Audience
Individuals looking to gamify their personal productivity and daily habits, and DevOps engineers managing its infrastructure.

## Core Value
Transforming mundane tasks into rewarding quests while maintaining a robust, automated infrastructure pipeline.

## Requirements

### Validated

- ✓ Gamified task management (quests, XP, difficulty tiers) — existing
- ✓ React Single Page Application (SPA) frontend — existing
- ✓ Spring Boot REST API backend — existing
- ✓ MySQL database persistence — existing
- ✓ Jenkins multi-job CI pipeline (lint, test, build, deploy) — existing
- ✓ Custom webhook-server for GitHub integration — existing
- ✓ Automated EC2 deployment (currently Ansible) — existing

### Active

- [ ] Migrate EC2 infrastructure provisioning from Ansible to Terraform
- [ ] Implement new product features (specifics to be determined)

### Out of Scope

- [ ] Migration to fully managed database (e.g., RDS) — User opted to stick with EC2 provisioning for now.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Terraform for infrastructure provisioning | Replaces Ansible to adopt a more robust Infrastructure as Code (IaC) DevOps toolchain for managing the EC2 host and basic infrastructure. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-07 after initialization*
