/**
 * @samas/smart-search - Enterprise Data Governance
 * Field-level security, audit logging, and row-level access control
 */

import { SearchResult, SearchOptions } from '../types';

export interface SecurityContext {
  userId: string;
  userRole: string;
  institutionId?: string;
  clearanceLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface DataGovernanceConfig {
  fieldMasking: {
    [fieldPath: string]: (value: any, userRole: string, context: SecurityContext) => any;
  };
  rowLevelSecurity: {
    [tableName: string]: (userId: string, userRole: string, context: SecurityContext) => string;
  };
  auditLogging: {
    enabled: boolean;
    logLevel: 'basic' | 'detailed' | 'comprehensive';
    fields: string[];
    retention?: number; // days
    destination: 'console' | 'database' | 'file' | 'external';
    sensitiveDataRedaction: boolean;
  };
  dataClassification: {
    [fieldPath: string]: 'public' | 'internal' | 'confidential' | 'restricted' | 'pii' | 'phi';
  };
  encryptionAtRest: {
    enabled: boolean;
    algorithm: 'AES256' | 'RSA';
    keyManagement: 'internal' | 'aws-kms' | 'azure-kv' | 'gcp-kms';
  };
  accessControl: {
    roleBasedAccess: boolean;
    attributeBasedAccess: boolean;
    timeBasedAccess: boolean;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  action: 'search' | 'access' | 'export' | 'modify';
  resource: string;
  query?: string;
  resultCount?: number;
  searchTime?: number;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  institutionId?: string;
  sensitiveDataAccessed: boolean;
  complianceFlags: string[];
}

export class DataGovernanceService {
  private config: DataGovernanceConfig;
  private auditLogs: AuditLogEntry[] = [];

  constructor(config: DataGovernanceConfig) {
    this.config = config;
  }

  /**
   * Apply field-level masking to search results based on user role and context
   */
  async maskSensitiveFields(
    results: SearchResult[], 
    userRole: string, 
    context: SecurityContext
  ): Promise<SearchResult[]> {
    return results.map(result => {
      const maskedResult = { ...result };
      
      for (const [fieldPath, maskingFunction] of Object.entries(this.config.fieldMasking)) {
        const fieldValue = this.getNestedValue(maskedResult, fieldPath);
        if (fieldValue !== undefined) {
          const maskedValue = maskingFunction(fieldValue, userRole, context);
          this.setNestedValue(maskedResult, fieldPath, maskedValue);
        }
      }

      return maskedResult;
    });
  }

  /**
   * Apply row-level security filters to search options
   */
  async applyRowLevelSecurity(
    options: SearchOptions,
    tableName: string,
    context: SecurityContext
  ): Promise<SearchOptions> {
    const rlsFunction = this.config.rowLevelSecurity[tableName];
    
    if (rlsFunction) {
      const securityFilter = rlsFunction(context.userId, context.userRole, context);
      
      return {
        ...options,
        filters: {
          ...options.filters,
          custom: {
            ...options.filters?.custom,
            rowLevelSecurity: securityFilter
          }
        }
      };
    }

    return options;
  }

  /**
   * Audit search access with comprehensive logging
   */
  async auditSearchAccess(
    query: string,
    user: SecurityContext,
    results: SearchResult[],
    searchTime: number,
    success: boolean = true,
    errorMessage?: string
  ): Promise<string> {
    if (!this.config.auditLogging.enabled) {
      return '';
    }

    const auditId = this.generateAuditId();
    const sensitiveDataAccessed = this.detectSensitiveDataAccess(results);
    const complianceFlags = this.generateComplianceFlags(results, user);

    const auditEntry: AuditLogEntry = {
      id: auditId,
      timestamp: new Date(),
      userId: user.userId,
      userRole: user.userRole,
      action: 'search',
      resource: 'search_results',
      query: this.config.auditLogging.sensitiveDataRedaction ? this.redactSensitiveQuery(query) : query,
      resultCount: results.length,
      searchTime,
      success,
      ...(errorMessage && { errorMessage }),
      ...(user.ipAddress && { ipAddress: user.ipAddress }),
      ...(user.userAgent && { userAgent: user.userAgent }),
      ...(user.sessionId && { sessionId: user.sessionId }),
      ...(user.institutionId && { institutionId: user.institutionId }),
      sensitiveDataAccessed,
      complianceFlags
    };

    await this.writeAuditLog(auditEntry);
    return auditId;
  }

  /**
   * Validate user access to specific data fields
   */
  async validateDataAccess(
    user: SecurityContext,
    requestedFields: string[]
  ): Promise<{ allowed: string[]; denied: string[]; reasons: Record<string, string> }> {
    const allowed: string[] = [];
    const denied: string[] = [];
    const reasons: Record<string, string> = {};

    for (const field of requestedFields) {
      const classification = this.config.dataClassification[field];
      const hasAccess = this.checkFieldAccess(user, field, classification);

      if (hasAccess) {
        allowed.push(field);
      } else {
        denied.push(field);
        reasons[field] = `Insufficient clearance for ${classification} data`;
      }
    }

    return { allowed, denied, reasons };
  }

  /**
   * Generate compliance report for audit purposes
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSearches: number;
    sensitiveDataAccesses: number;
    complianceViolations: number;
    userActivity: Record<string, number>;
    riskScore: number;
  }> {
    const relevantLogs = this.auditLogs.filter(
      log => log.timestamp >= startDate && log.timestamp <= endDate
    );

    const totalSearches = relevantLogs.length;
    const sensitiveDataAccesses = relevantLogs.filter(log => log.sensitiveDataAccessed).length;
    const complianceViolations = relevantLogs.filter(log => log.complianceFlags.length > 0).length;
    
    const userActivity: Record<string, number> = {};
    relevantLogs.forEach(log => {
      userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;
    });

    const riskScore = this.calculateRiskScore(relevantLogs);

    return {
      totalSearches,
      sensitiveDataAccesses,
      complianceViolations,
      userActivity,
      riskScore
    };
  }

  /**
   * Built-in field masking functions for common use cases
   */
  static readonly MaskingFunctions = {
    // Social Security Number masking
    ssn: (value: string, userRole: string) => {
      if (userRole === 'admin' || userRole === 'doctor') {return value;}
      return value ? `***-**-${value.slice(-4)}` : '';
    },

    // Email masking
    email: (value: string, userRole: string) => {
      if (userRole === 'admin') {return value;}
      if (!value) {return '';}
      const [localPart, domain] = value.split('@');
      return `${localPart.slice(0, 2)}***@${domain}`;
    },

    // Phone number masking
    phone: (value: string, userRole: string) => {
      if (userRole === 'admin' || userRole === 'doctor') {return value;}
      return value ? `***-***-${value.slice(-4)}` : '';
    },

    // Medical Record Number masking
    medicalRecordNumber: (value: string, userRole: string) => {
      if (userRole === 'doctor' || userRole === 'nurse') {return value;}
      return value ? `***${value.slice(-3)}` : '';
    },

    // Full redaction for highly sensitive data
    redact: (value: any, userRole: string) => {
      return userRole === 'admin' ? value : '[REDACTED]';
    },

    // Hash-based masking for consistent pseudonymization
    hash: (value: string) => {
      return value ? `#${this.simpleHash(value)}` : '';
    }
  };

  /**
   * Built-in row-level security functions
   */
  static readonly RLSFunctions = {
    // Patient data access by assigned doctor
    patientsByDoctor: (userId: string, userRole: string) => {
      if (userRole === 'admin') {return 'true';}
      if (userRole === 'doctor') {return `assigned_doctor_id = '${userId}'`;}
      return 'false';
    },

    // Institutional data access
    byInstitution: (userId: string, userRole: string, context: SecurityContext) => {
      if (userRole === 'admin') {return 'true';}
      if (context.institutionId) {return `institution_id = '${context.institutionId}'`;}
      return 'false';
    },

    // Time-based access (office hours only)
    officeHours: (userId: string, userRole: string, context: SecurityContext) => {
      const hour = context.timestamp.getHours();
      if (userRole === 'admin') {return 'true';}
      if (hour >= 8 && hour <= 18) {return 'true';} // 8 AM to 6 PM
      return 'access_after_hours = true';
    }
  };

  // Private helper methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {current[key] = {};}
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectSensitiveDataAccess(results: SearchResult[]): boolean {
    return results.some(result => {
      return Object.keys(this.config.dataClassification).some(fieldPath => {
        const classification = this.config.dataClassification[fieldPath];
        const hasValue = this.getNestedValue(result, fieldPath) !== undefined;
        return hasValue && ['confidential', 'restricted', 'pii', 'phi'].includes(classification);
      });
    });
  }

  private generateComplianceFlags(results: SearchResult[], user: SecurityContext): string[] {
    const flags: string[] = [];
    
    // Check for after-hours access to sensitive data
    const hour = user.timestamp.getHours();
    if ((hour < 8 || hour > 18) && this.detectSensitiveDataAccess(results)) {
      flags.push('AFTER_HOURS_SENSITIVE_ACCESS');
    }

    // Check for excessive result counts
    if (results.length > 1000) {
      flags.push('BULK_DATA_ACCESS');
    }

    // Check for cross-institutional access
    const institutionIds = new Set(results.map(r => r.metadata?.institutionId).filter(Boolean));
    if (institutionIds.size > 1) {
      flags.push('CROSS_INSTITUTIONAL_ACCESS');
    }

    return flags;
  }

  private redactSensitiveQuery(query: string): string {
    // Remove potential PII/PHI patterns from logged queries
    return query
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]');
  }

  private checkFieldAccess(user: SecurityContext, field: string, classification?: string): boolean {
    if (!classification) {return true;}
    
    const rolePermissions: Record<string, string[]> = {
      'admin': ['public', 'internal', 'confidential', 'restricted', 'pii', 'phi'],
      'doctor': ['public', 'internal', 'confidential', 'pii', 'phi'],
      'nurse': ['public', 'internal', 'pii'],
      'researcher': ['public', 'internal'],
      'patient': ['public']
    };

    const allowedClassifications = rolePermissions[user.userRole] || ['public'];
    return allowedClassifications.includes(classification);
  }

  private calculateRiskScore(logs: AuditLogEntry[]): number {
    if (logs.length === 0) {return 0;}
    
    let riskScore = 0;
    
    logs.forEach(log => {
      if (log.sensitiveDataAccessed) {riskScore += 2;}
      if (log.complianceFlags.length > 0) {riskScore += log.complianceFlags.length * 3;}
      if (!log.success) {riskScore += 1;}
    });

    return Math.min(100, (riskScore / logs.length) * 10);
  }

  private static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async writeAuditLog(entry: AuditLogEntry): Promise<void> {
    // Store in memory for this implementation
    this.auditLogs.push(entry);
    
    // Keep only recent logs to prevent memory issues
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }

    // Write to configured destination
    switch (this.config.auditLogging.destination) {
      case 'console':
        console.log(`[AUDIT] ${JSON.stringify(entry)}`);
        break;
      case 'file':
        // In production, write to rotating log files
        console.log(`[AUDIT FILE] Would write to audit.log:`, entry);
        break;
      case 'database':
        // In production, write to audit database table
        console.log(`[AUDIT DB] Would write to audit table:`, entry);
        break;
      case 'external':
        // In production, send to external logging service (e.g., Splunk, ELK)
        console.log(`[AUDIT EXTERNAL] Would send to external service:`, entry);
        break;
    }
  }
}

// Export default configurations for common compliance requirements
export const ComplianceConfigs = {
  HIPAA: {
    fieldMasking: {
      'ssn': DataGovernanceService.MaskingFunctions.ssn,
      'medical_record_number': DataGovernanceService.MaskingFunctions.medicalRecordNumber,
      'phone': DataGovernanceService.MaskingFunctions.phone,
      'email': DataGovernanceService.MaskingFunctions.email,
    },
    rowLevelSecurity: {
      'patients': DataGovernanceService.RLSFunctions.patientsByDoctor,
      'medical_records': DataGovernanceService.RLSFunctions.patientsByDoctor,
    },
    auditLogging: {
      enabled: true,
      logLevel: 'comprehensive' as const,
      fields: ['userId', 'query', 'resultCount', 'timestamp', 'ipAddress'],
      retention: 2555, // 7 years as required by HIPAA
      destination: 'database' as const,
      sensitiveDataRedaction: true
    },
    dataClassification: {
      'ssn': 'phi' as const,
      'medical_record_number': 'phi' as const,
      'diagnosis': 'phi' as const,
      'prescription': 'phi' as const,
      'phone': 'pii' as const,
      'email': 'pii' as const,
    }
  } as Partial<DataGovernanceConfig>
};