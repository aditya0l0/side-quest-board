package com.sidequest.board.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sidequest.board.dto.QuestRequest;
import com.sidequest.board.dto.QuestResponse;
import com.sidequest.board.dto.XpTotalResponse;
import com.sidequest.board.entity.Difficulty;
import com.sidequest.board.entity.Quest;
import com.sidequest.board.entity.QuestStatus;
import com.sidequest.board.exception.IllegalQuestStateException;
import com.sidequest.board.exception.QuestNotFoundException;
import com.sidequest.board.service.QuestService;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Slice tests for {@link QuestController}. Uses {@code @WebMvcTest} so only the web layer is
 * loaded — {@link QuestService} is mocked with Mockito.
 */
@WebMvcTest(QuestController.class)
public class QuestControllerTest {

  @Autowired private MockMvc mockMvc;

  @Autowired private ObjectMapper objectMapper;

  @MockBean private QuestService questService;

  // ── Helpers ──────────────────────────────────────────────────────────────

  private Quest buildQuest(Long id, String title, Difficulty difficulty, QuestStatus status) {
    Quest quest = new Quest();
    quest.setId(id);
    quest.setTitle(title);
    quest.setDifficulty(difficulty);
    quest.setStatus(status);
    quest.setQuestDate(LocalDate.now());
    return quest;
  }

  private QuestRequest buildRequest(String title, Difficulty difficulty) {
    QuestRequest req = new QuestRequest();
    req.setTitle(title);
    req.setDifficulty(difficulty);
    return req;
  }

  // ── POST /api/quests ──────────────────────────────────────────────────────

