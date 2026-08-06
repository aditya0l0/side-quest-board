package com.sidequest.board.repository;

import com.sidequest.board.entity.Quest;
import com.sidequest.board.entity.QuestStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

/** Spring Data JPA repository for {@link com.sidequest.board.entity.Quest} entities. */
@Repository
public interface QuestRepository extends JpaRepository<Quest, Long> {

  /** Find all quests for a given date, excluding abandoned ones (the "active board" view). */
  List<Quest> findByQuestDateAndStatusNot(LocalDate questDate, QuestStatus status);

  /** Find all quests for a given date regardless of status. */
  List<Quest> findByQuestDate(LocalDate questDate);

  /** Calculate lifetime total XP across all completed quests. */
  @Query("SELECT COALESCE(SUM(q.xpValue), 0) FROM Quest q WHERE q.status = 'COMPLETED'")
  Long sumXpByStatusCompleted();
}
