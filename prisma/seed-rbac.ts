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
  requiredLevel?: 'denied' | 'view' | 'write' | 'admin';
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
    requiredLevel: 'admin',
  },
  {
    resourceKey: 'page:settings-access-control',
    type: 'page',
    name: 'Settings - Access Control',
    description: 'User and group management, permissions',
    path: '/settings/access-control',
    parentKey: 'page:settings',
    sortOrder: 14,
    requiredLevel: 'admin',
  },
  {
    resourceKey: 'page:settings-email',
    type: 'page',
    name: 'Settings - Email',
    description: 'SMTP email configuration',
    path: '/settings/email',
    parentKey: 'page:settings',
    sortOrder: 15,
    requiredLevel: 'admin',
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
  // Delete operation components - require specific group membership
  {
    resourceKey: 'component:vendor-delete',
    type: 'component',
    name: 'Delete Vendors',
    description: 'Ability to delete vendor records',
    parentKey: 'page:vendors',
    sortOrder: 10,
  },
  {
    resourceKey: 'component:team-member-delete',
    type: 'component',
    name: 'Delete Team Members',
    description: 'Ability to delete team member records',
    parentKey: 'page:team-members',
    sortOrder: 11,
  },
  {
    resourceKey: 'component:contract-delete',
    type: 'component',
    name: 'Delete Contracts',
    description: 'Ability to delete contract records',
    parentKey: 'page:contracts',
    sortOrder: 12,
  },
  {
    resourceKey: 'component:invoice-delete',
    type: 'component',
    name: 'Delete Invoices',
    description: 'Ability to delete invoice records',
    parentKey: 'page:invoices',
    sortOrder: 13,
  },
  {
    resourceKey: 'component:rate-card-delete',
    type: 'component',
    name: 'Delete Rate Cards',
    description: 'Ability to delete rate card records',
    parentKey: 'page:settings-rate-cards',
    sortOrder: 14,
  },
  {
    resourceKey: 'component:role-delete',
    type: 'component',
    name: 'Delete Roles',
    description: 'Ability to delete job role records',
    parentKey: 'page:settings-roles',
    sortOrder: 15,
  },
  {
    resourceKey: 'component:exchange-rate-delete',
    type: 'component',
    name: 'Delete Exchange Rates',
    description: 'Ability to delete exchange rate records',
    parentKey: 'page:settings-exchange-rates',
    sortOrder: 16,
  },
  {
    resourceKey: 'component:document-delete',
    type: 'component',
    name: 'Delete Documents',
    description: 'Ability to delete vendor documents',
    parentKey: 'page:vendors',
    sortOrder: 17,
  },
  {
    resourceKey: 'component:user-delete',
    type: 'component',
    name: 'Delete Users',
    description: 'Ability to delete user accounts',
    parentKey: 'page:settings-access-control',
    sortOrder: 18,
  },
  {
    resourceKey: 'component:group-delete',
    type: 'component',
    name: 'Delete Groups',
    description: 'Ability to delete permission groups',
    parentKey: 'page:settings-access-control',
    sortOrder: 19,
  },
  {
    resourceKey: 'component:tag-delete',
    type: 'component',
    name: 'Delete Tags',
    description: 'Ability to delete tags',
    parentKey: 'page:vendors',
    sortOrder: 20,
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
        requiredLevel: resource.requiredLevel || 'view',
      },
      update: {
        type: resource.type,
        name: resource.name,
        description: resource.description,
        parentKey: resource.parentKey || null,
        path: resource.path || null,
        sortOrder: resource.sortOrder,
        requiredLevel: resource.requiredLevel || 'view',
      },
    });
    console.log(`  - ${resource.name} (${resource.resourceKey})${resource.requiredLevel ? ` [${resource.requiredLevel}]` : ''}`);
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

  // Assign Administrators group to other admin-only pages
  const adminOnlyPages = ['page:settings-configuration', 'page:settings-email'];
  for (const pageKey of adminOnlyPages) {
    const pageResource = await prisma.protectableResource.findUnique({
      where: { resourceKey: pageKey },
    });
    if (pageResource) {
      await prisma.resourcePermission.upsert({
        where: {
          resourceId_groupId: {
            resourceId: pageResource.id,
            groupId: adminGroup.id,
          },
        },
        create: {
          resourceId: pageResource.id,
          groupId: adminGroup.id,
        },
        update: {},
      });
      console.log(`  - Administrators group assigned to ${pageResource.name}`);
    }
  }

  // Assign Administrators group to all delete components
  console.log('\n3.1. Assigning Administrators group to delete components...');
  const deleteComponents = await prisma.protectableResource.findMany({
    where: {
      resourceKey: {
        startsWith: 'component:',
        endsWith: '-delete',
      },
    },
  });

  for (const component of deleteComponents) {
    await prisma.resourcePermission.upsert({
      where: {
        resourceId_groupId: {
          resourceId: component.id,
          groupId: adminGroup.id,
        },
      },
      create: {
        resourceId: component.id,
        groupId: adminGroup.id,
      },
      update: {},
    });
    console.log(`  - Administrators group assigned to ${component.name}`);
  }

  // 3.3 Create Delivery Managers permission group
  console.log('\n3.3. Creating Delivery Managers group...');

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
