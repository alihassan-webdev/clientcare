/**
 * Type definitions for Cloud Functions
 */

export interface FirestoreUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'customer';
  createdAt: number;
  updatedAt: number;
  syncedWithAuth?: boolean;
}

export interface SyncMetadata {
  lastSyncedAt: number;
  syncSource: 'auth' | 'firestore';
  manualSync?: boolean;
}

export enum SyncSource {
  AUTH = 'auth',
  FIRESTORE = 'firestore',
  MANUAL = 'manual',
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  functionName: string;
  userId?: string;
  email?: string;
  timestamp: number;
  [key: string]: any;
}
