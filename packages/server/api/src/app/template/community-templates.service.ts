import { ActivepiecesError, ErrorCode, isNil, SeekPage } from '@activepieces/core-utils'
import { ListTemplatesRequestQuery, Template } from '@activepieces/shared'
import { ALL_ANTICEIL_TEMPLATES } from './anticeil-templates'

const TEMPLATES_SOURCE_URL = 'https://cloud.activepieces.com/api/v1/templates'

export const communityTemplates = {
    getOrThrow: async (id: string): Promise<Template> => {
        const localTemplate = ALL_ANTICEIL_TEMPLATES.find((t) => t.id === id)
        if (localTemplate) {
            return localTemplate
        }

        const url = `${TEMPLATES_SOURCE_URL}/${id}`
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        if (!response.ok) {
            throw new ActivepiecesError({
                code: ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityType: 'template',
                    entityId: id,
                    message: `Template ${id} not found`,
                },
            })
        }
        const template = await response.json()
        return template
    },
    getCategories: async (): Promise<string[]> => {
        let categories: string[] = []
        try {
            const url = `${TEMPLATES_SOURCE_URL}/categories`
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            if (response.ok) {
                const json = await response.json()
                if (Array.isArray(json)) {
                    categories = json
                }
                else if (json && Array.isArray(json.value)) {
                    categories = json.value
                }
            }
        }
        catch {
            categories = []
        }

        const localCategories = ALL_ANTICEIL_TEMPLATES.flatMap((t) => t.categories || [])
        return Array.from(new Set([...localCategories, ...(Array.isArray(categories) ? categories : [])]))
    },
    list: async (request: ListTemplatesRequestQuery): Promise<SeekPage<Template>> => {
        let cloudTemplates: Template[] = []
        try {
            const queryString = convertToQueryString(request)
            const url = `${TEMPLATES_SOURCE_URL}?${queryString}`
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            if (response.ok) {
                const json = await response.json()
                cloudTemplates = json.data || []
            }
        }
        catch {
            cloudTemplates = []
        }

        const filteredLocal = ALL_ANTICEIL_TEMPLATES.filter((template) => {
            if (request.search) {
                const searchLower = request.search.toLowerCase()
                const matchesName = template.name.toLowerCase().includes(searchLower)
                const matchesSummary = template.summary.toLowerCase().includes(searchLower)
                if (!matchesName && !matchesSummary) return false
            }
            if (request.category && !template.categories.includes(request.category)) {
                return false
            }
            if (request.pieces && request.pieces.length > 0) {
                const hasPiece = request.pieces.some((p) => template.pieces.includes(p))
                if (!hasPiece) return false
            }
            return true
        })

        const combinedData = [...filteredLocal, ...cloudTemplates]
        return {
            data: combinedData,
            next: null,
            previous: null,
        }
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
