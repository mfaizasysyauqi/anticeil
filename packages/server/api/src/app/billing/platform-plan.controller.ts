import { SeekPage, tryCatch } from '@activepieces/core-utils'
import { apDayjs } from '@activepieces/server-utils'
import { AdjustUnconsumableFeatureQuantityParams, CancelSubscriptionRequest, CheckoutPlanParamsSchema, CheckoutSessionResponse, ConsumableFeatureId, ConsumableProductAutoTopupParams, isNil, PlatformBillingInformation, PrincipalType, ProjectCreditUsage, PurchasablePlan, SetupPaymentParams } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { securityAccess } from '../core/security/authorization/fastify-security'
import { getBillingOverviewKey, getCreditsBalanceKey, getCustomerStateMissKey, getEntitlementsForceRefreshKey, getPlatformPlanNameKey } from '../database/redis/keys'
import { distributedStore } from '../database/redis-connections'
import { billingProvider } from '../platform/billing-provider'
import { platformService } from '../platform/platform.service'
import { userService } from '../user/user-service'
import { platformPlanRepo, platformPlanService } from './platform-plan.service'
import { midtransService } from './midtrans.service'

const FORCE_REFRESH_DEDUP_SECONDS = 60
const DEFAULT_USAGE_PAGE_SIZE = 10

