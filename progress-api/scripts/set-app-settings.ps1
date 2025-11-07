param(
  [string]$ResourceGroup = $env:AZURE_RESOURCE_GROUP,
  [string]$FunctionApp = $env:AZURE_FUNCTIONAPP_NAME
)

if (-not $ResourceGroup) {
  $ResourceGroup = "MSAN-RG-Training"
}

if (-not $FunctionApp) {
  $FunctionApp = "futurecoder-progress-api-cub7aje5cae5a2fa"
}

$required = @("AZURE_WEBJOBS_STORAGE", "COSMOS_CONNECTION")
foreach ($name in $required) {
  if (-not (Get-Item -Path Env:\$name -ErrorAction SilentlyContinue)) {
    Write-Error "Environment variable '$name' must be set before running this script."
    exit 1
  }
}

$settings = @{
  AzureWebJobsStorage = $env:AZURE_WEBJOBS_STORAGE
  FUNCTIONS_WORKER_RUNTIME = "node"
  CosmosConnection = $env:COSMOS_CONNECTION
  COSMOS_DATABASE_ID = $(if ($env:COSMOS_DATABASE_ID) { $env:COSMOS_DATABASE_ID } else { "futurecoder" })
  COSMOS_CONTAINER_ID = $(if ($env:COSMOS_CONTAINER_ID) { $env:COSMOS_CONTAINER_ID } else { "progress" })
  CORS_ALLOWED_ORIGIN = $(if ($env:CORS_ALLOWED_ORIGIN) { $env:CORS_ALLOWED_ORIGIN } else { "*" })
  CORS_ALLOWED_METHODS = $(if ($env:CORS_ALLOWED_METHODS) { $env:CORS_ALLOWED_METHODS } else { "GET,POST,PATCH,OPTIONS" })
  CORS_ALLOWED_HEADERS = $(if ($env:CORS_ALLOWED_HEADERS) { $env:CORS_ALLOWED_HEADERS } else { "content-type,x-functions-key" })
}

$settingsArgs = $settings.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }

Write-Host "Updating app settings for $FunctionApp in resource group $ResourceGroup..."

az functionapp config appsettings set `
  --name $FunctionApp `
  --resource-group $ResourceGroup `
  --settings $settingsArgs

Write-Host "Done. Current values:"
az functionapp config appsettings list `
  --name $FunctionApp `
  --resource-group $ResourceGroup `
  --query "[?name=='AzureWebJobsStorage' || name=='CosmosConnection' || starts_with(name,'CORS_') || name=='COSMOS_DATABASE_ID' || name=='COSMOS_CONTAINER_ID']"
