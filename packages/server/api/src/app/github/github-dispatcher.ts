import axios from 'axios'
import { FastifyBaseLogger } from 'fastify'

export interface GitHubDispatchConfig {
    token: string
    owner: string
    repo: string
    workflowFileName?: string
}

export const githubDispatcher = (log?: FastifyBaseLogger) => ({
    async dispatchFlow({
        config,
        flowId,
        inputPayload,
    }: {
        config: GitHubDispatchConfig
        flowId: string
        inputPayload?: Record<string, unknown>
    }): Promise<{ success: boolean; message: string }> {
        const workflowFile = config.workflowFileName ?? 'anticeil-runner.yml'
        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${workflowFile}/dispatches`

        try {
            log?.info({ flowId, url }, '[GitHubDispatcher] Dispatching workflow to GitHub Actions...')

            const response = await axios.post(
                url,
                {
                    ref: 'main',
                    inputs: {
                        flowId,
                        inputPayload: inputPayload ? JSON.stringify(inputPayload) : undefined,
                    },
                },
                {
                    headers: {
                        Accept: 'application/vnd.github.v3+json',
                        Authorization: `Bearer ${config.token}`,
                        'User-Agent': 'Anticeil-Flow-Serverless',
                    },
                },
            )

            if (response.status === 204 || response.status === 200) {
                log?.info({ flowId }, '[GitHubDispatcher] Workflow dispatched successfully to GitHub Actions')
                return { success: true, message: 'Workflow dispatched to GitHub Actions' }
            }

            return { success: false, message: `Unexpected status code: ${response.status}` }
        } catch (error: any) {
            const errDetail = error.response?.data?.message || error.message
            log?.error({ err: error, flowId }, `[GitHubDispatcher] Failed to dispatch workflow: ${errDetail}`)
            return { success: false, message: `GitHub Dispatch Error: ${errDetail}` }
        }
    },
})
