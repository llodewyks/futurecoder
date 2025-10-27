const {app} = require("@azure/functions");
const {listAllUsers} = require("../shared/cosmos");
const {withCors, handleOptions} = require("../shared/http");

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

app.http("AdminProgress", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "admin/progress",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }
    try {
      const users = (await listAllUsers()).map(normalise);
      return withCors({
        status: 200,
        jsonBody: {users},
      });
    } catch (error) {
      context.log(`Failed to load admin progress: ${error.message}`);
      return withCors({
        status: 500,
        jsonBody: {error: "Failed to load admin progress"},
      });
    }
  },
});
