import fs from 'node:fs/promises'
import path from 'node:path'
import { EngineOperation, EngineOperationType, EngineResponseStatus, FlowRunStatus } from '@activepieces/shared'
import { execute } from './lib/operations'
import { ssrfGuard } from './lib/network/ssrf-guard'

// Install network protections
ssrfGuard.install()

interface SupabaseSyncConfig {
    supabaseUrl?: string
    supabaseServiceRoleKey?: string
    callbackUrl?: string
    callbackToken?: string
}

async function reportToSupabase(
    config: SupabaseSyncConfig,
    operation: any,
    result: any,
    startTime: number,
) {
    const { supabaseUrl, supabaseServiceRoleKey, callbackUrl, callbackToken } = config
    const runId = operation.flowRunId || operation.runId
    const projectId = operation.projectId

    // 1. Direct Supabase PostgREST Sync
    if (supabaseUrl && supabaseServiceRoleKey && runId) {
        try {
            console.log(`[Anticeil GHA Engine] Syncing execution results to Supabase (${supabaseUrl})...`)
            
            const isSuccess = result.status === EngineResponseStatus.OK
            const status = isSuccess ? FlowRunStatus.SUCCEEDED : FlowRunStatus.FAILED
            const finishTime = new Date().toISOString()
            const logsFileId = operation.logsFileId || `log_${runId}`

            // A. Save logs to `file` table if Supabase database is used
            const logData = Buffer.from(JSON.stringify(result)).toString('utf-8')
            const filePayload = {
                id: logsFileId,
                projectId,
                type: 'FLOW_RUN_LOG',
                data: logData,
                location: 'DB',
                compression: 'NONE',
                size: logData.length,
                created: finishTime,
                updated: finishTime,
            }

            await fetch(`${supabaseUrl}/rest/v1/file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceRoleKey,
                    'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                    'Prefer': 'resolution=merge-duplicates',
                },
                body: JSON.stringify(filePayload),
            }).catch(e => console.warn('[Anticeil GHA Engine] Warning: Failed to upsert file logs:', e))

            // B. Update `flow_run` table
            const updatePayload: Record<string, unknown> = {
                status,
                finishTime,
                logsFileId,
            }

            if (!isSuccess && result.error) {
                updatePayload.failedStep = {
                    message: result.error.message || String(result.error),
                }
            }

            const patchRes = await fetch(`${supabaseUrl}/rest/v1/flow_run?id=eq.${runId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceRoleKey,
                    'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify(updatePayload),
            })

            if (patchRes.ok) {
                console.log(`[Anticeil GHA Engine] Successfully updated flow_run ${runId} to ${status} in Supabase`)
            } else {
                console.warn(`[Anticeil GHA Engine] Supabase flow_run update returned status: ${patchRes.status}`)
            }
        } catch (err) {
            console.error('[Anticeil GHA Engine] Error updating Supabase:', err)
        }
    }

    // 2. Callback Webhook Sync (optional if API server is reachable)
    if (callbackUrl && runId) {
        try {
            console.log(`[Anticeil GHA Engine] Sending webhook callback to ${callbackUrl}...`)
            await fetch(callbackUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(callbackToken ? { 'Authorization': `Bearer ${callbackToken}` } : {}),
                },
                body: JSON.stringify({
                    runId,
                    projectId,
                    status: result.status,
                    durationMs: Date.now() - startTime,
                    output: result,
                }),
            })
            console.log('[Anticeil GHA Engine] Webhook callback delivered')
        } catch (err) {
            console.warn('[Anticeil GHA Engine] Warning: Webhook callback failed:', err)
        }
    }
}

async function main() {
    const args = process.argv.slice(2)
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Anticeil — Activepieces Serverless Engine Runner

Usage:
  npx tsx packages/server/engine/src/cli.ts [options]

Options:
  -i, --input <path>      Path to input JSON payload (default: ./input.json)
  -o, --output <path>     Path to output JSON result (default: ./output.json)
  -t, --type <type>       Engine operation type (default: EXECUTE_FLOW)
  -h, --help              Show this help message

Environment Variables:
  AP_ENGINE_INPUT         JSON string to use instead of reading from file
  AP_BASE_CODE_DIRECTORY  Directory for custom pieces (default: ./codes)
  SUPABASE_URL            Supabase project REST URL
  SUPABASE_SERVICE_ROLE_KEY Supabase service role key for direct DB updates
  ANTICEIL_CALLBACK_URL   Webhook callback URL upon completion
`)
        process.exit(0)
    }

    let inputPath = './input.json'
    let outputPath = './output.json'
    let operationType = EngineOperationType.EXECUTE_FLOW

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--input' || args[i] === '-i') {
            inputPath = args[++i]
        } else if (args[i] === '--output' || args[i] === '-o') {
            outputPath = args[++i]
        } else if (args[i] === '--type' || args[i] === '-t') {
            operationType = args[++i] as EngineOperationType
        }
    }

    console.log(`[Anticeil GHA Engine] Reading input from: ${inputPath}`)
    
    let rawInput: string
    if (process.env.AP_ENGINE_INPUT) {
        rawInput = process.env.AP_ENGINE_INPUT
    } else {
        try {
            rawInput = await fs.readFile(path.resolve(inputPath), 'utf-8')
        } catch {
            console.error(`[Anticeil GHA Engine] Could not read input file at ${inputPath}. Use --help for usage.`)
            process.exit(1)
        }
    }

    const operation = JSON.parse(rawInput) as EngineOperation
    console.log(`[Anticeil GHA Engine] Executing operation: ${operationType}...`)

    const startTime = Date.now()
    const result = await execute(operationType, operation)
    const duration = Date.now() - startTime

    console.log(`[Anticeil GHA Engine] Execution finished in ${duration}ms with status: ${result.status}`)

    if (outputPath) {
        await fs.writeFile(path.resolve(outputPath), JSON.stringify(result, null, 2), 'utf-8')
        console.log(`[Anticeil GHA Engine] Output written to: ${outputPath}`)
    }

    // Sync to Supabase & Webhook
    await reportToSupabase(
        {
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            callbackUrl: process.env.ANTICEIL_CALLBACK_URL,
            callbackToken: process.env.ANTICEIL_CALLBACK_TOKEN,
        },
        operation,
        result,
        startTime,
    )

    if (result.status !== EngineResponseStatus.OK) {
        console.error(`[Anticeil GHA Engine] Execution failed with status: ${result.status}`, result.error)
        process.exit(1)
    }

    process.exit(0)
}

main().catch((err) => {
    console.error('[Anticeil GHA Engine] Fatal error:', err)
    process.exit(1)
})
