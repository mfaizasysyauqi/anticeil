import { isNil } from '@activepieces/core-utils'
import { PurchasablePlan } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { system } from '../../../../helper/system/system'
import { AppSystemProp } from '../../../../helper/system/system-props'
import { BillingOverview, BillingProvider, emptyBillingOverview } from '../../../../platform/billing-provider'
import { platformPlanService } from '../platform-plan.service'

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
]

export const midtransBillingProvider = (log: FastifyBaseLogger): BillingProvider => ({
    listPlans: async () => {
        return MIDTRANS_PLANS
    },
    getBillingOverview: async () => {
        return emptyBillingOverview({})
    },
    createCheckoutSession: async ({ platformId, planId, successUrl }) => {
        const targetPlan = MIDTRANS_PLANS.find((p) => p.id === planId)
        if (!targetPlan || targetPlan.price === 0 || !targetPlan.price) {
            return { checkoutUrl: successUrl ?? null }
        }

        const serverKey = system.get(AppSystemProp.MIDTRANS_SERVER_KEY) || 'SB-Mid-server-anticeil-demo'
        const isProduction = system.getBoolean(AppSystemProp.MIDTRANS_IS_PRODUCTION) ?? false
        const snapEndpoint = isProduction
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

        const orderId = `ANTICEIL-${platformId.substring(0, 8)}-${Date.now()}`
        const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`

        try {
            const response = await fetch(snapEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: authHeader,
                },
                body: JSON.stringify({
                    transaction_details: {
                        order_id: orderId,
                        gross_amount: targetPlan.price,
                    },
                    item_details: [
                        {
                            id: targetPlan.id,
                            price: targetPlan.price,
                            quantity: 1,
                            name: `Anticeil ${targetPlan.name} Plan`,
                        },
                    ],
                    callbacks: {
                        finish: successUrl ?? 'http://localhost:8080/platform/setup/billing/success',
                    },
                }),
            })

            const data = await response.json() as { redirect_url?: string; token?: string }
            return { checkoutUrl: data.redirect_url ?? null }
        }
        catch (error) {
            log.error({ error, orderId }, 'Failed to create Midtrans Snap transaction')
            return { checkoutUrl: null }
        }
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
    trackFeature: async () => {
        return
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
    getCreditsAndAppSumoState: async () => {
        return {
            totalCredits: 100000,
            consumedCredits: 0,
            remainingCredits: 100000,
            resetPeriod: 'month',
            state: 'ok' as const,
        }
    },
    getConsumablesUsage: async () => {
        return {} as any
    },
    getCreditUsage: async () => {
        return {} as any
    },
})
