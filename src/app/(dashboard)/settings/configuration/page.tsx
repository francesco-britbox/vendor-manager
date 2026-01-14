import { SettingsConfig } from '@/components/settings';
import { Shield } from 'lucide-react';

export const metadata = {
  title: 'System Configuration | Settings',
  description: 'Configure system-wide settings including currency, formats, dashboard, and integrations',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default function SettingsConfigurationPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-2xl font-bold tracking-tight">System Configuration</h2>
        </div>
        <p className="text-muted-foreground">
          Configure system-wide settings. Changes here affect all users. Admin access required.
        </p>
      </div>

      <SettingsConfig />
    </div>
  );
}
