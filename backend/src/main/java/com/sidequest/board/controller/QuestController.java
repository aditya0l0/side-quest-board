package com.sidequest.board.controller;

import com.sidequest.board.dto.QuestRequest;
import com.sidequest.board.dto.QuestResponse;
import com.sidequest.board.dto.XpTotalResponse;
import com.sidequest.board.service.QuestService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * REST controller for the Side-Quest Board.
 *
 * All endpoints live under /api/quests. Business logic is
 * delegated entirely to {@link QuestService}.
 */
@RestController
@RequestMapping("/api/quests")
public class QuestController {

    private final QuestService questService;

    public QuestController(QuestService questService) {
        this.questService = questService;
    }

    // ── POST /api/quests — Create a new quest ───────────

    @PostMapping
    public ResponseEntity<QuestResponse> createQuest(@Valid @RequestBody QuestRequest request) {
        QuestResponse created = questService.createQuest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ── GET /api/quests?date=YYYY-MM-DD — Daily board ───

    @GetMapping
    public ResponseEntity<List<QuestResponse>> getQuests(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        List<QuestResponse> quests = questService.getQuestsForDate(targetDate);
        return ResponseEntity.ok(quests);
    }

    // ── GET /api/quests/xp-total — Lifetime XP ─────────

    @GetMapping("/xp-total")
    public ResponseEntity<XpTotalResponse> getXpTotal() {
        XpTotalResponse xp = questService.getLifetimeXp();
        return ResponseEntity.ok(xp);
    }

    // ── PUT /api/quests/{id} — Edit quest ───────────────

    @PutMapping("/{id}")
    public ResponseEntity<QuestResponse> updateQuest(
            @PathVariable Long id,
            @Valid @RequestBody QuestRequest request
    ) {
        QuestResponse updated = questService.updateQuest(id, request);
        return ResponseEntity.ok(updated);
    }

    // ── PATCH /api/quests/{id}/complete — Claim XP ──────

    @PatchMapping("/{id}/complete")
    public ResponseEntity<QuestResponse> completeQuest(@PathVariable Long id) {
        QuestResponse completed = questService.completeQuest(id);
        return ResponseEntity.ok(completed);
    }

    // ── PATCH /api/quests/{id}/abandon — Soft delete ────

    @PatchMapping("/{id}/abandon")
    public ResponseEntity<QuestResponse> abandonQuest(@PathVariable Long id) {
        QuestResponse abandoned = questService.abandonQuest(id);
        return ResponseEntity.ok(abandoned);
    }
}
