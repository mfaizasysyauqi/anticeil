import { isNil } from '@activepieces/core-utils'
import { apDayjs } from '@activepieces/server-utils'
import { ConsumableFeatureId, PurchasablePlan, UnconsumableFeatureId } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { getBillingOverviewKey, getPlatformPlanNameKey } from '../../../../database/redis/keys'
import { distributedStore } from '../../../../database/redis-connections'
import { system } from '../../../../helper/system/system'
import { AppSystemProp } from '../../../../helper/system/system-props'
import { BillingOverview, BillingProvider, ConsumablesUsage, CreditsAndAppSumoState, emptyBillingOverview, TrackFeatureParams } from '../../../../platform/billing-provider'
import { platformPlanRepo, platformPlanService } from '../platform-plan.service'

const MIDTRANS_PLANS: PurchasablePlan[] = [
    {
        id: 'free',
        name: 'Free',
        description: 'Perfect for individuals exploring automation',
        price: 0,
        interval: 'month',
        priceDisplay: 'Rp 0',
        baseVariantId: null,
        includedSeats: 1,
        includedCredits: 1000,
        creditsResetInterval: 'month',
    },
    {
        id: 'plus_monthly',
        name: 'Plus',
        description: 'Built for solo builders who need advanced AI agents and tools',
        price: 299000,
        interval: 'month',
        priceDisplay: 'Rp 299.000',
        baseVariantId: null,
        includedSeats: 5,
        includedCredits: 10000,
        creditsResetInterval: 'month',
    },
    {
        id: 'plus_annual',
        name: 'Plus (annual)',
        description: 'Built for solo builders (Annual Discount)',
        price: 2990000,
        interval: 'year',
        priceDisplay: 'Rp 2.990.000',
        baseVariantId: null,
        includedSeats: 5,
        includedCredits: 10000,
        creditsResetInterval: 'month',
    },
    {
        id: 'team_monthly',
        name: 'Team',
        description: 'Designed for teams collaborating on automations',
        price: 2990000,
        interval: 'month',
        priceDisplay: 'Rp 2.990.000',
        baseVariantId: null,
        includedSeats: 25,
        includedCredits: 50000,
        creditsResetInterval: 'month',
    },
    {
        id: 'team_annual',
        name: 'Team (annual)',
        description: 'Designed for teams collaborating on automations (Annual Discount)',
        price: 29900000,
        interval: 'year',
        priceDisplay: 'Rp 29.900.000',
        baseVariantId: null,
        includedSeats: 25,
        includedCredits: 50000,
        creditsResetInterval: 'month',
    },
]

function getCreditsUsageKey(platformId: string, monthStr: string): string {
    return `anticeil:credits_usage:${platformId}:${monthStr}`
}

