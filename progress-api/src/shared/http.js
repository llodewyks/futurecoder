const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN || "*";
const allowedHeaders = process.env.CORS_ALLOWED_HEADERS || "content-type,x-functions-key";
const allowedMethods = process.env.CORS_ALLOWED_METHODS || "GET,POST,PATCH,OPTIONS";

const baseHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": allowedHeaders,
  "Access-Control-Allow-Methods": allowedMethods,
};

const withCors = (response = {}) => ({
  ...response,
  headers: {
    ...baseHeaders,
    ...(response.headers || {}),
  },
});

const handleOptions = () => withCors({
  status: 204,
});

module.exports = {
  withCors,
  handleOptions,
};
