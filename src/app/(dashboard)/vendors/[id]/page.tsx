import { notFound } from 'next/navigation';
import { VendorDetail } from '@/components/vendors';
import { getVendorById } from '@/lib/vendors';

interface VendorDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VendorDetailPageProps) {
  const { id } = await params;
  const vendor = await getVendorById(id);

  if (!vendor) {
    return {
      title: 'Vendor Not Found | Delivery Manager',
    };
  }

  return {
    title: `${vendor.name} | Vendors | Delivery Manager`,
    description: vendor.serviceDescription || `View details for ${vendor.name}`,
  };
}

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default async function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { id } = await params;
  const vendor = await getVendorById(id);

  if (!vendor) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <VendorDetail vendor={vendor} />
    </div>
  );
}