export const midtransBillingProvider = (log: FastifyBaseLogger): BillingProvider => ({
    listPlans: async () => {
        return MIDTRANS_PLANS
    },
    getBillingOverview: async (platformId: string): Promise<BillingOverview> => {
        try {
            const platformPlan = await platformPlanService(log).getOrCreateForPlatform(platformId)
            const planKey = (platformPlan?.plan ?? 'free').toLowerCase()
            const isEnterprise = planKey.includes('enterprise')
            const isTeam = planKey.includes('team') || isEnterprise
            const isPlus = planKey.includes('plus') || isTeam

            const planName = isEnterprise ? 'Enterprise' : (isTeam ? 'Team' : (isPlus ? 'Plus' : 'Free'))
            const nextBillingAmount = isEnterprise ? 0 : (isTeam ? 2990000 : (isPlus ? 299000 : 0))
            const includedSeats = platformPlan?.usersLimit ?? (isEnterprise ? null : (isTeam ? 25 : (isPlus ? 5 : 1)))

            return {
                startDate: apDayjs().startOf('month').toISOString(),
                endDate: apDayjs().endOf('month').toISOString(),
                nextBillingAmount,
                cancelAt: null,
                trialEndsAt: null,
                planInterval: 'month',
                planName,
                scheduledPlanName: null,
                billingPortalAvailable: false,
                creditsResetInterval: 'month',
                creditsFeature: {
                    featureId: ConsumableFeatureId.AP_CREDITS,
                    pricePerUnit: 100,
                    billingUnits: 1000,
                    interval: 'month',
                    autoTopUp: null,
                },
                appSumoCreditsFeature: null,
                seatsFeature: {
                    featureId: UnconsumableFeatureId.USERS_LIMIT,
                    pricePerUnit: 50000,
                    billingUnits: 1,
                    interval: 'month',
                },
                includedSeats,
                additionalSeats: null,
                unavailable: false,
            }
        }
        catch (error) {
            log.error({ error, platformId }, 'Failed to fetch Midtrans billing overview, falling back to empty')
            return emptyBillingOverview({})
        }
    },
    createCheckoutSession: async ({ platformId, planId, successUrl }) => {
        const rawPlan = (planId || '').toLowerCase()
        const isEnterprise = rawPlan.includes('enterprise')
        const isTeam = rawPlan.includes('team') || isEnterprise
        const isPlus = rawPlan.includes('plus') || isTeam

        const planName = isEnterprise ? 'enterprise' : (isTeam ? 'team' : (isPlus ? 'plus' : 'free'))

        await platformPlanRepo().update({ platformId }, {
            plan: planName,
            agentsEnabled: isPlus,
            aiProvidersEnabled: isPlus,
            chatEnabled: true,
            tablesEnabled: true,
            apiKeysEnabled: isTeam,
            billedTeamProjectsLimit: isTeam ? null : (isPlus ? 1 : 0),
            includedCredits: isEnterprise ? 1000000 : (isTeam ? 50000 : (isPlus ? 10000 : 1000)),
            usersLimit: isEnterprise ? null : (isTeam ? 25 : (isPlus ? 5 : 1)),
            projectsLimit: isEnterprise ? null : (isTeam ? null : (isPlus ? null : 1)),
            activeFlowsLimit: isEnterprise ? null : (isTeam ? null : (isPlus ? 100 : 5)),
            analyticsEnabled: isPlus,
            customRolesEnabled: isTeam,
            projectRolesEnabled: isTeam,
            ssoEnabled: isTeam,
            scimEnabled: isEnterprise,
            globalConnectionsEnabled: isTeam,
            auditLogEnabled: isTeam,
            environmentsEnabled: isTeam,
            eventStreamingEnabled: isEnterprise,
            workerGroupsEnabled: isEnterprise,
            customDomainsEnabled: isEnterprise,
            showPoweredBy: !isPlus,
            secretManagersEnabled: isTeam,
            customAppearanceEnabled: isPlus,
            managePiecesEnabled: isTeam,
            manageTemplatesEnabled: isTeam,
            embeddingEnabled: isTeam,
        })
        await distributedStore.delete(getBillingOverviewKey(platformId))
        await distributedStore.delete(getPlatformPlanNameKey(platformId))
        log.info({ platformId, planName }, 'Plan instantly upgraded in development mode')

        return { checkoutUrl: null }
    },
    getBillingPortalUrl: async () => {
        return { url: '' }
    },
    adjustUnconsumableFeatureQuantity: async () => {
        return { checkoutUrl: null }
    },
    configureAutoTopUp: async () => {
        return
    },
    setupPayment: async () => {
        return { url: null }
    },
    cancelSubscription: async () => {
        return
    },
    reactivateSubscription: async () => {
        return
    },
    trackFeature: async (params: TrackFeatureParams) => {
        if (params.featureId === ConsumableFeatureId.AP_CREDITS) {
            const currentMonth = apDayjs().format('YYYY-MM')
            const key = getCreditsUsageKey(params.platformId, currentMonth)
            const current = (await distributedStore.get<number>(key)) ?? 0
            const added = Math.max(1, Math.round(params.value || 1))
            const newTotal = current + added
            await distributedStore.put(key, newTotal, 60 * 60 * 24 * 60)

            const platformPlan = await platformPlanService(log).getOrCreateForPlatform(params.platformId)
            const planKey = (platformPlan?.plan ?? 'free').toLowerCase()
            const isTeam = planKey.includes('team')
            const isPlus = planKey.includes('plus')
            const limit = platformPlan?.includedCredits ?? (isTeam ? 50000 : (isPlus ? 10000 : 1000))
            const remaining = Math.max(0, limit - newTotal)

            log.info({ platformId: params.platformId, value: added, newTotal, remaining }, '[MidtransBilling] Tracked AI/Automation credits')
        }
    },
    ensureEnrolled: async () => {
        return
    },
    compFreeLegacy: async () => {
        return
    },
    refreshEntitlements: async () => {
        return
    },
    applyAppSumoPlan: async () => {
        return
    },
    activateLicense: async () => {
        return
    },
    isBillingEnforced: async () => {
        return false
    },
    shouldBlockOnCredits: async () => {
        return false
    },
    getCreditsAndAppSumoState: async (platformId: string): Promise<CreditsAndAppSumoState> => {
        const currentMonth = apDayjs().format('YYYY-MM')
        const key = getCreditsUsageKey(platformId, currentMonth)
        const usage = (await distributedStore.get<number>(key)) ?? 0
        const platformPlan = await platformPlanService(log).getOrCreateForPlatform(platformId)
        const planKey = (platformPlan?.plan ?? 'free').toLowerCase()
        const isTeam = planKey.includes('team')
        const isPlus = planKey.includes('plus')
        const limit = platformPlan?.includedCredits ?? (isTeam ? 50000 : (isPlus ? 10000 : 1000))
        const remaining = Math.max(0, limit - usage)

        return {
            credits: {
                blocked: false,
                usage,
                limit,
                remaining,
                unlimited: false,
            },
            appSumo: {
                blocked: false,
                usage: 0,
                limit: 0,
                remaining: 0,
                unlimited: false,
            },
        }
    },
    getConsumablesUsage: async (platformId: string): Promise<ConsumablesUsage> => {
        const currentMonth = apDayjs().format('YYYY-MM')
        const key = getCreditsUsageKey(platformId, currentMonth)
        const usage = (await distributedStore.get<number>(key)) ?? 0
        const platformPlan = await platformPlanService(log).getOrCreateForPlatform(platformId)
        const planKey = (platformPlan?.plan ?? 'free').toLowerCase()
        const isTeam = planKey.includes('team')
        const isPlus = planKey.includes('plus')
        const limit = platformPlan?.includedCredits ?? (isTeam ? 50000 : (isPlus ? 10000 : 1000))
        const remaining = Math.max(0, limit - usage)
        const nextResetAt = apDayjs().endOf('month').toISOString()

        return {
            credits: {
                usage,
                remaining,
                nextResetAt,
            },
            appSumo: null,
        }
    },
    getCreditUsage: async ({ platformId }: { platformId: string }) => {
        const currentMonth = apDayjs().format('YYYY-MM')
        const key = getCreditsUsageKey(platformId, currentMonth)
        const usage = (await distributedStore.get<number>(key)) ?? 0
        return { total: usage, byProject: [] }
    },
})
