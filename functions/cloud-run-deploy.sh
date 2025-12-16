#!/usr/bin/env bash
# Build and deploy to Cloud Run using Docker
# Example:
# GCP_PROJECT=myproject REGION=us-central1 SERVICE_NAME=gd-process-docs GEMINI_API_KEY=xxx ./cloud-run-deploy.sh

set -euo pipefail
PROJECT=${GCP_PROJECT:-$(gcloud config get-value project)}
REGION=${REGION:-us-central1}
SERVICE=${SERVICE_NAME:-gd-process-docs}
IMAGE="gcr.io/${PROJECT}/${SERVICE}:v1"

echo "Building image ${IMAGE}..."
docker build -t ${IMAGE} .

echo "Pushing image..."
docker push ${IMAGE}

echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE} --image ${IMAGE} --region ${REGION} --platform managed --allow-unauthenticated --set-env-vars "GCS_BUCKET=${GCS_BUCKET:-},DRIVE_FOLDER_ID=${DRIVE_FOLDER_ID:-},GEMINI_API_KEY=${GEMINI_API_KEY:-},GEMINI_PROVIDER=${GEMINI_PROVIDER:-},GEMINI_API_URL=${GEMINI_API_URL:-},GEMINI_MODEL=${GEMINI_MODEL:-}"

echo "Done."