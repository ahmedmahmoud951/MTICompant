import * as signalR from '@microsoft/signalr';
import { apiClient } from '@/lib/api-client';
import { SignalRConfig } from '@/types';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private config: SignalRConfig | null = null;

  public async initialize(): Promise<signalR.HubConnection | null> {
    if (typeof window === 'undefined') return null;

    try {
      // 1. Fetch dynamic SignalR configuration from authenticated API endpoint
      const res = await apiClient.get<SignalRConfig>('/api/settings/signalr');
      if (!res.success || !res.data || !res.data.hubEnabled) {
        console.warn('SignalR is disabled in system settings.');
        return null;
      }
      this.config = res.data;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5241';
      const hubUrl = `${apiUrl}${this.config.hubPath || '/hubs/project'}`;

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => localStorage.getItem('mti_access_token') || '',
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      await this.connection.start();
      console.log('SignalR connected to MTI Project Hub.');
      return this.connection;
    } catch (err) {
      console.error('Failed to connect to SignalR hub:', err);
      return null;
    }
  }

  public getConnection(): signalR.HubConnection | null {
    return this.connection;
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}

export const signalRService = new SignalRService();
