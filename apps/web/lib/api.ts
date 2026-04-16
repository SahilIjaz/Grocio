// API Configuration
export const getApiUrl = (): string => {
  return "http://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001";
};

export const apiUrl = getApiUrl();

// Helper function to make API calls with self-signed cert support
export const apiCall = async (
  endpoint: string,
  options?: RequestInit
): Promise<Response> => {
  const url = `${apiUrl}${endpoint}`;

  // Note: Self-signed certificate may cause issues in some browsers
  // For production, use a valid SSL certificate from Let's Encrypt or AWS Certificate Manager
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
};
