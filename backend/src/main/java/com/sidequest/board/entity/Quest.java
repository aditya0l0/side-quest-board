package com.sidequest.board.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A single side-quest on the board.
 *
 * XP is derived server-side from the quest's {@link Difficulty} and is
 * never settable by the client. The quest locks for edits once it
 * reaches {@link QuestStatus#COMPLETED}.
 */
@Entity
@Table(name = "quest", indexes = {
    @Index(name = "idx_quest_date_status", columnList = "questDate, status")
})
public class Quest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Difficulty difficulty;

    @Column(nullable = false)
    private Integer xpValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private QuestStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;

    @Column(nullable = false)
    private LocalDate questDate;

    // ── Lifecycle callbacks ─────────────────────────────

    @PrePersist
    public void onPrePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.questDate == null) {
            this.questDate = LocalDate.now();
        }
        if (this.status == null) {
            this.status = QuestStatus.ACTIVE;
        }
        this.xpValue = this.difficulty.getXpValue();
    }

    // ── Getters & Setters ───────────────────────────────

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(Difficulty difficulty) {
        this.difficulty = difficulty;
        this.xpValue = difficulty.getXpValue();
    }

    public Integer getXpValue() {
        return xpValue;
    }

    // No public setter for xpValue — always derived from difficulty

    public QuestStatus getStatus() {
        return status;
    }

    public void setStatus(QuestStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public LocalDate getQuestDate() {
        return questDate;
    }

    public void setQuestDate(LocalDate questDate) {
        this.questDate = questDate;
    }
}
