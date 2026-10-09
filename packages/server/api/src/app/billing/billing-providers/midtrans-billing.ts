import { isNil } from '@activepieces/core-utils'
import { apDayjs } from '@activepieces/server-utils'
import { ConsumableFeatureId, PurchasablePlan, UnconsumableFeatureId } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { getBillingOverviewKey, getPlatformPlanNameKey } from '../../database/redis/keys'
import { distributedStore } from '../../database/redis-connections'
import { system } from '../../helper/system/system'
import { AppSystemProp } from '../../helper/system/system-props'
import { BillingOverview, BillingProvider, ConsumablesUsage, CreditsAndAppSumoState, emptyBillingOverview, TrackFeatureParams } from '../../platform/billing-provider'
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
        const isAnnual = rawPlan.includes('annual') || rawPlan.includes('year')

        const planName = isEnterprise ? 'Enterprise' : (isTeam ? 'Team' : (isPlus ? 'Plus' : 'Free'))

        let price = 0
        if (isEnterprise) {
            price = 50000000
        }
        else if (isTeam) {
            price = isAnnual ? 29900000 : 2990000
        }
        else if (isPlus) {
            price = isAnnual ? 2990000 : 299000
        }

        if (price === 0) {
            await platformPlanRepo().update({ platformId }, {
                plan: 'free',
                agentsEnabled: false,
                aiProvidersEnabled: false,
                chatEnabled: true,
                tablesEnabled: true,
                apiKeysEnabled: false,
                billedTeamProjectsLimit: 0,
                includedCredits: 1000,
                usersLimit: 1,
                projectsLimit: 1,
                activeFlowsLimit: 5,
                analyticsEnabled: false,
                customRolesEnabled: false,
                projectRolesEnabled: false,
                ssoEnabled: false,
                scimEnabled: false,
                globalConnectionsEnabled: false,
                auditLogEnabled: false,
                environmentsEnabled: false,
                eventStreamingEnabled: false,
                workerGroupsEnabled: false,
                customDomainsEnabled: false,
                showPoweredBy: true,
                secretManagersEnabled: false,
                customAppearanceEnabled: false,
                managePiecesEnabled: false,
                manageTemplatesEnabled: false,
                embeddingEnabled: false,
            })
            await distributedStore.delete(getBillingOverviewKey(platformId))
            await distributedStore.delete(getPlatformPlanNameKey(platformId))
            log.info({ platformId }, 'Plan reset to free')
            return { checkoutUrl: null }
        }

        const serverKey = system.get(AppSystemProp.MIDTRANS_SERVER_KEY) || process.env.AP_MIDTRANS_SERVER_KEY
        if (!serverKey) {
            log.warn({ platformId }, '[Midtrans] AP_MIDTRANS_SERVER_KEY is not configured')
            return { checkoutUrl: null }
        }
        const orderId = `ANTICEIL-${platformId.substring(0, 8)}-${rawPlan}-${Date.now()}`
        const finishUrl = successUrl || `${system.get(AppSystemProp.FRONTEND_URL) || 'https://anticeil.com'}/platform/billing?status=success`

        const snapPayload = {
            transaction_details: {
                order_id: orderId,
                gross_amount: price,
            },
            item_details: [
                {
                    id: rawPlan,
                    price,
                    quantity: 1,
                    name: `Anticeil Paket ${planName}`,
                },
            ],
            customer_details: {
                email: 'billing@anticeil.com',
                first_name: 'Pelanggan Anticeil',
            },
            callbacks: {
                finish: finishUrl,
            },
        }

        const isProdConfig = system.getBoolean(AppSystemProp.MIDTRANS_IS_PRODUCTION) ?? (process.env.AP_MIDTRANS_IS_PRODUCTION === 'true')
        const endpoints = isProdConfig
            ? ['https://app.midtrans.com/snap/v1/transactions', 'https://app.sandbox.midtrans.com/snap/v1/transactions']
            : ['https://app.sandbox.midtrans.com/snap/v1/transactions', 'https://app.midtrans.com/snap/v1/transactions']

        const authHeader = Buffer.from(`${serverKey}:`).toString('base64')

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Basic ${authHeader}`,
                    },
                    body: JSON.stringify(snapPayload),
                })
                const snapData = (await response.json()) as { redirect_url?: string, token?: string, error_messages?: string[] }
                if (snapData && snapData.redirect_url) {
                    log.info({ platformId, orderId, redirectUrl: snapData.redirect_url, endpoint }, '[Midtrans] Snap transaction created')
                    return { checkoutUrl: snapData.redirect_url }
                }
                log.warn({ endpoint, snapData }, '[Midtrans] Snap endpoint returned non-redirect payload')
            }
            catch (err) {
                log.warn({ err, endpoint }, '[Midtrans] Failed to call Snap endpoint')
            }
        }

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
