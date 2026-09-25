import { Env, FlowRunPayload } from './types';
import { AnticeilFlowWorkflow } from './workflows/flow-workflow';

export { AnticeilFlowWorkflow };

export default {
  /**
   * HTTP Gateway Handler for manual runs and webhooks
   */
  async fetch(request: Request, env: Env, ctx?: unknown): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(
        JSON.stringify({ status: 'ok', service: 'anticeil-cloudflare-runner' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Trigger Flow Run via Cloudflare Workflows
    if (url.pathname === '/api/v1/runs/dispatch' && request.method === 'POST') {
      try {
        const payload = (await request.json()) as FlowRunPayload;

        if (!payload.flowId || !payload.flowRunId) {
          return new Response(
            JSON.stringify({ error: 'Missing flowId or flowRunId in payload' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }

        // Create a new durable workflow instance
        const instance = await env.FLOW_WORKFLOW.create({
          id: `run-${payload.flowRunId}`,
          params: payload,
        });

        return new Response(
          JSON.stringify({
            success: true,
            instanceId: instance.id,
            message: 'Workflow successfully dispatched to Cloudflare Workflows',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || 'Failed to dispatch workflow' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  },

  /**
   * Scheduled Handler (Cron Trigger for recurring flows)
   */
  async scheduled(event: { cron: string }, env: Env, ctx?: unknown): Promise<void> {
    console.log(`[Cron Trigger] Running scheduled flow check at ${event.cron}`);
  },
};
