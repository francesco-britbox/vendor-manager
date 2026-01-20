import { ContractConfig } from '@/components/contracts';

export const metadata = {
  title: 'Contracts | Delivery Manager',
  description: 'Manage your contracts and track their lifecycle',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default function ContractsPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Contracts</h2>
        <p className="text-muted-foreground">
          Manage vendor contracts, track expiration dates, and monitor contract values
        </p>
      </div>

      <ContractConfig />
    </div>
  );
}
