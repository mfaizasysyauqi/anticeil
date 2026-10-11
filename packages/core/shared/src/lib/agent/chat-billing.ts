export const CHAT_CREDITS_PER_TOOL_CALL = 1

export type ChatToolCall = {
    toolName: string
    output?: unknown
}

export type TurnCredits = {
    base: number
    tools: number
    total: number
}

const BILLABLE_EXTERNAL_TOOL_NAMES = new Set<string>([
    'ap_web_search',
    'ap_scrape_url',
    'ap_generate_image',
    'ap_execute_action',
    'ap_explore_data',
    'ap_run_code',
])

function isPaidTool(toolName: string): boolean {
    return toolName.startsWith('mcp__') || BILLABLE_EXTERNAL_TOOL_NAMES.has(toolName)
}

function creditsForTurn({ provider, toolCalls }: { provider?: string | null, toolCalls: ChatToolCall[] }): TurnCredits {
    const base = provider === 'activepieces' ? 0 : 1
    const paidToolCount = toolCalls.filter((call) => isPaidTool(call.toolName)).length
    const tools = paidToolCount * CHAT_CREDITS_PER_TOOL_CALL
    return {
        base,
        tools,
        total: base + tools,
    }
}

export const chatBilling = {
    isPaidTool,
    creditsForTurn,
}
