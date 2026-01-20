// Core entity types for the Vendors Manager application

export type PermissionLevel = "denied" | "view" | "write" | "admin";

// User status for invitation workflow
export type UserStatus = "invited" | "active";

// Email delivery status for tracking
export type EmailDeliveryStatus = "pending" | "sent" | "failed";

// Re-export RBAC types
export * from './rbac';

export type VendorStatus = "active" | "inactive";

export type TeamMemberStatus = "active" | "inactive" | "onboarding" | "offboarded";

export type ContractStatus = "draft" | "active" | "expired" | "terminated";

export type InvoiceStatus = "pending" | "validated" | "disputed" | "paid";

export type TimeOffCode =
  | "VAC" // Vacation
  | "HALF" // Half Day
  | "SICK" // Sick Leave
  | "MAT" // Maternity Leave
  | "CAS" // Casual Leave
  | "UNPAID"; // Unpaid Leave

// Document types for vendor documents
export type DocumentType =
  | "CONTRACT"
  | "SOW"
  | "SLA"
  | "NDA"
  | "MSA"
  | "AMENDMENT"
  | "ADDENDUM"
  | "INVOICE"
  | "PROPOSAL"
  | "INSURANCE"
  | "COMPLIANCE"
  | "OTHER";

// Document type labels for display
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CONTRACT: "Contract",
  SOW: "Statement of Work",
  SLA: "Service Level Agreement",
  NDA: "Non-Disclosure Agreement",
  MSA: "Master Service Agreement",
  AMENDMENT: "Amendment",
  ADDENDUM: "Addendum",
  INVOICE: "Invoice",
  PROPOSAL: "Proposal",
  INSURANCE: "Insurance Certificate",
  COMPLIANCE: "Compliance Document",
  OTHER: "Other",
};

// AI Provider types
export type AIProvider = "anthropic" | "openai";

// Base entity interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User interface
export interface User extends BaseEntity {
  email: string;
  name: string;
  permissionLevel: PermissionLevel;
  isActive: boolean;
  isSuperUser: boolean;
}

// Vendor interface
export interface Vendor extends BaseEntity {
  name: string;
  address?: string;
  location?: string;
  serviceDescription?: string;
  status: VendorStatus;
  contractStartDate?: Date;
  contractEndDate?: Date;
  tags: Tag[];
}

// Role interface
export interface Role extends BaseEntity {
  name: string;
  description?: string;
}

// Rate Card interface
export interface RateCard extends BaseEntity {
  vendorId: string;
  roleId: string;
  rate: number;
  currency: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  notes?: string;
}

// Team Member interface
export interface TeamMember extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  vendorId: string;
  roleId: string;
  dailyRate: number;
  currency: string;
  startDate: Date;
  endDate?: Date;
  status: TeamMemberStatus;
  plannedUtilization?: number;
  tags: Tag[];
}

// Timesheet Entry interface
export interface TimesheetEntry extends BaseEntity {
  teamMemberId: string;
  date: Date;
  hours?: number;
  timeOffCode?: TimeOffCode;
}

// Invoice interface
export interface Invoice extends BaseEntity {
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  expectedAmount?: number;
  discrepancy?: number;
  toleranceThreshold?: number;
  tags: Tag[];
}

// Contract interface
export interface Contract extends BaseEntity {
  vendorId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  value: number;
  currency: string;
  status: ContractStatus;
  documentUrl?: string;
  // Document storage fields
  documentKey?: string;       // S3 object key
  documentName?: string;      // Original file name
  documentSize?: number;      // File size in bytes
  documentType?: string;      // MIME type
  documentUploadedAt?: Date;  // Upload timestamp
  aiAnalysis?: ContractAnalysis;
  tags: Tag[];
}

// Document upload response
export interface DocumentUploadResponse {
  documentKey: string;
  documentName: string;
  documentSize: number;
  documentType: string;
  documentUploadedAt: Date;
  downloadUrl: string;
}

// Vendor Document interface
export interface VendorDocument extends BaseEntity {
  vendorId: string;
  documentType: DocumentType;
  title?: string;
  description?: string;
  documentKey: string;
  documentName: string;
  documentSize: number;
  documentMimeType: string;
  enableAiExtraction: boolean;
  extractionStatus?: string;
  extractionError?: string;
  documentDate?: Date;
  expiryDate?: Date;
  uploadedAt: Date;
  aiAnalysis?: VendorDocumentAnalysis;
}

// Vendor Document Analysis interface
export interface VendorDocumentAnalysis {
  id: string;
  documentId: string;
  contractCreationDate?: string;
  expiryRenewalDate?: string;
  involvedEntities?: string;
  slaDetails?: string;
  uptimeGuarantee?: string;
  responseTime?: string;
  scopeOfWork?: string;
  termsAndConditions?: string;
  terminationClauses?: string;
  commercialTerms?: string;
  paymentSchedule?: string;
  totalValue?: string;
  currency?: string;
  noticePeriod?: string;
  renewalTerms?: string;
  keyContacts?: string;
  summary?: string;
  confidenceScores: Record<string, number>;
  aiProvider?: string;
  aiModel?: string;
  processingTimeMs?: number;
  analyzedAt: Date;
}

