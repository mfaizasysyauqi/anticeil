import { ActivepiecesError, apId, ErrorCode, isNil, spreadIfDefined } from '@activepieces/core-utils'
import { cryptoUtils } from '@activepieces/server-utils'
import { UserIdentity } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { nanoid } from 'nanoid'
import { repoFactory } from '../../core/db/repo-factory'
import { passwordHasher } from '../lib/password-hasher'
import { UserIdentityEntity } from './user-identity-entity'

const USERNAME_COOLDOWN_DAYS = 14

export const userIdentityRepository = repoFactory(UserIdentityEntity)

export const userIdentityService = (log: FastifyBaseLogger) => ({
    async create(params: Pick<UserIdentity, 'email' | 'password' | 'firstName' | 'lastName' | 'trackEvents' | 'newsLetter' | 'provider' | 'verified'> & { imageUrl?: string }): Promise<UserIdentity> {
        log.info({
            email: params.email,
        }, 'Creating user identity')

        const cleanedEmail = params.email.toLowerCase().trim()
        const hashedPassword = await passwordHasher.hash(params.password)
        const userByEmail = await userIdentityRepository().findOne({ where: { email: cleanedEmail } })
        if (userByEmail) {
            throw new ActivepiecesError({
                code: ErrorCode.EXISTING_USER,
                params: {
                    email: cleanedEmail,
                    platformId: null,
                },
            })
        }
        const username = await generateUniqueUsername(cleanedEmail)
        const newUserIdentity: UserIdentity = {
            firstName: params.firstName,
            lastName: params.lastName,
            provider: params.provider,
            email: cleanedEmail,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            verified: params.verified,
            id: apId(),
            password: hashedPassword,
            trackEvents: params.trackEvents,
            newsLetter: params.newsLetter,
            tokenVersion: nanoid(),
            imageUrl: params.imageUrl,
            username,
            usernameUpdatedAt: null,
        }
        const identity = await userIdentityRepository().save(newUserIdentity)
        return identity
    },
    async verifyIdentityPassword(params: VerifyIdentityPasswordParams): Promise<UserIdentity> {
        const userIdentity = await getIdentityByEmail(params.email)
        if (isNil(userIdentity)) {
            throw new ActivepiecesError({
                code: ErrorCode.INVALID_CREDENTIALS,
                params: null,
            })
        }
        if (!userIdentity.verified) {
            throw new ActivepiecesError({
                code: ErrorCode.EMAIL_IS_NOT_VERIFIED,
                params: {
                    email: userIdentity.email,
                },
            })
        }

        const passwordMatches = await passwordHasher.compare(params.password, userIdentity.password)
        if (!passwordMatches) {
            throw new ActivepiecesError({
                code: ErrorCode.INVALID_CREDENTIALS,
                params: null,
            })
        }
        return userIdentity
    },
    async getIdentityByEmail(email: string): Promise<UserIdentity | null> {
        const cleanedEmail = email.toLowerCase().trim()
        return userIdentityRepository().findOneBy({ email: cleanedEmail })
    },
    async getOneOrFail(params: GetOneOrFailParams): Promise<UserIdentity> {
        const userIdentity = await userIdentityRepository().findOneByOrFail({ id: params.id })
        return userIdentity
    },
    async getBasicInformation(id: string): Promise<Pick<UserIdentity, 'email' | 'firstName' | 'lastName' | 'trackEvents' | 'newsLetter' | 'imageUrl' | 'username' | 'usernameUpdatedAt'>> {
        const user = await userIdentityRepository().findOneByOrFail({ id })
        return {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            trackEvents: user.trackEvents,
            newsLetter: user.newsLetter,
            imageUrl: user.imageUrl,
            username: user.username,
            usernameUpdatedAt: user.usernameUpdatedAt,
        }
    },
    async updatePassword(params: UpdatePasswordParams): Promise<void> {
        const hashedPassword = await passwordHasher.hash(params.newPassword)
        await userIdentityRepository().update(params.id, {
            password: hashedPassword,
            tokenVersion: nanoid(),
        })
    },
    async updateNames({ id, firstName, lastName }: UpdateNamesParams): Promise<UserIdentity> {
        await userIdentityRepository().update(id, { firstName, lastName })
        return this.getOneOrFail({ id })
    },

    async verify(id: string): Promise<UserIdentity> {
        const user = await userIdentityRepository().findOneByOrFail({ id })
        if (user.verified) {
            return user
        }
        return userIdentityRepository().save({
            ...user,
            verified: true,
        })
    },
    // A password sitting on an unverified identity was chosen by whoever typed it,
    // which is not necessarily the person who reads the inbox. Verifying by emailed
    // code proves the inbox, so that password must not outlive the check: keeping it
    // would hand the account to anyone who registered the address first.
    async verifyAndDiscardPassword(id: string): Promise<UserIdentity> {
        const user = await userIdentityRepository().findOneByOrFail({ id })
        if (user.verified) {
            return user
        }
        return userIdentityRepository().save({
            ...user,
            verified: true,
            password: await passwordHasher.hash(await cryptoUtils.generateRandomPassword()),
            tokenVersion: nanoid(),
        })
    },
    async update(id: string, params: UpdateParams): Promise<void> {
        await userIdentityRepository().update(id, {
            ...params,
            ...spreadIfDefined('password', params.password ? await passwordHasher.hash(params.password) : undefined),
        })
    },
    async updateLastLoggedInPlatformId({ id, lastLoggedInPlatformId }: UpdateLastLoggedInPlatformIdParams): Promise<void> {
        await userIdentityRepository().update(id, { lastLoggedInPlatformId })
    },
    async getByUsername(username: string): Promise<UserIdentity | null> {
        return userIdentityRepository().findOneBy({ username: username.toLowerCase() })
    },
    async updateUsername({ id, username }: UpdateUsernameParams): Promise<UserIdentity> {
        const identity = await userIdentityRepository().findOneByOrFail({ id })

        // Enforce cooldown
        if (identity.usernameUpdatedAt) {
            const lastUpdate = new Date(identity.usernameUpdatedAt)
            const cooldownEnd = new Date(lastUpdate.getTime() + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
            if (new Date() < cooldownEnd) {
                throw new ActivepiecesError({
                    code: ErrorCode.VALIDATION,
                    params: {
                        message: `Username can only be changed once every ${USERNAME_COOLDOWN_DAYS} days. Next change available after ${cooldownEnd.toISOString()}.`,
                    },
                })
            }
        }

        const sanitized = sanitizeUsername(username)
        if (sanitized.length < 3 || sanitized.length > 32) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Username must be between 3 and 32 characters.',
                },
            })
        }

        const existing = await userIdentityRepository().findOneBy({ username: sanitized })
        if (existing && existing.id !== id) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Username is already taken.',
                },
            })
        }

        await userIdentityRepository().update(id, {
            username: sanitized,
            usernameUpdatedAt: new Date().toISOString(),
        })
        return this.getOneOrFail({ id })
    },
})