export const platformPlanController: FastifyPluginAsyncZod = async (app) => {

    app.get('/info', InfoRequest, async (request) => {
        return getBillingInformation(request.log, request.principal.platform.id)
    })

    app.post('/refresh', RefreshRequest, async (request) => {
        const platformId = request.principal.platform.id
        await distributedStore.runOnceWithin(
            getEntitlementsForceRefreshKey(platformId),
            FORCE_REFRESH_DEDUP_SECONDS,
            () => billingProvider.get(request.log).refreshEntitlements(platformId),
        )
        return getBillingInformation(request.log, platformId)
    })

    app.get('/plans', ListPlansRequest, async (request) => {
        const platformId = request.principal.platform?.id
        let plans: PurchasablePlan[] = []
        if (platformId) {
            try {
                plans = await billingProvider.get(request.log).listPlans(platformId)
            } catch (err) {
                request.log.warn({ err }, 'Failed to list plans from billingProvider, using default plans')
            }
        }
        if (!plans || plans.length === 0) {
            plans = [
                {
                    id: 'free',
                    name: 'Free',
                    description: 'For individuals exploring automation',
                    price: 0,
                    interval: 'month',
                    priceDisplay: 'Rp 0',
                    baseVariantId: null,
                    includedSeats: 1,
                    includedCredits: 1000,
                    creditsResetInterval: 'month',
                },
                {
                    id: 'plus-monthly',
                    name: 'Plus',
                    description: 'For solo builders who automate regularly',
                    price: 299000,
                    interval: 'month',
                    priceDisplay: 'Rp 299k',
                    baseVariantId: null,
                    includedSeats: 5,
                    includedCredits: 10000,
                    creditsResetInterval: 'month',
                },
                {
                    id: 'plus-annual',
                    name: 'Plus (annual)',
                    description: 'For solo builders who automate regularly',
                    price: 2990000,
                    interval: 'year',
                    priceDisplay: 'Rp 2.99M',
                    baseVariantId: null,
                    includedSeats: 5,
                    includedCredits: 10000,
                    creditsResetInterval: 'month',
                },
                {
                    id: 'team-monthly',
                    name: 'Team',
                    description: 'For teams that collaborate on automations',
                    price: 2990000,
                    interval: 'month',
                    priceDisplay: 'Rp 2.99M',
                    baseVariantId: null,
                    includedSeats: 25,
                    includedCredits: 50000,
                    creditsResetInterval: 'month',
                },
                {
                    id: 'team-annual',
                    name: 'Team (annual)',
                    description: 'For teams that collaborate on automations',
                    price: 29900000,
                    interval: 'year',
                    priceDisplay: 'Rp 29.9M',
                    baseVariantId: null,
                    includedSeats: 25,
                    includedCredits: 50000,
                    creditsResetInterval: 'month',
                },
            ]
        }
        return plans
    })

    app.get('/projects-usage', ProjectsUsageRequest, async (request) => {
        return platformPlanService(request.log).getCreditUsageByProject({
            platformId: request.principal.platform.id,
            startDate: request.query.startDate,
            endDate: request.query.endDate,
            cursor: request.query.cursor ?? null,
            limit: request.query.limit ?? DEFAULT_USAGE_PAGE_SIZE,
            userId: request.principal.id,
            principalType: request.principal.type,
        })
    })

    app.post('/checkout', CheckoutRequest, async (request) => {
        const platformId = request.principal.platform.id
        const result = await billingProvider.get(request.log).createCheckoutSession({
            platformId,
            planId: request.body.planId,
            successUrl: request.body.successUrl,
        })
        await refreshWhenAppliedImmediately({ log: request.log, platformId, checkoutUrl: result.checkoutUrl })
        return result
    })

    app.post('/cancel', CancelRequest, async (request) => {
        const platformId = request.principal.platform.id
        const provider = billingProvider.get(request.log)
        await provider.cancelSubscription({
            platformId,
            feedback: {
                reasons: request.body.reasons,
                comment: request.body.comment ?? null,
                canceledByEmail: await resolveActorEmail(request.log, request.principal.id),
            },
        })
        await provider.refreshEntitlements(platformId)
    })

    app.post('/reactivate', ReactivateRequest, async (request) => {
        const platformId = request.principal.platform.id
        const provider = billingProvider.get(request.log)
        await provider.reactivateSubscription({ platformId })
        await provider.refreshEntitlements(platformId)
    })

    app.post('/portal', PortalRequest, async (request) => {
        const platformId = request.principal?.platform?.id ?? (await platformService(request.log).getAll())[0]?.id
        const { url } = await billingProvider.get(request.log).getBillingPortalUrl({ platformId })
        return url
    })

    app.post('/activate', ActivateLicenseRequest, async (request) => {
        await billingProvider.get(request.log).activateLicense({
            platformId: request.principal.platform.id,
            licenseKey: request.body.licenseKey,
        })
    })

    app.post('/unconsumable-feature-quantity', AdjustUnconsumableFeatureQuantityRequest, async (request) => {
        const platformId = request.principal.platform.id
        const provider = billingProvider.get(request.log)
        const { checkoutUrl } = await provider.adjustUnconsumableFeatureQuantity({
            platformId,
            featureId: request.body.featureId,
            quantity: request.body.quantity,
        })
        await refreshWhenAppliedImmediately({ log: request.log, platformId, checkoutUrl })
        return { paymentUrl: checkoutUrl }
    })

    app.post('/consumable-product-topups/auto-topup', ConsumableProductAutoTopupRequest, async (request) => {
        const platformId = request.principal.platform.id
        const provider = billingProvider.get(request.log)
        await provider.configureAutoTopUp({
            ...request.body,
            platformId,
        })
        await provider.refreshEntitlements(platformId)
        return {}
    })

    app.post('/setup-payment', SetupPaymentRequest, async (request) => {
        return billingProvider.get(request.log).setupPayment({
            redirectUrl: request.body.redirectUrl,
            platformId: request.principal.platform.id,
        })
    })

    app.post('/switch-plan', SwitchPlanRequest, async (request) => {
        let platformId = request.principal?.platform?.id
        if (!platformId) {
            const platforms = await platformService(request.log).getAll()
            platformId = platforms[0]?.id
        }
        if (!platformId) {
            return { success: false, plan: 'free' }
        }

        const body = request.body as { plan?: string }
        const rawPlan = (body?.plan || 'enterprise').toLowerCase()
        const isEnterprise = rawPlan.includes('enterprise')
        const isTeam = rawPlan.includes('team') || isEnterprise
        const isPlus = rawPlan.includes('plus') || isTeam

        const planName = isEnterprise ? 'enterprise' : (isTeam ? 'team' : (isPlus ? 'plus' : 'free'))
        const includedCredits = isEnterprise ? 1000000 : (isTeam ? 50000 : (isPlus ? 10000 : 1000))

        await platformPlanService(request.log).getOrCreateForPlatform(platformId)

        await platformPlanRepo().update({ platformId }, {
            plan: planName,
            includedCredits: isEnterprise ? 1000000 : (isTeam ? 50000 : (isPlus ? 10000 : 1000)),
            usersLimit: isEnterprise ? null : (isTeam ? 25 : (isPlus ? 5 : 1)),
            activeFlowsLimit: isEnterprise ? null : (isTeam ? null : (isPlus ? 100 : 5)),
            projectsLimit: isEnterprise ? null : (isTeam ? null : (isPlus ? null : 1)),
            billedTeamProjectsLimit: isTeam ? null : (isPlus ? 1 : 0),

            agentsEnabled: isPlus,
            aiProvidersEnabled: isPlus,
            chatEnabled: true,
            tablesEnabled: true,
            analyticsEnabled: isPlus,

            customAppearanceEnabled: isPlus,
            showPoweredBy: !isPlus,

            globalConnectionsEnabled: isTeam,
            ssoEnabled: isTeam,
            customRolesEnabled: isTeam,
            projectRolesEnabled: isTeam,
            auditLogEnabled: isTeam,
            environmentsEnabled: isTeam,
            embeddingEnabled: isTeam,
            apiKeysEnabled: isTeam,
            secretManagersEnabled: isTeam,
            managePiecesEnabled: isTeam,
            manageTemplatesEnabled: isTeam,

            scimEnabled: isEnterprise,
            eventStreamingEnabled: isEnterprise,
            workerGroupsEnabled: isEnterprise,
            customDomainsEnabled: isEnterprise,
            dedicatedWorkers: null,
            canary: false,
        })
        await distributedStore.delete(getBillingOverviewKey(platformId))
        await distributedStore.delete(getPlatformPlanNameKey(platformId))
        await distributedStore.delete(getCreditsBalanceKey(platformId))
        await distributedStore.delete(getCustomerStateMissKey(platformId))

        const currentMonth = apDayjs().format('YYYY-MM')
        const usageKey = `anticeil:credits_usage:${platformId}:${currentMonth}`
        const currentUsage = (await distributedStore.get<number>(usageKey)) ?? 0
        const newBalance = {
            featureId: ConsumableFeatureId.AP_CREDITS,
            granted: includedCredits,
            usage: currentUsage,
            remaining: Math.max(0, includedCredits - currentUsage),
            unlimited: false,
            syncedAt: Date.now(),
            nextResetAt: apDayjs().endOf('month').valueOf(),
        }
        await distributedStore.put(getCreditsBalanceKey(platformId), newBalance, 60 * 60)

        request.log.info({ platformId, planName, creditsRemaining: newBalance.remaining }, 'Plan switched successfully (development mode)')
        return { success: true, plan: planName }
    })

    /**
     * POST /midtrans-token
     * Creates a Midtrans Snap transaction token for the given plan.
     * The frontend uses this token to open the Snap.js payment popup.
     */
    app.post('/midtrans-token', MidtransTokenRequest, async (request, reply) => {
        const platformId = request.principal.platform.id
        const { plan, cycle } = request.body as { plan: string; cycle: 'month' | 'year' }

        const planKey = plan.toLowerCase()
        const grossAmount = midtransService.getPlanPrice(planKey, cycle)
        if (grossAmount === 0) {
            throw new Error(`Invalid plan '${planKey}' or billing cycle '${cycle}'`)
        }

        // Unique order id per transaction attempt
        const orderId = `anticeil-${platformId}-${planKey}-${cycle}-${Date.now()}`

        // Resolve user email for Midtrans customer_details
        const user = await userService(request.log).getMetaInformation({ id: request.principal.id })
        const customerEmail = user?.email ?? 'user@anticeil.com'
        const customerName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Anticeil User'

        const itemName = `Anticeil ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan (${cycle === 'year' ? 'Annual' : 'Monthly'})`

        const snap = await midtransService.createSnapToken({
            orderId,
            grossAmount,
            customerName,
            customerEmail,
            itemName,
        })

        // Persist the pending order so the webhook can resolve platformId + plan
        await distributedStore.put(
            `anticeil:midtrans:order:${orderId}`,
            { platformId, planKey, cycle },
            60 * 60 * 24, // expire after 24h
        )

        return {
            snapToken: snap.token,
            orderId,
            clientKey: midtransService.getClientKey(),
        }
    })

    /**
     * POST /midtrans-notification
     * Midtrans webhook — verifies payment and applies the plan.
     * This endpoint must be whitelisted in Midtrans dashboard:
     *   https://dashboard.sandbox.midtrans.com -> Settings -> Configuration -> Payment Notification URL
     */
    app.post('/midtrans-notification', MidtransNotificationRequest, async (request) => {
        const body = request.body as { order_id: string }
        const orderId = body.order_id

        // Always re-verify via Midtrans API (never trust raw notification body alone)
        const status = await midtransService.getTransactionStatus(orderId)
        if (!midtransService.isPaymentSuccess(status)) {
            request.log.info({ orderId, status: status.transaction_status }, 'Midtrans notification: payment not successful, ignoring')
            return { received: true }
        }

        // Retrieve pending order metadata from Redis
        const orderMeta = await distributedStore.get<{ platformId: string; planKey: string; cycle: string }>(
            `anticeil:midtrans:order:${orderId}`,
        )
        if (isNil(orderMeta)) {
            request.log.warn({ orderId }, 'Midtrans notification: order metadata not found in Redis, ignoring')
            return { received: true }
        }

        const { platformId, planKey } = orderMeta
        const isEnterprise = planKey === 'enterprise'
        const isTeam = planKey === 'team' || isEnterprise
        const isPlus = planKey === 'plus' || isTeam
        const includedCredits = isEnterprise ? 1000000 : (isTeam ? 50000 : (isPlus ? 10000 : 1000))

        await platformPlanService(request.log).getOrCreateForPlatform(platformId)
        await platformPlanRepo().update({ platformId }, {
            plan: planKey,
            includedCredits,
            usersLimit: isEnterprise ? null : (isTeam ? 25 : (isPlus ? 5 : 1)),
            activeFlowsLimit: isEnterprise ? null : (isTeam ? null : (isPlus ? 100 : 5)),
            projectsLimit: isEnterprise ? null : (isTeam ? null : (isPlus ? null : 1)),
            billedTeamProjectsLimit: isTeam ? null : (isPlus ? 1 : 0),
            agentsEnabled: isPlus,
            aiProvidersEnabled: isPlus,
            chatEnabled: true,
            tablesEnabled: true,
            analyticsEnabled: isPlus,
            customAppearanceEnabled: isPlus,
            showPoweredBy: !isPlus,
            globalConnectionsEnabled: isTeam,
            ssoEnabled: isTeam,
            customRolesEnabled: isTeam,
            projectRolesEnabled: isTeam,
            auditLogEnabled: isTeam,
            environmentsEnabled: isTeam,
            embeddingEnabled: isTeam,
            apiKeysEnabled: isTeam,
            secretManagersEnabled: isTeam,
            managePiecesEnabled: isTeam,
            manageTemplatesEnabled: isTeam,
            scimEnabled: isEnterprise,
            eventStreamingEnabled: isEnterprise,
            workerGroupsEnabled: isEnterprise,
            customDomainsEnabled: isEnterprise,
            dedicatedWorkers: null,
            canary: false,
        })

        // Bust all billing caches so the next /info call reflects the new plan
        await Promise.all([
            distributedStore.delete(getBillingOverviewKey(platformId)),
            distributedStore.delete(getPlatformPlanNameKey(platformId)),
            distributedStore.delete(getCreditsBalanceKey(platformId)),
            distributedStore.delete(getCustomerStateMissKey(platformId)),
            distributedStore.delete(`anticeil:midtrans:order:${orderId}`),
        ])

        request.log.info({ orderId, platformId, planKey }, 'Midtrans payment verified — plan applied')
        return { received: true }
    })
}

