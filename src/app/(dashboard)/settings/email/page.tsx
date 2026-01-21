import { PageAccessCheck } from '@/components/permissions/page-access-check';
import { EmailSettingsForm } from '@/components/settings/email-settings-form';

export const metadata = {
  title: 'Email Settings | Settings',
  description: 'Configure SMTP email settings for the application',
};

// Force dynamic rendering since we need to check permissions
export const dynamic = 'force-dynamic';

/**
 * Email Settings Page
 *
 * Allows administrators to configure SMTP email settings for the application.
 */
export default async function EmailSettingsPage() {
  return (
    <PageAccessCheck resourceKey="page:settings-email">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure SMTP email service for sending notifications and alerts from the application.
          </p>
        </div>

        <EmailSettingsForm />
      </div>
    </PageAccessCheck>
  );
}
