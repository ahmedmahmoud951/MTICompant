import * as signalR from '@microsoft/signalr';
import { apiClient } from '@/lib/api-client';
import { SignalRConfig } from '@/types';
import { logger } from '@/lib/logger';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private config: SignalRConfig | null = null;

  public async initialize(): Promise<signalR.HubConnection | null> {
    if (typeof window === 'undefined') return null;

    try {
      // Reuse live connection
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        return this.connection;
      }
      if (this.connection) {
        try { await this.connection.stop(); } catch { /* ignore */ }
        this.connection = null;
      }

      // 1. Fetch dynamic SignalR configuration from authenticated API endpoint
      const res = await apiClient.get<SignalRConfig>('/api/settings/signalr');
      if (!res.success || !res.data || !res.data.hubEnabled) {
        logger.log('SIGNALR', 'SignalR is disabled in system settings.', null, 'warn');
        return null;
      }
      this.config = res.data;

      // Priority 1: Dynamic Hub URL from Database (SystemSettings table)
      // Priority 2: NEXT_PUBLIC_API_URL + HubPath
      const dynamicHubUrl = this.config.hubUrl?.trim();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mtiapi.runasp.net';
      const hubUrl = (dynamicHubUrl && dynamicHubUrl.length > 0)
        ? dynamicHubUrl
        : `${apiUrl}${this.config.hubPath || '/hubs/project'}`;

      logger.log('SIGNALR', `Connecting to Hub at: ${hubUrl}`, null, 'signalr');

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => localStorage.getItem('mti_access_token') || '',
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      this.connection.onreconnecting((err) => {
        logger.log('SIGNALR', `Reconnecting... (${err?.message || 'network drop'})`, null, 'warn');
      });

      this.connection.onreconnected((connectionId) => {
        logger.log('SIGNALR', `Reconnected! Connection ID: ${connectionId}`, null, 'success');
      });

      this.connection.onclose((err) => {
        logger.log('SIGNALR', `Connection closed. (${err?.message || 'stopped'})`, null, 'warn');
      });

      await this.connection.start();
      logger.log('SIGNALR', 'SignalR Live Sync connected successfully to MTI Project Hub.', null, 'success');
      return this.connection;
    } catch (err: any) {
      logger.log('SIGNALR', `Failed to connect to SignalR hub: ${err?.message || err}`, err, 'error');
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
