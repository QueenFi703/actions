"""
DREDGE ORION :: DEPLOYMENT MESH
GitHub Webhook → Orion Gateway → Railway + Vercel

"The forge listens.
The gate deploys.
The mesh remembers."
"""

import hashlib
import hmac
import os
import time

import requests
from fastapi import FastAPI, Header, HTTPException, Request

app = FastAPI(title="DREDGE Orion Deploy Mesh")

# ─────────────────────────────────────────────
# ENV
# ─────────────────────────────────────────────

GITHUB_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")

VERCEL_DEPLOY_HOOK = os.getenv("VERCEL_DEPLOY_HOOK")
RAILWAY_DEPLOY_HOOK = os.getenv("RAILWAY_DEPLOY_HOOK")

# Optional telemetry endpoint
ORION_TELEMETRY = os.getenv("ORION_TELEMETRY")

# ─────────────────────────────────────────────
# VERIFY GITHUB SIGNATURE
# ─────────────────────────────────────────────


def verify_signature(payload: bytes, signature: str):
    expected = "sha256=" + hmac.new(
        GITHUB_SECRET.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")


# ─────────────────────────────────────────────
# TELEMETRY
# ─────────────────────────────────────────────


def emit(event_type: str, data: dict):
    if not ORION_TELEMETRY:
        return

    try:
        requests.post(
            ORION_TELEMETRY,
            json={
                "event": event_type,
                "timestamp": time.time(),
                "data": data,
            },
            timeout=5,
        )
    except Exception as e:
        print(f"[telemetry-error] {e}")


# ─────────────────────────────────────────────
# DEPLOY ROUTERS
# ─────────────────────────────────────────────


def deploy_vercel():
    response = requests.post(VERCEL_DEPLOY_HOOK, timeout=15)
    response.raise_for_status()
    return response.json()


def deploy_railway():
    response = requests.post(RAILWAY_DEPLOY_HOOK, timeout=15)
    response.raise_for_status()
    return response.json()


# ─────────────────────────────────────────────
# GITHUB WEBHOOK ENTRYPOINT
# ─────────────────────────────────────────────


@app.post("/webhooks/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None),
    x_github_event: str = Header(None),
):
    payload = await request.body()

    verify_signature(payload, x_hub_signature_256)

    body = await request.json()

    repo = body.get("repository", {}).get("full_name")
    branch = body.get("ref", "").replace("refs/heads/", "")

    print(f"[forge] repo={repo} branch={branch}")

    emit(
        "github.received",
        {
            "repo": repo,
            "branch": branch,
            "event": x_github_event,
        },
    )

    # ─────────────────────────────────────────
    # DEPLOY RULES
    # ─────────────────────────────────────────

    if x_github_event == "push" and branch == "main":
        vercel = deploy_vercel()
        railway = deploy_railway()

        emit(
            "deploy.completed",
            {
                "repo": repo,
                "vercel": vercel,
                "railway": railway,
            },
        )

        return {
            "status": "deployed",
            "repo": repo,
            "branch": branch,
            "targets": [
                "vercel",
                "railway",
            ],
        }

    return {
        "status": "ignored",
        "event": x_github_event,
    }


# ─────────────────────────────────────────────
# HEALTHCHECK
# ─────────────────────────────────────────────


@app.get("/health")
def health():
    return {
        "status": "alive",
        "mesh": "operational",
    }
