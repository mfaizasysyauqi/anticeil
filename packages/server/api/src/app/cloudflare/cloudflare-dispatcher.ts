import axios from 'axios'
import { FastifyBaseLogger } from 'fastify'

export interface CloudflareDispatchConfig {
    accountId: string
    apiToken: string
    workflowName?: string
    workerUrl?: string
}

export const cloudflareDispatcher = (log?: FastifyBaseLogger) => ({
    /**
     * Dispatches a flow run to Cloudflare Workflows via REST API
     */
    async dispatchWorkflow({
        config,
        flowId,
        inputPayload,
    }: {
        config: CloudflareDispatchConfig
        flowId: string
        inputPayload?: Record<string, unknown>
    }): Promise<{ success: boolean; instanceId?: string; message: string }> {
        const workflowName = config.workflowName ?? 'anticeil-flow-engine'
        const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workflows/${workflowName}/instances`

        try {
            log?.info({ flowId, workflowName }, '[CloudflareDispatcher] Dispatching flow to Cloudflare Workflows...')

            const response = await axios.post(
                url,
                {
                    params: {
                        flowId,
                        inputPayload: inputPayload ?? {},
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${config.apiToken}`,
                    },
                },
            )

            if (response.status === 200 || response.status === 201) {
                const instanceId = response.data?.result?.id
                log?.info({ flowId, instanceId }, '[CloudflareDispatcher] Workflow successfully triggered on Cloudflare')
                return {
                    success: true,
                    instanceId,
                    message: 'Flow successfully dispatched to Cloudflare Workflows',
                }
            }

            return { success: false, message: `Unexpected status code: ${response.status}` }
        } catch (error: any) {
            const errDetail = error.response?.data?.errors?.[0]?.message || error.message
            log?.error({ err: error, flowId }, `[CloudflareDispatcher] Failed to dispatch workflow: ${errDetail}`)
            return { success: false, message: `Cloudflare Dispatch Error: ${errDetail}` }
        }
    },

    /**
     * Triggers a Cloudflare Worker directly via HTTP POST
     */
    async dispatchWorker({
        workerUrl,
        flowId,
        inputPayload,
    }: {
        workerUrl: string
        flowId: string
        inputPayload?: Record<string, unknown>
    }): Promise<{ success: boolean; message: string }> {
        try {
            log?.info({ flowId, workerUrl }, '[CloudflareDispatcher] Triggering Cloudflare Worker endpoint...')

            const response = await axios.post(
                workerUrl,
                {
                    flowId,
                    inputPayload: inputPayload ?? {},
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            )

            if (response.status >= 200 && response.status < 300) {
                return { success: true, message: 'Worker triggered successfully' }
            }

            return { success: false, message: `Worker returned status ${response.status}` }
        } catch (error: any) {
            const errDetail = error.response?.data?.message || error.message
            log?.error({ err: error, flowId }, `[CloudflareDispatcher] Failed to call Worker: ${errDetail}`)
            return { success: false, message: `Worker Call Error: ${errDetail}` }
        }
    },
})
