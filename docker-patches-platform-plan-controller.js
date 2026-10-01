"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformPlanController = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const server_utils_1 = require("@activepieces/server-utils");
const shared_1 = require("@activepieces/shared");
const http_status_codes_1 = require("http-status-codes");
const zod_1 = require("zod");
const fastify_security_1 = require("../../../core/security/authorization/fastify-security");
const keys_1 = require("../../../database/redis/keys");
const redis_connections_1 = require("../../../database/redis-connections");
const promise_handler_1 = require("../../../helper/promise-handler");
const billing_provider_1 = require("../../../platform/billing-provider");
const platform_service_1 = require("../../../platform/platform.service");
const user_service_1 = require("../../../user/user-service");
const platform_plan_telemetry_1 = require("./platform-plan-telemetry");
const platform_plan_service_1 = require("./platform-plan.service");
const FORCE_REFRESH_DEDUP_SECONDS = 60;
const DEFAULT_USAGE_PAGE_SIZE = 10;

function resolvePlanLimitsAndFeatures(planName = 'free') {
    const raw = (planName || 'free').toLowerCase();
    const isEnterprise = raw.includes('enterprise');
    const isTeam = raw.includes('team') || isEnterprise;
    const isPlus = raw.includes('plus') || isTeam;

    return {
        plan: isEnterprise ? 'enterprise' : (isTeam ? 'team' : (isPlus ? 'plus' : 'free')),
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
    };
}

