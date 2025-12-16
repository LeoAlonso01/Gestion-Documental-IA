Document processing Cloud Function (MVP)

Setup (outline):
1. Enable APIs in your GCP project: Drive API, Cloud Vision API, Cloud Functions, Firestore, Cloud Storage.
2. Create a service account with permissions: Drive File access (or full Drive for folder), Storage Object Admin, Vision User, and Firestore User.
3. Store the service account key in your environment or deploy to GCP so the function uses Workload Identity / ADC.
4. Create a GCS bucket and set env var GCS_BUCKET to it. Also create or choose a Drive folder and set DRIVE_FOLDER_ID (optional).
5. Set env var GEMINI_API_KEY with your Gemini API key (or endpoint-specific credentials). Optionally set GEMINI_PROVIDER ("google" or "generic"), GEMINI_MODEL (for Google provider) and GEMINI_API_URL (for generic providers).
6. Deploy the function (adjust to your platform). The project includes an Express server that can be deployed as an HTTP Cloud Function or to Cloud Run.

Notes:
- The code uses asyncBatchAnnotateFiles for PDFs which requires the file to be on GCS (the function uploads PDFs temporarily and cleans outputs after OCR is finished).
- This implementation intentionally does NOT save the original file (no upload to Drive) during the `/process` step — it only extracts text and returns the extracted JSON for review. If you want to store originals later, that can be added as an explicit separate step.
- A flexible Gemini wrapper is implemented in `index.js` as `callGemini(prompt)`; it supports:
  - provider="google": uses Google Generative Language (`models/{model}:generate`) with `GEMINI_MODEL` and `GEMINI_API_KEY`.
  - provider="deepseek": use `GEMINI_PROVIDER=deepseek`, set `GEMINI_API_URL` to the DeepSeek endpoint and `GEMINI_API_KEY` to your DeepSeek API key (Bearer). This provider is treated similarly to the "generic" flow.
  - provider="generic": uses `GEMINI_API_URL` with a Bearer token `GEMINI_API_KEY` (POST { prompt }).
  Adapt `GEMINI_PROVIDER` and `GEMINI_API_URL` to match the service you use.
- The function tries to parse a strict JSON response from the model; if the model returns non-JSON text, the raw text is saved under a `_raw` field.
- Always keep your GEMINI_API_KEY secret and only available server-side.

Providers and examples
- provider="google": use `GEMINI_PROVIDER=google` and set `GEMINI_MODEL` to a supported model (example: `gemini-pro`, `gemini-mini` depending on availability). The function will call Google Generative Language `models/{model}:generate` using the provided API key.
- provider="generic": set `GEMINI_PROVIDER=generic` and `GEMINI_API_URL` to the endpoint that accepts `{ prompt }` in the POST body and uses Bearer token auth with `GEMINI_API_KEY`.

Deployment helpers:
- `deploy.sh`: deploys to Cloud Functions using `gcloud functions deploy` (see top of script for example usage). Example usage:

  GCS_BUCKET=my-bucket DRIVE_FOLDER_ID=1a2b3c GEMINI_API_KEY=xxx GEMINI_PROVIDER=google GEMINI_MODEL=gemini-pro ./deploy.sh

- `cloud-run-deploy.sh`: builds and deploys a Docker image to Cloud Run. Example usage:

  GCP_PROJECT=myproject REGION=us-central1 SERVICE_NAME=gd-process-docs GEMINI_API_KEY=xxx ./cloud-run-deploy.sh

Security: ensure the service account used by the function has the least privilege required to access Drive, GCS and Firestore.

Testing locally
- You can run the server locally for testing with:

  npm install
  npm start

  Then send multipart POSTs to http://localhost:8080/process


Notes on adapting Gemini integration
- The function provides a flexible wrapper `callGemini(prompt)` inside `index.js`. Adjust the parsing logic if your provider returns a different shape (the code already attempts to handle several common response shapes).
