#!/usr/bin/env bash

set -euo pipefail

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-MSAN-RG-Training}"
FUNCTION_APP="${AZURE_FUNCTIONAPP_NAME:-futurecoder-progress-api-cub7aje5cae5a2fa}"

required_vars=("AZURE_WEBJOBS_STORAGE" "COSMOS_CONNECTION")
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Environment variable $var must be set before running this script." >&2
    exit 1
  fi
done

COSMOS_DATABASE_ID="${COSMOS_DATABASE_ID:-futurecoder}"
COSMOS_CONTAINER_ID="${COSMOS_CONTAINER_ID:-progress}"
CORS_ALLOWED_ORIGIN="${CORS_ALLOWED_ORIGIN:-*}"
CORS_ALLOWED_METHODS="${CORS_ALLOWED_METHODS:-GET,POST,PATCH,OPTIONS}"
CORS_ALLOWED_HEADERS="${CORS_ALLOWED_HEADERS:-content-type,x-functions-key}"

echo "Updating app settings for ${FUNCTION_APP} in resource group ${RESOURCE_GROUP}..."

az functionapp config appsettings set \
  --name "${FUNCTION_APP}" \
  --resource-group "${RESOURCE_GROUP}" \
  --settings \
    "AzureWebJobsStorage=${AZURE_WEBJOBS_STORAGE}" \
    "FUNCTIONS_WORKER_RUNTIME=node" \
    "CosmosConnection=${COSMOS_CONNECTION}" \
    "COSMOS_DATABASE_ID=${COSMOS_DATABASE_ID}" \
    "COSMOS_CONTAINER_ID=${COSMOS_CONTAINER_ID}" \
    "CORS_ALLOWED_ORIGIN=${CORS_ALLOWED_ORIGIN}" \
    "CORS_ALLOWED_METHODS=${CORS_ALLOWED_METHODS}" \
    "CORS_ALLOWED_HEADERS=${CORS_ALLOWED_HEADERS}"

echo "Done. Current settings:"
az functionapp config appsettings list \
  --name "${FUNCTION_APP}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "[?name=='AzureWebJobsStorage' || name=='CosmosConnection' || starts_with(name,'CORS_') || name=='COSMOS_DATABASE_ID' || name=='COSMOS_CONTAINER_ID']"
