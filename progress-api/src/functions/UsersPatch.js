const {app} = require("@azure/functions");
const {readUserDocument, upsertUserDocument} = require("../shared/cosmos");

const parseRequestBody = async (request) => {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return {};
    }
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
};

const applyPatch = (source, updates) => {
  const clone = JSON.parse(JSON.stringify(source || {}));
  for (const [path, value] of Object.entries(updates || {})) {
    if (!path) {
      continue;
    }
    const segments = path.split("/").filter(Boolean);
    if (!segments.length) {
      continue;
    }
    let cursor = clone;
    while (segments.length > 1) {
      const key = segments.shift();
      if (typeof cursor[key] !== "object" || cursor[key] === null) {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
    cursor[segments[0]] = value;
  }
  return clone;
};

const ensureDefaults = (userId, document) => {
  const result = document || {};
  result.id = result.id || userId;
  result.userId = result.userId || userId;
  if (typeof result.pagesProgress !== "object" || result.pagesProgress === null) {
    result.pagesProgress = {};
  }
  return result;
};

app.http("UsersPatch", {
  methods: ["PATCH"],
  authLevel: "anonymous",
  route: "users/{id}",
  handler: async (request, context) => {
    const userId = request.params.get("id") || request.query.get("id");
    if (!userId) {
      return {
        status: 400,
        jsonBody: {error: "Missing required path parameter: id"},
      };
    }

    const updates = await parseRequestBody(request);
    if (!Object.keys(updates).length) {
      return {
        status: 400,
        jsonBody: {error: "Request body must be a JSON object of updates"},
      };
    }

    context.log(`Applying ${Object.keys(updates).length} updates for user "${userId}"`);

    try {
      const current = ensureDefaults(userId, await readUserDocument(userId));
      const next = ensureDefaults(userId, applyPatch(current, updates));
      await upsertUserDocument(next);
      return {status: 204};
    } catch (error) {
      context.log(`Failed to patch user ${userId}: ${error.message}`);
      return {
        status: 500,
        jsonBody: {error: "Failed to update user progress"},
      };
    }
  },
});
