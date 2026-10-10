import { FastifyBaseLogger } from 'fastify'

const MIDTRANS_SANDBOX_BASE = 'https://app.sandbox.midtrans.com/snap/v1'
const MIDTRANS_PROD_BASE = 'https://app.midtrans.com/snap/v1'
const MIDTRANS_SANDBOX_CORE = 'https://api.sandbox.midtrans.com/v2'
const MIDTRANS_PROD_CORE = 'https://api.midtrans.com/v2'

export interface MidtransTransactionStatus {
    transaction_id: string
    order_id: string
    transaction_status: string
    fraud_status?: string
    payment_type?: string
    gross_amount: string
}

export interface MidtransSnapToken {
    token: string
    redirect_url: string
}

function getConfig() {
    const serverKey = process.env.AP_MIDTRANS_SERVER_KEY ?? ''
    const clientKey = process.env.AP_MIDTRANS_CLIENT_KEY ?? ''
    const isProduction = process.env.AP_MIDTRANS_IS_PRODUCTION === 'true'
    const snapBase = isProduction ? MIDTRANS_PROD_BASE : MIDTRANS_SANDBOX_BASE
    const coreBase = isProduction ? MIDTRANS_PROD_CORE : MIDTRANS_SANDBOX_CORE
    const auth = Buffer.from(`${serverKey}:`).toString('base64')
    return { serverKey, clientKey, isProduction, snapBase, coreBase, auth }
}

async function createSnapToken({
    orderId,
    grossAmount,
    customerName,
    customerEmail,
    itemName,
}: {
    orderId: string
    grossAmount: number
    customerName: string
    customerEmail: string
    itemName: string
}): Promise<MidtransSnapToken> {
    const { isProduction, auth } = getConfig()

    const body = {
        transaction_details: {
            order_id: orderId,
            gross_amount: grossAmount,
        },
        customer_details: {
            first_name: customerName,
            email: customerEmail,
        },
        item_details: [
            {
                id: 'plan',
                price: grossAmount,
                quantity: 1,
                name: itemName,
            },
        ],
        callbacks: {
            finish: `${(process.env.AP_FRONTEND_URL || 'https://anticeil.com').replace(/\/$/, '')}/platform/billing/success?action=upgrade`,
            error: `${(process.env.AP_FRONTEND_URL || 'https://anticeil.com').replace(/\/$/, '')}/platform/billing/error`,
            unfinish: `${(process.env.AP_FRONTEND_URL || 'https://anticeil.com').replace(/\/$/, '')}/platform/billing`,
        },
    }

    const endpoints = isProduction
        ? [MIDTRANS_PROD_BASE, MIDTRANS_SANDBOX_BASE]
        : [MIDTRANS_SANDBOX_BASE, MIDTRANS_PROD_BASE]

    let lastError = ''
    for (const base of endpoints) {
        try {
            const res = await fetch(`${base}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Basic ${auth}`,
                },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                return res.json() as Promise<MidtransSnapToken>
            }
            lastError = await res.text()
        } catch (err: any) {
            lastError = err?.message || 'fetch failed'
        }
    }

    throw new Error(`Midtrans createSnapToken failed on all endpoints: ${lastError}`)
}

async function getTransactionStatus(orderId: string): Promise<MidtransTransactionStatus> {
    const { coreBase, auth } = getConfig()

    const res = await fetch(`${coreBase}/${orderId}/status`, {
        headers: {
            Authorization: `Basic ${auth}`,
        },
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Midtrans getTransactionStatus failed: ${res.status} ${text}`)
    }

    return res.json() as Promise<MidtransTransactionStatus>
}

function isPaymentSuccess(status: MidtransTransactionStatus): boolean {
    const { transaction_status, fraud_status } = status
    if (transaction_status === 'capture') {
        return fraud_status === 'accept' || fraud_status === undefined
    }
    return transaction_status === 'settlement'
}

/** Gross amount (IDR) for each plan per billing cycle */
const PLAN_PRICES: Record<string, Record<string, number>> = {
    plus: { month: 299000, year: 2990000 },
    team: { month: 2990000, year: 29900000 },
}

function getPlanPrice(planKey: string, cycle: 'month' | 'year'): number {
    return PLAN_PRICES[planKey]?.[cycle] ?? 0
}

function getClientKey(): string {
    return getConfig().clientKey
}

export const midtransService = {
    createSnapToken,
    getTransactionStatus,
    isPaymentSuccess,
    getPlanPrice,
    getClientKey,
}
