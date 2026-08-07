package com.sidequest.board.controller;

import com.sidequest.board.dto.QuestRequest;
import com.sidequest.board.dto.QuestResponse;
import com.sidequest.board.dto.XpTotalResponse;
import com.sidequest.board.service.QuestService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for the Side-Quest Board.
 *
 * <p>All endpoints live under /api/quests. Business logic is delegated entirely to {@link
 * QuestService}.
 */
@RestController
@RequestMapping("/api/quests")
public class QuestController {

  private final QuestService questService;

  /**
   * Constructs the controller, injecting the required {@link QuestService}.
   *
   * @param questService service for quest operations
   */
  public QuestController(QuestService questService) {
    this.questService = questService;
  }

  // ── POST /api/quests — Create a new quest ───────────

  /**
   * Creates a new quest.
   *
   * @param request quest request payload containing title and difficulty
   * @return response entity containing created quest details and HTTP 201 status
   */
  @PostMapping
  public ResponseEntity<QuestResponse> createQuest(@Valid @RequestBody QuestRequest request) {
    QuestResponse created = questService.createQuest(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  // ── GET /api/quests?date=YYYY-MM-DD — Daily board ───

  /**
   * Returns all non-abandoned quests for the given date (defaults to today if omitted).
   *
   * @param date optional target date for quests filter
   * @return response entity with list of quests for specified date
   */
  @GetMapping
  public ResponseEntity<List<QuestResponse>> getQuests(
      @RequestParam(name = "date", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate date) {
    LocalDate targetDate = (date != null) ? date : LocalDate.now();
    List<QuestResponse> quests = questService.getQuestsForDate(targetDate);
    return ResponseEntity.ok(quests);
  }

  // ── GET /api/quests/xp-total — Lifetime XP ─────────

  /**
   * Retrieves lifetime XP accumulated across all completed quests.
   *
   * @return response entity containing lifetime XP total
   */
  @GetMapping("/xp-total")
  public ResponseEntity<XpTotalResponse> getXpTotal() {
    XpTotalResponse xp = questService.getLifetimeXp();
    return ResponseEntity.ok(xp);
  }

  // ── PUT /api/quests/{id} — Edit quest ───────────────

  /**
   * Updates an existing active quest's details.
   *
   * @param id quest ID
   * @param request quest request payload containing updated title and difficulty
   * @return response entity containing updated quest details
   */
  @PutMapping("/{id}")
  public ResponseEntity<QuestResponse> updateQuest(
      @PathVariable("id") Long id, @Valid @RequestBody QuestRequest request) {
    QuestResponse updated = questService.updateQuest(id, request);
    return ResponseEntity.ok(updated);
  }

  // ── PATCH /api/quests/{id}/complete — Claim XP ──────

  /**
   * Marks a quest as completed and awards XP.
   *
   * @param id quest ID
   * @return response entity containing completed quest details
   */
  @PatchMapping("/{id}/complete")
  public ResponseEntity<QuestResponse> completeQuest(@PathVariable("id") Long id) {
    QuestResponse completed = questService.completeQuest(id);
    return ResponseEntity.ok(completed);
  }

  // ── PATCH /api/quests/{id}/abandon — Soft delete ────

  /**
   * Soft deletes / abandons a quest.
   *
   * @param id quest ID
   * @return response entity containing abandoned quest details
   */
  @PatchMapping("/{id}/abandon")
  public ResponseEntity<QuestResponse> abandonQuest(@PathVariable("id") Long id) {
    QuestResponse abandoned = questService.abandonQuest(id);
    return ResponseEntity.ok(abandoned);
  }
}
