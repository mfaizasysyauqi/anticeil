import fs from 'node:fs/promises'
import path from 'node:path'
import { EngineOperation, EngineOperationType, EngineResponseStatus } from '@activepieces/shared'
import { execute } from './lib/operations'
import { ssrfGuard } from './lib/network/ssrf-guard'

// Install network protections
ssrfGuard.install()

async function main() {
    const args = process.argv.slice(2)
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Anticeil Flow — Activepieces Serverless Engine Runner

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
