FROM ghcr.io/activepieces/activepieces:0.92.0

# Layer custom Anticeil backend patches onto official image
COPY docker-patches-ai-provider-service.js /usr/src/app/packages/server/api/dist/src/app/ai/ai-provider-service.js
COPY docker-patches-agent-model-resolution.js /usr/src/app/packages/server/api/dist/src/app/ee/agent/agent-model-resolution.js
COPY docker-patches-autumn-billing.js /usr/src/app/packages/server/api/dist/src/app/ee/platform/platform-plan/billing-providers/autumn-billing.js

# Layer custom Anticeil frontend build onto official stable Activepieces image
COPY dist/packages/web/ /usr/src/app/dist/packages/web/