const platformPlanController = async (app) => {
    app.get('/info', { config: { allowedPrincipals: [shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE] } }, async (request, reply) => {
        try {
            let platformId = request.principal?.platform?.id || request.principal?.platformId;
            if (!platformId) {
                const platforms = await (0, platform_service_1.platformService)(request.log).getAll();
                platformId = platforms[0]?.id;
            }
            if (!platformId) {
                return reply.status(200).send(getUnlimitedBillingInfo());
            }
            const info = await getBillingInformation(request.log, platformId);
            return reply.status(200).send(info);
        } catch (e) {
            request.log.warn({ err: e }, '[anticeil] billing info error, attempting recovery with platform');
            try {
                const platforms = await (0, platform_service_1.platformService)(request.log).getAll();
                if (platforms[0]?.id) {
                    const fallbackInfo = await getBillingInformation(request.log, platforms[0].id);
                    return reply.status(200).send(fallbackInfo);
                }
            } catch (err2) {
                request.log.error({ err: err2 }, '[anticeil] secondary fallback failed');
            }
            return reply.status(200).send(getUnlimitedBillingInfo());
        }
    });
    app.post('/refresh', RefreshRequest, async (request) => {
        const platformId = request.principal.platform.id;
        await redis_connections_1.distributedStore.runOnceWithin((0, keys_1.getEntitlementsForceRefreshKey)(platformId), FORCE_REFRESH_DEDUP_SECONDS, () => billing_provider_1.billingProvider.get(request.log).refreshEntitlements(platformId));
        return getBillingInformation(request.log, platformId);
    });
    app.get('/plans', ListPlansRequest, async (request) => {
        return billing_provider_1.billingProvider.get(request.log).listPlans(request.principal.platform.id);
    });
    app.get('/projects-usage', ProjectsUsageRequest, async (request) => {
        return (0, platform_plan_service_1.platformPlanService)(request.log).getCreditUsageByProject({
            platformId: request.principal.platform.id,
            startDate: request.query.startDate,
            endDate: request.query.endDate,
            cursor: request.query.cursor ?? null,
            limit: request.query.limit ?? DEFAULT_USAGE_PAGE_SIZE,
            userId: request.principal.id,
            principalType: request.principal.type,
        });
    });
    app.post('/checkout', CheckoutRequest, async (request) => {
        const platformId = request.principal.platform.id;
        const result = await billing_provider_1.billingProvider.get(request.log).createCheckoutSession({
            platformId,
            planId: request.body.planId,
            successUrl: request.body.successUrl,
        });
        (0, promise_handler_1.rejectedPromiseHandler)((0, platform_plan_telemetry_1.platformPlanTelemetry)(request.log).onCheckoutStarted({ platformId, planId: request.body.planId }), request.log);
        await refreshWhenAppliedImmediately({ log: request.log, platformId, checkoutUrl: result.checkoutUrl });
        return result;
    });
    app.post('/cancel', CancelRequest, async (request) => {
        const platformId = request.principal.platform.id;
        const provider = billing_provider_1.billingProvider.get(request.log);
        await provider.cancelSubscription({
            platformId,
            feedback: {
                reasons: request.body.reasons,
                comment: request.body.comment ?? null,
                canceledByEmail: await resolveActorEmail(request.log, request.principal.id),
            },
        });
        await provider.refreshEntitlements(platformId);
    });
    app.post('/reactivate', ReactivateRequest, async (request) => {
        const platformId = request.principal.platform.id;
        const provider = billing_provider_1.billingProvider.get(request.log);
        await provider.reactivateSubscription({ platformId });
        (0, promise_handler_1.rejectedPromiseHandler)((0, platform_plan_telemetry_1.platformPlanTelemetry)(request.log).onReactivated({ platformId }), request.log);
        await provider.refreshEntitlements(platformId);
    });
    app.post('/portal', { config: PLATFORM_ADMIN_ONLY }, async (request) => {
        const { url } = await billing_provider_1.billingProvider.get(request.log).getBillingPortalUrl({ platformId: request.principal.platform.id });
        return url;
    });
    app.post('/activate', ActivateLicenseRequest, async (request) => {
        await billing_provider_1.billingProvider.get(request.log).activateLicense({
            platformId: request.principal.platform.id,
            licenseKey: request.body.licenseKey,
        });
    });
    app.post('/unconsumable-feature-quantity', AdjustUnconsumableFeatureQuantityRequest, async (request) => {
        const platformId = request.principal.platform.id;
        const provider = billing_provider_1.billingProvider.get(request.log);
        const { checkoutUrl } = await provider.adjustUnconsumableFeatureQuantity({
            platformId,
            featureId: request.body.featureId,
            quantity: request.body.quantity,
        });
        await refreshWhenAppliedImmediately({ log: request.log, platformId, checkoutUrl });
        return { paymentUrl: checkoutUrl };
    });
    app.post('/consumable-product-topups/auto-topup', ConsumableProductAutoTopupRequest, async (request) => {
        const platformId = request.principal.platform.id;
        const provider = billing_provider_1.billingProvider.get(request.log);
        await provider.configureAutoTopUp({
            ...request.body,
            platformId,
        });
        await provider.refreshEntitlements(platformId);
        return {};
    });
    app.post('/setup-payment', SetupPaymentRequest, async (request) => {
        return billing_provider_1.billingProvider.get(request.log).setupPayment({
            redirectUrl: request.body.redirectUrl,
            platformId: request.principal.platform.id,
        });
    });
    app.post('/switch-plan', { config: { allowedPrincipals: [shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE] } }, async (request, reply) => {
        try {
            let platformId = request.principal?.platform?.id;
            if (!platformId) {
                const platforms = await (0, platform_service_1.platformService)(request.log).getAll();
                platformId = platforms[0]?.id;
            }
            if (!platformId) {
                return reply.status(200).send({ success: true, plan: 'enterprise' });
            }

            const body = request.body;
            const planName = (body?.plan || 'enterprise').toLowerCase();
            const planData = resolvePlanLimitsAndFeatures(planName);

            const planRepo = (0, platform_plan_service_1.platformPlanRepo)();
            const existing = await planRepo.findOneBy({ platformId });

            if (existing) {
                await planRepo.update({ platformId }, planData);
            } else {
                await planRepo.save({
                    id: (0, core_utils_1.apId)(),
                    platformId,
                    ...planData,
                });
            }
            await redis_connections_1.distributedStore.delete((0, keys_1.getBillingOverviewKey)(platformId));
            await redis_connections_1.distributedStore.delete((0, keys_1.getPlatformPlanNameKey)(platformId));
            await redis_connections_1.distributedStore.delete((0, keys_1.getCreditsBalanceKey)(platformId));
            await redis_connections_1.distributedStore.delete((0, keys_1.getCustomerStateMissKey)(platformId));

            const currentMonth = (0, server_utils_1.apDayjs)().format('YYYY-MM');
            const usageKey = `anticeil:credits_usage:${platformId}:${currentMonth}`;
            const currentUsage = (await redis_connections_1.distributedStore.get(usageKey)) ?? 0;
            const newBalance = {
                featureId: shared_1.ConsumableFeatureId.AP_CREDITS,
                granted: planData.includedCredits,
                usage: currentUsage,
                remaining: Math.max(0, planData.includedCredits - currentUsage),
                unlimited: false,
                syncedAt: Date.now(),
                nextResetAt: (0, server_utils_1.apDayjs)().endOf('month').valueOf(),
            };
            await redis_connections_1.distributedStore.put((0, keys_1.getCreditsBalanceKey)(platformId), newBalance, 60 * 60);

            request.log.info({ platformId, planName: planData.plan, creditsRemaining: newBalance.remaining }, 'Plan switched successfully');
            return reply.status(200).send({ success: true, plan: planData.plan });
        } catch (err) {
            request.log.error({ err }, 'Failed to switch plan');
            return reply.status(500).send({ statusCode: 500, error: 'Internal Server Error', message: err?.message || 'Failed to switch plan' });
        }
    });
    app.post('/midtrans-webhook', { config: { allowedPrincipals: [shared_1.PrincipalType.UNKNOWN, shared_1.PrincipalType.SERVICE] } }, async (request, reply) => {
        const body = request.body;
        const orderId = body?.order_id;
        const transactionStatus = body?.transaction_status;
        const fraudStatus = body?.fraud_status;

        request.log.info({ orderId, transactionStatus, fraudStatus }, 'Midtrans webhook received');

        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'accept' || !fraudStatus) {
                const grossAmount = Number(body?.gross_amount);
                const isTeam = grossAmount >= 2000000;
                const isPlus = grossAmount >= 200000 && !isTeam;

                const platforms = await (0, platform_service_1.platformService)(request.log).getAll();
                const platform = platforms[0];
                if (platform) {
                    const planName = isTeam ? 'team' : (isPlus ? 'plus' : 'free');
                    const planData = resolvePlanLimitsAndFeatures(planName);
                    await (0, platform_plan_service_1.platformPlanRepo)().update({ platformId: platform.id }, planData);
                    await redis_connections_1.distributedStore.delete((0, keys_1.getBillingOverviewKey)(platform.id));
                    await redis_connections_1.distributedStore.delete((0, keys_1.getPlatformPlanNameKey)(platform.id));
                    await redis_connections_1.distributedStore.delete((0, keys_1.getCreditsBalanceKey)(platform.id));
                    await redis_connections_1.distributedStore.delete((0, keys_1.getCustomerStateMissKey)(platform.id));

                    const currentMonth = (0, server_utils_1.apDayjs)().format('YYYY-MM');
                    const usageKey = `anticeil:credits_usage:${platform.id}:${currentMonth}`;
                    const currentUsage = (await redis_connections_1.distributedStore.get(usageKey)) ?? 0;
                    const newBalance = {
                        featureId: shared_1.ConsumableFeatureId.AP_CREDITS,
                        granted: planData.includedCredits,
                        usage: currentUsage,
                        remaining: Math.max(0, planData.includedCredits - currentUsage),
                        unlimited: false,
                        syncedAt: Date.now(),
                        nextResetAt: (0, server_utils_1.apDayjs)().endOf('month').valueOf(),
                    };
                    await redis_connections_1.distributedStore.put((0, keys_1.getCreditsBalanceKey)(platform.id), newBalance, 60 * 60);
                    request.log.info({ platformId: platform.id, planName: planData.plan, creditsRemaining: newBalance.remaining }, 'Midtrans plan upgraded successfully');
                }
            }
        }
        return reply.status(200).send({ status: 'OK' });
    });
};
exports.platformPlanController = platformPlanController;
function resolvePlanLimitsAndFeatures(planName = 'free') {
    const raw = (planName || 'free').toLowerCase();
    const isEnterprise = raw.includes('enterprise');
    const isTeam = raw.includes('team') || isEnterprise;
    const isPlus = raw.includes('plus') || isTeam;
    const finalPlanName = isEnterprise ? 'enterprise' : (isTeam ? 'team' : (isPlus ? 'plus' : 'free'));

    return {
        plan: finalPlanName,
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
    };
}

