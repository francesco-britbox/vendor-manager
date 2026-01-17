import { InvoiceConfig } from '@/components/invoices';

export const metadata = {
  title: 'Invoices | Vendors Manager',
  description: 'Manage invoices and validate against timesheet spend',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default function InvoicesPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
        <p className="text-muted-foreground">
          Manage vendor invoices, validate against timesheet spend, and track payment status
        </p>
      </div>

      <InvoiceConfig />
    </div>
  );
}
