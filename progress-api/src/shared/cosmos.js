const {CosmosClient} = require("@azure/cosmos");

const connectionString =
  process.env.CosmosConnection ||
  process.env.COSMOS_CONNECTION ||
  process.env.COSMOS_CONNECTION_STRING ||
  process.env.COSMOS_DB_CONNECTION_STRING;

if (!connectionString) {
  throw new Error("Cosmos DB connection string is not configured (CosmosConnection).");
}

const databaseId = process.env.COSMOS_DATABASE_ID || "futurecoder";
const containerId = process.env.COSMOS_CONTAINER_ID || "progress";

const client = new CosmosClient(connectionString);
const containerRef = client.database(databaseId).container(containerId);

const notFoundCodes = new Set([404, "NotFound"]);

async function readUserDocument(userId) {
  try {
    const {resource} = await containerRef.item(userId, userId).read();
    return resource || null;
  } catch (error) {
    if (notFoundCodes.has(error?.code) || notFoundCodes.has(error?.name)) {
      return null;
    }
    throw error;
  }
}

async function upsertUserDocument(document) {
  await containerRef.items.upsert(document);
}

async function listAllUsers() {
  const {resources} = await containerRef.items.query("SELECT * FROM c").fetchAll();
  return resources || [];
}

module.exports = {
  container: containerRef,
  readUserDocument,
  upsertUserDocument,
  listAllUsers,
  databaseId,
  containerId,
};
