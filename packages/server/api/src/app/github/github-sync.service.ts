import axios from 'axios'
import { FastifyBaseLogger } from 'fastify'

export interface GitHubUserSyncConfig {
    token: string
    username: string
    repoName?: string
}

export const githubSyncService = (log?: FastifyBaseLogger) => ({
    /**
     * Memastikan repository private `anticeil-workflows` sudah ada di akun GitHub user.
     * Jika belum ada, otomatis dibuatkan.
     */
    async ensureUserRepo({ token, username, repoName = 'anticeil-workflows' }: GitHubUserSyncConfig): Promise<{ success: boolean; repoUrl: string }> {
        const headers = {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Anticeil-Flow-Serverless',
        }

        try {
            // Check if repo exists
            await axios.get(`https://api.github.com/repos/${username}/${repoName}`, { headers })
            log?.info({ username, repoName }, '[GitHubSync] Repo already exists')
            return { success: true, repoUrl: `https://github.com/${username}/${repoName}` }
        } catch (err: any) {
            if (err.response?.status === 404) {
                // Create private repo on user account
                log?.info({ username, repoName }, '[GitHubSync] Creating private repo for user...')
                const res = await axios.post(
                    'https://api.github.com/user/repos',
                    {
                        name: repoName,
                        private: true,
                        description: 'Anticeil Serverless Workflows (2,000 free minutes/mo)',
                        auto_init: true,
                    },
                    { headers },
                )
                return { success: true, repoUrl: res.data.html_url }
            }
            throw err
        }
    },

    /**
     * Men-deploy file workflow GitHub Actions (.github/workflows/anticeil-flow-[id].yml)
     * ke repository akun user.
     */
    async upsertWorkflowFile({
        token,
        username,
        repoName = 'anticeil-workflows',
        flowId,
        flowTitle,
        yamlContent,
    }: {
        token: string
        username: string
        repoName?: string
        flowId: string
        flowTitle: string
        yamlContent: string
    }): Promise<{ success: boolean; sha?: string }> {
        const headers = {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Anticeil-Flow-Serverless',
        }

        const path = `.github/workflows/anticeil-flow-${flowId}.yml`
        const message = `chore(anticeil): deploy workflow "${flowTitle}" [skip ci]`
        const content = Buffer.from(yamlContent).toString('base64')

        let existingSha: string | undefined
        try {
            const getRes = await axios.get(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, { headers })
            existingSha = getRes.data.sha
        } catch {
            // File doesn't exist yet
        }

        const res = await axios.put(
            `https://api.github.com/repos/${username}/${repoName}/contents/${path}`,
            {
                message,
                content,
                ...(existingSha ? { sha: existingSha } : {}),
            },
            { headers },
        )

        log?.info({ username, path, status: res.status }, '[GitHubSync] Workflow file deployed to user repo')
        return { success: true, sha: res.data.content?.sha }
    },

    /**
     * Menyimpan GitHub Secrets secara terenkripsi (libsodium) langsung di repo user.
     */
    async setRepoSecret({
        token,
        username,
        repoName = 'anticeil-workflows',
        secretName,
        secretValue,
    }: {
        token: string
        username: string
        repoName?: string
        secretName: string
        secretValue: string
    }): Promise<{ success: boolean }> {
        const headers = {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Anticeil-Flow-Serverless',
        }

        // 1. Get repository public key
        const keyRes = await axios.get(`https://api.github.com/repos/${username}/${repoName}/actions/secrets/public-key`, { headers })
        const { key: publicKeyBase64, key_id: keyId } = keyRes.data

        // 2. Encrypt secret using tweetsodium
        const sodium = await import('tweetsodium').then((m: any) => m.default || m)
        const keyBytes = Buffer.from(publicKeyBase64, 'base64')
        const messageBytes = Buffer.from(secretValue)
        const encryptedBytes = sodium.seal(messageBytes, keyBytes)
        const encryptedBase64 = Buffer.from(encryptedBytes).toString('base64')

        // 3. Put encrypted secret
        await axios.put(
            `https://api.github.com/repos/${username}/${repoName}/actions/secrets/${secretName}`,
            {
                encrypted_value: encryptedBase64,
                key_id: keyId,
            },
            { headers },
        )

        log?.info({ username, secretName }, '[GitHubSync] Secret successfully encrypted and stored in user repo')
        return { success: true }
    },
})
