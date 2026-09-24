import { exec as execCallback, execSync, spawn } from 'node:child_process'
import type { SpawnOptions } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import treeKill from 'tree-kill'

export const execPromise = promisify(execCallback)

let cachedBunPath: string | null = null

export function getBunExecutable(): string {
    if (cachedBunPath) {
        return cachedBunPath
    }

    if (process.env['AP_BUN_PATH'] && fs.existsSync(process.env['AP_BUN_PATH'])) {
        cachedBunPath = process.env['AP_BUN_PATH']
        return cachedBunPath
    }

    if (process.platform !== 'win32') {
        cachedBunPath = 'bun'
        return cachedBunPath
    }

    // Windows resolution:
    // 1. Check ~/.bun/bin/bun.exe
    const userProfile = process.env['USERPROFILE'] ?? process.env['HOME'] ?? ''
    const defaultBunPath = path.join(userProfile, '.bun', 'bin', 'bun.exe')
    if (fs.existsSync(defaultBunPath)) {
        cachedBunPath = defaultBunPath
        return cachedBunPath
    }

    // 2. Check npm global: %APPDATA%\npm\node_modules\bun\bin\bun.exe
    const appData = process.env['APPDATA'] ?? ''
    const npmBunPath = path.join(appData, 'npm', 'node_modules', 'bun', 'bin', 'bun.exe')
    if (fs.existsSync(npmBunPath)) {
        cachedBunPath = npmBunPath
        return cachedBunPath
    }

    // 3. Search in PATH via where.exe
    try {
        const output = execSync('where.exe bun', { encoding: 'utf-8' })
        const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        for (const line of lines) {
            if (line.toLowerCase().endsWith('.exe') && fs.existsSync(line)) {
                cachedBunPath = line
                return cachedBunPath
            }
            const candidate = path.join(path.dirname(line), 'node_modules', 'bun', 'bin', 'bun.exe')
            if (fs.existsSync(candidate)) {
                cachedBunPath = candidate
                return cachedBunPath
            }
        }
    }
    catch {
        // ignore
    }

    cachedBunPath = 'bun'
    return cachedBunPath
}

export async function spawnWithKill({
    cmd,
    args: explicitArgs,
    options = {},
    printOutput,
    timeoutMs,
}: SpawnWithKillParams): Promise<CommandOutput> {

    return new Promise((resolve, reject) => {
        // When explicit args are provided, skip shell splitting and disable shell
        // to prevent command injection via user-controlled path components.
        const [command, ...splitArgs] = explicitArgs === undefined ? cmd.split(' ') : [cmd]
        const args = explicitArgs ?? splitArgs
        const resolvedCommand = command === 'bun' ? getBunExecutable() : command
        const cp = spawn(resolvedCommand, args, {
            detached: true,
            shell: explicitArgs === undefined,
            ...options,
        })

        let stdout = ''
        let stderr = ''

        if (cp.stdout) {
            cp.stdout.on('data', data => {
                if (printOutput) process.stdout.write(data)
                stdout += data
            })
        }

        if (cp.stderr) {
            cp.stderr.on('data', data => {
                if (printOutput) process.stderr.write(data)
                stderr += data
            })
        }

        let finished = false
        let timeoutHandler: NodeJS.Timeout | undefined

        const finish = (err?: Error | null) => {
            if (finished) return
            finished = true

            if (timeoutHandler) clearTimeout(timeoutHandler)

            if (!cp.pid || cp.exitCode !== null) {
                return err ? reject(err) : resolve({ stdout, stderr })
            }

            treeKill(cp.pid, 'SIGKILL', () => {
                if (err) reject(err)
                else resolve({ stdout, stderr })
            })
        }

        if (timeoutMs && timeoutMs > 0) {
            timeoutHandler = setTimeout(() => {
                finish(
                    new Error(
                        `Timeout after ${timeoutMs}ms\nstdout: ${stdout}\nstderr: ${stderr}`,
                    ),
                )
            }, timeoutMs)
        }

        cp.on('error', err => finish(err))
        cp.on('close', (code, signal) => {
            if (code !== 0) {
                return finish(
                    new Error(
                        `Exit ${code}${signal ? ` (signal ${signal})` : ''}\nstdout: ${stdout}\nstderr: ${stderr}`,
                    ),
                )
            }
            finish()
        })
    })
}


type SpawnWithKillParams = {
    cmd: string
    args?: string[]
    options?: SpawnOptions
    printOutput?: boolean
    timeoutMs?: number
}

export type CommandOutput = {
    stdout: string
    stderr: string
}
