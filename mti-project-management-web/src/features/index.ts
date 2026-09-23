// Export features
export const MODULES = [
  'auth', 'dashboard', 'users', 'projects', 'sites',
  'assignments', 'project-data', 'tasks', 'chat',
  'notifications', 'reports', 'settings',
  'documents', 'milestones', 'organization'
] as const;

export * from './documents/DocumentsManager';
export * from './milestones/MilestonesRoadmap';
export * from './organization/OrganizationView';
export * from './accounting/AccountingWorkspace';
export * from './operations/SiteOperationsManager';
export * from './reports/DailySiteReportsManager';
export * from './reports/ReportsAnalyticsHub';
export * from './dashboard/MainDashboard';

