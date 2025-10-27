const {app} = require("@azure/functions");
const {readUserDocument} = require("../shared/cosmos");
const {withCors, handleOptions} = require("../shared/http");

const fallbackPageSlug = "loading_placeholder";

const normaliseUserDocument = (userId, document = {}) => {
  const pagesProgress = typeof document.pagesProgress === "object" && document.pagesProgress
    ? document.pagesProgress
    : {};

  return {
    userId,
    email: document.email ?? null,
    pageSlug: document.pageSlug || fallbackPageSlug,
    developerMode: Boolean(document.developerMode),
    editorContent: document.editorContent || "",
    lastActiveAt: document.lastActiveAt ?? null,
    isAdmin: Boolean(document.isAdmin),
    pagesProgress,
  };
};

app.http("UsersGet", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "users/{id}",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }
    const userId = request.params.get("id") || request.query.get("id");
    if (!userId) {
      return withCors({
        status: 400,
        jsonBody: {error: "Missing required path parameter: id"},
      });
    }

    context.log(`Fetching progress for user "${userId}"`);

    try {
      const document = await readUserDocument(userId);
      if (!document) {
        return withCors({
          status: 404,
          jsonBody: {error: "User not found"},
        });
      }

      return withCors({
        status: 200,
        jsonBody: normaliseUserDocument(userId, document),
      });
    } catch (error) {
      context.log(`Failed to fetch user ${userId}: ${error.message}`);
      return withCors({
        status: 500,
        jsonBody: {error: "Failed to load user progress"},
      });
    }
  },
});
