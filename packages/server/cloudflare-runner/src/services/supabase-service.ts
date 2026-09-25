import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Env } from '../types';

export class SupabaseService {
  private client: SupabaseClient;

  constructor(env: Env) {
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async updateRunStatus({
    flowRunId,
    status,
    currentStepId,
    logsSummary,
    durationMs,
  }: {
    flowRunId: string;
    status: 'queued' | 'running' | 'success' | 'failed';
    currentStepId?: string;
    logsSummary?: Record<string, unknown>;
    durationMs?: number;
  }) {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (currentStepId) updateData.current_step_id = currentStepId;
    if (logsSummary) updateData.logs_summary = logsSummary;
    if (durationMs) updateData.duration_ms = durationMs;

    const { error } = await this.client
      .from('flow_runs')
      .update(updateData)
      .eq('id', flowRunId);

    if (error) {
      console.error('[SupabaseService] Failed to update flow_runs:', error);
    }
  }

  async getFlowDefinition(flowId: string) {
    const { data, error } = await this.client
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (error) {
      console.error('[SupabaseService] Failed to fetch flow:', error);
      return null;
    }
    return data;
  }
}
