import { ApiResponse } from '@/types';
import { logger } from './logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mtiapi.runasp.net';

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('mti_access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('mti_refresh_token');
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mti_access_token', accessToken);
    localStorage.setItem('mti_refresh_token', refreshToken);
  }

  public clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('mti_access_token');
    localStorage.removeItem('mti_refresh_token');
    localStorage.removeItem('mti_user');
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    // For FormData, let the browser set multipart boundary automatically
    if (isFormData && headers.has('Content-Type')) {
      headers.delete('Content-Type');
    }

    const token = this.getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const method = options.method || 'GET';

    let response = await fetch(url, { ...options, headers });

    // Handle Token Expiry & Automatic Refresh
    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${this.getAccessToken()}`);
        response = await fetch(url, { ...options, headers });
      } else {
        this.clearTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/';
        }
      }
    }

    const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime);
    logger.http(method, endpoint, response.status, durationMs);

    const data = await response.json().catch(() => ({
      success: false,
      message: `HTTP Error ${response.status}: ${response.statusText}`,
      data: null as unknown as T,
      errors: [response.statusText],
    }));

    if (!response.ok) {
      logger.log('ERROR', `HTTP [${response.status}] ${endpoint}: ${data?.message || response.statusText}`, data, 'error');
      const message =
        data?.message
        || (response.status === 403
          ? 'ليس لديك صلاحية لهذا الإجراء. سجّل دخول بحساب Admin.'
          : `Request failed with status ${response.status}`);
      return {
        success: false,
        message,
        data: null as unknown as T,
        errors: data?.errors || [response.statusText],
      };
    }

    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
      return data;
    }

    return {
      success: true,
      message: 'Success',
      data: data as T,
      errors: [],
    };
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.success && data.data?.accessToken && data.data?.refreshToken) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public uploadForm<T>(endpoint: string, formData: FormData, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export { API_BASE_URL };
