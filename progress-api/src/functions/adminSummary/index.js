const { app } = require("@azure/functions");
const { listAllUsers } = require("../../shared/cosmos");
const { withCors, handleOptions } = require("../../shared/http");

const normalise = (document = {}) => ({
  userId: document.userId || document.id,
  email: document.email ?? null,
  pageSlug: document.pageSlug ?? null,
  lastActiveAt: document.lastActiveAt ?? null,
  isAdmin: Boolean(document.isAdmin),
  pagesProgress: typeof document.pagesProgress === "object" && document.pagesProgress
    ? document.pagesProgress
    : {},
});

// Define the function
async function adminSummary(request, context) {
  context.log('HTTP trigger function processed a request.');
  
  if (request.method === "OPTIONS") {
    return handleOptions();
  }
  
  try {
    const users = (await listAllUsers()).map(normalise);
    return withCors({
      status: 200,
      jsonBody: { users },
    });
  } catch (error) {
    context.error(`Failed to load admin progress: ${error.message}`, error);
    return withCors({
      status: 500,
      jsonBody: { error: "Failed to load admin progress" },
    });
  }
}

// Register the function with Azure Functions v4 model
app.http('adminSummary', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'adminSummary',
  handler: adminSummary
});

// Export the app
module.exports = app;
