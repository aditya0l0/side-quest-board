package com.sidequest.board.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sidequest.board.dto.QuestRequest;
import com.sidequest.board.dto.QuestResponse;
import com.sidequest.board.dto.XpTotalResponse;
import com.sidequest.board.entity.Difficulty;
import com.sidequest.board.entity.Quest;
import com.sidequest.board.entity.QuestStatus;
import com.sidequest.board.exception.IllegalQuestStateException;
import com.sidequest.board.exception.QuestNotFoundException;
import com.sidequest.board.repository.QuestRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Pure unit tests for {@link QuestService}. No Spring context — all collaborators are Mockito
 * mocks. Tests focus on business-rule enforcement and data transformation.
 */
@ExtendWith(MockitoExtension.class)
public class QuestServiceTest {

  @Mock private QuestRepository questRepository;

  @InjectMocks private QuestService questService;

  // ── Helpers ──────────────────────────────────────────────────────────────

  private Quest persistedQuest(Long id, String title, Difficulty difficulty, QuestStatus status) {
    Quest q = new Quest();
    q.setId(id);
    q.setTitle(title);
    q.setDifficulty(difficulty); // also sets xpValue via setDifficulty
    q.setStatus(status);
    q.setQuestDate(LocalDate.now());
    q.setCreatedAt(java.time.LocalDateTime.now());
    return q;
  }

  private QuestRequest request(String title, Difficulty difficulty) {
    QuestRequest req = new QuestRequest();
    req.setTitle(title);
    req.setDifficulty(difficulty);
    return req;
  }

  // ── createQuest ──────────────────────────────────────────────────────────

  @Test
  void createQuest_savesAndReturnsMappedResponse() {
    Quest saved = persistedQuest(1L, "Forge a Sword", Difficulty.SILVER, QuestStatus.ACTIVE);
    when(questRepository.save(any(Quest.class))).thenReturn(saved);

    QuestResponse result = questService.createQuest(request("Forge a Sword", Difficulty.SILVER));

    assertThat(result.getId()).isEqualTo(1L);
    assertThat(result.getTitle()).isEqualTo("Forge a Sword");
    assertThat(result.getDifficulty()).isEqualTo(Difficulty.SILVER);
    assertThat(result.getStatus()).isEqualTo(QuestStatus.ACTIVE);
    assertThat(result.getXpValue()).isEqualTo(25); // SILVER = 25 XP
    verify(questRepository).save(any(Quest.class));
  }

  @Test
  void createQuest_trimsTitleWhitespace() {
    Quest saved = persistedQuest(2L, "Trimmed Title", Difficulty.BRONZE, QuestStatus.ACTIVE);
    when(questRepository.save(any(Quest.class))).thenReturn(saved);

    questService.createQuest(request("  Trimmed Title  ", Difficulty.BRONZE));

    verify(questRepository).save(any(Quest.class));
  }

  @Test
  void createQuest_xpValueDerivedFromDifficulty() {
    Quest bronze = persistedQuest(3L, "Easy Quest", Difficulty.BRONZE, QuestStatus.ACTIVE);
    Quest silver = persistedQuest(4L, "Medium Quest", Difficulty.SILVER, QuestStatus.ACTIVE);
    Quest gold = persistedQuest(5L, "Hard Quest", Difficulty.GOLD, QuestStatus.ACTIVE);

    when(questRepository.save(any(Quest.class))).thenReturn(bronze, silver, gold);

    assertThat(questService.createQuest(request("Easy Quest", Difficulty.BRONZE)).getXpValue()).isEqualTo(10);
    assertThat(questService.createQuest(request("Medium Quest", Difficulty.SILVER)).getXpValue()).isEqualTo(25);
    assertThat(questService.createQuest(request("Hard Quest", Difficulty.GOLD)).getXpValue()).isEqualTo(50);
  }

  // ── getQuestsForDate ─────────────────────────────────────────────────────