async function getIdentityByEmail(email: string): Promise<UserIdentity | null> {
    const cleanedEmail = email.toLowerCase().trim()
    return userIdentityRepository().findOneBy({ email: cleanedEmail })
}

function sanitizeUsername(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32)
}

async function generateUniqueUsername(email: string): Promise<string> {
    const base = sanitizeUsername(email.split('@')[0]) || 'user'
    const trimmed = base.slice(0, 26) // leave room for suffix
    let candidate = trimmed
    let attempt = 0
    while (attempt < 10) {
        const exists = await userIdentityRepository().findOneBy({ username: candidate })
        if (!exists) return candidate
        candidate = `${trimmed}_${nanoid(4).toLowerCase()}`
        attempt++
    }
    return `${trimmed}_${nanoid(6).toLowerCase()}`
}

type GetOneOrFailParams = {
    id: string
}

type UpdateNamesParams = {
    id: string
    firstName: string
    lastName: string
}

type UpdatePasswordParams = {
    id: string
    newPassword: string
}

type UpdateParams = {
    firstName?: string
    lastName?: string
    password?: string
    imageUrl?: string | null
}

type UpdateLastLoggedInPlatformIdParams = {
    id: string
    lastLoggedInPlatformId: string
}

type UpdateUsernameParams = {
    id: string
    username: string
}

type VerifyIdentityPasswordParams = {
    email: string
    password: string
}
