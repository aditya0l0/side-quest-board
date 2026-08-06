#!/bin/bash
# =============================================================================
# ec2_cleanup.sh — Side-Quest Board EC2 Free Tier Maintenance Script
#
# Usage:
#   chmod +x ec2_cleanup.sh
#   ./ec2_cleanup.sh          # full cleanup
#   ./ec2_cleanup.sh --dry-run  # show what would be deleted, delete nothing
#
# Safe to run while the app is LIVE. Only removes stopped containers,
# dangling images/volumes, and stale build artifacts — not running services.
# =============================================================================

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY-RUN mode — nothing will be deleted."
fi

run() {
  if $DRY_RUN; then
    echo "  [DRY-RUN] $*"
  else
    eval "$@"
  fi
}

section() { echo; echo "━━━ $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }

# Check for Docker once — all Docker sections are skipped if not installed.
if command -v docker &>/dev/null; then
  DOCKER_AVAILABLE=true
else
  DOCKER_AVAILABLE=false
  echo
  echo "⚠️  Docker not found on this host."
  echo "   Docker sections will be SKIPPED."
  echo "   To install Docker, run:"
  echo "     curl -fsSL https://get.docker.com | sudo sh"
  echo "     sudo usermod -aG docker ubuntu && newgrp docker"
  echo
fi

# ─────────────────────────────────────────────────────────────────────────────
section "📊 BEFORE — Disk & Memory"
# ─────────────────────────────────────────────────────────────────────────────
df -h /
echo
free -h

# ─────────────────────────────────────────────────────────────────────────────
section "🐳 Docker — Stopped containers"
# ─────────────────────────────────────────────────────────────────────────────
if ! $DOCKER_AVAILABLE; then echo "  [SKIP] Docker not installed."
else
echo "Stopped containers:"
docker ps -a --filter "status=exited" --format "  {{.Names}} ({{.Image}}) — stopped {{.RunningFor}}"
run docker container prune -f
fi

# ─────────────────────────────────────────────────────────────────────────────
section "🐳 Docker — Dangling images (untagged build layers)"
# ─────────────────────────────────────────────────────────────────────────────
if ! $DOCKER_AVAILABLE; then echo "  [SKIP] Docker not installed."
else
echo "Dangling images:"
docker images -f "dangling=true" --format "  {{.Repository}}:{{.Tag}} ({{.Size}})"
run docker image prune -f
fi

# ─────────────────────────────────────────────────────────────────────────────
section "🐳 Docker — Old sidequest-* image versions (keep latest 2 per image)"
# ─────────────────────────────────────────────────────────────────────────────
# Keeps the 2 most recent tags for sidequest-backend and sidequest-frontend,
# removes older build-numbered tags to prevent disk accumulation.
if ! $DOCKER_AVAILABLE; then echo "  [SKIP] Docker not installed."
else
for IMAGE in sidequest-backend sidequest-frontend; do
  echo "Processing $IMAGE ..."
  OLD_TAGS=$(docker images "$IMAGE" --format "{{.Tag}}" | sort -rn | tail -n +3)
  if [[ -z "$OLD_TAGS" ]]; then
    echo "  No old tags to remove for $IMAGE."
  else
    for TAG in $OLD_TAGS; do
      echo "  Removing $IMAGE:$TAG"
      run docker rmi "$IMAGE:$TAG" || true
    done
  fi
done

# Also clean old aditya0l0/* images from Docker Hub pulls
for IMAGE in aditya0l0/sidequest-backend aditya0l0/sidequest-frontend; do
  OLD_TAGS=$(docker images "$IMAGE" --format "{{.Tag}}" | sort -rn | tail -n +3)
  if [[ -n "$OLD_TAGS" ]]; then
    for TAG in $OLD_TAGS; do
      echo "  Removing $IMAGE:$TAG"
      run docker rmi "$IMAGE:$TAG" || true
    done
  fi
done
fi  # DOCKER_AVAILABLE

# ─────────────────────────────────────────────────────────────────────────────
section "🐳 Docker — Unused volumes"
# ─────────────────────────────────────────────────────────────────────────────
if ! $DOCKER_AVAILABLE; then echo "  [SKIP] Docker not installed."
else
echo "Unused volumes:"
docker volume ls -f "dangling=true" --format "  {{.Name}}"
run docker volume prune -f
fi

# ─────────────────────────────────────────────────────────────────────────────
section "🐳 Docker — Build cache"
# ─────────────────────────────────────────────────────────────────────────────
if ! $DOCKER_AVAILABLE; then echo "  [SKIP] Docker not installed."
else
echo "Clearing Docker build cache..."
run docker builder prune -f
fi

# ─────────────────────────────────────────────────────────────────────────────
section "📜 System logs (journald)"
# ─────────────────────────────────────────────────────────────────────────────
echo "Current journal size:"
journalctl --disk-usage
echo "Vacuuming logs older than 3 days..."
run sudo journalctl --vacuum-time=3d

# ─────────────────────────────────────────────────────────────────────────────
section "📦 APT — Package cache"
# ─────────────────────────────────────────────────────────────────────────────
echo "APT cache size:"
du -sh /var/cache/apt/archives/ 2>/dev/null || echo "  (not applicable)"
run sudo apt-get clean -y
run sudo apt-get autoremove -y --purge

# ─────────────────────────────────────────────────────────────────────────────
section "🔩 Snap — Disabled revisions"
# ─────────────────────────────────────────────────────────────────────────────
echo "Disabled snap revisions:"
snap list --all | awk '/disabled/{print $1, $3}'
if ! $DRY_RUN; then
  snap list --all | awk '/disabled/{print $1, $3}' | while read -r name rev; do
    sudo snap remove "$name" --revision="$rev" || true
  done
fi

# ─────────────────────────────────────────────────────────────────────────────
section "🗑️  Temp files & npm cache"
# ─────────────────────────────────────────────────────────────────────────────
echo "Clearing /tmp files older than 1 day..."
run sudo find /tmp -maxdepth 1 -mtime +1 -exec rm -rf {} + || true

echo "Maven local repo size (if present):"
du -sh ~/.m2/repository 2>/dev/null || echo "  ~/.m2 not found"
echo "  (Skipping Maven cache — needed for incremental builds. Delete manually if critical.)"

echo "npm cache size (if present):"
du -sh ~/.npm 2>/dev/null || echo "  ~/.npm not found"
echo "  Cleaning npm cache..."
run npm cache clean --force 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
section "💾 Swap — Check & create if missing (free-tier t2.micro has no swap)"
# ─────────────────────────────────────────────────────────────────────────────
SWAP_TOTAL=$(free -m | awk '/^Swap:/ {print $2}')
if [[ "$SWAP_TOTAL" -eq 0 ]]; then
  echo "⚠️  No swap detected — creating 1GB swapfile (recommended for t2.micro deployments)..."
  if ! $DRY_RUN; then
    if [[ ! -f /swapfile ]]; then
      sudo fallocate -l 1G /swapfile
      sudo chmod 600 /swapfile
      sudo mkswap /swapfile
      sudo swapon /swapfile
      grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
      echo "✅ Swapfile created and enabled."
    else
      sudo swapon /swapfile 2>/dev/null || echo "  Swapfile already exists and may already be active."
    fi
  else
    echo "  [DRY-RUN] Would create /swapfile (1GB) and add to /etc/fstab"
  fi
else
  echo "✅ Swap already configured: ${SWAP_TOTAL}MB"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "📊 AFTER — Disk & Memory"
# ─────────────────────────────────────────────────────────────────────────────
df -h /
echo
free -h
echo
if $DOCKER_AVAILABLE; then
  echo "Docker disk usage summary:"
  docker system df
else
  echo "⚠️  Docker not installed — install it before deploying:"
  echo "     curl -fsSL https://get.docker.com | sudo sh"
  echo "     sudo usermod -aG docker ubuntu && newgrp docker"
fi

echo
echo "✅ Cleanup complete."
