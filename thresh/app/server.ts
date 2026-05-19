// Credits: QueenFi703
/**
 * thresh/app/server.ts
 *
 * Probot-based webhook server. Deploy this on Railway, Fly.io, or Vercel to
 * receive real-time GitHub events across all repositories where the Thresh
 * GitHub App is installed.
 */
import express from "express";
import { createNodeMiddleware, createProbot } from "probot";
import type { ApplicationFunction, Context } from "probot";
import { agent } from "../agent/index.js";
import type { AgentContext } from "../agent/index.js";

const app = express();

/**
 * Cast a Probot context to our AgentContext interface.
 *
 * Probot's Context already satisfies the structural requirements; the cast
 * lets TypeScript verify that our agent only uses a documented subset of it.
 */
function asAgentCtx(ctx: Context): AgentContext {
  return ctx as unknown as AgentContext;
}

/** Thresh application function — wires GitHub events to agent handlers. */
const threshApp: ApplicationFunction = (probotApp) => {
  probotApp.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async (ctx) => {
      await agent.handlePullRequest(asAgentCtx(ctx));
    }
  );

  probotApp.on("push", async (ctx) => {
    await agent.handlePush(asAgentCtx(ctx));
  });

  probotApp.on("workflow_run.completed", async (ctx) => {
    await agent.handleWorkflow(asAgentCtx(ctx));
  });
};

const appId = process.env.APP_ID;
const privateKey = process.env.PRIVATE_KEY;
const webhookSecret = process.env.WEBHOOK_SECRET;

if (!appId || !privateKey || !webhookSecret) {
  app.get("*", (_req, res) => {
    res.status(500).json({
      error: "Missing required environment variables.",
      required: ["APP_ID", "PRIVATE_KEY", "WEBHOOK_SECRET"],
    });
  });
} else {
  const probot = createProbot({
    overrides: {
      appId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      secret: webhookSecret,
    },
  });

  app.use(createNodeMiddleware(threshApp, { probot }));
}

const PORT = parseInt(process.env.PORT ?? "3000", 10);

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`🔥 Thresh App running on port ${PORT}`);
  });
}

export default app;
