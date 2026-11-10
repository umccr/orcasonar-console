#!/usr/bin/env bash
# The console on http://localhost:3000/orcasonar/ against OrcaSonar dev, as orca-ui-v2's start.sh runs OrcaUI against
# OrcaBus dev. Run it with `make start` or `pnpm start`.
#
# It signs in through the dev Cognito pool's localhost client, whose settings it reads from SSM, and the dev server
# proxies /api to https://sonar.dev.umccr.org, which accepts that client's tokens in beta. It needs the AWS CLI and a
# session in the dev account:
#
#   aws sso login --profile dev
#
# AWS_PROFILE picks another profile (default: dev); ORCASONAR_API another OrcaSonar (default: dev's).
set -euo pipefail

export AWS_PROFILE="${AWS_PROFILE:-dev}"
export AWS_REGION="${AWS_REGION:-ap-southeast-2}"
export ORCASONAR_API="${ORCASONAR_API:-https://sonar.dev.umccr.org}"

# The localhost client sends readers back to http://localhost:3000/<app>/ only (cognito_aai `localhost_url`).
export PORT=3000

if ! command -v aws >/dev/null 2>&1; then
  echo "start.sh needs the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" >&2
  exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "No AWS session for profile ${AWS_PROFILE}. Sign in, then run this again:" >&2
  echo "  aws sso login --profile ${AWS_PROFILE}" >&2
  exit 1
fi

# One SSM parameter's value, or a stop that says which one is missing.
parameter() {
  local value
  if ! value="$(aws ssm get-parameter --name "$1" --query Parameter.Value --output text 2>/dev/null)"; then
    echo "Can't read the SSM parameter $1 with profile ${AWS_PROFILE}. Is it the dev account?" >&2
    exit 1
  fi
  printf '%s' "$value"
}

VITE_REGION="${AWS_REGION}"
VITE_COG_USER_POOL_ID="$(parameter /data_portal/client/cog_user_pool_id)"
VITE_OAUTH_DOMAIN="$(parameter /data_portal/client/oauth_domain)"
VITE_COG_APP_CLIENT_ID="$(parameter /cognito/localhost-app/app-client-id)"
export VITE_REGION VITE_COG_USER_POOL_ID VITE_OAUTH_DOMAIN VITE_COG_APP_CLIENT_ID

echo "OrcaSonar Console on http://localhost:${PORT}/orcasonar/, calling ${ORCASONAR_API} through the dev server."
exec pnpm exec vite --port "${PORT}" --strictPort
