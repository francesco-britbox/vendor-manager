/**
 * RBAC Seed Script
 *
 * This script initializes the RBAC system with:
 * 1. Default protectable resources (pages and components)
 * 2. Administrators group
 * 3. Sets the first admin user as a super user
 *
 * Run with: npx tsx prisma/seed-rbac.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Resource definition type
interface ResourceDefinition {
  resourceKey: string;
  type: string;
  name: string;
  description: string;
  path?: string;
  parentKey?: string;
  sortOrder: number;
}

// Protectable pages
const PROTECTABLE_PAGES: ResourceDefinition[] = [
  {
    resourceKey: 'page:dashboard',
    type: 'page',
    name: 'Dashboard',
    description: 'Main dashboard with overview metrics',
    path: '/dashboard',
    sortOrder: 1,
  },
  {
    resourceKey: 'page:vendors',
    type: 'page',
    name: 'Vendors',
    description: 'Vendor management and listing',
    path: '/vendors',
    sortOrder: 2,
  },
  {
    resourceKey: 'page:team-members',
    type: 'page',
    name: 'Team Members',
    description: 'Team member management',
    path: '/team-members',
    sortOrder: 3,
  },
  {
    resourceKey: 'page:timesheet',
    type: 'page',
    name: 'Timesheet',
    description: 'Timesheet entries and tracking',
    path: '/timesheet',
    sortOrder: 4,
  },
  {
    resourceKey: 'page:invoices',
    type: 'page',
    name: 'Invoices',
    description: 'Invoice management and validation',
    path: '/invoices',
    sortOrder: 5,
  },
  {
    resourceKey: 'page:contracts',
    type: 'page',
    name: 'Contracts',
    description: 'Contract management',
    path: '/contracts',
    sortOrder: 6,
  },
  {
    resourceKey: 'page:analytics',
    type: 'page',
    name: 'Analytics',
    description: 'Analytics and insights',
    path: '/analytics',
    sortOrder: 7,
  },
  {
    resourceKey: 'page:reports',
    type: 'page',
    name: 'Reports',
    description: 'Report generation and viewing',
    path: '/reports',
    sortOrder: 8,
  },
  {
    resourceKey: 'page:settings',
    type: 'page',
    name: 'Settings',
    description: 'System settings and configuration',
    path: '/settings',
    sortOrder: 9,
  },
  {
    resourceKey: 'page:settings-roles',
    type: 'page',
    name: 'Settings - Roles',
    description: 'Job role definitions',
    path: '/settings/roles',
    parentKey: 'page:settings',
    sortOrder: 10,
  },
  {
    resourceKey: 'page:settings-rate-cards',
    type: 'page',
    name: 'Settings - Rate Cards',
    description: 'Vendor pricing templates',
    path: '/settings/rate-cards',
    parentKey: 'page:settings',
    sortOrder: 11,
  },
  {
    resourceKey: 'page:settings-exchange-rates',
    type: 'page',
    name: 'Settings - Exchange Rates',
    description: 'Currency exchange rates',
    path: '/settings/exchange-rates',
    parentKey: 'page:settings',
    sortOrder: 12,
  },
  {
    resourceKey: 'page:settings-configuration',
    type: 'page',
    name: 'Settings - Configuration',
    description: 'System-wide configuration',
    path: '/settings/configuration',
    parentKey: 'page:settings',
    sortOrder: 13,
  },
  {
    resourceKey: 'page:settings-access-control',
    type: 'page',
    name: 'Settings - Access Control',
    description: 'User and group management, permissions',
    path: '/settings/access-control',
    parentKey: 'page:settings',
    sortOrder: 14,
  },
  // Reporting pages
  {
    resourceKey: 'page:reporting',
    type: 'page',
    name: 'Reporting',
    description: 'Weekly vendor reporting section',
    path: '/reporting',
    sortOrder: 15,
  },
  {
    resourceKey: 'page:reporting-create',
    type: 'page',
    name: 'Create Report',
    description: 'Create and edit weekly vendor reports',
    path: '/reporting/create',
    parentKey: 'page:reporting',
    sortOrder: 16,
  },
];

// Protectable components
const PROTECTABLE_COMPONENTS: ResourceDefinition[] = [
  {
    resourceKey: 'component:vendor-documents',
    type: 'component',
    name: 'Vendor Documents',
    description: 'Documents section on vendor detail page',
    parentKey: 'page:vendors',
    sortOrder: 1,
  },
  {
    resourceKey: 'component:vendor-contract-period',
    type: 'component',
    name: 'Vendor Contract Period',
    description: 'Contract period section on vendor detail page',
    parentKey: 'page:vendors',
    sortOrder: 2,
  },
  {
    resourceKey: 'component:vendor-tags',
    type: 'component',
    name: 'Vendor Tags',
    description: 'Tags section on vendor detail page',
    parentKey: 'page:vendors',
    sortOrder: 3,
  },
];

async function main() {
  console.log('Starting RBAC seed...');

  // 1. Create protectable resources
  console.log('\n1. Creating protectable resources...');

  const allResources = [...PROTECTABLE_PAGES, ...PROTECTABLE_COMPONENTS];

  for (const resource of allResources) {
    await prisma.protectableResource.upsert({
      where: { resourceKey: resource.resourceKey },
      create: {
        resourceKey: resource.resourceKey,
        type: resource.type,
        name: resource.name,
        description: resource.description,
        parentKey: resource.parentKey || null,
        path: resource.path || null,
        sortOrder: resource.sortOrder,
        isActive: true,
      },
      update: {
        type: resource.type,
        name: resource.name,
        description: resource.description,
        parentKey: resource.parentKey || null,
        path: resource.path || null,
        sortOrder: resource.sortOrder,
      },
    });
    console.log(`  - ${resource.name} (${resource.resourceKey})`);
  }

  // 2. Create Administrators group
  console.log('\n2. Creating Administrators group...');

  const adminGroup = await prisma.permissionGroup.upsert({
    where: { name: 'Administrators' },
    create: {
      name: 'Administrators',
      description:
        'Full access to settings and user management. Members can manage other users, groups, and system configuration.',
      isSystem: true,
    },
    update: {},
  });
  console.log(`  - Created/verified Administrators group (${adminGroup.id})`);

  // 3. Assign Administrators group to Access Control page
  console.log('\n3. Setting up Access Control page permissions...');

  const accessControlResource = await prisma.protectableResource.findUnique({
    where: { resourceKey: 'page:settings-access-control' },
  });

  if (accessControlResource) {
    await prisma.resourcePermission.upsert({
      where: {
        resourceId_groupId: {
          resourceId: accessControlResource.id,
          groupId: adminGroup.id,
        },
      },
      create: {
        resourceId: accessControlResource.id,
        groupId: adminGroup.id,
      },
      update: {},
    });
    console.log('  - Administrators group assigned to Access Control page');
  }

  // 3.1 Create Delivery Managers permission group
  console.log('\n3.1. Creating Delivery Managers group...');

  const deliveryManagerGroup = await prisma.permissionGroup.upsert({
    where: { name: 'Delivery Managers' },
    create: {
      name: 'Delivery Managers',
      description: 'Access to weekly reporting features for assigned vendors',
      isSystem: false,
    },
    update: {},
  });
  console.log(`  - Created/verified Delivery Managers group (${deliveryManagerGroup.id})`);

  // Assign Delivery Managers group to reporting pages
  const reportingResources = await prisma.protectableResource.findMany({
    where: {
      resourceKey: {
        in: ['page:reporting', 'page:reporting-create'],
      },
    },
  });

  for (const resource of reportingResources) {
    await prisma.resourcePermission.upsert({
      where: {
        resourceId_groupId: {
          resourceId: resource.id,
          groupId: deliveryManagerGroup.id,
        },
      },
      create: {
        resourceId: resource.id,
        groupId: deliveryManagerGroup.id,
      },
      update: {},
    });
    console.log(`  - Delivery Managers group assigned to ${resource.name}`);
  }

  // 4. Set the first admin user as super user
  console.log('\n4. Setting up super user...');

  const adminUser = await prisma.user.findFirst({
    where: {
      permissionLevel: 'admin',
      isActive: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { isSuperUser: true },
    });
    console.log(`  - ${adminUser.name} (${adminUser.email}) set as super user`);

    // Add admin user to Administrators group
    await prisma.userGroup.upsert({
      where: {
        userId_groupId: {
          userId: adminUser.id,
          groupId: adminGroup.id,
        },
      },
      create: {
        userId: adminUser.id,
        groupId: adminGroup.id,
      },
      update: {},
    });
    console.log(`  - ${adminUser.name} added to Administrators group`);
  } else {
    console.log('  - No admin user found. Please create one and run this seed again.');
  }

  console.log('\nRBAC seed completed successfully!');

  // Summary
  const resourceCount = await prisma.protectableResource.count();
  const groupCount = await prisma.permissionGroup.count();
  const superUserCount = await prisma.user.count({ where: { isSuperUser: true } });

  console.log('\nSummary:');
  console.log(`  - ${resourceCount} protectable resources`);
  console.log(`  - ${groupCount} permission groups`);
  console.log(`  - ${superUserCount} super user(s)`);
}

main()
  .catch((e) => {
    console.error('Error during RBAC seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
