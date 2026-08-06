package com.sidequest.board.exception;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global exception handler — returns clean JSON error bodies instead of Spring's default whitelabel
 * error page.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  // ── 404 — Quest not found ───────────────────────────

  @ExceptionHandler(QuestNotFoundException.class)
  public ResponseEntity<Map<String, Object>> handleNotFound(QuestNotFoundException ex) {
    return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage());
  }

  // ── 409 — Illegal state transition ──────────────────

  @ExceptionHandler(IllegalQuestStateException.class)
  public ResponseEntity<Map<String, Object>> handleConflict(IllegalQuestStateException ex) {
    return buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage());
  }

  // ── 400 — Bean Validation errors ────────────────────

  /** Handles bean-validation errors, returning a 400 with per-field messages. */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .collect(Collectors.joining("; "));
    return buildErrorResponse(HttpStatus.BAD_REQUEST, message);
  }

  // ── 400 — General bad request ───────────────────────

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
    return buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
  }

  // ── Helper ──────────────────────────────────────────

  private ResponseEntity<Map<String, Object>> buildErrorResponse(
      HttpStatus status, String message) {
    Map<String, Object> body = new HashMap<>();
    body.put("timestamp", LocalDateTime.now().toString());
    body.put("status", status.value());
    body.put("error", status.getReasonPhrase());
    body.put("message", message);
    return ResponseEntity.status(status).body(body);
  }
}