async function getBillingInformation(log: FastifyBaseLogger, platformId: string): Promise<PlatformBillingInformation> {
    const platform = await platformService(log).getOneOrThrow(platformId)
    const [platformPlan, usage, overview, billingEnforced] = await Promise.all([
        platformPlanService(log).getOrCreateForPlatform(platform.id),
        platformPlanService(log).getUsage(platform.id),
        billingProvider.get(log).getBillingOverview(platform.id),
        billingProvider.get(log).isBillingEnforced(platform.id),
    ])

    const { startDate: billingPeriodStart, endDate: nextBillingDate, nextBillingAmount, cancelAt, trialEndsAt, planName: autumnPlanName, scheduledPlanName, billingPortalAvailable, creditsResetInterval, planInterval, creditsFeature, appSumoCreditsFeature, seatsFeature, includedSeats, additionalSeats, unavailable: billingUnavailable } = overview

    const usageWithCredits = usage.creditsRemaining === null
        ? { ...usage, creditsUsed: await fetchUnlimitedCreditsUsed({ log, platformId: platform.id, startDate: billingPeriodStart, endDate: nextBillingDate, fallback: usage.creditsUsed }) }
        : usage

    const currentCreditsUsed = usageWithCredits.creditsUsed ?? 0
    const planCredits = platformPlan.includedCredits
    const consistentCreditsRemaining = (planCredits !== null && planCredits !== undefined)
        ? Math.max(0, planCredits - currentCreditsUsed)
        : usageWithCredits.creditsRemaining

    const coherentUsage = {
        ...usageWithCredits,
        creditsUsed: currentCreditsUsed,
        creditsRemaining: consistentCreditsRemaining,
    }

    return {
        plan: platformPlan,
        usage: coherentUsage,
        creditsResetInterval,
        planInterval,
        autumnPlanName,
        scheduledPlanName,
        nextBillingAmount,
        nextBillingDate,
        cancelAt,
        trialEndsAt,
        creditsFeature,
        appSumoCreditsFeature,
        seatsFeature,
        billingPortalAvailable,
        billingEnforced,
        billingUnavailable,
        includedSeats,
        additionalSeats,
    }
}

