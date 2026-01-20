'use client';

import * as React from 'react';
import { EmailSettingsForm } from '@/components/settings/email-settings-form';

/**
 * Email Settings Page
 *
 * Allows administrators to configure SMTP email settings for the application.
 */
export default function EmailSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Settings</h1>
        <p className="text-muted-foreground">
          Configure SMTP email service for sending notifications and alerts from the application.
        </p>
      </div>

      <EmailSettingsForm />
    </div>
  );
}
