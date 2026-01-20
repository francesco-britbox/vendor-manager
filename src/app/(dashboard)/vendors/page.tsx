import { VendorConfig } from '@/components/vendors';
import { PageAccessCheck } from '@/components/permissions';

export const metadata = {
  title: 'Vendors | Vendors Manager',
  description: 'Manage your vendors and their information',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default async function VendorsPage() {
  return (
    <PageAccessCheck resourceKey="page:vendors">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Vendors</h2>
          <p className="text-muted-foreground">
            Manage and track all your vendor relationships
          </p>
        </div>

        <VendorConfig />
      </div>
    </PageAccessCheck>
  );
}
