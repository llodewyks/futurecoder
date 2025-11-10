Progress API Deployment
=======================

- Run `npm run build` to compile the Azure Functions project into `dist/`.
- The GitHub Actions workflow (`deploy-progress-api.yml`) copies the compiled output into `progress-api/deployment`, installs runtime dependencies, and zips that folder into `functionapp.zip`.
- The workflow then logs into Azure via OIDC and runs `az functionapp deployment source config-zip` against the `futurecoder-progress-api` app inside `MSAN-RG-Training`.
- When this README changes (or any other file under `progress-api/`), the workflow triggers automatically. For ad-hoc deployments use the `workflow_dispatch` action in GitHub.
