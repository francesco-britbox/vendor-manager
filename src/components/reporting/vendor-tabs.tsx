'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Loader2 } from 'lucide-react';
import type { AssignedVendor } from '@/types/delivery-reporting';

interface VendorTabsProps {
  vendors: AssignedVendor[];
  currentVendorId: string | null;
  onVendorChange: (vendorId: string) => void;
  isLoading?: boolean;
}

export function VendorTabs({
  vendors,
  currentVendorId,
  onVendorChange,
  isLoading = false,
}: VendorTabsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading vendors...</span>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>No vendors assigned</span>
      </div>
    );
  }

  return (
    <Tabs
      value={currentVendorId || undefined}
      onValueChange={onVendorChange}
      className="w-full"
    >
      <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
        {vendors.map((vendor) => (
          <TabsTrigger
            key={vendor.id}
            value={vendor.id}
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Building2 className="h-4 w-4" />
            <span>{vendor.name}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
