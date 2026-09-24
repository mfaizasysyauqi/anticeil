import { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { githubSyncService } from './github-sync.service'
import { githubDispatcher } from './github-dispatcher'
import { system } from '../helper/system/system'
import { AppSystemProp } from '../helper/system/system-props'
import { flowRunRepo, flowRunService } from '../flows/flow-run/flow-run-service'
import { FlowRunStatus } from '@activepieces/shared'
import { appConnectionService } from '../app-connection/app-connection-service/app-connection-service'
import { AppConnectionType, AppConnectionScope } from '@activepieces/shared'
import fs from 'node:fs/promises'
import path from 'node:path'

const GITHUB_CONNECTION_NAME = 'anticeil_github_runner'

export const githubController: FastifyPluginCallbackZod = (app, _opts, done) => {
    /**
     * Connect user's GitHub account with Personal Access Token (or OAuth token)
     * Automatically provisions private repo and sets up secrets + workflow file.
     */
    app.post(
        '/connect',
        {
            schema: {
                body: z.object({
                    token: z.string().min(10, 'GitHub Token is required'),
                    username: z.string().optional(),
                    repoName: z.string().optional().default('anticeil-workflows'),
                }),
            },
        },
        async (request, reply) => {
            const { token, repoName } = request.body
            const log = request.log

            try {
                // 1. Verify token by fetching user profile
                const axios = (await import('axios')).default
                const userRes = await axios.get('https://api.github.com/user', {
                    headers: {
                        Accept: 'application/vnd.github.v3+json',
                        Authorization: `Bearer ${token}`,
                        'User-Agent': 'Anticeil-Flow-Serverless',
                    },
                })
                const username = userRes.data.login

                // 2. Ensure repository exists on user's GitHub account
                const sync = githubSyncService(log)
                const repoResult = await sync.ensureUserRepo({ token, username, repoName })

                // 3. Set necessary repository secrets for Supabase & Callback
                const supabaseUrl = process.env.SUPABASE_URL || ''
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
                const apiUrl = system.get(AppSystemProp.FRONTEND_URL) || 'https://anticeil.com'

                if (supabaseUrl && supabaseKey) {
                    await sync.setRepoSecret({
                        token,
                        username,
                        repoName,
                        secretName: 'SUPABASE_URL',
                        secretValue: supabaseUrl,
                    })
                    await sync.setRepoSecret({
                        token,
                        username,
                        repoName,
                        secretName: 'SUPABASE_SERVICE_ROLE_KEY',
                        secretValue: supabaseKey,
                    })
                }

                await sync.setRepoSecret({
                    token,
                    username,
                    repoName,
                    secretName: 'ANTICEIL_CALLBACK_URL',
                    secretValue: `${apiUrl}/api/v1/github/callback`,
                })

                // 4. Deploy the default runner workflow to the user repo
                let runnerYaml = ''
                try {
                    runnerYaml = await fs.readFile(
                        path.resolve(process.cwd(), '.github/workflows/anticeil-runner.yml'),
                        'utf-8',
                    )
                } catch {
                    // Fallback to relative path if running from package root
                    runnerYaml = await fs.readFile(
                        path.resolve(__dirname, '../../../../../../.github/workflows/anticeil-runner.yml'),
                        'utf-8',
                    ).catch(() => '')
                }

                if (runnerYaml) {
                    await sync.upsertWorkflowFile({
                        token,
                        username,
                        repoName,
                        flowId: 'runner',
                        flowTitle: 'Anticeil Engine Runner',
                        yamlContent: runnerYaml,
                    })
                }

                // 5. Store connection securely in project connections
                if (request.projectId && request.principal?.platform?.id) {
                    const { securityHelper } = await import('../helper/security-helper')
                    const ownerId = await securityHelper.getUserIdFromRequest(request)
                    await appConnectionService(log).upsert({
                        platformId: request.principal.platform.id,
                        projectIds: [request.projectId],
                        externalId: GITHUB_CONNECTION_NAME,
                        displayName: `GitHub Runner (@${username})`,
                        pieceName: 'github',
                        pieceVersion: '1.0.0',
                        scope: AppConnectionScope.PROJECT,
                        type: AppConnectionType.CUSTOM_AUTH,
                        ownerId,
                        value: {
                            type: AppConnectionType.CUSTOM_AUTH,
                            props: {
                                token,
                                username,
                                repoName,
                                repoUrl: repoResult.repoUrl,
                            },
                        },
                    })
                }

                return reply.status(StatusCodes.OK).send({
                    success: true,
                    username,
                    repoName,
                    repoUrl: repoResult.repoUrl,
                    message: 'GitHub Serverless Runner successfully configured! (2,000 free minutes/mo active)',
                })
            } catch (err: any) {
                log.error({ err }, '[GitHubController] Connect failed')
                return reply.status(StatusCodes.BAD_REQUEST).send({
                    success: false,
                    message: err.response?.data?.message || err.message,
                })
            }
        },
    )

    /**
     * Get GitHub integration status for current project
     */
    app.get('/status', async (request, reply) => {
        const log = request.log
        if (!request.projectId || !request.principal?.platform?.id) {
            return reply.send({ connected: false })
        }

        try {
            const connection = await appConnectionService(log).getOne({
                projectId: request.projectId,
                platformId: request.principal.platform.id,
                externalId: GITHUB_CONNECTION_NAME,
            })
            if (!connection) {
                return reply.send({ connected: false })
            }
            const props = (connection.value as any)?.props || {}
            return reply.send({
                connected: true,
                username: props.username,
                repoName: props.repoName,
                repoUrl: props.repoUrl,
            })
        } catch {
            return reply.send({ connected: false })
        }
    })

    /**
     * Dispatch Flow execution to GitHub Actions runner
     */
    app.post(
        '/dispatch',
        {
            schema: {
                body: z.object({
                    flowId: z.string(),
                    runId: z.string().optional(),
                    inputPayload: z.record(z.unknown()).optional(),
                }),
            },
        },
        async (request, reply) => {
            const { flowId, runId, inputPayload } = request.body
            const log = request.log

            try {
                if (!request.projectId || !request.principal?.platform?.id) {
                    throw new Error('Project ID or Platform ID is missing')
                }
                const connection = await appConnectionService(log).getOne({
                    projectId: request.projectId,
                    platformId: request.principal.platform.id,
                    externalId: GITHUB_CONNECTION_NAME,
                })
                if (!connection) {
                    throw new Error('GitHub Runner is not connected for this project')
                }
                const { token, username, repoName } = (connection.value as any).props

                const dispatcher = githubDispatcher(log)
                const dispatchRes = await dispatcher.dispatchFlow({
                    config: {
                        token,
                        owner: username,
                        repo: repoName || 'anticeil-workflows',
                        workflowFileName: 'anticeil-flow-runner.yml',
                    },
                    flowId,
                    inputPayload: {
                        flowId,
                        flowRunId: runId,
                        ...inputPayload,
                    },
                })

                return reply.send(dispatchRes)
            } catch (err: any) {
                return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
                    success: false,
                    message: err.message,
                })
            }
        },
    )

    /**
     * Webhook Callback endpoint from GHA runner completion
     */
    app.post(
        '/callback',
        {
            schema: {
                body: z.object({
                    runId: z.string(),
                    projectId: z.string().optional(),
                    status: z.string(),
                    durationMs: z.number().optional(),
                    output: z.unknown().optional(),
                }),
            },
        },
        async (request, reply) => {
            const { runId, status, durationMs } = request.body
            const log = request.log

            log.info({ runId, status, durationMs }, '[GitHubController] Received execution callback from GitHub Runner')

            if (runId) {
                await flowRunRepo().update(
                    { id: runId },
                    {
                        status: status === 'OK' ? FlowRunStatus.SUCCEEDED : FlowRunStatus.FAILED,
                        finishTime: new Date().toISOString(),
                    },
                )
            }

            return reply.status(StatusCodes.OK).send({ received: true })
        },
    )

    done()
}
