'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Server,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Send,
  AlertTriangle,
  RefreshCw,
  Clock,
  Lock,
  Unlock,
  Shield,
} from 'lucide-react';
import type { EmailConfig } from '@/types';

interface EmailSettingsFormProps {
  onSave?: () => void;
  isLoading?: boolean;
}

// Connection test status types
type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error' | 'timeout';

interface ConnectionTestState {
  status: ConnectionStatus;
  message: string | null;
  testedAt: Date | null;
  responseTime?: number;
}

// Common SMTP ports
const SMTP_PORTS = [
  { value: 587, label: '587 (TLS/STARTTLS)', secure: false },
  { value: 465, label: '465 (SSL)', secure: true },
  { value: 2465, label: '2465 (SSL Alt)', secure: true },
  { value: 25, label: '25 (Unencrypted)', secure: false },
];

// Default connection test state
const DEFAULT_CONNECTION_TEST: ConnectionTestState = {
  status: 'idle',
  message: null,
  testedAt: null,
};

/**
 * Email Settings form for configuring SMTP and sending test emails
 */
export function EmailSettingsForm({ onSave }: EmailSettingsFormProps) {
  // Form state
  const [host, setHost] = React.useState('');
  const [port, setPort] = React.useState(587);
  const [secure, setSecure] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [fromAddress, setFromAddress] = React.useState('');
  const [fromName, setFromName] = React.useState('');
  const [replyTo, setReplyTo] = React.useState('');
  const [isEnabled, setIsEnabled] = React.useState(true);

  // Test email state
  const [testRecipient, setTestRecipient] = React.useState('');

  // UI state
  const [config, setConfig] = React.useState<EmailConfig | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isSendingTest, setIsSendingTest] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [connectionTest, setConnectionTest] = React.useState<ConnectionTestState>(DEFAULT_CONNECTION_TEST);

  // Validation state
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  // Fetch email settings on mount
  React.useEffect(() => {
    fetchSettings();
  }, []);

  // Auto-adjust port when TLS is toggled
  React.useEffect(() => {
    // Only auto-adjust if user hasn't manually set a non-standard port
    const isStandardPort = SMTP_PORTS.some(p => p.value === port);
    if (isStandardPort) {
      const newPort = secure ? 465 : 587;
      setPort(newPort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secure]);

  const fetchSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const response = await fetch('/api/settings/email');
      const data = await response.json();

      if (data.success && data.data) {
        const emailConfig: EmailConfig = data.data;
        setConfig(emailConfig);
        setHost(emailConfig.host);
        setPort(emailConfig.port);
        setSecure(emailConfig.secure);
        setFromAddress(emailConfig.fromAddress);
        setFromName(emailConfig.fromName || '');
        setReplyTo(emailConfig.replyTo || '');
        setIsEnabled(emailConfig.isEnabled);

        // Restore connection test status
        if (emailConfig.lastTestStatus) {
          setConnectionTest({
            status: emailConfig.lastTestStatus,
            message: emailConfig.lastTestMessage || null,
            testedAt: emailConfig.lastTestedAt ? new Date(emailConfig.lastTestedAt) : null,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
      setError('Failed to load email settings');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Validation functions
  const validateHost = (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return 'SMTP server is required';
    }
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!hostnameRegex.test(value) && !ipv4Regex.test(value)) {
      return 'Invalid hostname or IP address';
    }
    return null;
  };

  const validateEmail = (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return 'Email address is required';
    }
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(value)) {
      return 'Invalid email format';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const hostError = validateHost(host);
    if (hostError) errors.host = hostError;

    if (!username || username.trim().length === 0) {
      errors.username = 'Username is required';
    }

    // Only require password for new configuration
    if (!config && (!password || password.trim().length === 0)) {
      errors.password = 'Password is required';
    }

    const fromError = validateEmail(fromAddress);
    if (fromError) errors.fromAddress = fromError;

    if (replyTo && replyTo.trim().length > 0) {
      const replyToError = validateEmail(replyTo);
      if (replyToError) errors.replyTo = 'Invalid reply-to email format';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setError('Please fix the validation errors');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port,
          secure,
          username: username.trim(),
          password: password || undefined,
          fromAddress: fromAddress.trim(),
          fromName: fromName.trim() || undefined,
          replyTo: replyTo.trim() || undefined,
          isEnabled,
          testConnection: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        setPassword(''); // Clear password after successful save
        setSuccess('Email configuration saved successfully!');
        setConnectionTest({
          status: 'success',
          message: 'Connection verified',
          testedAt: new Date(),
        });
        onSave?.();
      } else {
        setError(data.error || 'Failed to save email configuration');
        if (data.error?.toLowerCase().includes('connection') || data.error?.toLowerCase().includes('smtp')) {
          setConnectionTest({
            status: 'error',
            message: data.error,
            testedAt: new Date(),
          });
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save email configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete the email configuration? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings/email', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setConfig(null);
        setHost('');
        setPort(587);
        setSecure(false);
        setUsername('');
        setPassword('');
        setFromAddress('');
        setFromName('');
        setReplyTo('');
        setIsEnabled(true);
        setConnectionTest(DEFAULT_CONNECTION_TEST);
        setSuccess('Email configuration deleted');
        onSave?.();
      } else {
        setError(data.error || 'Failed to delete email configuration');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete email configuration');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      setError('Please fix the validation errors before testing');
      return;
    }

    setIsTesting(true);
    setError(null);
    setSuccess(null);
    setConnectionTest({
      status: 'testing',
      message: 'Testing connection...',
      testedAt: null,
    });

    try {
      const response = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port,
          secure,
          username: username.trim(),
          password: password || undefined,
          fromAddress: fromAddress.trim(),
          fromName: fromName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionTest({
          status: 'success',
          message: `Connection successful (${data.data.responseTime}ms)`,
          testedAt: new Date(),
          responseTime: data.data.responseTime,
        });
        setSuccess('SMTP connection test successful!');
      } else {
        setConnectionTest({
          status: 'error',
          message: data.error || 'Connection failed',
          testedAt: new Date(),
        });
        setError(data.error || 'Connection test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setConnectionTest({
        status: 'error',
        message: errorMessage,
        testedAt: new Date(),
      });
      setError(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    const recipientError = validateEmail(testRecipient);
    if (recipientError) {
      setValidationErrors((prev) => ({ ...prev, testRecipient: recipientError }));
      return;
    }

    setIsSendingTest(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port,
          secure,
          username: username.trim(),
          password: password || undefined,
          fromAddress: fromAddress.trim(),
          fromName: fromName.trim() || undefined,
          testRecipient: testRecipient.trim(),
          sendTestEmail: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Test email sent successfully to ${testRecipient}!`);
        setTestRecipient('');
      } else {
        setError(data.error || 'Failed to send test email');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const getConnectionStatusBadge = () => {
    switch (connectionTest.status) {
      case 'testing':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Testing...
          </Badge>
        );
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'timeout':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Timeout
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            Not tested
          </Badge>
        );
    }
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Email Service Configuration</CardTitle>
                <CardDescription>
                  Configure SMTP settings for sending emails from the application
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getConnectionStatusBadge()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 text-green-700 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              {isEnabled ? (
                <Unlock className="h-5 w-5 text-green-600" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Email Service</p>
                <p className="text-sm text-muted-foreground">
                  {isEnabled ? 'Emails can be sent from the application' : 'Email sending is disabled'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* SMTP Server Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              SMTP Server
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">
                  SMTP Server <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smtp-host"
                  type="text"
                  placeholder="smtp.example.com"
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, host: '' }));
                  }}
                  className={validationErrors.host ? 'border-red-500' : ''}
                />
                {validationErrors.host && (
                  <p className="text-xs text-red-500">{validationErrors.host}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-port">
                  Port <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={String(port)}
                  onValueChange={(value) => {
                    const newPort = parseInt(value, 10);
                    setPort(newPort);
                    // Update secure based on selected port
                    const portConfig = SMTP_PORTS.find(p => p.value === newPort);
                    if (portConfig) {
                      setSecure(portConfig.secure);
                    }
                  }}
                >
                  <SelectTrigger id="smtp-port">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMTP_PORTS.map((p) => (
                      <SelectItem key={p.value} value={String(p.value)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">TLS/SSL Encryption</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
              <span className="text-xs text-muted-foreground">
                {secure ? 'Using SSL/TLS (recommended)' : 'Using STARTTLS or unencrypted'}
              </span>
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              Authentication
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-username">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smtp-username"
                  type="text"
                  placeholder="your-username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, username: '' }));
                  }}
                  className={validationErrors.username ? 'border-red-500' : ''}
                />
                {validationErrors.username && (
                  <p className="text-xs text-red-500">{validationErrors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-password">
                  Password {!config && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="smtp-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={config ? '••••••••' : 'Enter password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    className={validationErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-xs text-red-500">{validationErrors.password}</p>
                )}
                {config && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing password
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sender Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Sender Information
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from-address">
                  From Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="from-address"
                  type="email"
                  placeholder="noreply@example.com"
                  value={fromAddress}
                  onChange={(e) => {
                    setFromAddress(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, fromAddress: '' }));
                  }}
                  className={validationErrors.fromAddress ? 'border-red-500' : ''}
                />
                {validationErrors.fromAddress && (
                  <p className="text-xs text-red-500">{validationErrors.fromAddress}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="from-name">From Name</Label>
                <Input
                  id="from-name"
                  type="text"
                  placeholder="Vendor Management System"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply-to">Reply-To Address (optional)</Label>
              <Input
                id="reply-to"
                type="email"
                placeholder="support@example.com"
                value={replyTo}
                onChange={(e) => {
                  setReplyTo(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, replyTo: '' }));
                }}
                className={validationErrors.replyTo ? 'border-red-500' : ''}
              />
              {validationErrors.replyTo && (
                <p className="text-xs text-red-500">{validationErrors.replyTo}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving || isTesting || isDeleting}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isSaving || isTesting || isDeleting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            {config && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSaving || isTesting || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Email Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Send Test Email</CardTitle>
              <CardDescription>
                Send a test email to verify your configuration is working
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="test-recipient">Recipient Email</Label>
              <Input
                id="test-recipient"
                type="email"
                placeholder="test@example.com"
                value={testRecipient}
                onChange={(e) => {
                  setTestRecipient(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, testRecipient: '' }));
                }}
                className={validationErrors.testRecipient ? 'border-red-500' : ''}
              />
              {validationErrors.testRecipient && (
                <p className="text-xs text-red-500">{validationErrors.testRecipient}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This email will not be saved. It&apos;s only used for testing.
              </p>
            </div>
            <div className="pt-8">
              <Button
                onClick={handleSendTestEmail}
                disabled={!testRecipient || isSendingTest || isSaving || isTesting}
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="rounded-md bg-amber-50 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Security Notice</p>
          <p>
            SMTP credentials are encrypted before storage. Ensure only trusted administrators have access to these settings.
            Never share your SMTP password or configuration details.
          </p>
        </div>
      </div>

      {/* Usage Statistics */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Statistics</CardTitle>
            <CardDescription>Email sending statistics and connection history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground">Total Emails Sent</p>
                <p className="text-2xl font-bold">{config.usageCount.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground">Last Used</p>
                <p className="text-lg font-medium">
                  {config.lastUsedAt
                    ? new Date(config.lastUsedAt).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground">Last Test</p>
                <p className="text-lg font-medium">
                  {connectionTest.testedAt
                    ? connectionTest.testedAt.toLocaleString()
                    : 'Never tested'}
                </p>
                {connectionTest.message && (
                  <p className="text-xs text-muted-foreground mt-1">{connectionTest.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
