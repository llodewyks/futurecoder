const {app} = require("@azure/functions");
const {listAllUsers} = require("../shared/cosmos");

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
  methods: ["GET"],
  authLevel: "anonymous",
  route: "admin/progress",
  handler: async (_request, context) => {
    try {
      const users = (await listAllUsers()).map(normalise);
      return {
        status: 200,
        jsonBody: {users},
      };
    } catch (error) {
      context.log(`Failed to load admin progress: ${error.message}`);
      return {
        status: 500,
        jsonBody: {error: "Failed to load admin progress"},
      };
    }
  },
});
