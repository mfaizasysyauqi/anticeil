"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autumnBillingProvider = void 0;
exports.computeCreditState = computeCreditState;
const core_utils_1 = require("@activepieces/core-utils");
const server_utils_1 = require("@activepieces/server-utils");
const shared_1 = require("@activepieces/shared");
const autumn_js_1 = require("autumn-js");
const keys_1 = require("../../../../database/redis/keys");
const redis_connections_1 = require("../../../../database/redis-connections");
const promise_handler_1 = require("../../../../helper/promise-handler");
const billing_provider_1 = require("../../../../platform/billing-provider");
const platform_plan_service_1 = require("../platform-plan.service");
const autumn_utils_1 = require("./autumn-utils");
const CREDITS_REFETCH_PERIOD_MS = 180 * 1000;
const CUSTOMER_STATE_REFRESH_DEBOUNCE_SECONDS = 15;
const CUSTOMER_STATE_MISS_DEBOUNCE_SECONDS = 60;
const CUSTOMER_STATE_FETCH_LOCK_TIMEOUT_SECONDS = 15;
const CREDITS_CACHE_READ_TIMEOUT_MS = 25;
const BILLING_OVERVIEW_TTL_SECONDS = 5 * 60;
const TRIAL_DURATION_UNITS = { day: 'day', month: 'month', year: 'year' };
const MIDTRANS_PLANS = [
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
        price: 2999000,
        interval: 'month',
        priceDisplay: 'Rp 2.999.000',
        baseVariantId: null,
        includedSeats: 25,
        includedCredits: 50000,
        creditsResetInterval: 'month',
    },
    {
        id: 'team_annual',
        name: 'Team (annual)',
        description: 'Designed for teams collaborating on automations (Annual Discount)',
        price: 29990000,
        interval: 'year',
        priceDisplay: 'Rp 29.990.000',
        baseVariantId: null,
        includedSeats: 25,
        includedCredits: 50000,
        creditsResetInterval: 'month',
    },
];

