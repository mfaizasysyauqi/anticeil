FROM ghcr.io/activepieces/activepieces:0.92.2

# Layer custom Anticeil backend patches onto official image
COPY docker-patches-ai-provider-service.js /usr/src/app/packages/server/api/dist/src/app/ai/ai-provider-service.js
COPY docker-patches-agent-model-resolution.js /usr/src/app/packages/server/api/dist/src/app/ee/agent/agent-model-resolution.js
COPY docker-patches-autumn-billing.js /usr/src/app/packages/server/api/dist/src/app/ee/platform/platform-plan/billing-providers/autumn-billing.js
COPY docker-patches-autumn-utils.js /usr/src/app/packages/server/api/dist/src/app/ee/platform/platform-plan/billing-providers/autumn-utils.js
COPY docker-patches-platform-plan-controller.js /usr/src/app/packages/server/api/dist/src/app/ee/platform/platform-plan/platform-plan.controller.js
COPY docker-patches-machine-service.js /usr/src/app/packages/server/api/dist/src/app/workers/machine/machine-service.js
COPY docker-patches-ai-providers-index.js /usr/src/app/packages/server/api/dist/src/app/ai/providers/index.js
COPY docker-patches-federated-authn-service.js /usr/src/app/packages/server/api/dist/src/app/ee/authentication/federated-authn/federated-authn-service.js
COPY docker-patches-authorize.js /usr/src/app/packages/server/api/dist/src/app/core/security/v2/authz/authorize.js
COPY docker-patches-ai-provider-controller.js /usr/src/app/packages/server/api/dist/src/app/ai/ai-provider-controller.js
COPY docker-patches-piece-set-controller.js /usr/src/app/packages/server/api/dist/src/app/ee/pieces/piece-set/piece-set.controller.js
COPY docker-patches-signing-key-controller.js /usr/src/app/packages/server/api/dist/src/app/signing-key/signing-key-controller.js
COPY docker-patches-signing-key-module.js /usr/src/app/packages/server/api/dist/src/app/signing-key/signing-key-module.js
COPY docker-patches-ee-authorization.js /usr/src/app/packages/server/api/dist/src/app/authentication/ee-authorization.js

# Layer custom Anticeil frontend build onto official stable Activepieces image
COPY dist/packages/web/ /usr/src/app/dist/packages/web/

# Layer custom Anticeil prompts onto official image
COPY packages/server/api/src/assets/prompts/ /usr/src/app/packages/server/api/src/assets/prompts/


