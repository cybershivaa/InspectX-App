
"use client";

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Header } from '@/components/Header';
import { SidebarNav } from '@/components/SidebarNav';
import { Skeleton } from '@/components/ui/skeleton';
import { PendingInspectionWarning } from '@/components/PendingInspectionWarning';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };
  
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full">
        <div className="hidden md:flex flex-col w-64 border-r p-4 gap-4 bg-sidebar">
          <div className="p-2">
            <Skeleton className="h-8 w-3/4 bg-sidebar-accent" />
          </div>
          <div className="p-2 space-y-2">
            <Skeleton className="h-8 w-full bg-sidebar-accent" />
            <Skeleton className="h-8 w-full bg-sidebar-accent" />
            <Skeleton className="h-8 w-full bg-sidebar-accent" />
          </div>
        </div>
        <div className="flex-1">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
             <div className="flex-1" />
             <Skeleton className="h-10 w-10 rounded-full"/>
          </header>
          <main className="p-6">
            <Skeleton className="h-64 w-full"/>
          </main>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <img src="/ntpc-logo.png" alt="NTPC Logo" className="h-16 w-16 object-contain" />
            <h1 className="text-xl font-bold">InspectX</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav role={user.role} />
        </SidebarContent>
        <SidebarFooter>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-full">
          <Header />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">{children}</main>
        </div>
        <PendingInspectionWarning />
      </SidebarInset>
    </SidebarProvider>
  );
}

    