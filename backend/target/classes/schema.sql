-- ═══════════════════════════════════════════════
-- Side-Quest Board — Database Setup
-- ═══════════════════════════════════════════════
-- Run this script once to create the database.
-- JPA/Hibernate will handle table creation via ddl-auto=update.

CREATE DATABASE IF NOT EXISTS sidequest_board
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sidequest_board;

-- Reference DDL (JPA auto-generates this, but here for documentation):
--
-- CREATE TABLE quest (
--     id            BIGINT AUTO_INCREMENT PRIMARY KEY,
--     title         VARCHAR(120)  NOT NULL,
--     description   VARCHAR(500),
--     difficulty    VARCHAR(10)   NOT NULL,  -- BRONZE, SILVER, GOLD
--     xp_value      INT           NOT NULL,
--     status        VARCHAR(15)   NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, COMPLETED, ABANDONED
--     created_at    DATETIME      NOT NULL,
--     completed_at  DATETIME,
--     quest_date    DATE          NOT NULL,
--     INDEX idx_quest_date_status (quest_date, status)
-- );