// AI API Configuration
export interface AIApiConfig {
  id: string;
  provider: AIProvider;
  isEnabled: boolean;
  defaultModel?: string;
  usageCount: number;
  lastUsedAt?: Date;
  hasApiKey: boolean; // Don't expose the actual key
  maskedApiKey?: string; // Masked version for display (e.g., "••••••••abcd")
  lastTestedAt?: Date; // When connection was last tested
  lastTestStatus?: 'success' | 'error' | 'timeout'; // Last test result
  lastTestMessage?: string; // Last test result message
  createdAt: Date;
  updatedAt: Date;
}

// AI Usage Log
export interface AIUsageLog {
  id: string;
  provider: string;
  model: string;
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  processingTime?: number;
  status: string;
  errorMessage?: string;
  documentId?: string;
  contractId?: string;
  createdAt: Date;
}

// AI Settings for the application
export interface AISettings {
  anthropic: AIApiConfig | null;
  openai: AIApiConfig | null;
  defaultProvider: AIProvider | null;
}

// Email Configuration
export interface EmailConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  hasCredentials: boolean; // Don't expose actual credentials
  maskedUsername: string; // Masked version for display
  maskedPassword: string; // Masked version for display
  fromAddress: string;
  fromName?: string;
  replyTo?: string;
  isEnabled: boolean;
  lastTestedAt?: Date;
  lastTestStatus?: 'success' | 'error' | 'timeout';
  lastTestMessage?: string;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Email Log for audit trail
export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  errorMessage?: string;
  messageId?: string;
  userId?: string;
  module?: string;
  emailType?: string;
  metadata?: Record<string, unknown>;
  sentAt: Date;
  createdAt: Date;
}

// Email Settings (for form data)
export interface EmailSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName?: string;
  replyTo?: string;
  isEnabled: boolean;
}

// Contract AI Analysis interface
export interface ContractAnalysis {
  expirationDate?: string;
  renewalTerms?: string;
  sla?: string;
  paymentTerms?: string;
  noticePeriod?: string;
  keyContacts?: string;
  scopeSummary?: string;
  terminationClauses?: string;
  confidenceScores: Record<string, number>;
  analyzedAt: Date;
}

// Tag interface
export interface Tag extends BaseEntity {
  name: string;
  color?: string;
}

// Currency interface
export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

// Exchange Rate interface
export interface ExchangeRate extends BaseEntity {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Settings types
export type SettingsCategory =
  | 'currency'
  | 'formats'
  | 'dashboard'
  | 'integrations';

export type DateFormat =
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD';

export type NumberFormat =
  | 'en-US'    // 1,234.56
  | 'en-GB'    // 1,234.56
  | 'de-DE'    // 1.234,56
  | 'fr-FR';   // 1 234,56

export type RoundingMode =
  | 'HALF_UP'      // Standard rounding (0.5 rounds up)
  | 'HALF_DOWN'    // 0.5 rounds down
  | 'UP'           // Always round up
  | 'DOWN'         // Always round down
  | 'HALF_EVEN';   // Banker's rounding

// Currency Settings
export interface CurrencySettings {
  defaultCurrency: string;
  displayDecimals: number;
  roundingMode: RoundingMode;
  showCurrencySymbol: boolean;
  symbolPosition: 'before' | 'after';
}

// Format Settings
export interface FormatSettings {
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  timezone: string;
  weekStartsOn: 0 | 1 | 6; // 0=Sunday, 1=Monday, 6=Saturday
}

// Dashboard Settings
export interface DashboardSettings {
  defaultView: 'overview' | 'detailed' | 'compact';
  showRecentActivity: boolean;
  activityItemsCount: number;
  refreshInterval: number; // in seconds, 0 = no auto-refresh
  showExpiringContracts: boolean;
  expiringContractsDays: number; // days before expiration to show
}

// Integration Settings
export interface IntegrationSettings {
  exchangeRateApi: {
    enabled: boolean;
    provider: 'manual' | 'openexchangerates' | 'exchangerateapi';
    apiKey?: string;
    autoUpdate: boolean;
    updateInterval: number; // in hours
  };
  notifications: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    slackWebhookUrl?: string;
  };
}

// Combined Settings Interface
export interface SystemSettings {
  currency: CurrencySettings;
  formats: FormatSettings;
  dashboard: DashboardSettings;
  integrations: IntegrationSettings;
}

// System Settings Entity (as stored in DB)
export interface SystemSettingsEntity extends BaseEntity {
  category: SettingsCategory;
  key: string;
  value: string;
  description?: string;
  updatedBy?: string;
}

// Default Settings Values
export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  defaultCurrency: 'GBP',
  displayDecimals: 2,
  roundingMode: 'HALF_UP',
  showCurrencySymbol: true,
  symbolPosition: 'before',
};

export const DEFAULT_FORMAT_SETTINGS: FormatSettings = {
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'en-GB',
  timezone: 'Europe/London',
  weekStartsOn: 1,
};

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  defaultView: 'overview',
  showRecentActivity: true,
  activityItemsCount: 10,
  refreshInterval: 0,
  showExpiringContracts: true,
  expiringContractsDays: 30,
};

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  exchangeRateApi: {
    enabled: false,
    provider: 'manual',
    autoUpdate: false,
    updateInterval: 24,
  },
  notifications: {
    emailEnabled: false,
    slackEnabled: false,
  },
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  currency: DEFAULT_CURRENCY_SETTINGS,
  formats: DEFAULT_FORMAT_SETTINGS,
  dashboard: DEFAULT_DASHBOARD_SETTINGS,
  integrations: DEFAULT_INTEGRATION_SETTINGS,
};
