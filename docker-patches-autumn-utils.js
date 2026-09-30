"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autumnConsole = exports.autumnUtils = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const server_utils_1 = require("@activepieces/server-utils");
const shared_1 = require("@activepieces/shared");
const autumn_js_1 = require("autumn-js");
const keys_1 = require("../../../../database/redis/keys");
const redis_connections_1 = require("../../../../database/redis-connections");
const promise_handler_1 = require("../../../../helper/promise-handler");
const system_1 = require("../../../../helper/system/system");
const system_props_1 = require("../../../../helper/system/system-props");
const billing_provider_1 = require("../../../../platform/billing-provider");
const platform_service_1 = require("../../../../platform/platform.service");
const user_service_1 = require("../../../../user/user-service");
const platform_plan_service_1 = require("../platform-plan.service");
const AUTUMN_CONSOLE_URL = (system_1.system.get(system_props_1.AppSystemProp.AUTUMN_CONSOLE_URL) ?? '').replace(/\/+$/, '');
const edition = system_1.system.getEdition();
const CONSOLE_REQUEST_TIMEOUT_MS = 30000;
const AUTUMN_GET_CUSTOMER_TIMEOUT_MS = 5000;
const CREDITS_CACHE_TTL_SECONDS = 60 * 60;
const FREE_LEGACY_COMP_ATTEMPT_TTL_SECONDS = 5 * 60;
const PROJECT_ID_PROPERTY = 'projectId';
const CREDIT_USAGE_MAX_GROUPS = 250;
const AI_CREDIT_USAGE_SOURCES = [billing_provider_1.CreditUsageSource.AI, billing_provider_1.CreditUsageSource.CHAT];
const BASELINE_PLAN_IDS = [shared_1.PlanName.FREE, shared_1.PlanName.FREE_LEGACY, shared_1.PlanName.APPSUMO];
exports.autumnUtils = {
    client({ secretKey, customerId }) {
        const client = new autumn_js_1.Autumn({ secretKey, failOpen: true });
        return {
            check(params) {
                return client.check({ customerId, ...params });
            },
            track({ idempotencyKey, ...params }) {
                return client.track({ customerId, ...params }, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);
            },
            getCustomer(params) {
                return client.customers.get({ customerId, expand: params?.expand }, { timeoutMs: AUTUMN_GET_CUSTOMER_TIMEOUT_MS });
            },
            listPlans(params) {
                return client.plans.list(params);
            },
            aggregateEvents(params) {
                return client.events.aggregate({ customerId, ...params });
            },
        };
    },
    async loadAutumnCreds(log, platformId) {
        const credentials = await (0, platform_plan_service_1.platformPlanService)(log).getAutumnCredentials(platformId);
        const { autumnCustomerId, autumnApiKey } = credentials;
        if (edition === shared_1.ApEdition.CLOUD && (0, shared_1.isFreeLegacyEligible)(credentials)) {
            (0, promise_handler_1.rejectedPromiseHandler)(exports.autumnUtils.ensureFreeLegacyComped(log, platformId), log);
        }
        if ((0, core_utils_1.isNil)(autumnCustomerId) && (0, core_utils_1.isNil)(autumnApiKey)) {
            return null;
        }
        if ((0, core_utils_1.isNil)(autumnCustomerId) || (0, core_utils_1.isNil)(autumnApiKey)) {
            log.error({ platform: { id: platformId } }, 'Autumn credentials incomplete for an enrolled platform; billing and entitlement calls will silently no-op until repaired');
            return null;
        }
        return { autumnCustomerId, autumnApiKey };
    },
    async resolveClientForPlatform(log, platformId) {
        const creds = await exports.autumnUtils.loadAutumnCreds(log, platformId);
        if ((0, core_utils_1.isNil)(creds)) {
            return null;
        }
        return exports.autumnUtils.client({ secretKey: creds.autumnApiKey, customerId: creds.autumnCustomerId });
    },
    async getCreditUsage(log, platformId, startDate, endDate) {
        const client = await exports.autumnUtils.resolveClientForPlatform(log, platformId);
        if ((0, core_utils_1.isNil)(client)) {
            return { total: 0, byProject: [] };
        }
        const timeRange = !(0, core_utils_1.isNil)(startDate) && !(0, core_utils_1.isNil)(endDate)
            ? { customRange: { start: new Date(startDate).getTime(), end: new Date(endDate).getTime() } }
            : { range: autumn_js_1.Range.Thirtyd };
        const baseParams = {
            featureId: shared_1.ConsumableFeatureId.AP_CREDITS,
            groupBy: `properties.${PROJECT_ID_PROPERTY}`,
            maxGroups: CREDIT_USAGE_MAX_GROUPS,
            ...timeRange,
        };
        const [total, ...aiResults] = await Promise.all([
            client.aggregateEvents(baseParams),
            ...AI_CREDIT_USAGE_SOURCES.map((source) => client.aggregateEvents({ ...baseParams, filterBy: { source } })),
        ]);
        return toCreditUsage({ total, aiResults });
    },
    async ensureEnrolled(log, platformId) {
        if (!AUTUMN_CONSOLE_URL) {
            return;
        }
        const credentials = await (0, platform_plan_service_1.platformPlanService)(log).getAutumnCredentials(platformId);
        if ((0, core_utils_1.isNil)(credentials.autumnCustomerId)) {
            await (0, redis_connections_1.distributedLock)(log).runExclusive({
                key: (0, keys_1.getAutumnEnrollLockKey)(platformId),
                timeoutInSeconds: keys_1.AUTUMN_ENROLL_LOCK_TIMEOUT_SECONDS,
                fn: async () => {
                    const { autumnCustomerId } = await (0, platform_plan_service_1.platformPlanService)(log).getAutumnCredentials(platformId);
                    if (!(0, core_utils_1.isNil)(autumnCustomerId)) {
                        return;
                    }
                    const platformPlan = await (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(platformId);
                    const enrolled = (0, core_utils_1.isNil)(platformPlan.licenseKey) || (0, core_utils_1.isEmpty)(platformPlan.licenseKey)
                        ? await exports.autumnConsole.enrollFree({ email: await exports.autumnUtils.getPlatformOwnerEmail(log, platformId) })
                        : await exports.autumnConsole.activate({ licenseKey: platformPlan.licenseKey });
                    await (0, platform_plan_service_1.platformPlanService)(log).setAutumnCredentials({ platformId, ...enrolled });
                    await exports.autumnUtils.refreshEntitlements(log, platformId);
                },
            });
        }
        await exports.autumnUtils.ensureFreeLegacyComped(log, platformId);
    },
    async ensureFreeLegacyComped(log, platformId) {
        if (!AUTUMN_CONSOLE_URL || edition !== shared_1.ApEdition.CLOUD) {
            return;
        }
        if (!(0, shared_1.isFreeLegacyEligible)(await (0, platform_plan_service_1.platformPlanService)(log).getAutumnCredentials(platformId))) {
            return;
        }
        await redis_connections_1.distributedStore.runOnceWithin((0, keys_1.getFreeLegacyCompAttemptKey)(platformId), FREE_LEGACY_COMP_ATTEMPT_TTL_SECONDS, () => (0, redis_connections_1.distributedLock)(log).runExclusive({
            key: (0, keys_1.getAutumnEnrollLockKey)(platformId),
            timeoutInSeconds: keys_1.AUTUMN_ENROLL_LOCK_TIMEOUT_SECONDS,
            fn: async () => {
                const credentials = await (0, platform_plan_service_1.platformPlanService)(log).getAutumnCredentials(platformId);
                const autumnCustomerId = credentials.autumnCustomerId;
                if (!(0, shared_1.isFreeLegacyEligible)(credentials) || (0, core_utils_1.isNil)(autumnCustomerId)) {
                    return;
                }
                const { error } = await (0, core_utils_1.tryCatch)(() => exports.autumnConsole.compFreeLegacy({ autumnCustomerId }));
                if (!(0, core_utils_1.isNil)(error)) {
                    log.warn({ error, platform: { id: platformId } }, 'Failed to comp the free legacy plan');
                    return;
                }
                await exports.autumnUtils.refreshEntitlements(log, platformId);
            },
        }));
    },
    async refreshEntitlements(log, platformId) {
        if (!AUTUMN_CONSOLE_URL) {
            return;
        }
        const client = await exports.autumnUtils.resolveClientForPlatform(log, platformId);
        if ((0, core_utils_1.isNil)(client)) {
            return;
        }
        const customer = await client.getCustomer({ expand: ['subscriptions.plan', 'purchases.plan'] });
        const entitlements = toAutumnEntitlements(customer);
        const mappedPlan = exports.autumnUtils.mapAutumnFeaturesToPlatformPlan(entitlements);
        // [anticeil] Don't overwrite a manually-set paid plan with Autumn's free plan.
        // When the user has switched to plus/team/enterprise locally but has no real
        // Autumn subscription, Autumn returns planId='free' and would reset the DB.
        const PAID_PLANS = ['plus', 'team', 'enterprise'];
        const autumnPlanIsBaseline = (0, core_utils_1.isNil)(mappedPlan.plan) || !PAID_PLANS.includes(mappedPlan.plan);
        if (autumnPlanIsBaseline) {
            const existingPlan = await (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(platformId);
            if (PAID_PLANS.includes(existingPlan.plan)) {
                await exports.autumnUtils.writeCustomerStateCaches({ platformId, customer, grantedFeatureIds: entitlements.grantedFeatureIds });
                await exports.autumnUtils.invalidateBillingOverview(platformId);
                return;
            }
        }
        await (0, platform_plan_service_1.platformPlanService)(log).update({ platformId, ...mappedPlan });
        await exports.autumnUtils.writeCustomerStateCaches({ platformId, customer, grantedFeatureIds: entitlements.grantedFeatureIds });
        await exports.autumnUtils.invalidateBillingOverview(platformId);
        await exports.autumnUtils.provisionLicenseKeyIfPaid(log, platformId, entitlements.planId);
    },
    async provisionLicenseKeyIfPaid(log, platformId, planId) {
        if ((0, core_utils_1.isNil)(planId) || planId === shared_1.PlanName.FREE || planId === shared_1.PlanName.APPSUMO || planId === shared_1.PlanName.FREE_LEGACY) {
            return;
        }
        const platformPlan = await (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(platformId);
        if (!(0, core_utils_1.isNil)(platformPlan.licenseKey) && !(0, core_utils_1.isEmpty)(platformPlan.licenseKey)) {
            return;
        }
        const creds = await exports.autumnConsole.getCreds(log, platformId);
        if ((0, core_utils_1.isNil)(creds)) {
            return;
        }
        const { data, error } = await (0, core_utils_1.tryCatch)(() => exports.autumnConsole.provisionLicenseKey({ ...creds }));
        if (error) {
            log.warn({ error, platform: { id: platformId } }, 'Failed to provision license key for self-serve paid customer');
            return;
        }
        if (!(0, core_utils_1.isNil)(data.licenseKey)) {
            await (0, platform_plan_service_1.platformPlanService)(log).update({ platformId, licenseKey: data.licenseKey });
        }
    },
    async invalidateBillingOverview(platformId) {
        await redis_connections_1.distributedStore.delete((0, keys_1.getBillingOverviewKey)(platformId));
    },
    mapAutumnFeaturesToPlatformPlan(entitlements) {
        const teamProjects = entitlements.balances[shared_1.UnconsumableFeatureId.TEAM_PROJECTS_LIMIT];
        const users = entitlements.balances[shared_1.UnconsumableFeatureId.USERS_LIMIT];
        const activeFlows = entitlements.balances[shared_1.UnconsumableFeatureId.ACTIVE_FLOWS_LIMIT];
        const credits = entitlements.balances[shared_1.ConsumableFeatureId.AP_CREDITS];
        return {
            ...toPlatformPlanFlags(entitlements.grantedFeatureIds),
            plan: entitlements.planId,
            billedTeamProjectsLimit: toPlatformPlanLimit(teamProjects, 1),
            usersLimit: toPlatformPlanLimit(users, null),
            scheduledUsersLimit: entitlements.scheduledUsersLimit,
            activeFlowsLimit: toPlatformPlanLimit(activeFlows, null),
            includedCredits: credits?.granted ?? 0,
        };
    },
    async readBalance({ platformId, featureId }) {
        return redis_connections_1.distributedStore.get(balanceCacheKey({ platformId, featureId }));
    },
    async writeBalance({ platformId, featureId, balance }) {
        await redis_connections_1.distributedStore.put(balanceCacheKey({ platformId, featureId }), exports.autumnUtils.toBalanceCache(balance), CREDITS_CACHE_TTL_SECONDS);
    },
    toGrantedFeatureIds(attachments) {
        const plans = toEntitlementPlans(attachments);
        if (plans.length > 0 && plans.every((plan) => !plan.expanded)) {
            system_1.system.globalLogger().warn('Autumn customer was read without expanded plans, so no entitlement resolves');
        }
        return new Set(plans.flatMap((plan) => plan.featureIds));
    },
    billingEnforcedFromGrantedFeatureIds(_grantedFeatureIds) {
        return false;
    },
    async writeCustomerStateCaches({ platformId, customer, grantedFeatureIds }) {
        const creditsBalance = customer.balances[shared_1.ConsumableFeatureId.AP_CREDITS];
        const appSumoBalance = customer.balances[shared_1.ConsumableFeatureId.APP_SUMO_AI_CREDITS];
        await Promise.all([
            redis_connections_1.distributedStore.put((0, keys_1.getBillingEnforcedKey)(platformId), exports.autumnUtils.billingEnforcedFromGrantedFeatureIds(grantedFeatureIds), keys_1.BILLING_ENFORCED_TTL_SECONDS),
            (0, core_utils_1.isNil)(creditsBalance) ? Promise.resolve() : exports.autumnUtils.writeBalance({ platformId, featureId: shared_1.ConsumableFeatureId.AP_CREDITS, balance: creditsBalance }),
            (0, core_utils_1.isNil)(appSumoBalance) ? Promise.resolve() : exports.autumnUtils.writeBalance({ platformId, featureId: shared_1.ConsumableFeatureId.APP_SUMO_AI_CREDITS, balance: appSumoBalance }),
        ]);
        return {
            credits: (0, core_utils_1.isNil)(creditsBalance) ? null : exports.autumnUtils.toBalanceCache(creditsBalance),
            appSumo: (0, core_utils_1.isNil)(appSumoBalance) ? null : exports.autumnUtils.toBalanceCache(appSumoBalance),
        };
    },
    toBalanceCache(balance) {
        return {
            granted: balance.granted,
            usage: balance.usage,
            remaining: balance.remaining,
            unlimited: balance.unlimited,
            nextResetAt: largestGrantResetAt(balance) ?? balance.nextResetAt,
            syncedAt: Date.now(),
        };
    },
    toBaseSubscriptions(customer) {
        return customer.subscriptions.filter((subscription) => !subscription.addOn);
    },
    selectCurrentBaseSubscription(baseSubscriptions) {
        const activeBaseSubscriptions = baseSubscriptions.filter((subscription) => subscription.status === 'active');
        return activeBaseSubscriptions.find((subscription) => subscription.planId !== shared_1.PlanName.FREE)
            ?? activeBaseSubscriptions[0]
            ?? baseSubscriptions[0];
    },
    async getPlatformOwnerEmail(log, platformId) {
        const platform = await (0, platform_service_1.platformService)(log).getOneOrThrow(platformId);
        const owner = await (0, user_service_1.userService)(log).getMetaInformation({ id: platform.ownerId });
        return owner.email;
    },
};
exports.autumnConsole = {
    async listPlans({ platformId }) {
        const { plans } = await consoleRequest({
            method: 'get',
            path: '/api/v1/billing/plans',
            query: { version: server_utils_1.apVersionUtil.getCurrentRelease(), platformId },
        });
        return plans.map(toPurchasablePlan);
    },
    async enrollFree({ email }) {
        return consoleRequest({ path: '/api/v1/billing/enroll', body: { email } });
    },
    async activate({ licenseKey }) {
        return consoleRequest({ path: '/api/v1/billing/activate', token: licenseKey });
    },
    async checkout({ autumnCustomerId, autumnApiKey, planId, successUrl }) {
        return consoleRequest({
            path: '/api/v1/billing/checkout',
            token: autumnApiKey,
            body: { autumnCustomerId, planId, successUrl },
        });
    },
    async setUnconsumableQuantity({ autumnCustomerId, autumnApiKey, featureId, quantity }) {
        return consoleRequest({
            path: '/api/v1/billing/unconsumable-feature-quantity',
            token: autumnApiKey,
            body: { autumnCustomerId, featureId, quantity },
        });
    },
    async portal({ autumnCustomerId, autumnApiKey, returnUrl }) {
        return consoleRequest({
            path: '/api/v1/billing/portal',
            token: autumnApiKey,
            body: { autumnCustomerId, returnUrl },
        });
    },
    async configureAutoTopUp(params) {
        const { autumnCustomerId, autumnApiKey, ...body } = params;
        await consoleRequest({ path: '/api/v1/billing/auto-topup', token: autumnApiKey, body: { autumnCustomerId, ...body } });
    },
    async setupPayment({ autumnCustomerId, autumnApiKey, redirectUrl }) {
        return consoleRequest({
            path: '/api/v1/billing/setup-payment',
            token: autumnApiKey,
            body: { autumnCustomerId, redirectUrl },
        });
    },
    async provisionLicenseKey({ autumnCustomerId, autumnApiKey }) {
        return consoleRequest({
            path: '/api/v1/billing/provision-license-key',
            token: autumnApiKey,
            body: { autumnCustomerId },
        });
    },
    async cancel({ autumnCustomerId, autumnApiKey, feedback }) {
        await consoleRequest({
            path: '/api/v1/billing/cancel',
            token: autumnApiKey,
            body: { autumnCustomerId, reasons: feedback.reasons, comment: feedback.comment, canceledByEmail: feedback.canceledByEmail },
        });
    },
    async reactivate({ autumnCustomerId, autumnApiKey }) {
        await consoleRequest({ path: '/api/v1/billing/reactivate', token: autumnApiKey, body: { autumnCustomerId } });
    },
    async compAppSumo({ log, platformId, action }) {
        const creds = await exports.autumnConsole.getCreds(log, platformId);
        (0, core_utils_1.assertNotNullOrUndefined)(creds, 'Autumn credentials must exist before applying an AppSumo plan');
        await consoleRequest({
            path: '/api/v1/billing/appsumo',
            token: system_1.system.get(system_props_1.AppSystemProp.APPSUMO_TOKEN),
            body: { autumnCustomerId: creds.autumnCustomerId, action },
        });
    },
    async compFreeLegacy({ autumnCustomerId }) {
        await consoleRequest({ path: '/api/v1/billing/free-legacy', token: consoleSecretOrThrow(), body: { autumnCustomerId } });
    },
    async getCreds(log, platformId) {
        return exports.autumnUtils.loadAutumnCreds(log, platformId);
    },
};
async function consoleRequest({ path, method = 'post', token, body, query }) {
    if (!AUTUMN_CONSOLE_URL) {
        return {};
    }
    const url = `${AUTUMN_CONSOLE_URL}${path}`;
    const config = {
        timeout: CONSOLE_REQUEST_TIMEOUT_MS,
        params: query,
        headers: (0, core_utils_1.isNil)(token) ? undefined : { Authorization: `Bearer ${token}` },
    };
    const { data: response, error } = await (0, core_utils_1.tryCatch)(() => method === 'get'
        ? server_utils_1.safeHttp.axios.get(url, config)
        : server_utils_1.safeHttp.axios.post(url, body ?? {}, config));
    if (!(0, core_utils_1.isNil)(error)) {
        system_1.system.globalLogger().error({ error, url }, 'Autumn console request failed');
        throw error;
    }
    (0, core_utils_1.assertNotNullOrUndefined)(response, 'response');
    return response.data.data;
}
function consoleSecretOrThrow() {
    const secret = system_1.system.get(system_props_1.AppSystemProp.CONSOLE_API_SECRET_KEY);
    if ((0, core_utils_1.isNil)(secret) || (0, core_utils_1.isEmpty)(secret)) {
        throw new Error('CONSOLE_API_SECRET_KEY is not configured');
    }
    return secret;
}
function balanceCacheKey({ platformId, featureId }) {
    return featureId === shared_1.ConsumableFeatureId.AP_CREDITS
        ? (0, keys_1.getCreditsBalanceKey)(platformId)
        : (0, keys_1.getAppSumoAiCreditsBalanceKey)(platformId);
}
function largestGrantResetAt(balance) {
    const resets = (balance.breakdown ?? []).filter((entry) => !(0, core_utils_1.isNil)(entry.reset?.resetsAt));
    if (resets.length < 2) {
        return null;
    }
    return resets.reduce((largest, entry) => entry.includedGrant > largest.includedGrant ? entry : largest).reset?.resetsAt ?? null;
}
function toPurchasablePlan(plan) {
    const creditsItem = (plan.items ?? []).find((item) => item.featureId === shared_1.ConsumableFeatureId.AP_CREDITS && (0, core_utils_1.isNil)(item.price));
    return {
        id: plan.id,
        name: plan.name,
        description: plan.description ?? null,
        price: plan.price?.amount ?? null,
        interval: plan.price?.interval ?? null,
        priceDisplay: plan.price?.display?.primaryText ?? null,
        baseVariantId: plan.variantDetails?.basePlanId ?? plan.baseVariantId ?? null,
        includedSeats: (plan.items ?? []).find((item) => item.featureId === shared_1.UnconsumableFeatureId.USERS_LIMIT)?.included ?? null,
        includedCredits: creditsItem?.included ?? null,
        creditsResetInterval: creditsItem?.reset?.interval ?? null,
    };
}
function sumCreditsByProject(response) {
    const featureId = shared_1.ConsumableFeatureId.AP_CREDITS;
    const byProjectMap = new Map();
    for (const bin of response.list ?? []) {
        const grouped = bin.groupedValues?.[featureId] ?? {};
        for (const [projectId, value] of Object.entries(grouped)) {
            byProjectMap.set(projectId, (byProjectMap.get(projectId) ?? 0) + value);
        }
    }
    return byProjectMap;
}
function toCreditUsage({ total, aiResults }) {
    const creditsByProject = sumCreditsByProject(total);
    const aiCreditsByProject = new Map();
    for (const result of aiResults) {
        for (const [projectId, value] of sumCreditsByProject(result)) {
            aiCreditsByProject.set(projectId, (aiCreditsByProject.get(projectId) ?? 0) + value);
        }
    }
    return {
        total: total.total?.[shared_1.ConsumableFeatureId.AP_CREDITS]?.sum ?? 0,
        byProject: [...creditsByProject].map(([projectId, creditsUsed]) => ({
            projectId,
            creditsUsed,
            aiCreditsUsed: aiCreditsByProject.get(projectId) ?? 0,
        })),
    };
}
function toAutumnEntitlements(customer) {
    const balances = {};
    for (const [featureId, balance] of Object.entries(customer.balances)) {
        balances[featureId] = {
            granted: balance.granted,
            usage: balance.usage,
            remaining: balance.remaining,
            unlimited: balance.unlimited,
            nextResetAt: balance.nextResetAt,
        };
    }
    // A lifetime plan (e.g. AppSumo) is a one-off `purchase`, not a subscription — the only base subscription.
    // Resolve from the ACTIVE base subscription (mirroring toBillingInfo): a scheduled future plan (e.g. a
    // pending end-of-cycle downgrade) also lives in `subscriptions`, and picking it here would mislabel the
    // customer as already on the plan they only switch to later.
    const baseSubscriptions = exports.autumnUtils.toBaseSubscriptions(customer);
    const baseSubscriptionPlanId = exports.autumnUtils.selectCurrentBaseSubscription(baseSubscriptions)?.planId ?? null;
    const purchasedPlanId = (customer.purchases ?? [])
        .find((purchase) => !(0, core_utils_1.isNil)(purchase.planId) && purchase.planId !== shared_1.PlanName.FREE)?.planId ?? null;
    const planId = baseSubscriptionPlanId != null && baseSubscriptionPlanId !== shared_1.PlanName.FREE
        ? baseSubscriptionPlanId
        : purchasedPlanId ?? baseSubscriptionPlanId;
    return {
        planId,
        grantedFeatureIds: exports.autumnUtils.toGrantedFeatureIds(customer),
        balances,
        scheduledUsersLimit: toScheduledUsersLimit(baseSubscriptions),
    };
}
function toEntitlementPlans(attachments) {
    const now = Date.now();
    const attached = [
        ...attachments.subscriptions.filter((subscription) => subscription.status === 'active'),
        ...attachments.purchases.filter((purchase) => (0, core_utils_1.isNil)(purchase.expiresAt) || purchase.expiresAt > now),
    ].map(toEntitlementPlan);
    const hasNonBaselinePlan = attached.some((plan) => !plan.addOn && !BASELINE_PLAN_IDS.includes(plan.planId));
    return attached.filter((plan) => !hasNonBaselinePlan || !BASELINE_PLAN_IDS.includes(plan.planId));
}
function toEntitlementPlan(attachment) {
    return {
        planId: attachment.planId,
        addOn: attachment.plan?.addOn ?? false,
        expanded: !(0, core_utils_1.isNil)(attachment.plan),
        featureIds: (attachment.plan?.items ?? []).map((item) => item.featureId),
    };
}
function toPlatformPlanFlags(_grantedFeatureIds) {
    return {
        tablesEnabled: true,
        eventStreamingEnabled: true,
        environmentsEnabled: true,
        analyticsEnabled: true,
        showPoweredBy: false,
        auditLogEnabled: true,
        embeddingEnabled: true,
        aiProvidersEnabled: true,
        chatEnabled: true,
        agentsEnabled: true,
        workerGroupsEnabled: true,
        managePiecesEnabled: true,
        manageTemplatesEnabled: true,
        customAppearanceEnabled: true,
        projectRolesEnabled: true,
        globalConnectionsEnabled: true,
        customRolesEnabled: true,
        apiKeysEnabled: true,
        ssoEnabled: true,
        secretManagersEnabled: true,
        scimEnabled: true,
    };
}
function toScheduledUsersLimit(baseSubscriptions) {
    const scheduledSubscription = baseSubscriptions.find((subscription) => subscription.status === 'scheduled');
    const usersLimitItem = (scheduledSubscription?.plan?.items ?? [])
        .find((item) => item.featureId === shared_1.UnconsumableFeatureId.USERS_LIMIT);
    if ((0, core_utils_1.isNil)(usersLimitItem) || usersLimitItem.unlimited) {
        return null;
    }
    return usersLimitItem.included ?? null;
}
function toPlatformPlanLimit(balance, whenAbsent) {
    if ((0, core_utils_1.isNil)(balance)) {
        return whenAbsent;
    }
    if (balance.unlimited) {
        return null;
    }
    return balance.granted ?? whenAbsent;
}
//# sourceMappingURL=autumn-utils.js.map