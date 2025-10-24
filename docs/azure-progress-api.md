Azure Progress API Integration
================================

This frontend can persist learner progress and feed the admin dashboard entirely through Azure Functions. The sections below describe a minimal implementation you can adapt to your infrastructure.

Environment variables
---------------------

Configure the React app via `.env.local` (see `frontend/.env.local.example`):

```
REACT_APP_PROGRESS_API_BASE=https://your-function-app.azurewebsites.net/api
REACT_APP_PROGRESS_API_KEY=<optional functions key>
REACT_APP_ADMIN_EMAILS=admin@example.com,@company.com
```

Endpoint contract
-----------------

The UI expects three endpoints under `REACT_APP_PROGRESS_API_BASE`:

1. **GET `/users/{id}`**  
   Returns a JSON document shaped like:
   ```json
   {
     "pageSlug": "Introduction",
     "developerMode": false,
     "editorContent": "print('hello world')",
     "pagesProgress": {
       "Introduction": {
         "step_name": "writing_code",
         "updated_at": "2025-10-24T08:00:00Z"
       }
     }
   }
   ```
   Fields can contain more data, but these keys are required.

2. **PATCH `/users/{id}`**  
   Accepts partial updates in the same shape and merges them into storage. For example:
   ```json
   {
     "pagesProgress/Introduction/step_name": "next_step",
     "pagesProgress/Introduction/updated_at": "2025-10-24T08:05:00Z"
   }
   ```
   You can implement this either as a document merge or convert the flattened paths back to nested objects before writing.

3. **GET `/admin/progress`**  
   Returns either an array or an object with a `users` array. Each entry needs:
   ```json
   {
     "userId": "1234-5678",
     "email": "learner@example.com",
     "pagesProgress": { "...": { "step_name": "...", "updated_at": "..." } }
   }
   ```

Sample Azure Functions skeleton
-------------------------------

Below is a TypeScript/JavaScript example using Cosmos DB bindings. Adjust names and bindings to match your resource group.

`UsersGet/index.js`
```javascript
module.exports = async function (context, req) {
  const { id } = req.params;
  const user = context.bindings.userDocument || {};
  context.res = {
    status: 200,
    body: {
      pageSlug: user.pageSlug || "loading_placeholder",
      developerMode: Boolean(user.developerMode),
      editorContent: user.editorContent || "",
      pagesProgress: user.pagesProgress || {},
      email: user.email || null
    }
  };
};
```

`UsersGet/function.json`
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": [ "get" ],
      "route": "users/{id}"
    },
    {
      "type": "cosmosDB",
      "direction": "in",
      "name": "userDocument",
      "databaseName": "futurecoder",
      "containerName": "progress",
      "connection": "CosmosConnection",
      "partitionKey": "{id}",
      "id": "{id}"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

`UsersPatch/index.js`
```javascript
const applyPatch = (doc, updates) => {
  const clone = { ...doc };
  Object.entries(updates).forEach(([path, value]) => {
    const segments = path.split("/");
    let cursor = clone;
    while (segments.length > 1) {
      const key = segments.shift();
      cursor[key] = cursor[key] || {};
      cursor = cursor[key];
    }
    cursor[segments[0]] = value;
  });
  return clone;
};

module.exports = async function (context, req) {
  const { id } = req.params;
  const updates = req.body || {};
  const current = context.bindings.userDocument || {};
  const next = applyPatch(current, updates);
  next.userId = next.userId || id;
  context.bindings.updatedDocument = next;
  context.res = { status: 204 };
};
```

`UsersPatch/function.json`
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": [ "patch" ],
      "route": "users/{id}"
    },
    {
      "type": "cosmosDB",
      "direction": "in",
      "name": "userDocument",
      "databaseName": "futurecoder",
      "containerName": "progress",
      "connection": "CosmosConnection",
      "partitionKey": "{id}",
      "id": "{id}"
    },
    {
      "type": "cosmosDB",
      "direction": "out",
      "name": "updatedDocument",
      "databaseName": "futurecoder",
      "containerName": "progress",
      "connection": "CosmosConnection",
      "createIfNotExists": true,
      "partitionKey": "{id}"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

`AdminProgress/index.js`
```javascript
module.exports = async function (context, req) {
  const users = context.bindings.progressDocuments || [];
  context.res = {
    status: 200,
    body: {
      users: users.map(doc => ({
        userId: doc.userId || doc.id,
        email: doc.email || null,
        pagesProgress: doc.pagesProgress || {}
      }))
    }
  };
};
```

`AdminProgress/function.json`
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": [ "get" ],
      "route": "admin/progress"
    },
    {
      "type": "cosmosDB",
      "direction": "in",
      "name": "progressDocuments",
      "databaseName": "futurecoder",
      "containerName": "progress",
      "connection": "CosmosConnection",
      "sqlQuery": "SELECT * FROM c"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

Local testing tips
------------------

1. Install the Azure Functions Core Tools and Cosmos DB emulator (or target your cloud instance).
2. Create `local.settings.json` alongside `host.json`:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "CosmosConnection": "AccountEndpoint=https://localhost:8081/;AccountKey=local-emulator-key;"
     }
   }
   ```
3. Seed the `progress` container with documents matching the schema above.
4. Run `func start` and confirm the endpoints return sample data.
5. Set `REACT_APP_PROGRESS_API_BASE=http://localhost:7071/api` in `.env.local` and start the React app.

Security considerations
-----------------------

- Swap `authLevel` to `anonymous` and enforce Azure AD via Easy Auth if you plan to use MSAL access tokens instead of a functions key.
- Restrict `AdminProgress` to admins only (e.g. verify group claims in Easy Auth headers or add your own JWT validation layer).
- Sanitize inputs when you expand the schema; the skeleton above blindly merges update paths, so refine it for production.

Once these endpoints are live, the frontend will automatically persist learner progress and render the admin dashboard using your Azure stack.
