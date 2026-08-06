package com.sidequest.board.dto;

import com.sidequest.board.entity.Difficulty;
import com.sidequest.board.entity.Quest;
import com.sidequest.board.entity.QuestStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Outbound DTO for quest data sent to the client. */
public class QuestResponse {

  private Long id;
  private String title;
  private String description;
  private Difficulty difficulty;
  private Integer xpValue;
  private QuestStatus status;
  private LocalDateTime createdAt;
  private LocalDateTime completedAt;
  private LocalDate questDate;

  // ── Factory ─────────────────────────────────────────

  /** Creates a {@link QuestResponse} DTO from the given {@link Quest} entity. */
  public static QuestResponse fromEntity(Quest quest) {
    QuestResponse dto = new QuestResponse();
    dto.id = quest.getId();
    dto.title = quest.getTitle();
    dto.description = quest.getDescription();
    dto.difficulty = quest.getDifficulty();
    dto.xpValue = quest.getXpValue();
    dto.status = quest.getStatus();
    dto.createdAt = quest.getCreatedAt();
    dto.completedAt = quest.getCompletedAt();
    dto.questDate = quest.getQuestDate();
    return dto;
  }

  // ── Getters ─────────────────────────────────────────

  public Long getId() {
    return id;
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }

  public Difficulty getDifficulty() {
    return difficulty;
  }

  public Integer getXpValue() {
    return xpValue;
  }

  public QuestStatus getStatus() {
    return status;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public LocalDateTime getCompletedAt() {
    return completedAt;
  }

  public LocalDate getQuestDate() {
    return questDate;
  }
}
