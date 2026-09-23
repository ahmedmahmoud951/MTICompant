import { ApiResponse } from '@/types';
import { logger } from './logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mtiapi.runasp.net';

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

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

    // Handle Token Expiry & Automatic Refresh (single-flight)
    const isAuthEndpoint =
      endpoint.includes('/api/auth/login') ||
      endpoint.includes('/api/auth/refresh-token') ||
      endpoint.includes('/api/auth/logout');

    if (response.status === 401 && !isAuthEndpoint) {
      if (this.getRefreshToken()) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          headers.set('Authorization', `Bearer ${this.getAccessToken()}`);
          response = await fetch(url, { ...options, headers });
        } else {
          this.clearTokens();
        }
      } else {
        this.clearTokens();
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
          : response.status === 401
            ? 'انتهت الجلسة. سجّل الدخول من جديد.'
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
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
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
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
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

  /** Upload FormData with real byte progress (0–100). Used by documents and other file uploads. */
  public uploadFormWithProgress<T>(
    endpoint: string,
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      const token = this.getAccessToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const pct = Math.max(0, Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
        onProgress?.(pct);
      };

      xhr.onload = () => {
        onProgress?.(100);
        let data: any;
        try {
          data = JSON.parse(xhr.responseText || '{}');
        } catch {
          data = {
            success: false,
            message: `HTTP Error ${xhr.status}`,
            data: null,
            errors: [xhr.statusText],
          };
        }

        logger.http('POST', endpoint, xhr.status, 0);

        if (xhr.status < 200 || xhr.status >= 300) {
          logger.log('ERROR', `HTTP [${xhr.status}] ${endpoint}: ${data?.message || xhr.statusText}`, data, 'error');
          resolve({
            success: false,
            message: data?.message || data?.Message || `Request failed with status ${xhr.status}`,
            data: null as unknown as T,
            errors: data?.errors || data?.Errors || [xhr.statusText],
          });
          return;
        }

        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          resolve(data);
          return;
        }
        if (data && typeof data === 'object' && 'Success' in data) {
          resolve({
            success: !!data.Success,
            message: data.Message || '',
            data: data.Data as T,
            errors: data.Errors || [],
          });
          return;
        }

        resolve({ success: true, message: 'Success', data: data as T, errors: [] });
      };

      xhr.onerror = () => {
        resolve({
          success: false,
          message: 'Network error during upload',
          data: null as unknown as T,
          errors: ['Network error'],
        });
      };

      xhr.send(formData);
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
