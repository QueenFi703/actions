// Credits: QueenFi703
/**
 * thresh/app/server.ts
 *
 * Probot-based webhook server.  Deploy this on Railway, Fly.io, or Vercel to
 * receive real-time GitHub events across all repositories where the Thresh
 * GitHub App is installed.
 *
 * Required environment variables:
 *   APP_ID          – GitHub App numeric ID
 *   PRIVATE_KEY     – GitHub App RSA private key (PEM, with literal \n)
 *   WEBHOOK_SECRET  – Secret configured on the GitHub App webhook settings
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

const probot = createProbot({
  overrides: {
    appId: process.env.APP_ID!,
    privateKey: (process.env.PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    secret: process.env.WEBHOOK_SECRET,
  },
});

app.use(createNodeMiddleware(threshApp, { probot }));

const PORT = parseInt(process.env.PORT ?? "3000", 10);
app.listen(PORT, () => {
  console.log(`🔥 Thresh App running on port ${PORT}`);
});
