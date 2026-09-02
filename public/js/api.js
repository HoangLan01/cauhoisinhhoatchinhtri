/**
 * API Helper Module - Phường Tùng Thiện Quiz
 * Hỗ trợ các thao tác fetch thống nhất, xử lý timeout và lỗi
 */

const ApiClient = (() => {
  const DEFAULT_TIMEOUT_MS = 10000;

  class ApiError extends Error {
    constructor(message, status = 500, data = null) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  }

  async function request(endpoint, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = DEFAULT_TIMEOUT_MS,
      ...customOptions
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      },
      signal: controller.signal,
      ...customOptions
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      config.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Đảm bảo endpoint là đường dẫn tương đối bắt đầu bằng /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    try {
      const response = await fetch(cleanEndpoint, config);
      clearTimeout(timeoutId);

      let responseData = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        const errorMsg =
          (responseData && responseData.error) ||
          (responseData && responseData.message) ||
          `Yêu cầu thất bại (${response.status})`;
        throw new ApiError(errorMsg, response.status, responseData);
      }

      return responseData;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new ApiError('Hết thời gian chờ phản hồi từ máy chủ (Timeout)', 408);
      }
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(err.message || 'Lỗi kết nối mạng, vui lòng thử lại', 0);
    }
  }

  return {
    get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
    put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
    delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
    ApiError
  };
})();

// Gắn vào window để dễ dàng sử dụng từ mọi trang script
window.ApiClient = ApiClient;
