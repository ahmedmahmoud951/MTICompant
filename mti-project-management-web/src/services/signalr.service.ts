import * as signalR from '@microsoft/signalr';
import { apiClient } from '@/lib/api-client';
import { SignalRConfig } from '@/types';
import { logger } from '@/lib/logger';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private config: SignalRConfig | null = null;
  private reconnectCallbacks: ((connectionId?: string) => void)[] = [];
  private handlersMap = new Map<string, Set<Function>>();
  private channel: BroadcastChannel | null = null;
  private isInitializing = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('mti_realtime_sync_channel');
        this.channel.onmessage = (event) => {
          const { eventName, payload } = event.data || {};
          if (eventName) {
            this.dispatchLocal(eventName, payload);
          }
        };
      } catch (e) {
        console.warn('[SignalR] BroadcastChannel not supported or error:', e);
      }
    }
  }

  public async initialize(): Promise<signalR.HubConnection | null> {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem('mti_access_token');
    if (!token) {
      logger.log('SIGNALR', 'Skipped: no access token in session.', null, 'warn');
      return null;
    }

    if (this.isInitializing) return this.connection;
    this.isInitializing = true;

    try {
      // Reuse live connection if already connected
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        this.isInitializing = false;
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
        this.isInitializing = false;
        return null;
      }
      this.config = res.data;

      const dynamicHubUrl = this.config.hubUrl?.trim();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mtiapi.runasp.net';
      const hubUrl = (dynamicHubUrl && dynamicHubUrl.length > 0)
        ? dynamicHubUrl
        : `${apiUrl}${this.config.hubPath || '/hubs/realtime'}`;

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

      // Bind all existing registered event handlers to this connection
      this.handlersMap.forEach((_, eventName) => {
        this.connection!.on(eventName, (...args: any[]) => {
          this.dispatchLocal(eventName, ...args);
        });
      });

      this.connection.onreconnecting((err) => {
        logger.log('SIGNALR', `Reconnecting... (${err?.message || 'network drop'})`, null, 'warn');
      });

      this.connection.onreconnected((connectionId) => {
        logger.log('SIGNALR', `Reconnected! Connection ID: ${connectionId}`, null, 'success');
        this.reconnectCallbacks.forEach((cb) => {
          try { cb(connectionId); } catch (e) { console.error('Error in SignalR reconnect callback', e); }
        });
      });

      this.connection.onclose((err) => {
        logger.log('SIGNALR', `Connection closed. (${err?.message || 'stopped'})`, null, 'warn');
      });

      await this.connection.start();
      logger.log('SIGNALR', 'SignalR Live Sync connected successfully to MTI Centralized Realtime Hub.', null, 'success');
      this.isInitializing = false;
      return this.connection;
    } catch (err: any) {
      logger.log('SIGNALR', `Failed to connect to SignalR hub: ${err?.message || err}`, err, 'error');
      this.isInitializing = false;
      return null;
    }
  }

  /**
   * Subscribe to a Realtime SignalR event.
   * Automatically persists across reconnects and works across tabs.
   * Returns an unsubscribe function for React useEffect cleanup.
   */
  public on(eventName: string, handler: (...args: any[]) => void): () => void {
    if (!this.handlersMap.has(eventName)) {
      this.handlersMap.set(eventName, new Set());
      if (this.connection) {
        this.connection.on(eventName, (...args: any[]) => {
          this.dispatchLocal(eventName, ...args);
        });
      }
    }

    this.handlersMap.get(eventName)!.add(handler);

    return () => {
      const set = this.handlersMap.get(eventName);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.handlersMap.delete(eventName);
          if (this.connection) {
            try { this.connection.off(eventName); } catch { /* ignore */ }
          }
        }
      }
    };
  }

  /**
   * Broadcast an event to local listeners, all browser tabs, and SignalR Hub.
   */
  public emit(eventName: string, payload?: any, targetGroup?: string): void {
    // 1. Dispatch locally in this tab immediately
    this.dispatchLocal(eventName, payload);

    // 2. Broadcast across tabs in the same browser
    if (this.channel) {
      try {
        this.channel.postMessage({ eventName, payload, targetGroup });
      } catch (e) { /* ignore */ }
    }

    // 3. Send over SignalR hub if connected
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        this.connection.invoke('BroadcastEvent', eventName, payload, targetGroup || null).catch(() => {});
      } catch { /* ignore */ }
    }
  }

  private dispatchLocal(eventName: string, ...args: any[]) {
    const set = this.handlersMap.get(eventName);
    if (set && set.size > 0) {
      set.forEach((fn) => {
        try {
          fn(...args);
        } catch (e) {
          console.error(`[SignalR] Error in handler for event "${eventName}":`, e);
        }
      });
    }
  }

  public onReconnected(callback: (connectionId?: string) => void): () => void {
    this.reconnectCallbacks.push(callback);
    return () => {
      this.reconnectCallbacks = this.reconnectCallbacks.filter((c) => c !== callback);
    };
  }

  public getConnection(): signalR.HubConnection | null {
    return this.connection;
  }

  public async joinProject(projectId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected && projectId) {
      await this.connection.invoke('JoinProject', projectId).catch(() => {});
    }
  }

  public async leaveProject(projectId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected && projectId) {
      await this.connection.invoke('LeaveProject', projectId).catch(() => {});
    }
  }

  public async joinSite(siteId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected && siteId) {
      await this.connection.invoke('JoinSite', siteId).catch(() => {});
    }
  }

  public async leaveSite(siteId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected && siteId) {
      await this.connection.invoke('LeaveSite', siteId).catch(() => {});
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
    if (this.channel) {
      try { this.channel.close(); } catch { /* ignore */ }
      this.channel = null;
    }
  }
}

export const signalRService = new SignalRService();