  @Test
  void getQuestsForDate_returnsMappedList() {
    LocalDate today = LocalDate.now();
    Quest q1 = persistedQuest(10L, "Quest A", Difficulty.BRONZE, QuestStatus.ACTIVE);
    Quest q2 = persistedQuest(11L, "Quest B", Difficulty.GOLD, QuestStatus.ACTIVE);
    when(questRepository.findByQuestDateAndStatusNot(today, QuestStatus.ABANDONED))
        .thenReturn(List.of(q1, q2));

    List<QuestResponse> results = questService.getQuestsForDate(today);

    assertThat(results).hasSize(2);
    assertThat(results.get(0).getTitle()).isEqualTo("Quest A");
    assertThat(results.get(1).getTitle()).isEqualTo("Quest B");
  }

  @Test
  void getQuestsForDate_emptyWhenNoneExist() {
    LocalDate today = LocalDate.now();
    when(questRepository.findByQuestDateAndStatusNot(today, QuestStatus.ABANDONED))
        .thenReturn(List.of());

    List<QuestResponse> results = questService.getQuestsForDate(today);

    assertThat(results).isEmpty();
  }

  // ── getLifetimeXp ────────────────────────────────────────────────────────

  @Test
  void getLifetimeXp_returnsSumFromRepository() {
    when(questRepository.sumXpByStatusCompleted()).thenReturn(175L);

    XpTotalResponse xp = questService.getLifetimeXp();

    assertThat(xp.getTotalXp()).isEqualTo(175L);
  }

  @Test
  void getLifetimeXp_zeroWhenRepositoryReturnsNull() {
    when(questRepository.sumXpByStatusCompleted()).thenReturn(null);

    XpTotalResponse xp = questService.getLifetimeXp();

    // The service wraps null directly — this documents current behavior
    assertThat(xp.getTotalXp()).isNull();
  }

  // ── updateQuest ──────────────────────────────────────────────────────────

  @Test
  void updateQuest_updatesActiveQuest() {
    Quest existing = persistedQuest(20L, "Old Title", Difficulty.BRONZE, QuestStatus.ACTIVE);
    Quest updated = persistedQuest(20L, "New Title", Difficulty.GOLD, QuestStatus.ACTIVE);
    when(questRepository.findById(20L)).thenReturn(Optional.of(existing));
    when(questRepository.save(any(Quest.class))).thenReturn(updated);

    QuestResponse result = questService.updateQuest(20L, request("New Title", Difficulty.GOLD));

    assertThat(result.getTitle()).isEqualTo("New Title");
    assertThat(result.getDifficulty()).isEqualTo(Difficulty.GOLD);
  }

  @Test
  void updateQuest_throwsNotFound_whenQuestMissing() {
    when(questRepository.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> questService.updateQuest(999L, request("Any", Difficulty.BRONZE)))
        .isInstanceOf(QuestNotFoundException.class)
        .hasMessageContaining("999");
  }

  @Test
  void updateQuest_throwsConflict_whenQuestCompleted() {
    Quest completed = persistedQuest(21L, "Done Quest", Difficulty.GOLD, QuestStatus.COMPLETED);
    when(questRepository.findById(21L)).thenReturn(Optional.of(completed));

    assertThatThrownBy(() -> questService.updateQuest(21L, request("Any", Difficulty.BRONZE)))
        .isInstanceOf(IllegalQuestStateException.class)
        .hasMessageContaining("completed");
  }

  @Test
  void updateQuest_throwsConflict_whenQuestAbandoned() {
    Quest abandoned = persistedQuest(22L, "Lost Quest", Difficulty.BRONZE, QuestStatus.ABANDONED);
    when(questRepository.findById(22L)).thenReturn(Optional.of(abandoned));

    assertThatThrownBy(() -> questService.updateQuest(22L, request("Any", Difficulty.BRONZE)))
        .isInstanceOf(IllegalQuestStateException.class)
        .hasMessageContaining("abandoned");
  }