function getUnlimitedBillingInfo(requestedPlan = 'free') {
    const limits = resolvePlanLimitsAndFeatures(requestedPlan);
    return {
        plan: {
            id: 'self-hosted',
            platformId: 'self-hosted',
            stripeSubscriptionId: null,
            stripeCustomerId: null,
            ...limits,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        },
        usage: {
            creditsUsed: 0,
            creditsRemaining: limits.includedCredits,
            creditsNextResetAt: null,
            appSumoAiCreditsUsed: null,
            appSumoAiCreditsRemaining: null,
            activeFlows: 0,
            teamProjects: 0,
            users: 1,
            activeUsers: 1,
            invitedSeats: 0,
        },
        creditsResetInterval: 'month',
        planInterval: 'month',
        autumnPlanName: limits.plan === 'enterprise' ? 'Enterprise' : (limits.plan === 'team' ? 'Team' : (limits.plan === 'plus' ? 'Plus' : 'Free')),
        scheduledPlanName: null,
        nextBillingAmount: limits.plan === 'team' ? 2990000 : (limits.plan === 'plus' ? 299000 : 0),
        nextBillingDate: null,
        cancelAt: null,
        trialEndsAt: null,
        creditsFeature: null,
        appSumoCreditsFeature: null,
        seatsFeature: null,
        billingPortalAvailable: false,
        billingEnforced: false,
        billingUnavailable: false,
        includedSeats: limits.usersLimit,
        additionalSeats: null,
    };
}
async function getBillingInformation(log, platformId) {
    const platform = await (0, platform_service_1.platformService)(log).getOneOrThrow(platformId);
    const [platformPlan, usage, overview, billingEnforced] = await Promise.all([
        (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(platform.id),
        (0, platform_plan_service_1.platformPlanService)(log).getUsage(platform.id),
        billing_provider_1.billingProvider.get(log).getBillingOverview(platform.id),
        billing_provider_1.billingProvider.get(log).isBillingEnforced(platform.id),
    ]);
    const { startDate: billingPeriodStart, endDate: nextBillingDate, nextBillingAmount, cancelAt, trialEndsAt, planName: autumnPlanName, scheduledPlanName, billingPortalAvailable, creditsResetInterval, planInterval, creditsFeature, appSumoCreditsFeature, seatsFeature, includedSeats, additionalSeats, unavailable: billingUnavailable } = overview;
    const usageWithCredits = usage.creditsRemaining === null
        ? { ...usage, creditsUsed: await fetchUnlimitedCreditsUsed({ log, platformId: platform.id, startDate: billingPeriodStart, endDate: nextBillingDate, fallback: usage.creditsUsed }) }
        : usage;

    const currentPlanKey = (platformPlan?.plan || 'free').toLowerCase();
    const planLimits = resolvePlanLimitsAndFeatures(currentPlanKey);
    const effectivePlan = {
        ...platformPlan,
        ...planLimits,
    };
    const isEnterprise = planLimits.plan === 'enterprise';
    const isTeam = planLimits.plan === 'team' || isEnterprise;
    const isPlus = planLimits.plan === 'plus' || isTeam;
    const hasPaidLocalPlan = isPlus || isTeam || isEnterprise;
    const fallbackPlanName = isEnterprise ? 'Enterprise' : (isTeam ? 'Team' : (isPlus ? 'Plus' : 'Free'));
    const displayPlanName = hasPaidLocalPlan ? fallbackPlanName : (autumnPlanName || 'Free');

    const currentCreditsUsed = usageWithCredits.creditsUsed ?? 0;
    const planCredits = effectivePlan.includedCredits;
    const consistentCreditsRemaining = (planCredits !== null && planCredits !== undefined)
        ? Math.max(0, planCredits - currentCreditsUsed)
        : usageWithCredits.creditsRemaining;

    const coherentUsage = {
        ...usageWithCredits,
        creditsUsed: currentCreditsUsed,
        creditsRemaining: consistentCreditsRemaining,
    };

    return {
        plan: effectivePlan,
        usage: coherentUsage,
        creditsResetInterval: creditsResetInterval || 'month',
        planInterval: planInterval || 'month',
        autumnPlanName: displayPlanName,
        scheduledPlanName,
        nextBillingAmount: nextBillingAmount ?? (currentPlanKey === 'team' ? 2990000 : (currentPlanKey === 'plus' ? 299000 : 0)),
        nextBillingDate,
        cancelAt,
        trialEndsAt,
        creditsFeature,
        appSumoCreditsFeature,
        seatsFeature,
        billingPortalAvailable,
        billingEnforced,
        billingUnavailable: false,
        includedSeats: includedSeats ?? effectivePlan.usersLimit,
        additionalSeats,
    };
}
async function refreshWhenAppliedImmediately({ log, platformId, checkoutUrl }) {
    if (!(0, shared_1.isNil)(checkoutUrl)) {
        return;
    }
    await billing_provider_1.billingProvider.get(log).refreshEntitlements(platformId);
}
async function resolveActorEmail(log, userId) {
    const { data: user, error } = await (0, core_utils_1.tryCatch)(() => (0, user_service_1.userService)(log).getMetaInformation({ id: userId }));
    if (!(0, shared_1.isNil)(error) || (0, shared_1.isNil)(user)) {
        log.warn({ error, user: { id: userId } }, 'Failed to resolve the cancelling user email; recording the cancellation without it');
        return null;
    }
    return user.email;
}
async function fetchUnlimitedCreditsUsed({ log, platformId, startDate, endDate, fallback }) {
    const { data: creditUsage, error } = await (0, core_utils_1.tryCatch)(() => billing_provider_1.billingProvider.get(log).getCreditUsage({ platformId, startDate, endDate }));
    if (!(0, shared_1.isNil)(error) || (0, shared_1.isNil)(creditUsage)) {
        log.warn({ error, platform: { id: platformId } }, 'Failed to aggregate credit usage for an unlimited plan; reporting the cached value');
        return fallback;
    }
    return creditUsage.total;
}
const PLATFORM_ADMIN_ONLY = {
    security: fastify_security_1.securityAccess.platformAdminOnly([shared_1.PrincipalType.USER]),
};
const InfoRequest = {
    config: { allowedPrincipals: [shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE] },
    schema: {
        response: {
            [http_status_codes_1.StatusCodes.OK]: shared_1.PlatformBillingInformation,
        },
    },
};
const RefreshRequest = {
    config: PLATFORM_ADMIN_ONLY,
    schema: {
        response: {
            [http_status_codes_1.StatusCodes.OK]: shared_1.PlatformBillingInformation,
        },
    },
};
const ProjectsUsageRequest = {
    schema: {
        querystring: zod_1.z.object({
            startDate: zod_1.z.string().optional(),
            endDate: zod_1.z.string().optional(),
            cursor: zod_1.z.string().optional(),
            limit: zod_1.z.coerce.number().optional(),
        }),
        response: {
            [http_status_codes_1.StatusCodes.OK]: (0, core_utils_1.SeekPage)(shared_1.ProjectCreditUsage),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
};
const ListPlansRequest = {
    schema: {
        response: {
            [http_status_codes_1.StatusCodes.OK]: zod_1.z.array(shared_1.PurchasablePlan),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
};
const CheckoutRequest = {
    schema: {
        body: shared_1.CheckoutPlanParamsSchema,
        response: {
            [http_status_codes_1.StatusCodes.OK]: shared_1.CheckoutSessionResponse,
        },
    },
    config: PLATFORM_ADMIN_ONLY,
};
const CancelRequest = {
    config: PLATFORM_ADMIN_ONLY,
    schema: {
        body: shared_1.CancelSubscriptionRequest,
    },
};
const ReactivateRequest = {
    config: PLATFORM_ADMIN_ONLY,
};
const AdjustUnconsumableFeatureQuantityRequest = {
    schema: {
        body: shared_1.AdjustUnconsumableFeatureQuantityParams,
        response: {
            [http_status_codes_1.StatusCodes.OK]: zod_1.z.object({
                paymentUrl: zod_1.z.string().nullable(),
            }),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
};
const ActivateLicenseRequest = {
    schema: {
        body: zod_1.z.object({
            licenseKey: zod_1.z.string(),
        }),
    },
    config: PLATFORM_ADMIN_ONLY,
};
const ConsumableProductAutoTopupRequest = {
    schema: {
        body: shared_1.ConsumableProductAutoTopupParams,
        response: {
            [http_status_codes_1.StatusCodes.OK]: zod_1.z.object({}),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
};
const SetupPaymentRequest = {
    schema: {
        body: shared_1.SetupPaymentParams,
        response: {
            [http_status_codes_1.StatusCodes.OK]: zod_1.z.object({
                url: zod_1.z.string().nullable(),
            }),
        },
    },
    config: PLATFORM_ADMIN_ONLY,
};