const autumnBillingProvider = (log) => ({
    listPlans: async (platformId) => {
        const plans = await autumn_utils_1.autumnConsole.listPlans({ platformId });
        return (plans && plans.length > 0) ? plans : MIDTRANS_PLANS;
    },
    getBillingOverview: async (platformId) => {
        const cached = await redis_connections_1.distributedStore.get((0, keys_1.getBillingOverviewKey)(platformId));
        if (!(0, core_utils_1.isNil)(cached)) {
            return cached;
        }
        return (0, redis_connections_1.distributedLock)(log).runExclusive({
            key: (0, keys_1.getBillingOverviewFetchLockKey)(platformId),
            timeoutInSeconds: CUSTOMER_STATE_FETCH_LOCK_TIMEOUT_SECONDS,
            fn: async () => {
                const again = await redis_connections_1.distributedStore.get((0, keys_1.getBillingOverviewKey)(platformId));
                if (!(0, core_utils_1.isNil)(again)) {
                    return again;
                }
                return fetchBillingOverview(log, platformId);
            },
        });
    },
    createCheckoutSession: async ({ platformId, planId, successUrl }) => withEnrolledCreds({
        log,
        platformId,
        fallback: { checkoutUrl: null },
        fn: async (creds) => {
            const targetPlan = (await autumn_utils_1.autumnConsole.listPlans({ platformId })).find((plan) => plan.id === planId);
            if (!(0, core_utils_1.isNil)(targetPlan) && !(0, core_utils_1.isNil)(targetPlan.includedSeats)) {
                await (0, platform_plan_service_1.assertSeatsNotBelowActiveUsers)({ platformId, targetLimit: targetPlan.includedSeats, log });
            }
            const { paymentUrl } = await autumn_utils_1.autumnConsole.checkout({ ...creds, planId, successUrl });
            return { checkoutUrl: paymentUrl };
        },
    }),
    getBillingPortalUrl: async ({ platformId, returnUrl }) => {
        const creds = await autumn_utils_1.autumnConsole.getCreds(log, platformId);
        if ((0, core_utils_1.isNil)(creds)) {
            return { url: '' };
        }
        const { url } = await autumn_utils_1.autumnConsole.portal({ ...creds, returnUrl });
        return { url: url ?? '' };
    },
    adjustUnconsumableFeatureQuantity: async ({ platformId, featureId, quantity }) => {
        if (featureId === shared_1.UnconsumableFeatureId.USERS_LIMIT) {
            await (0, platform_plan_service_1.assertSeatsNotBelowActiveUsers)({ platformId, targetLimit: quantity, log });
        }
        return withEnrolledCreds({
            log,
            platformId,
            fallback: { checkoutUrl: null },
            fn: async (creds) => {
                const { paymentUrl } = await autumn_utils_1.autumnConsole.setUnconsumableQuantity({ ...creds, featureId, quantity });
                return { checkoutUrl: paymentUrl };
            },
        });
    },
    configureAutoTopUp: async (params) => withEnrolledCreds({
        log,
        platformId: params.platformId,
        fallback: undefined,
        fn: async (creds) => {
            await autumn_utils_1.autumnConsole.configureAutoTopUp(params.state === shared_1.AiCreditsAutoTopUpState.DISABLED
                ? { ...creds, featureId: params.featureId, enabled: false }
                : {
                    ...creds,
                    featureId: params.featureId,
                    enabled: true,
                    threshold: params.minThreshold,
                    quantity: params.creditsToAdd,
                    maxMonthlyTopUps: params.maxMonthlyTopUps,
                });
            await autumn_utils_1.autumnUtils.invalidateBillingOverview(params.platformId);
        },
    }),
    setupPayment: async ({ platformId, redirectUrl }) => withEnrolledCreds({
        log,
        platformId,
        fallback: { url: null },
        fn: (creds) => autumn_utils_1.autumnConsole.setupPayment({ ...creds, redirectUrl }),
    }),
    cancelSubscription: async ({ platformId, feedback }) => withEnrolledCreds({
        log,
        platformId,
        fallback: undefined,
        fn: async (creds) => {
            const freePlan = (await autumn_utils_1.autumnConsole.listPlans({ platformId })).find((plan) => plan.id === shared_1.PlanName.FREE);
            if (!(0, core_utils_1.isNil)(freePlan) && !(0, core_utils_1.isNil)(freePlan.includedSeats)) {
                await (0, platform_plan_service_1.assertSeatsNotBelowActiveUsers)({ platformId, targetLimit: freePlan.includedSeats, log });
            }
            await autumn_utils_1.autumnConsole.cancel({ ...creds, feedback });
        },
    }),
    reactivateSubscription: async ({ platformId }) => withEnrolledCreds({
        log,
        platformId,
        fallback: undefined,
        fn: (creds) => autumn_utils_1.autumnConsole.reactivate({ ...creds }),
    }),
    trackFeature: async (params) => {
        await sendTrackEvent({ ...params, log });
    },
    ensureEnrolled: async (platformId) => {
        await autumn_utils_1.autumnUtils.ensureEnrolled(log, platformId);
    },
    compFreeLegacy: async (platformId) => {
        await autumn_utils_1.autumnUtils.ensureFreeLegacyComped(log, platformId);
    },
    refreshEntitlements: async (platformId) => {
        await autumn_utils_1.autumnUtils.refreshEntitlements(log, platformId);
    },
    applyAppSumoPlan: async ({ platformId, action }) => {
        await autumn_utils_1.autumnUtils.ensureEnrolled(log, platformId);
        await autumn_utils_1.autumnConsole.compAppSumo({ log, platformId, action });
        await autumn_utils_1.autumnUtils.refreshEntitlements(log, platformId);
    },
    activateLicense: async ({ platformId, licenseKey }) => {
        const credentials = await autumn_utils_1.autumnConsole.activate({ licenseKey });
        await (0, redis_connections_1.distributedLock)(log).runExclusive({
            key: (0, keys_1.getAutumnEnrollLockKey)(platformId),
            timeoutInSeconds: keys_1.AUTUMN_ENROLL_LOCK_TIMEOUT_SECONDS,
            fn: async () => {
                const { autumnCustomerId: replacedCustomerId } = await (0, platform_plan_service_1.platformPlanService)(log).getAutumnCredentials(platformId);
                if (!(0, core_utils_1.isNil)(replacedCustomerId) && replacedCustomerId !== credentials.autumnCustomerId) {
                    log.warn({ platform: { id: platformId }, replacedCustomerId, autumnCustomerId: credentials.autumnCustomerId }, 'License activation replaced an existing Autumn customer; the previous subscription is now orphaned and needs manual reconciliation');
                }
                await (0, platform_plan_service_1.platformPlanService)(log).update({ platformId, licenseKey });
                await (0, platform_plan_service_1.platformPlanService)(log).setAutumnCredentials({ platformId, ...credentials });
            },
        });
        await autumn_utils_1.autumnUtils.refreshEntitlements(log, platformId);
    },
    isBillingEnforced: async (platformId) => {
        return (await redis_connections_1.distributedStore.get((0, keys_1.getBillingEnforcedKey)(platformId))) ?? false;
    },
    shouldBlockOnCredits: async (platformId) => {
        return (await computeCreditsAndAppSumoState(log, platformId)).credits.blocked;
    },
    getCreditsAndAppSumoState: async (platformId) => {
        return computeCreditsAndAppSumoState(log, platformId);
    },
    getConsumablesUsage: async (platformId) => {
        const { credits, appSumo } = await resolveCreditsCache(log, platformId);
        return {
            credits: toCreditsUsage(credits),
            appSumo: toAppSumoAiCreditsUsage(appSumo),
        };
    },
    getCreditUsage: async ({ platformId, startDate, endDate }) => {
        return autumn_utils_1.autumnUtils.getCreditUsage(log, platformId, startDate, endDate);
    },
});
exports.autumnBillingProvider = autumnBillingProvider;
async function withEnrolledCreds({ log, platformId, fallback, fn }) {
    await autumn_utils_1.autumnUtils.ensureEnrolled(log, platformId);
    const creds = await autumn_utils_1.autumnConsole.getCreds(log, platformId);
    if ((0, core_utils_1.isNil)(creds)) {
        return fallback;
    }
    return fn(creds);
}
function selectCurrentPlan(customer) {
    const baseSubscriptions = autumn_utils_1.autumnUtils.toBaseSubscriptions(customer);
    const subscription = autumn_utils_1.autumnUtils.selectCurrentBaseSubscription(baseSubscriptions);
    const purchase = (customer.purchases ?? []).find((entry) => !(0, core_utils_1.isNil)(entry.plan) && !entry.plan.addOn && entry.planId !== shared_1.PlanName.FREE);
    return { baseSubscriptions, subscription, purchase, plan: purchase?.plan ?? subscription?.plan ?? null };
}
function purchaseTrialEndsAt(purchase) {
    const freeTrial = purchase?.plan?.freeTrial;
    if ((0, core_utils_1.isNil)(purchase) || (0, core_utils_1.isNil)(freeTrial)) {
        return null;
    }
    const unit = TRIAL_DURATION_UNITS[freeTrial.durationType];
    if ((0, core_utils_1.isNil)(unit)) {
        return null;
    }
    const endsAt = (0, server_utils_1.apDayjs)(purchase.startedAt).add(freeTrial.durationLength, unit);
    return endsAt.isAfter((0, server_utils_1.apDayjs)()) ? endsAt.toISOString() : null;
}
function toBillingInfo(customer, monthStart, monthEnd) {
    const { baseSubscriptions, subscription, purchase, plan } = selectCurrentPlan(customer);
    const scheduledPlan = baseSubscriptions.find((entry) => entry.status === 'scheduled');
    return {
        planName: plan?.name ?? null,
        creditsResetInterval: toCreditsResetInterval(plan?.items ?? []),
        planInterval: plan?.price?.interval ?? null,
        startDate: msToIso(subscription?.currentPeriodStart) ?? monthStart,
        endDate: msToIso(subscription?.currentPeriodEnd) ?? monthEnd,
        nextBillingAmount: subscription?.plan?.price?.amount ?? 0,
        cancelAt: msToIso(subscription?.expiresAt) ?? null,
        trialEndsAt: msToIso(subscription?.trialEndsAt) ?? purchaseTrialEndsAt(purchase),
        scheduledPlanName: scheduledPlan?.plan?.name ?? null,
        billingPortalAvailable: !(0, core_utils_1.isNil)(customer.paymentMethod),
    };
}
function toBillableFeatures(customer) {
    const { baseSubscriptions, plan } = selectCurrentPlan(customer);
    const trialing = baseSubscriptions.some((subscription) => !(0, core_utils_1.isNil)(subscription.trialEndsAt) && subscription.trialEndsAt > (0, server_utils_1.apDayjs)().valueOf());
    const items = trialing ? [] : plan?.items ?? [];
    const autoTopUps = toAutoTopUps(customer);
    return {
        creditsFeature: withAutoTopUp({ feature: findPricedFeature({ items, featureId: shared_1.ConsumableFeatureId.AP_CREDITS }), autoTopUps }),
        appSumoCreditsFeature: withAutoTopUp({ feature: findPricedFeature({ items, featureId: shared_1.ConsumableFeatureId.APP_SUMO_AI_CREDITS }), autoTopUps }),
        seatsFeature: findPricedFeature({ items, featureId: shared_1.UnconsumableFeatureId.USERS_LIMIT }),
    };
}
function withAutoTopUp({ feature, autoTopUps }) {
    if ((0, core_utils_1.isNil)(feature)) {
        return null;
    }
    return { ...feature, autoTopUp: autoTopUps.find((config) => config.featureId === feature.featureId) ?? null };
}
function findPricedFeature({ items, featureId }) {
    return items.flatMap((item) => {
        const price = item.price;
        if (item.featureId !== featureId || price?.billingMethod !== 'prepaid' || (0, core_utils_1.isNil)(price.amount)) {
            return [];
        }
        return [{ featureId, pricePerUnit: price.amount, billingUnits: price.billingUnits ?? 1, interval: price.interval ?? null }];
    })[0] ?? null;
}
function toCreditsResetInterval(items) {
    const creditsItem = items.find((item) => item.featureId === shared_1.ConsumableFeatureId.AP_CREDITS && (0, core_utils_1.isNil)(item.price));
    return creditsItem?.reset?.interval ?? null;
}
function toSeatBreakdown(customer) {
    const balance = customer.balances[shared_1.UnconsumableFeatureId.USERS_LIMIT];
    if ((0, core_utils_1.isNil)(balance)) {
        return { includedSeats: null, additionalSeats: null };
    }
    const breakdown = balance.breakdown ?? [];
    return {
        includedSeats: breakdown.reduce((sum, entry) => sum + entry.includedGrant, 0),
        additionalSeats: breakdown.reduce((sum, entry) => sum + entry.prepaidGrant, 0),
    };
}
function toAutoTopUps(customer) {
    return (customer.billingControls?.autoTopups ?? []).flatMap((autoTopUp) => {
        if (!(0, shared_1.isConsumableFeatureId)(autoTopUp.featureId)) {
            return [];
        }
        return [{
                featureId: autoTopUp.featureId,
                enabled: autoTopUp.enabled,
                threshold: autoTopUp.threshold,
                quantity: autoTopUp.quantity,
                maxMonthlyTopUps: autoTopUp.purchaseLimit?.limit ?? null,
            }];
    });
}
function toCreditsUsage(balance) {
    if ((0, core_utils_1.isNil)(balance)) {
        return null;
    }
    return { usage: balance.usage, remaining: balance.unlimited ? null : balance.remaining, nextResetAt: msToIso(balance.nextResetAt) };
}
function toAppSumoAiCreditsUsage(balance) {
    if ((0, core_utils_1.isNil)(balance) || balance.unlimited || balance.granted <= 0) {
        return null;
    }
    return { usage: balance.usage, limit: balance.granted };
}
function isDuplicateTrack(error) {
    return error instanceof autumn_js_1.AutumnError && error.statusCode === 409;
}
function msToIso(ms) {
    return (0, core_utils_1.isNil)(ms) ? null : (0, server_utils_1.apDayjs)(ms).toISOString();
}
async function computeCreditsAndAppSumoState(log, platformId) {
    const { data: snapshot, error } = await (0, core_utils_1.tryCatch)(() => withTimeout(readCreditsCaches(platformId), CREDITS_CACHE_READ_TIMEOUT_MS));
    if ((0, core_utils_1.isNil)(snapshot)) {
        log.warn({ error, platform: { id: platformId } }, 'Credits gate cache read timed out or failed; failing open without gating this request');
        return {
            credits: computeCreditState({ balance: null, enforced: false }),
            appSumo: computeCreditState({ balance: null, enforced: true }),
        };
    }
    const state = {
        credits: computeCreditState({ balance: snapshot.credits, enforced: snapshot.billingEnforced }),
        appSumo: computeCreditState({ balance: snapshot.appSumo, enforced: true }),
    };
    scheduleCreditsCacheMaintenance({ log, platformId, snapshot, state });
    return state;
}
function scheduleCreditsCacheMaintenance({ log, platformId, snapshot, state }) {
    const stale = (0, core_utils_1.isNil)(snapshot.credits) || isCreditsStale(snapshot.credits);
    if (!stale && !state.credits.blocked && !state.appSumo.blocked) {
        return;
    }
    (0, promise_handler_1.rejectedPromiseHandler)(refreshCredits(log, platformId), log);
}
async function readCreditsCaches(platformId) {
    const [billingEnforced, { credits, appSumo }] = await Promise.all([
        redis_connections_1.distributedStore.get((0, keys_1.getBillingEnforcedKey)(platformId)),
        readCachedCredits(platformId),
    ]);
    return { billingEnforced: billingEnforced ?? false, credits, appSumo };
}
function withTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
        promise.then((value) => {
            clearTimeout(timer);
            resolve(value);
        }, (rejection) => {
            clearTimeout(timer);
            reject(rejection);
        });
    });
}
function computeCreditState({ balance, enforced }) {
    const exhausted = !(0, core_utils_1.isNil)(balance) && isCreditsExhausted(balance);
    return {
        blocked: enforced && exhausted,
        usage: balance?.usage ?? 0,
        limit: balance?.granted ?? 0,
        remaining: balance?.remaining ?? 0,
        unlimited: balance?.unlimited ?? false,
    };
}
async function sendTrackEvent(params) {
    const { log, platformId, featureId, value, idempotencyKey } = params;
    const { error } = await (0, core_utils_1.tryCatch)(async () => {
        const client = await autumn_utils_1.autumnUtils.resolveClientForPlatform(log, platformId);
        if ((0, core_utils_1.isNil)(client)) {
            if (featureId === shared_1.ConsumableFeatureId.AP_CREDITS) {
                const currentMonth = (0, server_utils_1.apDayjs)().format('YYYY-MM');
                const usageKey = `anticeil:credits_usage:${platformId}:${currentMonth}`;
                const currentUsage = (await redis_connections_1.distributedStore.get(usageKey)) ?? 0;
                const added = Math.max(1, Math.round(value || 1));
                const newUsage = currentUsage + added;
                await redis_connections_1.distributedStore.put(usageKey, newUsage, 60 * 60 * 24 * 60);

                const platformPlan = await (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(platformId);
                const planKey = (platformPlan?.plan ?? 'free').toLowerCase();
                const isTeam = planKey.includes('team');
                const isPlus = planKey.includes('plus');
                const limit = platformPlan?.includedCredits ?? (isTeam ? 50000 : (isPlus ? 10000 : 1000));

                const updatedBalance = {
                    featureId: shared_1.ConsumableFeatureId.AP_CREDITS,
                    granted: limit,
                    usage: newUsage,
                    remaining: Math.max(0, limit - newUsage),
                    unlimited: false,
                    syncedAt: Date.now(),
                    nextResetAt: (0, server_utils_1.apDayjs)().endOf('month').valueOf(),
                };
                await redis_connections_1.distributedStore.put((0, keys_1.getCreditsBalanceKey)(platformId), updatedBalance, 60 * 60);
                log.info({ platformId, value: added, newUsage, remaining: updatedBalance.remaining }, '[Anticeil] Local AI/Automation credits deducted');
            }
            return;
        }
        const properties = { source: params.source, ...params.properties };
        const response = await client.track({ featureId, value, idempotencyKey, properties });
        if (!(0, core_utils_1.isNil)(response.balance)) {
            await autumn_utils_1.autumnUtils.writeBalance({ platformId, featureId, balance: response.balance });
        }
    });
    if (!(0, core_utils_1.isNil)(error) && !isDuplicateTrack(error)) {
        log.error({ error, platform: { id: platformId }, feature: { id: featureId } }, 'Failed to track feature usage with Autumn');
    }
}
async function resolveCreditsCache(log, platformId) {
    const cached = await readCachedCredits(platformId);
    if ((0, core_utils_1.isNil)(cached.credits)) {
        const fetched = await fetchCreditsDeduped(log, platformId);
        if (!(0, core_utils_1.isNil)(fetched)) {
            return fetched;
        }
        return cached;
    }
    if (isCreditsStale(cached.credits)) {
        (0, promise_handler_1.rejectedPromiseHandler)(refreshCredits(log, platformId), log);
    }
    return cached;
}
async function readCachedCredits(platformId) {
    let [credits, appSumo] = await Promise.all([
        autumn_utils_1.autumnUtils.readBalance({ platformId, featureId: shared_1.ConsumableFeatureId.AP_CREDITS }),
        autumn_utils_1.autumnUtils.readBalance({ platformId, featureId: shared_1.ConsumableFeatureId.APP_SUMO_AI_CREDITS }),
    ]);
    if ((0, core_utils_1.isNil)(credits)) {
        const system = require('../../../../helper/system/system').system;
        const platformPlan = await (0, platform_plan_service_1.platformPlanService)(system.globalLogger()).getOrCreateForPlatform(platformId);
        const planKey = (platformPlan?.plan ?? 'free').toLowerCase();
        const isTeam = planKey.includes('team');
        const isPlus = planKey.includes('plus');
        const limit = platformPlan?.includedCredits ?? (isTeam ? 50000 : (isPlus ? 10000 : 1000));
        const currentMonth = (0, server_utils_1.apDayjs)().format('YYYY-MM');
        const usageKey = `anticeil:credits_usage:${platformId}:${currentMonth}`;
        const currentUsage = (await redis_connections_1.distributedStore.get(usageKey)) ?? 0;
        credits = {
            featureId: shared_1.ConsumableFeatureId.AP_CREDITS,
            granted: limit,
            usage: currentUsage,
            remaining: Math.max(0, limit - currentUsage),
            unlimited: false,
            syncedAt: Date.now(),
            nextResetAt: (0, server_utils_1.apDayjs)().endOf('month').valueOf(),
        };
        await redis_connections_1.distributedStore.put((0, keys_1.getCreditsBalanceKey)(platformId), credits, 60 * 60);
    }
    return { credits, appSumo };
}
function isCreditsStale(credits) {
    return Date.now() - credits.syncedAt > CREDITS_REFETCH_PERIOD_MS;
}
function isCreditsExhausted(credits) {
    return !credits.unlimited && credits.remaining <= 0;
}
async function fetchCreditsDeduped(log, platformId) {
    const { data, error } = await (0, core_utils_1.tryCatch)(() => (0, redis_connections_1.distributedLock)(log).runExclusive({
        key: (0, keys_1.getCustomerStateFetchLockKey)(platformId),
        timeoutInSeconds: CUSTOMER_STATE_FETCH_LOCK_TIMEOUT_SECONDS,
        fn: async () => {
            const cached = await readCachedCredits(platformId);
            if (!(0, core_utils_1.isNil)(cached.credits)) {
                return cached;
            }
            const recentlyMissed = await redis_connections_1.distributedStore.get((0, keys_1.getCustomerStateMissKey)(platformId));
            if (!(0, core_utils_1.isNil)(recentlyMissed)) {
                return null;
            }
            const fetched = await fetchCredits(log, platformId);
            if ((0, core_utils_1.isNil)(fetched?.credits)) {
                await redis_connections_1.distributedStore.put((0, keys_1.getCustomerStateMissKey)(platformId), '1', CUSTOMER_STATE_MISS_DEBOUNCE_SECONDS);
            }
            return fetched;
        },
    }));
    if (!(0, core_utils_1.isNil)(error)) {
        log.warn({ error, platform: { id: platformId } }, 'Failed to fetch credits gate snapshot; failing open');
        return null;
    }
    return data;
}
async function refreshCredits(log, platformId) {
    await redis_connections_1.distributedStore.runOnceWithin((0, keys_1.getCustomerStateRefreshKey)(platformId), CUSTOMER_STATE_REFRESH_DEBOUNCE_SECONDS, () => fetchCredits(log, platformId));
}
async function fetchCredits(log, platformId) {
    const client = await autumn_utils_1.autumnUtils.resolveClientForPlatform(log, platformId);
    if ((0, core_utils_1.isNil)(client)) {
        return null;
    }
    const customer = await client.getCustomer({ expand: ['subscriptions.plan', 'purchases.plan'] });
    return autumn_utils_1.autumnUtils.writeCustomerStateCaches({
        platformId,
        customer,
        grantedFeatureIds: autumn_utils_1.autumnUtils.toGrantedFeatureIds(customer),
    });
}
async function fetchBillingOverview(log, platformId) {
    const monthStart = (0, server_utils_1.apDayjs)().startOf('month').toISOString();
    const monthEnd = (0, server_utils_1.apDayjs)().endOf('month').toISOString();
    const client = await autumn_utils_1.autumnUtils.resolveClientForPlatform(log, platformId);
    if ((0, core_utils_1.isNil)(client)) {
        const platformPlan = await (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(platformId);
        const planKey = (platformPlan?.plan ?? 'free').toLowerCase();
        const isTeam = planKey.includes('team');
        const isPlus = planKey.includes('plus');
        const planName = isTeam ? 'Team' : (isPlus ? 'Plus' : 'Free');
        const nextBillingAmount = isTeam ? 2999000 : (isPlus ? 299000 : 0);
        const includedSeats = platformPlan?.includedSeats ?? (isTeam ? 25 : (isPlus ? 5 : 1));

        return {
            startDate: monthStart,
            endDate: monthEnd,
            nextBillingAmount,
            cancelAt: null,
            trialEndsAt: null,
            planInterval: 'month',
            planName,
            scheduledPlanName: null,
            billingPortalAvailable: false,
            creditsResetInterval: 'month',
            creditsFeature: {
                featureId: shared_1.ConsumableFeatureId.AP_CREDITS,
                pricePerUnit: 100,
                billingUnits: 1000,
                interval: 'month',
                autoTopUp: null,
            },
            appSumoCreditsFeature: null,
            seatsFeature: {
                featureId: shared_1.UnconsumableFeatureId.USERS_LIMIT,
                pricePerUnit: 50000,
                billingUnits: 1,
                interval: 'month',
            },
            includedSeats,
            additionalSeats: null,
            unavailable: false,
        };
    }
    const { data: customer, error } = await (0, core_utils_1.tryCatch)(() => client.getCustomer({ expand: ['subscriptions.plan', 'purchases.plan', 'payment_method', 'billing_controls.auto_topups.purchase_limit'] }));
    if (!(0, core_utils_1.isNil)(error) || (0, core_utils_1.isNil)(customer)) {
        log.warn({ error, platform: { id: platformId } }, 'Failed to fetch billing overview; serving an empty overview without caching it');
        return (0, billing_provider_1.emptyBillingOverview)({ startDate: monthStart, endDate: monthEnd, unavailable: true });
    }
    const overview = {
        ...toBillingInfo(customer, monthStart, monthEnd),
        ...toSeatBreakdown(customer),
        ...toBillableFeatures(customer),
        unavailable: false,
    };
    await redis_connections_1.distributedStore.put((0, keys_1.getBillingOverviewKey)(platformId), overview, BILLING_OVERVIEW_TTL_SECONDS);
    return overview;
}
//# sourceMappingURL=autumn-billing.js.map