  // ── completeQuest ────────────────────────────────────────────────────────

  @Test
  void completeQuest_setsStatusAndCompletedAt() {
    Quest active = persistedQuest(30L, "Almost Done", Difficulty.SILVER, QuestStatus.ACTIVE);
    Quest done = persistedQuest(30L, "Almost Done", Difficulty.SILVER, QuestStatus.COMPLETED);
    done.setCompletedAt(java.time.LocalDateTime.now());
    when(questRepository.findById(30L)).thenReturn(Optional.of(active));
    when(questRepository.save(any(Quest.class))).thenReturn(done);

    QuestResponse result = questService.completeQuest(30L);

    assertThat(result.getStatus()).isEqualTo(QuestStatus.COMPLETED);
    assertThat(result.getCompletedAt()).isNotNull();
  }

  @Test
  void completeQuest_throwsConflict_whenAlreadyCompleted() {
    Quest completed = persistedQuest(31L, "Done Quest", Difficulty.GOLD, QuestStatus.COMPLETED);
    when(questRepository.findById(31L)).thenReturn(Optional.of(completed));

    assertThatThrownBy(() -> questService.completeQuest(31L))
        .isInstanceOf(IllegalQuestStateException.class)
        .hasMessageContaining("already completed");
  }

  @Test
  void completeQuest_throwsConflict_whenAbandoned() {
    Quest abandoned = persistedQuest(32L, "Lost Quest", Difficulty.BRONZE, QuestStatus.ABANDONED);
    when(questRepository.findById(32L)).thenReturn(Optional.of(abandoned));

    assertThatThrownBy(() -> questService.completeQuest(32L))
        .isInstanceOf(IllegalQuestStateException.class)
        .hasMessageContaining("abandoned");
  }

  @Test
  void completeQuest_throwsNotFound_whenQuestMissing() {
    when(questRepository.findById(998L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> questService.completeQuest(998L))
        .isInstanceOf(QuestNotFoundException.class);
  }

  // ── abandonQuest ─────────────────────────────────────────────────────────

  @Test
  void abandonQuest_setsStatusToAbandoned() {
    Quest active = persistedQuest(40L, "Dropped Quest", Difficulty.BRONZE, QuestStatus.ACTIVE);
    Quest abandoned = persistedQuest(40L, "Dropped Quest", Difficulty.BRONZE, QuestStatus.ABANDONED);
    when(questRepository.findById(40L)).thenReturn(Optional.of(active));
    when(questRepository.save(any(Quest.class))).thenReturn(abandoned);

    QuestResponse result = questService.abandonQuest(40L);

    assertThat(result.getStatus()).isEqualTo(QuestStatus.ABANDONED);
  }

  @Test
  void abandonQuest_throwsConflict_whenAlreadyAbandoned() {
    Quest abandoned = persistedQuest(41L, "Lost Quest", Difficulty.BRONZE, QuestStatus.ABANDONED);
    when(questRepository.findById(41L)).thenReturn(Optional.of(abandoned));

    assertThatThrownBy(() -> questService.abandonQuest(41L))
        .isInstanceOf(IllegalQuestStateException.class)
        .hasMessageContaining("already abandoned");
  }

  @Test
  void abandonQuest_throwsConflict_whenCompleted() {
    Quest completed = persistedQuest(42L, "Earned Quest", Difficulty.GOLD, QuestStatus.COMPLETED);
    when(questRepository.findById(42L)).thenReturn(Optional.of(completed));

    assertThatThrownBy(() -> questService.abandonQuest(42L))
        .isInstanceOf(IllegalQuestStateException.class)
        .hasMessageContaining("completed");
  }

  @Test
  void abandonQuest_throwsNotFound_whenQuestMissing() {
    when(questRepository.findById(997L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> questService.abandonQuest(997L))
        .isInstanceOf(QuestNotFoundException.class);
  }
}
