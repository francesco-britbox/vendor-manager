'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UsersManagement,
  GroupsManagement,
  PermissionsManagement,
} from '@/components/access-control';
import { AdminGuard } from '@/components/permissions';
import { Shield, Users, Lock } from 'lucide-react';

/**
 * Access Control Settings Page
 *
 * This page is only accessible to super users and members of the Administrators group.
 * It provides interfaces for managing users, groups, and permissions.
 */
export default function AccessControlPage() {
  const [activeTab, setActiveTab] = React.useState('users');

  return (
    <AdminGuard
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don&apos;t have permission to access the Access Control settings.
            Please contact an administrator if you need access.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Access Control
          </h1>
          <p className="text-muted-foreground">
            Manage users, groups, and permission assignments
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="groups">
            <GroupsManagement />
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
