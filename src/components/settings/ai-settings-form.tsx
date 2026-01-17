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
  Bot,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  BarChart3,
  Zap,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { AnthropicIcon, OpenAIIcon } from '@/components/ui/ai-provider-icons';
import type { AIApiConfig, AIProvider } from '@/types';

interface AISettingsFormProps {
  onSave?: () => void;
  isLoading?: boolean;
}

// Connection test status types
type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error' | 'timeout' | 'invalid_format';

interface ConnectionTestState {
  status: ConnectionStatus;
  message: string | null;
  testedAt: Date | null;
  responseTime?: number;
}

interface ProviderConfig {
  config: AIApiConfig | null;
  apiKey: string;
  showKey: boolean;
  defaultModel: string;
  isEnabled: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isTesting: boolean;
  error: string | null;
  success: string | null;
  connectionTest: ConnectionTestState;
}

interface AIUsageStats {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { calls: number; tokens: number; cost: number }>;
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format cost as currency
 */
function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(cost);
}

/**
 * Provider metadata for display
 */
const PROVIDER_INFO: Record<AIProvider, {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  anthropic: {
    name: 'Anthropic',
    description: 'Claude models for powerful document analysis and extraction',
    icon: AnthropicIcon,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT models for versatile AI-powered document processing',
    icon: OpenAIIcon,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
};

// Default connection test state
const DEFAULT_CONNECTION_TEST: ConnectionTestState = {
  status: 'idle',
  message: null,
  testedAt: null,
};

/**
 * AI Settings form for configuring API keys and selecting providers
 */
export function AISettingsForm({ onSave }: AISettingsFormProps) {
  const [anthropic, setAnthropic] = React.useState<ProviderConfig>({
    config: null,
    apiKey: '',
    showKey: false,
    defaultModel: 'claude-sonnet-4-20250514',
    isEnabled: true,
    isSaving: false,
    isDeleting: false,
    isTesting: false,
    error: null,
    success: null,
    connectionTest: DEFAULT_CONNECTION_TEST,
  });

  const [openai, setOpenai] = React.useState<ProviderConfig>({
    config: null,
    apiKey: '',
    showKey: false,
    defaultModel: 'gpt-4o',
    isEnabled: true,
    isSaving: false,
    isDeleting: false,
    isTesting: false,
    error: null,
    success: null,
    connectionTest: DEFAULT_CONNECTION_TEST,
  });

  // Track if any test is in progress to prevent concurrent tests
  const isAnyTestInProgress = anthropic.isTesting || openai.isTesting;

  // Only models that support structured outputs (json_schema) for reliable AI analysis
  const [availableModels, setAvailableModels] = React.useState<{
    anthropic: string[];
    openai: string[];
  }>({
    anthropic: ['claude-sonnet-4-20250514'],
    openai: ['gpt-4o', 'gpt-4o-mini'],
  });

  const [defaultProvider, setDefaultProvider] = React.useState<AIProvider | null>(null);
  const [isSettingDefault, setIsSettingDefault] = React.useState(false);
  const [defaultProviderError, setDefaultProviderError] = React.useState<string | null>(null);
  const [usageStats, setUsageStats] = React.useState<AIUsageStats | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [isLoadingUsage, setIsLoadingUsage] = React.useState(true);

  // Fetch AI settings on mount
  React.useEffect(() => {
    fetchSettings();
    fetchUsageStats();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const response = await fetch('/api/settings/ai');
      const data = await response.json();

      if (data.success) {
        if (data.data.anthropic) {
          const anthropicConfig = data.data.anthropic;
          setAnthropic((prev) => ({
            ...prev,
            config: anthropicConfig,
            defaultModel: anthropicConfig.defaultModel || 'claude-sonnet-4-20250514',
            isEnabled: anthropicConfig.isEnabled,
            // Restore persisted connection test status
            connectionTest: anthropicConfig.lastTestStatus ? {
              status: anthropicConfig.lastTestStatus as ConnectionStatus,
              message: anthropicConfig.lastTestMessage || null,
              testedAt: anthropicConfig.lastTestedAt ? new Date(anthropicConfig.lastTestedAt) : null,
            } : DEFAULT_CONNECTION_TEST,
          }));
        }

        if (data.data.openai) {
          const openaiConfig = data.data.openai;
          setOpenai((prev) => ({
            ...prev,
            config: openaiConfig,
            defaultModel: openaiConfig.defaultModel || 'gpt-4o',
            isEnabled: openaiConfig.isEnabled,
            // Restore persisted connection test status
            connectionTest: openaiConfig.lastTestStatus ? {
              status: openaiConfig.lastTestStatus as ConnectionStatus,
              message: openaiConfig.lastTestMessage || null,
              testedAt: openaiConfig.lastTestedAt ? new Date(openaiConfig.lastTestedAt) : null,
            } : DEFAULT_CONNECTION_TEST,
          }));
        }

        if (data.data.availableModels) {
          setAvailableModels(data.data.availableModels);
        }

        if (data.data.defaultProvider) {
          setDefaultProvider(data.data.defaultProvider);
        }
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      setIsLoadingUsage(true);
      const response = await fetch('/api/settings/ai/usage?limit=1000');
      const data = await response.json();

      if (data.success) {
        setUsageStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching AI usage stats:', error);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  /**
   * Test connection for a provider with the current or stored API key
   */
  const handleTestConnection = async (provider: AIProvider, apiKeyToTest?: string) => {
    const state = provider === 'anthropic' ? anthropic : openai;
    const setState = provider === 'anthropic' ? setAnthropic : setOpenai;

    // Prevent concurrent tests
    if (isAnyTestInProgress) {
      return;
    }

    // Get the API key to test - either the one being entered or test existing config
    const keyToTest = apiKeyToTest || state.apiKey;

    // If no key provided and no existing config, show error
    if (!keyToTest && !state.config?.hasApiKey) {
      setState((prev) => ({
        ...prev,
        connectionTest: {
          status: 'error',
          message: 'Please enter an API key to test',
          testedAt: new Date(),
        },
      }));
      return;
    }

    // Clear previous messages and set testing state
    setState((prev) => ({
      ...prev,
      isTesting: true,
      error: null,
      success: null,
      connectionTest: {
        status: 'testing',
        message: 'Testing connection...',
        testedAt: null,
      },
    }));

    try {
      // Test connection - use stored key if no new key entered
      const useStoredKey = !keyToTest && state.config?.hasApiKey;

      const response = await fetch('/api/settings/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: keyToTest || undefined,
          useStored: useStoredKey,
          timeout: 30000, // 30 second timeout
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setState((prev) => ({
          ...prev,
          isTesting: false,
          connectionTest: {
            status: data.data.status as ConnectionStatus,
            message: data.data.message,
            testedAt: new Date(data.data.testedAt),
            responseTime: data.data.responseTime,
          },
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isTesting: false,
          connectionTest: {
            status: data.data?.status || 'error',
            message: data.data?.message || data.error || 'Connection test failed',
            testedAt: new Date(),
            responseTime: data.data?.responseTime,
          },
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isTesting: false,
        connectionTest: {
          status: 'error',
          message: 'Network error. Please check your connection and try again.',
          testedAt: new Date(),
        },
      }));
    }
  };

  /**
   * Auto-test connection when API key is entered (debounced)
   */
  const apiKeyDebounceRef = React.useRef<{ anthropic?: NodeJS.Timeout; openai?: NodeJS.Timeout }>({});

  const handleApiKeyChange = (provider: AIProvider, value: string) => {
    const setState = provider === 'anthropic' ? setAnthropic : setOpenai;

    // Update the API key value
    setState((prev) => ({ ...prev, apiKey: value }));

    // Clear any existing debounce timer
    if (apiKeyDebounceRef.current[provider]) {
      clearTimeout(apiKeyDebounceRef.current[provider]);
    }

    // Reset connection test state when key changes
    setState((prev) => ({
      ...prev,
      connectionTest: DEFAULT_CONNECTION_TEST,
    }));

    // Auto-test after user stops typing (if key is long enough)
    if (value.length >= 20) {
      apiKeyDebounceRef.current[provider] = setTimeout(() => {
        handleTestConnection(provider, value);
      }, 1500); // 1.5 second debounce
    }
  };

  // Cleanup debounce timers on unmount
  React.useEffect(() => {
    const currentRef = apiKeyDebounceRef.current;
    return () => {
      if (currentRef.anthropic) {
        clearTimeout(currentRef.anthropic);
      }
      if (currentRef.openai) {
        clearTimeout(currentRef.openai);
      }
    };
  }, []);

  const handleSetDefaultProvider = async (provider: AIProvider) => {
    // Check if the provider has an API key configured
    const providerConfig = provider === 'anthropic' ? anthropic : openai;
    if (!providerConfig.config?.hasApiKey) {
      setDefaultProviderError(`Cannot set ${PROVIDER_INFO[provider].name} as default: No API key configured`);
      return;
    }

    setIsSettingDefault(true);
    setDefaultProviderError(null);

    try {
      const response = await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to set default provider');
      }

      setDefaultProvider(provider);
      onSave?.();
    } catch (error) {
      setDefaultProviderError(error instanceof Error ? error.message : 'Failed to set default provider');
    } finally {
      setIsSettingDefault(false);
    }
  };

  const handleSave = async (provider: AIProvider) => {
    const state = provider === 'anthropic' ? anthropic : openai;
    const setState = provider === 'anthropic' ? setAnthropic : setOpenai;

    // Prevent save if testing in progress
    if (isAnyTestInProgress) {
      return;
    }

    // Clear messages and set saving state
    setState((prev) => ({
      ...prev,
      error: null,
      success: null,
      isSaving: true,
      connectionTest: {
        status: 'testing',
        message: 'Validating API key...',
        testedAt: null,
      },
    }));

    try {
      const response = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: state.apiKey,
          defaultModel: state.defaultModel,
          isEnabled: state.isEnabled,
          testKey: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setState((prev) => ({
          ...prev,
          error: data.error || 'Failed to save configuration',
          isSaving: false,
          connectionTest: {
            status: 'error',
            message: data.error || 'API key validation failed',
            testedAt: new Date(),
          },
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        config: data.data,
        apiKey: '',
        success: data.message || 'Configuration saved successfully',
        isSaving: false,
        connectionTest: {
          status: 'success',
          message: 'API key validated and saved successfully',
          testedAt: new Date(),
        },
      }));

      // If this is the first provider configured, auto-set it as default
      if (!defaultProvider && data.data?.hasApiKey) {
        setDefaultProvider(provider);
      }

      onSave?.();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save configuration',
        isSaving: false,
        connectionTest: {
          status: 'error',
          message: 'Network error while saving. Please try again.',
          testedAt: new Date(),
        },
      }));
    }
  };

  const handleDelete = async (provider: AIProvider) => {
    if (!confirm(`Are you sure you want to remove the ${PROVIDER_INFO[provider].name} API key?`)) {
      return;
    }

    const setState = provider === 'anthropic' ? setAnthropic : setOpenai;

    setState((prev) => ({ ...prev, error: null, success: null, isDeleting: true }));

    try {
      const response = await fetch(`/api/settings/ai?provider=${provider}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete configuration');
      }

      setState((prev) => ({
        ...prev,
        config: null,
        apiKey: '',
        success: data.message || 'Configuration deleted',
        isDeleting: false,
      }));

      // If the deleted provider was the default, clear it
      if (defaultProvider === provider) {
        setDefaultProvider(null);
      }

      onSave?.();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete configuration',
        isDeleting: false,
      }));
    }
  };

  /**
   * Render connection test status with appropriate visual feedback
   */
  const renderConnectionStatus = (provider: AIProvider, state: ProviderConfig) => {
    const { connectionTest } = state;

    // Don't show anything for idle state
    if (connectionTest.status === 'idle') {
      return null;
    }

    const statusConfig = {
      testing: {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
      },
      success: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
      },
      error: {
        icon: <AlertCircle className="h-4 w-4" />,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
      },
      timeout: {
        icon: <Clock className="h-4 w-4" />,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
      },
      invalid_format: {
        icon: <AlertTriangle className="h-4 w-4" />,
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
      },
    };

    const config = statusConfig[connectionTest.status];

    return (
      <div
        className={`flex items-start gap-2 rounded-md p-3 border ${config.bgColor} ${config.borderColor}`}
      >
        <div className={`mt-0.5 ${config.textColor}`}>{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${config.textColor}`}>
            {connectionTest.message}
          </p>
          {connectionTest.responseTime && connectionTest.status === 'success' && (
            <p className="text-xs text-muted-foreground mt-1">
              Response time: {connectionTest.responseTime}ms
            </p>
          )}
          {connectionTest.testedAt && connectionTest.status !== 'testing' && (
            <p className="text-xs text-muted-foreground mt-1">
              Tested {formatTimeAgo(connectionTest.testedAt)}
            </p>
          )}
          {connectionTest.status === 'timeout' && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className={`h-auto p-0 mt-1 ${config.textColor}`}
              onClick={() => handleTestConnection(provider, state.apiKey)}
              disabled={state.isTesting || isAnyTestInProgress}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  };

  /**
   * Format time ago string
   */
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 120) return '1 minute ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return date.toLocaleTimeString();
  };

  const renderProviderCard = (
    provider: AIProvider,
    state: ProviderConfig,
    setState: React.Dispatch<React.SetStateAction<ProviderConfig>>,
    models: string[]
  ) => {
    const info = PROVIDER_INFO[provider];
    const Icon = info.icon;
    const isDefault = defaultProvider === provider;
    const hasKey = state.config?.hasApiKey;

    return (
      <Card
        key={provider}
        className={`relative transition-all duration-200 ${
          isDefault
            ? `ring-2 ring-primary ${info.bgColor}`
            : hasKey
              ? `${info.bgColor} hover:shadow-md`
              : 'hover:shadow-md'
        }`}
      >
        {/* Default Provider Badge */}
        {isDefault && (
          <div className="absolute -top-2 -right-2 z-10">
            <Badge variant="default" className="bg-primary text-primary-foreground gap-1">
              <Zap className="h-3 w-3" />
              Active
            </Badge>
          </div>
        )}

        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className={`p-2 rounded-lg ${info.bgColor} ${info.borderColor} border`}>
              <Icon className={`h-5 w-5 ${info.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {info.name}
                {hasKey && (
                  <span className="flex items-center gap-1 text-sm font-normal text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Configured
                  </span>
                )}
              </div>
              <CardDescription className="text-sm font-normal mt-1">
                {info.description}
              </CardDescription>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error/Success Messages */}
          {state.error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {state.error}
            </div>
          )}

          {state.success && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {state.success}
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor={`${provider}-api-key`}>
              API Key {!hasKey && <span className="text-destructive">*</span>}
            </Label>
            {/* Show masked key when one exists and user hasn't started typing */}
            {hasKey && !state.apiKey && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm text-muted-foreground">
                  {state.config?.maskedApiKey || '••••••••••••'}
                </span>
                <Badge variant="outline" className="ml-auto text-xs text-green-600 border-green-200 bg-green-50">
                  Stored
                </Badge>
              </div>
            )}
            <div className="relative">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={`${provider}-api-key`}
                type={state.showKey ? 'text' : 'password'}
                placeholder={hasKey ? 'Enter new key to replace existing one' : 'Enter your API key'}
                value={state.apiKey}
                onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                className="pl-10 pr-10"
                disabled={state.isTesting}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={() => setState((prev) => ({ ...prev, showKey: !prev.showKey }))}
              >
                {state.showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasKey
                ? 'Enter a new key to replace the existing one'
                : `Get your API key from ${provider === 'anthropic' ? 'console.anthropic.com' : 'platform.openai.com'}`}
            </p>
          </div>

          {/* Connection Test Status */}
          {renderConnectionStatus(provider, state)}

          {/* Test Connection Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleTestConnection(provider, state.apiKey)}
            disabled={state.isTesting || isAnyTestInProgress || (!state.apiKey && !hasKey)}
            className="w-full"
          >
            {state.isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>

          {/* Default Model Selection */}
          <div className="space-y-2">
            <Label htmlFor={`${provider}-model`}>Default Model</Label>
            <Select
              value={state.defaultModel}
              onValueChange={(value) => setState((prev) => ({ ...prev, defaultModel: value }))}
            >
              <SelectTrigger id={`${provider}-model`} className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This model will be used for document analysis
            </p>
          </div>

          {/* Usage Stats */}
          {hasKey && (
            <div className="rounded-md bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">API Calls</span>
                <span className="font-medium">{formatNumber(state.config?.usageCount || 0)}</span>
              </div>
              {state.config?.lastUsedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Used</span>
                  <span className="font-medium">
                    {new Date(state.config.lastUsedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleSave(provider)}
              disabled={!state.apiKey || state.isSaving || state.isDeleting || state.isTesting || isAnyTestInProgress}
              className="flex-1"
            >
              {state.isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {hasKey ? 'Update Key' : 'Save Key'}
                </>
              )}
            </Button>

            {hasKey && !isDefault && (
              <Button
                variant="outline"
                onClick={() => handleSetDefaultProvider(provider)}
                disabled={isSettingDefault || state.isSaving || state.isDeleting || state.isTesting || isAnyTestInProgress}
                title="Set as active provider"
              >
                {isSettingDefault ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
              </Button>
            )}

            {hasKey && (
              <Button
                variant="outline"
                onClick={() => handleDelete(provider)}
                disabled={state.isSaving || state.isDeleting || state.isTesting || isAnyTestInProgress}
                title="Delete configuration"
              >
                {state.isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
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

  const hasAnyProvider = anthropic.config?.hasApiKey || openai.config?.hasApiKey;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Configuration
          </CardTitle>
          <CardDescription>
            Configure API keys for AI-powered document analysis. Your keys are encrypted
            and stored securely. At least one provider must be configured for AI features.
          </CardDescription>
        </CardHeader>
        {hasAnyProvider && (
          <CardContent className="pt-0">
            <div className={`rounded-md p-4 flex items-start gap-3 ${
              defaultProvider
                ? 'bg-green-50 border border-green-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              {defaultProvider ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Active Provider: {PROVIDER_INFO[defaultProvider].name}</p>
                    <p>All AI-powered features will use this provider by default.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">No Active Provider Selected</p>
                    <p>Click the lightning bolt icon on a configured provider to set it as active.</p>
                  </div>
                </>
              )}
            </div>
            {defaultProviderError && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {defaultProviderError}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Provider Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {renderProviderCard('anthropic', anthropic, setAnthropic, availableModels.anthropic)}
        {renderProviderCard('openai', openai, setOpenai, availableModels.openai)}
      </div>

      {/* Usage Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Usage Statistics
          </CardTitle>
          <CardDescription>
            Track your AI API usage and costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsage ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : usageStats ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-md bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{formatNumber(usageStats.totalCalls)}</p>
                  <p className="text-sm text-muted-foreground">Total API Calls</p>
                </div>
                <div className="rounded-md bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{formatNumber(usageStats.totalTokens)}</p>
                  <p className="text-sm text-muted-foreground">Total Tokens</p>
                </div>
                <div className="rounded-md bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{formatCost(usageStats.totalCost)}</p>
                  <p className="text-sm text-muted-foreground">Estimated Cost</p>
                </div>
              </div>

              {/* Per-Provider Breakdown */}
              {Object.keys(usageStats.byProvider).length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Usage by Provider</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(usageStats.byProvider).map(([provider, stats]) => {
                      const info = PROVIDER_INFO[provider as AIProvider];
                      if (!info) return null;
                      const Icon = info.icon;
                      return (
                        <div
                          key={provider}
                          className={`rounded-md p-3 ${info.bgColor} ${info.borderColor} border`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`h-4 w-4 ${info.color}`} />
                            <span className={`font-medium ${info.color}`}>{info.name}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="font-medium">{formatNumber(stats.calls)}</p>
                              <p className="text-xs text-muted-foreground">Calls</p>
                            </div>
                            <div>
                              <p className="font-medium">{formatNumber(stats.tokens)}</p>
                              <p className="text-xs text-muted-foreground">Tokens</p>
                            </div>
                            <div>
                              <p className="font-medium">{formatCost(stats.cost)}</p>
                              <p className="text-xs text-muted-foreground">Cost</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              No usage data available yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