async function refreshWhenAppliedImmediately({ log, platformId, checkoutUrl }: RefreshWhenAppliedImmediatelyParams): Promise<void> {
    if (!isNil(checkoutUrl)) {
        return
    }
    await billingProvider.get(log).refreshEntitlements(platformId)
}

async function resolveActorEmail(log: FastifyBaseLogger, userId: string): Promise<string | null> {
    const { data: user, error } = await tryCatch(() => userService(log).getMetaInformation({ id: userId }))
    if (!isNil(error) || isNil(user)) {
        log.warn({ error, user: { id: userId } }, 'Failed to resolve the cancelling user email; recording the cancellation without it')
        return null
    }
    return user.email
}

async function fetchUnlimitedCreditsUsed({ log, platformId, startDate, endDate, fallback }: { log: FastifyBaseLogger, platformId: string, startDate: string, endDate: string, fallback: number }): Promise<number> {
    const { data: creditUsage, error } = await tryCatch(() => billingProvider.get(log).getCreditUsage({ platformId, startDate, endDate }))
    if (!isNil(error) || isNil(creditUsage)) {
        log.warn({ error, platform: { id: platformId } }, 'Failed to aggregate credit usage for an unlimited plan; reporting the cached value')
        return fallback
    }
    return creditUsage.total
}

