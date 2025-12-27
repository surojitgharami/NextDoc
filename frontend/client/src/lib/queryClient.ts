import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Store for auth token getter function - will be set by the auth provider
let getTokenFn: (() => Promise<string | null>) | null = null;

export function setGetTokenFn(fn: (() => Promise<string | null>) | null) {
  getTokenFn = fn;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText = res.statusText;
    try {
      const body = await res.text();
      errorText = body || res.statusText;
    } catch (e) {
      // If reading body fails, use status text
    }
    throw new Error(`${res.status}: ${errorText}`);
  }
}

interface ApiRequestOptions {
  signal?: AbortSignal;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: ApiRequestOptions,
): Promise<Response> {
  // Ensure URL starts with /
  const endpoint = url.startsWith("/") ? url : `/${url}`;

  // Get fresh token for this request
  let token: string | null = null;
  if (getTokenFn) {
    try {
      token = await getTokenFn();
    } catch (error) {
      console.error("Failed to get auth token:", error);
    }
  }

  const res = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    signal: options?.signal,
  });

  await throwIfResNotOk(res);
  return res;
}

export async function apiRequestFormData(
  method: string,
  url: string,
  formData: FormData,
): Promise<Response> {
  // Ensure URL starts with /
  const endpoint = url.startsWith("/") ? url : `/${url}`;

  // Get fresh token for this request
  let token: string | null = null;
  if (getTokenFn) {
    try {
      token = await getTokenFn();
    } catch (error) {
      console.error("Failed to get auth token:", error);
    }
  }

  const res = await fetch(endpoint, {
    method,
    headers: {
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: formData,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const endpoint = queryKey.join("/") as string;
    const fullUrl = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    
    // Get fresh token for this request
    let token: string | null = null;
    if (getTokenFn) {
      try {
        token = await getTokenFn();
      } catch (error) {
        console.error("Failed to get auth token:", error);
      }
    }
    
    const res = await fetch(fullUrl, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
