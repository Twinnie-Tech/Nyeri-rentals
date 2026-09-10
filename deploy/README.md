# Point teammates at the right env file
#
# Development (local):
#   cp apps/api/.env.development.example apps/api/.env
#   cp .env.example .env.local
#
# Staging / production:
#   Inject vars on Railway + Vercel from:
#     apps/api/.env.staging.example
#     apps/api/.env.production.example
#     .env.example (web section)
#
# Full steps: docs/DEPLOY.md · staging: docs/STAGING_GO_LIVE.md
# Machine-readable matrix: deploy/environments.yaml
# Smoke: node scripts/smoke-staging.mjs https://<api-host>/v1