const PLATFORM_ADMIN_ONLY = {
    security: securityAccess.platformAdminOnly([PrincipalType.USER]),
}

const InfoRequest = {
    config: PLATFORM_ADMIN_ONLY,
    schema: {
        response: {
            [StatusCodes.OK]: PlatformBillingInformation,
        },
    },
}

const RefreshRequest = {
    config: PLATFORM_ADMIN_ONLY,
    schema: {
        response: {
            [StatusCodes.OK]: PlatformBillingInformation,
        },
    },
}

const ProjectsUsageRequest = {
    schema: {
        querystring: z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            cursor: z.string().optional(),
            limit: z.coerce.number().optional(),
        }),
        response: {
            [StatusCodes.OK]: SeekPage(ProjectCreditUsage),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
}

const ListPlansRequest = {
    schema: {
        response: {
            [StatusCodes.OK]: z.array(PurchasablePlan),
        },
    },
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    },
}

const CheckoutRequest = {
    schema: {
        body: CheckoutPlanParamsSchema,
        response: {
            [StatusCodes.OK]: CheckoutSessionResponse,
        },
    },
    config: PLATFORM_ADMIN_ONLY,
}

const CancelRequest = {
    config: PLATFORM_ADMIN_ONLY,
    schema: {
        body: CancelSubscriptionRequest,
    },
}

const ReactivateRequest = {
    config: PLATFORM_ADMIN_ONLY,
}

const PortalRequest = {
    config: PLATFORM_ADMIN_ONLY,
}

const SwitchPlanRequest = {
    config: PLATFORM_ADMIN_ONLY,
}


const AdjustUnconsumableFeatureQuantityRequest = {
    schema: {
        body: AdjustUnconsumableFeatureQuantityParams,
        response: {
            [StatusCodes.OK]: z.object({
                paymentUrl: z.string().nullable(),
            }),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
}

const ActivateLicenseRequest = {
    schema: {
        body: z.object({
            licenseKey: z.string(),
        }),
    },
    config: PLATFORM_ADMIN_ONLY,
}

const ConsumableProductAutoTopupRequest = {
    schema: {
        body: ConsumableProductAutoTopupParams,
        response: {
            [StatusCodes.OK]: z.object({}),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
}

const SetupPaymentRequest = {
    schema: {
        body: SetupPaymentParams,
        response: {
            [StatusCodes.OK]: z.object({
                url: z.string().nullable(),
            }),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
}

type RefreshWhenAppliedImmediatelyParams = {
    log: FastifyBaseLogger
    platformId: string
    checkoutUrl: string | null
}

const MidtransTokenRequest = {
    schema: {
        body: z.object({
            plan: z.string(),
            cycle: z.enum(['month', 'year']),
        }),
        response: {
            [StatusCodes.OK]: z.object({
                snapToken: z.string(),
                orderId: z.string(),
                clientKey: z.string(),
            }),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
}

// Midtrans webhook is unauthenticated (called by Midtrans servers)
const MidtransNotificationRequest = {
    schema: {
        body: z.object({
            order_id: z.string(),
        }).passthrough(),
        response: {
            [StatusCodes.OK]: z.object({ received: z.boolean() }),
        },
    },
}
