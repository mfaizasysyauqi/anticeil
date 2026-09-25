import { Env, FlowRunPayload } from '../types';
import { SupabaseService } from '../services/supabase-service';
import { BrowserService } from '../services/browser-service';

export interface WorkflowEvent<T> {
  payload: T;
}

export interface WorkflowStep {
  do: <R>(name: string, callback: () => Promise<R>) => Promise<R>;
  sleep: (name: string, duration: string | number) => Promise<void>;
}

export class AnticeilFlowWorkflow {
  ctx: any;
  env: Env;

  constructor(ctx: any, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  async run(event: WorkflowEvent<FlowRunPayload>, step: WorkflowStep) {
    const { flowId, flowRunId, steps, initialTriggerPayload } = event.payload;
    const supabase = new SupabaseService(this.env);
    const browser = new BrowserService(this.env);

    const startTime = Date.now();
    const executionContext: Record<string, unknown> = {
      trigger: initialTriggerPayload ?? {},
      steps: {},
    };

    // 1. Update Status to 'running'
    await step.do('init-run-status', async () => {
      await supabase.updateRunStatus({
        flowRunId,
        status: 'running',
      });
    });

    try {
      // 2. Iterate through each step in the flow durably
      for (const currentStep of steps) {
        const stepResult = await step.do(`step-${currentStep.id}`, async () => {
          console.log(`[Workflow] Executing step ${currentStep.name} (${currentStep.type})...`);

          // Notify Supabase Realtime which step is currently active
          await supabase.updateRunStatus({
            flowRunId,
            status: 'running',
            currentStepId: currentStep.id,
          });

          // Execute based on Step Type
          switch (currentStep.type) {
            case 'BROWSER_SCRAPE': {
              const url = (currentStep.settings?.url as string) || 'https://example.com';
              return await browser.scrapeUrl({
                url,
                extractSelector: currentStep.settings?.extractSelector as string,
                screenshot: Boolean(currentStep.settings?.screenshot),
              });
            }

            case 'HTTP': {
              const res = await fetch((currentStep.settings?.url as string) || '', {
                method: (currentStep.settings?.method as string) || 'GET',
                headers: (currentStep.settings?.headers as Record<string, string>) || {},
                body: currentStep.settings?.body ? JSON.stringify(currentStep.settings?.body) : undefined,
              });
              const json = await res.json().catch(() => ({ status: res.status }));
              return json;
            }

            case 'AI_GROQ': {
              const apiKey = currentStep.settings?.apiKey as string;
              const prompt = currentStep.settings?.prompt as string;
              const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: 'llama-3.3-70b-versatile',
                  messages: [{ role: 'user', content: prompt }],
                }),
              });
              return await res.json();
            }

            default:
              return { success: true, message: `Executed ${currentStep.name}` };
          }
        });

        // Store step output for downstream nodes
        (executionContext.steps as Record<string, unknown>)[currentStep.id] = stepResult;
      }

      // 3. Mark Run as 'success'
      const durationMs = Date.now() - startTime;
      await step.do('complete-run-success', async () => {
        await supabase.updateRunStatus({
          flowRunId,
          status: 'success',
          durationMs,
          logsSummary: executionContext,
        });
      });
    } catch (err: any) {
      // 4. Mark Run as 'failed' if any unhandled error occurs
      const durationMs = Date.now() - startTime;
      await step.do('handle-run-failure', async () => {
        await supabase.updateRunStatus({
          flowRunId,
          status: 'failed',
          durationMs,
          logsSummary: {
            error: err.message || String(err),
            partialContext: executionContext,
          },
        });
      });
      throw err;
    }
  }
}
