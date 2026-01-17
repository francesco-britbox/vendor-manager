'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users,
  DollarSign,
  ArrowLeftRight,
  Settings2,
  Bot,
} from 'lucide-react';

/**
 * Settings navigation items
 */
const settingsNavItems = [
  {
    href: '/settings/roles',
    label: 'Roles',
    icon: Users,
    description: 'Manage role definitions',
  },
  {
    href: '/settings/rate-cards',
    label: 'Rate Cards',
    icon: DollarSign,
    description: 'Configure pricing templates',
  },
  {
    href: '/settings/exchange-rates',
    label: 'Exchange Rates',
    icon: ArrowLeftRight,
    description: 'Manage currency rates',
  },
  {
    href: '/settings/configuration',
    label: 'Configuration',
    icon: Settings2,
    description: 'System-wide settings & AI',
  },
];

/**
 * Settings layout with navigation sidebar
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Settings Navigation Sidebar */}
      <aside className="w-full md:w-64 shrink-0">
        <nav className="space-y-1 bg-card rounded-lg border p-2">
          {settingsNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground hidden md:block">
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* AI Configuration Quick Link */}
        <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Features</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Configure API keys for Anthropic (Claude) and OpenAI (GPT) to enable AI-powered document analysis.
          </p>
          <Link
            href="/settings/configuration"
            className={cn(
              'inline-flex items-center text-xs font-medium text-primary hover:underline',
              pathname === '/settings/configuration' && 'underline'
            )}
          >
            Go to Configuration →
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
