import { ExchangeRateConfig } from '@/components/currency';
import { CurrencyConverter } from '@/components/currency';

export const metadata = {
  title: 'Exchange Rates | Settings',
  description: 'Configure exchange rates for multi-currency support',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default function ExchangeRatesPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Exchange Rates</h2>
        <p className="text-muted-foreground">
          Configure and manage exchange rates for multi-currency support
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExchangeRateConfig />
        </div>
        <div>
          <CurrencyConverter />
        </div>
      </div>
    </div>
  );
}
