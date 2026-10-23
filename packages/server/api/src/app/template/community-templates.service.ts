import { ActivepiecesError, ErrorCode, isNil, SeekPage } from '@activepieces/core-utils'
import { ListTemplatesRequestQuery, Template } from '@activepieces/shared'

const TEMPLATES_SOURCE_URL = 'https://cloud.activepieces.com/api/v1/templates'

let cachedTemplates: Template[] = []
let cachedCategories: string[] = [
    'Customer Service', 'Marketing', 'Sales', 'IT', 'HR', 'Operations', 'AI', 'Finance'
]

export const communityTemplates = {
    getOrThrow: async (id: string): Promise<Template> => {
        const foundLocal = cachedTemplates.find(t => t.id === id)
        if (foundLocal) {
            return foundLocal
        }

        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 6000)
            const url = `${TEMPLATES_SOURCE_URL}/${id}`
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            })
            clearTimeout(timeout)
            if (response.ok) {
                const template = await response.json()
                if (template?.id) {
                    cachedTemplates.push(template)
                }
                return template
            }
        }
        catch {
            // Handled below with fallback
        }

        if (foundLocal) {
            return foundLocal
        }

        throw new ActivepiecesError({
            code: ErrorCode.ENTITY_NOT_FOUND,
            params: {
                entityType: 'template',
                entityId: id,
                message: `Template ${id} not found`,
            },
        })
    },
    getCategories: async (): Promise<string[]> => {
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 4000)
            const url = `${TEMPLATES_SOURCE_URL}/categories`
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
            })
            clearTimeout(timeout)
            if (response.ok) {
                const cats = await response.json()
                if (Array.isArray(cats) && cats.length > 0) {
                    cachedCategories = cats
                }
                return cats
            }
        }
        catch {
            // Fallback to cached categories
        }
        return cachedCategories
    },
    list: async (request: ListTemplatesRequestQuery): Promise<SeekPage<Template>> => {
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 6000)
            const queryString = convertToQueryString(request)
            const url = `${TEMPLATES_SOURCE_URL}?${queryString}`
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
            })
            clearTimeout(timeout)
            if (response.ok) {
                const result = await response.json()
                if (result && Array.isArray(result.data) && result.data.length > 0) {
                    const existingIds = new Set(cachedTemplates.map(t => t.id))
                    for (const item of result.data) {
                        if (!existingIds.has(item.id)) {
                            cachedTemplates.push(item)
                        }
                    }
                    return result
                }
            }
        }
        catch {
            // Fallback to cached templates
        }

        // Resilient offline fallback: return cached templates
        let filtered = cachedTemplates
        if (request && (request as any).search) {
            const s = (request as any).search.toLowerCase()
            filtered = filtered.filter(t =>
                (t.name && t.name.toLowerCase().includes(s)) ||
                (t.summary && t.summary.toLowerCase().includes(s)) ||
                (t.description && t.description.toLowerCase().includes(s))
            )
        }

        return { data: filtered, next: null, previous: null }
    },
}


function convertToQueryString(params: ListTemplatesRequestQuery): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((val) => {
                if (!isNil(val)) {
                    searchParams.append(key, typeof val === 'string' ? val : JSON.stringify(val))
                }
            })
        }
        else if (!isNil(value)) {
            searchParams.set(key, value.toString())
        }
    })

    return searchParams.toString()
}
