package com.sidequest.board.entity;

/** Quest difficulty tiers — each tier awards a fixed XP value. */
public enum Difficulty {
  BRONZE(10),
  SILVER(25),
  GOLD(50);

  private final int xpValue;

  Difficulty(int xpValue) {
    this.xpValue = xpValue;
  }

  public int getXpValue() {
    return xpValue;
  }
}
