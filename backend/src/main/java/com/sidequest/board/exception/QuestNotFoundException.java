package com.sidequest.board.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a quest ID is not found in the database.
 * Maps to HTTP 404.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class QuestNotFoundException extends RuntimeException {

    public QuestNotFoundException(Long id) {
        super("Quest not found with id: " + id);
    }
}
