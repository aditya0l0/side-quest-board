package com.sidequest.board.service;

import com.sidequest.board.dto.QuestRequest;
import com.sidequest.board.dto.QuestResponse;
import com.sidequest.board.dto.XpTotalResponse;
import com.sidequest.board.entity.Quest;
import com.sidequest.board.entity.QuestStatus;
import com.sidequest.board.exception.IllegalQuestStateException;
import com.sidequest.board.exception.QuestNotFoundException;
import com.sidequest.board.repository.QuestRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business-logic layer for quests.
 *
 * <p>All XP derivation and status-transition rules live here, keeping the controller thin and the
 * entity clean.
 */
@Service
@Transactional
public class QuestService {

  private final QuestRepository questRepository;

  public QuestService(QuestRepository questRepository) {
    this.questRepository = questRepository;
  }

  // ── Create ──────────────────────────────────────────

  /** Create a new quest for today. XP is derived from difficulty; status defaults to ACTIVE. */
  public QuestResponse createQuest(QuestRequest request) {
    Quest quest = new Quest();
    quest.setTitle(request.getTitle().trim());
    quest.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
    quest.setDifficulty(request.getDifficulty());
    // xpValue, status, createdAt, questDate set by @PrePersist

    Quest saved = questRepository.save(quest);
    return QuestResponse.fromEntity(saved);
  }

  // ── Read ────────────────────────────────────────────

  /** Fetch all non-abandoned quests for a given date. */
  @Transactional(readOnly = true)
  public List<QuestResponse> getQuestsForDate(LocalDate date) {
    return questRepository.findByQuestDateAndStatusNot(date, QuestStatus.ABANDONED).stream()
        .map(QuestResponse::fromEntity)
        .collect(Collectors.toList());
  }

  /** Lifetime XP total across all completed quests. */
  @Transactional(readOnly = true)
  public XpTotalResponse getLifetimeXp() {
    Long total = questRepository.sumXpByStatusCompleted();
    return new XpTotalResponse(total);
  }

  // ── Update ──────────────────────────────────────────

  /** Edit a quest's title, description, or difficulty. Only allowed while the quest is ACTIVE. */
  public QuestResponse updateQuest(@NonNull Long id, QuestRequest request) {
    Quest quest = findOrThrow(id);

    if (quest.getStatus() != QuestStatus.ACTIVE) {
      throw new IllegalQuestStateException(
          "Cannot edit a quest that is "
              + quest.getStatus().name().toLowerCase()
              + ". Only ACTIVE quests can be modified.");
    }

    quest.setTitle(request.getTitle().trim());
    quest.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
    quest.setDifficulty(request.getDifficulty());
    // setDifficulty also recalculates xpValue

    Quest saved = questRepository.save(quest);
    return QuestResponse.fromEntity(saved);
  }

  // ── Complete ────────────────────────────────────────

  /**
   * Mark a quest as COMPLETED and lock it for further edits. Awards XP by setting status to
   * COMPLETED + recording completedAt.
   */
  public QuestResponse completeQuest(@NonNull Long id) {
    Quest quest = findOrThrow(id);

    if (quest.getStatus() == QuestStatus.COMPLETED) {
      throw new IllegalQuestStateException("Quest is already completed. You can't claim XP twice!");
    }
    if (quest.getStatus() == QuestStatus.ABANDONED) {
      throw new IllegalQuestStateException(
          "Cannot complete an abandoned quest. It's lost to the void.");
    }

    quest.setStatus(QuestStatus.COMPLETED);
    quest.setCompletedAt(LocalDateTime.now());

    Quest saved = questRepository.save(quest);
    return QuestResponse.fromEntity(saved);
  }

  // ── Abandon (soft delete) ───────────────────────────

  /**
   * Soft-delete a quest by setting its status to ABANDONED. It will be hidden from the active board
   * but remains in history.
   */
  public QuestResponse abandonQuest(@NonNull Long id) {
    Quest quest = findOrThrow(id);

    if (quest.getStatus() == QuestStatus.ABANDONED) {
      throw new IllegalQuestStateException("Quest is already abandoned.");
    }
    if (quest.getStatus() == QuestStatus.COMPLETED) {
      throw new IllegalQuestStateException(
          "Cannot abandon a completed quest. The XP has been earned!");
    }

    quest.setStatus(QuestStatus.ABANDONED);

    Quest saved = questRepository.save(quest);
    return QuestResponse.fromEntity(saved);
  }

  // ── Helper ──────────────────────────────────────────

  private Quest findOrThrow(@NonNull Long id) {
    return questRepository.findById(id).orElseThrow(() -> new QuestNotFoundException(id));
  }
}
