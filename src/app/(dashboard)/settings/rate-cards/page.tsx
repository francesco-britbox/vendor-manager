import { RateCardConfig } from '@/components/rate-cards';

export const metadata = {
  title: 'Rate Cards | Settings',
  description: 'Configure and manage vendor-specific role pricing with effective date ranges',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default function RateCardsPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Rate Card Management</h2>
        <p className="text-muted-foreground">
          Define and manage vendor-specific pricing by role. Support multiple currencies, effective date ranges, and historical tracking for auditing.
        </p>
      </div>

      <RateCardConfig />
    </div>
  );
}
