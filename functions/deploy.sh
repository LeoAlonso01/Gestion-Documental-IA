#!/usr/bin/env bash
# Deploy Cloud Function (HTTP) using gcloud
# Set environment variables before running or add them to --set-env-vars
# Example:
# GCS_BUCKET=my-bucket DRIVE_FOLDER_ID=1a2b3c GEMINI_API_KEY=xxx GEMINI_PROVIDER=google GEMINI_MODEL=gemini-pro ./deploy.sh

set -euo pipefail
NAME="gd-process-docs"
REGION="us-central1"
ENTRY_POINT="app"
RUNTIME="node18"
ALLOW_UNAUTH="--allow-unauthenticated"
SCRIPTS_ENV="GCS_BUCKET=${GCS_BUCKET:-},DRIVE_FOLDER_ID=${DRIVE_FOLDER_ID:-},GEMINI_API_KEY=${GEMINI_API_KEY:-},GEMINI_PROVIDER=${GEMINI_PROVIDER:-},GEMINI_API_URL=${GEMINI_API_URL:-},GEMINI_MODEL=${GEMINI_MODEL:-}"

echo "Deploying Cloud Function ${NAME} to ${REGION}..."
gcloud functions deploy ${NAME} \
  --region=${REGION} \
  --runtime=${RUNTIME} \
  --trigger-http \
  --entry-point=${ENTRY_POINT} \
  ${ALLOW_UNAUTH} \
  --set-env-vars=${SCRIPTS_ENV}

echo "Done. Get URL with: gcloud functions describe ${NAME} --region=${REGION} --format='value(httpsTrigger.url)'"