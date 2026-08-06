package com.sidequest.board.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a state transition is illegal (e.g. editing a completed quest). Maps to HTTP 409
 * Conflict.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class IllegalQuestStateException extends RuntimeException {

  public IllegalQuestStateException(String message) {
    super(message);
  }
}
