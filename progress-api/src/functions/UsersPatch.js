const {app} = require("@azure/functions");
const {readUserDocument, upsertUserDocument} = require("../shared/cosmos");
const {withCors, handleOptions} = require("../shared/http");

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
  methods: ["PATCH", "OPTIONS"],
  authLevel: "anonymous",
  route: "users/{id}",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }
    const userId =
      (request.params && typeof request.params.get === "function" && request.params.get("id")) ||
      (request.params && request.params.id) ||
      (request.query && typeof request.query.get === "function" && request.query.get("id")) ||
      (request.query && request.query.id) ||
      null;
    if (!userId) {
      return withCors({
        status: 400,
        jsonBody: {error: "Missing required path parameter: id"},
      });
    }

    const updates = await parseRequestBody(request);
    if (!Object.keys(updates).length) {
      return withCors({
        status: 400,
        jsonBody: {error: "Request body must be a JSON object of updates"},
      });
    }

    context.log(`Applying ${Object.keys(updates).length} updates for user "${userId}"`);

    try {
      const current = ensureDefaults(userId, await readUserDocument(userId));
      const next = ensureDefaults(userId, applyPatch(current, updates));
      await upsertUserDocument(next);
      return withCors({status: 204});
    } catch (error) {
      context.log.error(`Failed to patch user ${userId}: ${error.message}`, error);
      return withCors({
        status: 500,
        jsonBody: {error: "Failed to update user progress"},
      });
    }
  },
});
