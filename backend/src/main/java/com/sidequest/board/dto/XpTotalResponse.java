package com.sidequest.board.dto;

/**
 * Simple wrapper for the lifetime XP total endpoint.
 */
public class XpTotalResponse {

    private Long totalXp;

    public XpTotalResponse() {}

    public XpTotalResponse(Long totalXp) {
        this.totalXp = totalXp;
    }

    public Long getTotalXp() {
        return totalXp;
    }

    public void setTotalXp(Long totalXp) {
        this.totalXp = totalXp;
    }
}