  @Test
  void createQuest_returnsCreatedAndBody() throws Exception {
    Quest q = buildQuest(1L, "Slay the Dragon", Difficulty.GOLD, QuestStatus.ACTIVE);
    when(questService.createQuest(any(QuestRequest.class))).thenReturn(QuestResponse.fromEntity(q));

    mockMvc
        .perform(
            post("/api/quests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(buildRequest("Slay the Dragon", Difficulty.GOLD))))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(1))
        .andExpect(jsonPath("$.title").value("Slay the Dragon"))
        .andExpect(jsonPath("$.difficulty").value("GOLD"))
        .andExpect(jsonPath("$.status").value("ACTIVE"));
  }

  @Test
  void createQuest_missingTitle_returns400() throws Exception {
    QuestRequest bad = new QuestRequest();
    bad.setDifficulty(Difficulty.BRONZE); // title intentionally omitted

    mockMvc
        .perform(
            post("/api/quests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(bad)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.status").value(400));
  }

  @Test
  void createQuest_missingDifficulty_returns400() throws Exception {
    QuestRequest bad = new QuestRequest();
    bad.setTitle("Valid Title"); // difficulty intentionally omitted

    mockMvc
        .perform(
            post("/api/quests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(bad)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void createQuest_titleTooLong_returns400() throws Exception {
    QuestRequest bad = buildRequest("A".repeat(121), Difficulty.SILVER); // 121 chars > max 120

    mockMvc
        .perform(
            post("/api/quests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(bad)))
        .andExpect(status().isBadRequest());
  }

  // ── GET /api/quests ───────────────────────────────────────────────────────

  @Test
  void getQuests_returnsListForToday() throws Exception {
    Quest q = buildQuest(2L, "Brew a Potion", Difficulty.BRONZE, QuestStatus.ACTIVE);
    when(questService.getQuestsForDate(any(LocalDate.class)))
        .thenReturn(List.of(QuestResponse.fromEntity(q)));

    mockMvc
        .perform(get("/api/quests"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].title").value("Brew a Potion"))
        .andExpect(jsonPath("$[0].difficulty").value("BRONZE"));
  }

  @Test
  void getQuests_withDateParam_passesDateToService() throws Exception {
    when(questService.getQuestsForDate(LocalDate.of(2025, 6, 15)))
        .thenReturn(Collections.emptyList());

    mockMvc
        .perform(get("/api/quests").param("date", "2025-06-15"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void getQuests_emptyBoard_returnsEmptyArray() throws Exception {
    when(questService.getQuestsForDate(any(LocalDate.class))).thenReturn(Collections.emptyList());

    mockMvc.perform(get("/api/quests")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
  }

  // ── GET /api/quests/xp-total ──────────────────────────────────────────────

  @Test
  void getXpTotal_returnsLifetimeXp() throws Exception {
    when(questService.getLifetimeXp()).thenReturn(new XpTotalResponse(250L));

    mockMvc
        .perform(get("/api/quests/xp-total"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalXp").value(250));
  }

  @Test
  void getXpTotal_zeroWhenNoCompletedQuests() throws Exception {
    when(questService.getLifetimeXp()).thenReturn(new XpTotalResponse(0L));

    mockMvc
        .perform(get("/api/quests/xp-total"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalXp").value(0));
  }

  // ── PUT /api/quests/{id} ──────────────────────────────────────────────────

  @Test
  void updateQuest_returnsUpdatedQuest() throws Exception {
    Quest updated = buildQuest(3L, "Upgraded Quest", Difficulty.SILVER, QuestStatus.ACTIVE);
    when(questService.updateQuest(eq(3L), any(QuestRequest.class)))
        .thenReturn(QuestResponse.fromEntity(updated));

    mockMvc
        .perform(
            put("/api/quests/3")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRequest("Upgraded Quest", Difficulty.SILVER))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(3))
        .andExpect(jsonPath("$.title").value("Upgraded Quest"))
        .andExpect(jsonPath("$.difficulty").value("SILVER"));
  }

  @Test
  void updateQuest_notFound_returns404() throws Exception {
    when(questService.updateQuest(eq(999L), any(QuestRequest.class)))
        .thenThrow(new QuestNotFoundException(999L));

    mockMvc
        .perform(
            put("/api/quests/999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRequest("Ghost Quest", Difficulty.BRONZE))))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404));
  }

  @Test
  void updateQuest_completedQuest_returns409() throws Exception {
    when(questService.updateQuest(eq(5L), any(QuestRequest.class)))
        .thenThrow(new IllegalQuestStateException("Cannot edit a quest that is completed."));

    mockMvc
        .perform(
            put("/api/quests/5")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRequest("Stale Quest", Difficulty.GOLD))))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  // ── PATCH /api/quests/{id}/complete ──────────────────────────────────────

  @Test
  void completeQuest_returnsCompletedQuest() throws Exception {
    Quest done = buildQuest(4L, "Finished Quest", Difficulty.GOLD, QuestStatus.COMPLETED);
    when(questService.completeQuest(4L)).thenReturn(QuestResponse.fromEntity(done));

    mockMvc
        .perform(patch("/api/quests/4/complete"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("COMPLETED"));
  }

  @Test
  void completeQuest_alreadyCompleted_returns409() throws Exception {
    when(questService.completeQuest(7L))
        .thenThrow(new IllegalQuestStateException("Quest is already completed. You can't claim XP twice!"));

    mockMvc
        .perform(patch("/api/quests/7/complete"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value("Quest is already completed. You can't claim XP twice!"));
  }

  @Test
  void completeQuest_notFound_returns404() throws Exception {
    when(questService.completeQuest(99L)).thenThrow(new QuestNotFoundException(99L));

    mockMvc
        .perform(patch("/api/quests/99/complete"))
        .andExpect(status().isNotFound());
  }

  // ── PATCH /api/quests/{id}/abandon ───────────────────────────────────────

  @Test
  void abandonQuest_returnsAbandonedQuest() throws Exception {
    Quest abandoned = buildQuest(6L, "Abandoned Quest", Difficulty.BRONZE, QuestStatus.ABANDONED);
    when(questService.abandonQuest(6L)).thenReturn(QuestResponse.fromEntity(abandoned));

    mockMvc
        .perform(patch("/api/quests/6/abandon"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ABANDONED"));
  }

  @Test
  void abandonQuest_alreadyAbandoned_returns409() throws Exception {
    when(questService.abandonQuest(8L))
        .thenThrow(new IllegalQuestStateException("Quest is already abandoned."));

    mockMvc
        .perform(patch("/api/quests/8/abandon"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value("Quest is already abandoned."));
  }

  @Test
  void abandonQuest_completedQuest_returns409() throws Exception {
    when(questService.abandonQuest(9L))
        .thenThrow(new IllegalQuestStateException("Cannot abandon a completed quest. The XP has been earned!"));

    mockMvc
        .perform(patch("/api/quests/9/abandon"))
        .andExpect(status().isConflict());
  }

  @Test
  void abandonQuest_notFound_returns404() throws Exception {
    when(questService.abandonQuest(404L)).thenThrow(new QuestNotFoundException(404L));

    mockMvc
        .perform(patch("/api/quests/404/abandon"))
        .andExpect(status().isNotFound());
  }
}
