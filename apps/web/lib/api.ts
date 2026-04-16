// API Configuration
export const getApiUrl = (): string => {
  if (typeof window !== "undefined") {
    // Client-side: use NEXT_PUBLIC_API_URL
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  }
  // Server-side fallback
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
};

export const apiUrl = getApiUrl();

// Helper function to make API calls
export const apiCall = async (
  endpoint: string,
  options?: RequestInit
): Promise<Response> => {
  const url = `${apiUrl}${endpoint}`;
  return fetch(url, options);
};
