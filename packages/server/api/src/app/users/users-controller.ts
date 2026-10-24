import { ActivepiecesError, ApId, ApMultipartFile, ErrorCode, isNil } from '@activepieces/core-utils'
import { AP_MAXIMUM_PROFILE_PICTURE_SIZE, FileType, PrincipalType, PROFILE_PICTURE_ALLOWED_TYPES, SERVICE_KEY_SECURITY_OPENAPI, UpdateMeResponse, UpdateUsernameRequest, UserWithMetaInformation } from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { userIdentityService } from '../authentication/user-identity/user-identity-service'
import { securityAccess } from '../core/security/authorization/fastify-security'
import { fileService } from '../file/file.service'
import { userService } from '../user/user-service'

export const usersController: FastifyPluginAsyncZod = async (app) => {
    app.get('/:id', GetUserByIdRequest, async (req): Promise<UserWithMetaInformation> => {
        const userId = req.params.id
        const platformId = req.principal.platform.id
        return userService(req.log).getOneByIdAndPlatformIdOrThrow({ id: userId, platformId })
    })

    app.post('/me', UpdateMeRequest, async (req) => {
        const userId = req.principal.id
        const user = await userService(req.log).getOrThrow({ id: userId })
        const identityId = user.identityId
        const platformId = req.principal.platform.id

        const part = await req.file()
        const profilePicture: ApMultipartFile | undefined = isNil(part)
            ? undefined
            : { filename: part.filename, data: await part.toBuffer(), type: 'file', mimetype: part.mimetype }

        const imageUrl = await fileService(app.log).uploadPublicAsset({
            file: profilePicture,
            type: FileType.USER_PROFILE_PICTURE,
            platformId,
            allowedMimeTypes: PROFILE_PICTURE_ALLOWED_TYPES,
            maxFileSizeInBytes: AP_MAXIMUM_PROFILE_PICTURE_SIZE,
            metadata: { identityId },
        })

        if (!isNil(imageUrl)) {
            await userIdentityService(app.log).update(identityId, { imageUrl })
        }

        return userIdentityService(app.log).getBasicInformation(identityId)
    })

    app.delete('/me/profile-picture', DeleteProfilePictureRequest, async (req) => {
        const userId = req.principal.id
        const user = await userService(req.log).getOrThrow({ id: userId })
        const identityId = user.identityId

        await userIdentityService(app.log).update(identityId, { imageUrl: null })

        return { success: true }
    })

    app.patch('/me/username', UpdateUsernameRequestOptions, async (req) => {
        const userId = req.principal.id
        const user = await userService(req.log).getOrThrow({ id: userId })
        const identityId = user.identityId

        const updated = await userIdentityService(app.log).updateUsername({
            id: identityId,
            username: req.body.username,
        })

        return {
            email: updated.email,
            firstName: updated.firstName,
            lastName: updated.lastName,
            trackEvents: updated.trackEvents,
            newsLetter: updated.newsLetter,
            imageUrl: updated.imageUrl,
            username: updated.username,
            usernameUpdatedAt: updated.usernameUpdatedAt,
        }
    })

    app.patch('/me/name', UpdateNameRequestOptions, async (req) => {
        const userId = req.principal.id
        const rateCheck = checkNameUpdateRateLimit(userId)
        if (!rateCheck.allowed) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: `Terlalu sering mengubah nama. Silakan tunggu ${rateCheck.resetInSeconds} detik sebelum mencoba lagi.`,
                },
            })
        }

        const user = await userService(req.log).getOrThrow({ id: userId })
        const identityId = user.identityId

        let firstName = req.body.firstName
        let lastName = req.body.lastName ?? ''

        if (req.body.name) {
            const trimmed = req.body.name.trim()
            const parts = trimmed.split(/\s+/)
            firstName = parts[0]
            lastName = parts.slice(1).join(' ')
        }

        if (!firstName || firstName.trim().length === 0) {
            throw new ActivepiecesError({
                code: ErrorCode.VALIDATION,
                params: {
                    message: 'Nama depan / display name tidak boleh kosong.',
                },
            })
        }

        await userIdentityService(app.log).update(identityId, {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
        })

        const basic = await userIdentityService(app.log).getBasicInformation(identityId)
        return {
            email: basic.email,
            firstName: basic.firstName,
            lastName: basic.lastName,
            trackEvents: basic.trackEvents,
            newsLetter: basic.newsLetter,
            imageUrl: basic.imageUrl,
            username: basic.username,
            usernameUpdatedAt: basic.usernameUpdatedAt,
        }
    })

}

const nameUpdateRateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkNameUpdateRateLimit(userId: string): { allowed: boolean; resetInSeconds?: number } {
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxRequests = 10
    const current = nameUpdateRateLimitMap.get(userId)
    if (!current || now > current.resetAt) {
        nameUpdateRateLimitMap.set(userId, { count: 1, resetAt: now + windowMs })
        return { allowed: true }
    }
    if (current.count >= maxRequests) {
        const resetInSeconds = Math.ceil((current.resetAt - now) / 1000)
        return { allowed: false, resetInSeconds }
    }
    current.count++
    return { allowed: true }
}

const UpdateNameRequestOptions = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        body: z.object({
            name: z.string().min(1).max(100).optional(),
            firstName: z.string().min(1).max(64).optional(),
            lastName: z.string().max(64).optional(),
        }),
        response: {
            [StatusCodes.OK]: UpdateMeResponse,
        },
    },
}

const GetUserByIdRequest = {
    schema: {
        tags: ['users'],
        description: 'Get a user by id',
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        params: z.object({
            id: ApId,
        }),
        response: {
            [StatusCodes.OK]: UserWithMetaInformation,
        },
    },
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.SERVICE]),
    },
}

const UpdateMeRequest = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        consumes: ['multipart/form-data'],
        response: {
            [StatusCodes.OK]: UpdateMeResponse,
        },
    },
}

const DeleteProfilePictureRequest = {
    schema: {
        response: {
            [StatusCodes.OK]: z.object({
                success: z.boolean(),
            }),
        },
    },
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
}

const UpdateUsernameRequestOptions = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        body: UpdateUsernameRequest,
        response: {
            [StatusCodes.OK]: UpdateMeResponse,
        },
    },
}
