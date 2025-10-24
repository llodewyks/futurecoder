import axios from "axios";

const baseUrl = (process.env.REACT_APP_PROGRESS_API_BASE || "").replace(/\/$/, "");
const apiKey = process.env.REACT_APP_PROGRESS_API_KEY;

export const progressApiAvailable = Boolean(baseUrl);

const safeHeaders = () => {
  if (!apiKey) {
    return {};
  }
  return {"x-functions-key": apiKey};
};

const request = async (config) => {
  if (!progressApiAvailable) {
    return null;
  }
  const finalConfig = {
    ...config,
    headers: {
      ...safeHeaders(),
      ...(config.headers || {}),
    },
    timeout: 15000,
  };
  const response = await axios(finalConfig);
  return response.data;
};

export async function fetchUserProgress(userId) {
  if (!progressApiAvailable || !userId) {
    return null;
  }
  try {
    return await request({
      method: "GET",
      url: `${baseUrl}/users/${encodeURIComponent(userId)}`,
    });
  } catch (error) {
    if (error?.response?.status === 404) {
      return {};
    }
    throw error;
  }
}

export async function patchUserProgress(userId, updates) {
  if (!progressApiAvailable || !userId || !updates || !Object.keys(updates).length) {
    return null;
  }
  try {
    return await request({
      method: "PATCH",
      url: `${baseUrl}/users/${encodeURIComponent(userId)}`,
      data: updates,
    });
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchAdminProgress() {
  if (!progressApiAvailable) {
    return null;
  }
  return request({
    method: "GET",
    url: `${baseUrl}/admin/progress`,
  });
}
