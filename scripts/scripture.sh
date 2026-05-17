#!/usr/bin/env bash
# =========================================================
# DREDGE :: SCRIPTURE FUNNEL
# "The net gathers before the harvest."
# Layered funnel: capture + onboarding + retention + billing
# =========================================================

set -euo pipefail

DREDGE_VERSION="${DREDGE_VERSION:-0.1.0}"
DREDGE_API="${DREDGE_API:-https://api.oriongateway.io}"
DREDGE_REPO="${DREDGE_REPO:-QueenFi703/DREDGE-Cli}"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
SESSION_ID="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid || echo "unknown")"
NOW_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# ---------------------------------------------------------
# CORE HTTP EMITTER
# ---------------------------------------------------------
post_json() {
  local endpoint="$1"
  local body="$2"

  curl -fsSL \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$body" \
    "$DREDGE_API/$endpoint" \
    >/dev/null 2>&1 || true
}

base_payload() {
  cat <<JSON
{"session_id":"$SESSION_ID","repo":"$DREDGE_REPO","version":"$DREDGE_VERSION","os":"$OS","arch":"$ARCH","timestamp":"$NOW_UTC"}
JSON
}

# ---------------------------------------------------------
# [CREATE] CAPTURE LAYER
# ---------------------------------------------------------
capture_layer() {
  echo "→ [capture] Emitting install telemetry..."
  post_json "v1/install" "$(base_payload)"

  post_json "v1/capture/session-start" "$(base_payload)"
}

# ---------------------------------------------------------
# [CREATE] ONBOARDING LAYER
# ---------------------------------------------------------
onboarding_layer() {
  echo ""
  echo "Choose your role:"
  echo ""
  echo "  [1] Forge     → Builder"
  echo "  [2] Sentinel  → Security"
  echo "  [3] Oracle    → Analysis"
  echo "  [4] Gate      → Infrastructure"
  echo "  [5] Replay    → Audit"
  echo ""

  read -rp "Role Selection: " ROLE_INPUT

  case "$ROLE_INPUT" in
    1) ROLE="forge" ;;
    2) ROLE="sentinel" ;;
    3) ROLE="oracle" ;;
    4) ROLE="gate" ;;
    5) ROLE="replay" ;;
    *) ROLE="forge" ;;
  esac

  echo ""
  echo "→ [onboarding] Claimed role: $ROLE"

  post_json "v1/claim-role" "{\"session_id\":\"$SESSION_ID\",\"role\":\"$ROLE\",\"timestamp\":\"$NOW_UTC\"}"

  echo ""
  echo "Activate cloud orchestration?"
  echo ""
  echo "  [y] Connect to Orion"
  echo "  [n] Local-only mode"
  echo ""

  read -rp "Selection: " ACTIVATE

  if [[ "$ACTIVATE" == "y" || "$ACTIVATE" == "Y" ]]; then
    CLAIM_URL="$DREDGE_API/claim/$SESSION_ID"

    echo ""
    echo "→ [onboarding] Provisioning tenant..."

    post_json "v1/provision" "{\"session_id\":\"$SESSION_ID\",\"role\":\"$ROLE\",\"timestamp\":\"$NOW_UTC\"}"

    echo ""
    echo "Claim URL: $CLAIM_URL"
    ACTIVATED="true"
  else
    echo ""
    echo "→ [onboarding] Running in local mode."
    ACTIVATED="false"
  fi
}

# ---------------------------------------------------------
# [CREATE] RETENTION LAYER
# ---------------------------------------------------------
retention_layer() {
  echo ""
  echo "Subscribe to release channel?"
  echo ""

  read -rp "Email (optional): " EMAIL

  if [[ -n "${EMAIL:-}" ]]; then
    post_json "v1/subscribe" "{\"session_id\":\"$SESSION_ID\",\"email\":\"$EMAIL\",\"role\":\"$ROLE\",\"timestamp\":\"$NOW_UTC\"}"
    echo "→ [retention] Added to release covenant."
    RETAINED="true"
  else
    RETAINED="false"
  fi
}

# ---------------------------------------------------------
# [CREATE] BILLING LAYER
# ---------------------------------------------------------
billing_layer() {
  # Billing intent event allows server-side pricing/trial funnels.
  post_json "v1/billing/intent" "{\"session_id\":\"$SESSION_ID\",\"activated\":$ACTIVATED,\"retained\":$RETAINED,\"role\":\"$ROLE\",\"timestamp\":\"$NOW_UTC\"}"

  # Existing completion endpoint for full funnel attribution.
  post_json "v1/funnel-complete" "{\"session_id\":\"$SESSION_ID\",\"completed\":true,\"activated\":$ACTIVATED,\"retained\":$RETAINED,\"timestamp\":\"$NOW_UTC\"}"
}

banner() {
  echo ""
  echo "═══════════════════════════════════════════════"
  echo "        D R E D G E   A W A K E N S"
  echo "═══════════════════════════════════════════════"
  echo ""
}

finish() {
  echo ""
  echo "═══════════════════════════════════════════════"
  echo " The gate remembers who walked through it."
  echo "═══════════════════════════════════════════════"
  echo ""
}

main() {
  banner
  capture_layer
  onboarding_layer
  retention_layer
  billing_layer
  finish
}

main "$@"
