'use client';

import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';

/**
 * REALTIME-02 / REALTIME-03: Deduplication-aware SignalR connection wrapper.
 *
 * Every event from the server includes { eventId, eventType, ...payload }.
 * The client maintains a fixed-size LRU cache of processed eventIds.
 * On reconnect, the client does NOT replay events — the server sends only
 * new events via the Outbox pattern, so there is no risk of duplication
 * from the server side. Client-side dedup protects against any edge case
 * where the same event might arrive twice over the WebSocket.
 */

const DEDUP_CACHE_SIZE = 200;

class EventDeduplicator {
  private processed = new Set<string>();
  private queue: string[] = [];

  /** Returns true if this event was already processed (duplicate). */
  isDuplicate(eventId: string): boolean {
    return this.processed.has(eventId);
  }

  /** Mark an eventId as processed. */
  markProcessed(eventId: string): void {
    if (this.processed.has(eventId)) return;
    if (this.queue.length >= DEDUP_CACHE_SIZE) {
      const oldest = this.queue.shift()!;
      this.processed.delete(oldest);
    }
    this.processed.add(eventId);
    this.queue.push(eventId);
  }
}

// Shared deduplicator instance per page load
const deduplicator = new EventDeduplicator();

export type RealtimeEventHandler = (payload: Record<string, unknown>) => void;

export class MtiRealtimeClient {
  private connection: HubConnection | null = null;
  private handlers = new Map<string, RealtimeEventHandler[]>();
  private groupsToJoin: string[] = [];

  constructor(private hubUrl: string, private getToken: () => string | null) {}

  async connect(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    // Generic event router with REALTIME-03 deduplication
    this.connection.onreconnected(async () => {
      console.log('[SignalR] Reconnected — re-joining groups');
      await this.rejoinGroups();
    });

    // Register a wildcard listener that routes by eventType
    // We listen for the set of known event types
    const knownEvents = [
      'MessageCreated', 'MessageEdited', 'MessageDeleted', 'MessageRead',
      'TaskAssigned', 'TaskStatusChanged', 'TaskCompleted',
      'DocumentUploaded', 'DocumentApproved', 'DocumentRejected',
      'ProjectUpdated', 'MilestoneCompleted',
      'NotificationReceived', 'Notification',
      'UserOnline', 'UserOffline',
      'ProjectCreated', 'SiteAssigned', 'DataRecordSubmitted', 'DataRecordApproved',
      'IssueCreated', 'MaintenanceCreated', 'WarrantyExpiring',
    ];

    for (const event of knownEvents) {
      this.connection.on(event, (payload: Record<string, unknown>) => {
        this.routeEvent(event, payload);
      });
    }

    await this.connection.start();
    await this.rejoinGroups();
    console.log('[SignalR] Connected to', this.hubUrl);
  }

  private routeEvent(eventType: string, payload: Record<string, unknown>): void {
    const eventId = payload['eventId'] as string | undefined;

    // REALTIME-03: Skip duplicates
    if (eventId) {
      if (deduplicator.isDuplicate(eventId)) {
        console.debug(`[SignalR] Duplicate event ignored: ${eventId}`);
        return;
      }
      deduplicator.markProcessed(eventId);
    }

    const handlers = this.handlers.get(eventType) ?? [];
    handlers.forEach(h => h(payload));
  }

  on(eventType: string, handler: RealtimeEventHandler): () => void {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, []);
    this.handlers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const list = this.handlers.get(eventType) ?? [];
      this.handlers.set(eventType, list.filter(h => h !== handler));
    };
  }

  async joinGroup(group: string): Promise<void> {
    if (!this.groupsToJoin.includes(group)) this.groupsToJoin.push(group);
    if (this.connection?.state === HubConnectionState.Connected) {
      try { await this.connection.invoke('JoinGroup', group); } catch {}
    }
  }

  async leaveGroup(group: string): Promise<void> {
    this.groupsToJoin = this.groupsToJoin.filter(g => g !== group);
    if (this.connection?.state === HubConnectionState.Connected) {
      try { await this.connection.invoke('LeaveGroup', group); } catch {}
    }
  }

  private async rejoinGroups(): Promise<void> {
    for (const group of this.groupsToJoin) {
      try { await this.connection!.invoke('JoinGroup', group); } catch {}
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  get state(): HubConnectionState | null {
    return this.connection?.state ?? null;
  }
}
