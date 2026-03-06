
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/lib/types';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { LayoutDashboard, Search, FileText, Wrench, Users, AlertTriangle, ClipboardList, Archive } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  disabled?: boolean;
  tooltip?: string;
}

const navItems: Record<string, NavItem[]> = {
  all: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ],
  Admin: [
    { href: '/inspections', label: 'Inspections', icon: FileText },
    { href: '/inspection-records', label: 'Inspection Records', icon: Archive },
    { href: '/search', label: 'Machine Search', icon: Search },
    { href: '/anomaly-detection', label: 'Anomaly Detection', icon: AlertTriangle },
    { href: '/admin', label: 'Admin Panel', icon: Users },
    { href: '/form-builder', label: 'Form Builder', icon: Wrench },
  ],
  Inspector: [
    { href: '/inspections', label: 'Assigned Inspections', icon: FileText },
    { href: '/anomaly-detection', label: 'Anomaly Detection', icon: AlertTriangle },
  ],
  Client: [
    { href: '/inspections', label: 'My Raised Calls', icon: FileText },
    { href: '/activity', label: 'Activity', icon: ClipboardList },
  ],
};

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const userNavItems: NavItem[] = [...(navItems.all || []), ...(navItems[role] || [])];

  return (
    <SidebarMenu className="p-2">
      {userNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard') && (item.href !== '/admin' || pathname === '/admin')}
            disabled={item.disabled}
            tooltip={item.tooltip}
            className={item.disabled ? "cursor-not-allowed" : ""}
          >
            <Link href={item.disabled ? "#" : item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
