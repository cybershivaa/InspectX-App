"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, FileText, UserPlus, ClipboardCheck, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/hooks/useAppContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface AppNotification {
  id: string;
  type: 'new_inspection' | 'inspection_assigned' | 'inspection_completed' | 'new_user' | 'status_update' | 'info';
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'inspectx_notifications';

const notifIcon = (type: AppNotification['type']) => {
  switch (type) {
    case 'new_inspection':    return <FileText className="h-4 w-4 text-blue-500" />;
    case 'inspection_assigned': return <ClipboardCheck className="h-4 w-4 text-green-500" />;
    case 'inspection_completed': return <CheckCheck className="h-4 w-4 text-emerald-500" />;
    case 'new_user':          return <UserPlus className="h-4 w-4 text-purple-500" />;
    case 'status_update':     return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:                  return <Info className="h-4 w-4 text-gray-500" />;
  }
};

function loadStored(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStored(userId: string, notifications: AppNotification[]) {
  try {
    // Keep max 50 notifications
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(notifications.slice(0, 50)));
  } catch {}
}

function addNotif(
  userId: string,
  prev: AppNotification[],
  notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
): AppNotification[] {
  const newNotif: AppNotification = {
    ...notif,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const updated = [newNotif, ...prev].slice(0, 50);
  saveStored(userId, updated);
  return updated;
}

export function NotificationBell() {
  const { user } = useAppContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Stable primitives — avoid channel churn / re-renders from full user object reference changes
  const userId   = user?.id   ?? null;
  const userRole = user?.role ?? null;
  const userName = user?.name ?? null;

  // Load persisted notifications when userId changes (login/switch)
  useEffect(() => {
    if (!userId) return;
    setNotifications(loadStored(userId));
  }, [userId]);

  const push = useCallback((notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    if (!userId) return;
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);
    setNotifications(prev => addNotif(userId, prev, notif));
  }, [userId]);

  // Single effect for ALL real-time channels — avoids 3 separate subscription/cleanup cycles
  useEffect(() => {
    if (!userId || !userRole) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Admin + Inspector: new inspection created
    if (userRole === 'Admin' || userRole === 'Inspector') {
      const ch = supabase
        .channel(`notif:insp:insert:${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inspections' }, (payload) => {
          const insp = payload.new as any;
          const machineName = insp.machinename ?? insp.machineName ?? 'A machine';
          const requestedBy = insp.requestedby ?? insp.requestedBy ?? 'Someone';
          push({
            type: 'new_inspection',
            title: 'New Inspection Call',
            message: `${machineName} requested by ${requestedBy}`,
            href: '/inspections',
          });
        })
        .subscribe();
      channels.push(ch);
    }

    // Inspector + Client: inspection updates (assigned / completed)
    if (userRole === 'Inspector' || userRole === 'Client') {
      const ch = supabase
        .channel(`notif:insp:update:${userId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inspections' }, (payload) => {
          const insp = payload.new as any;
          const machineName = insp.machinename ?? insp.machineName ?? 'An inspection';
          const assignedTo  = insp.assignedto  ?? insp.assignedTo  ?? '';
          const requestedBy = insp.requestedby ?? insp.requestedBy ?? '';
          const status      = insp.status      ?? '';

          if (userRole === 'Inspector' && assignedTo === userName) {
            push({
              type: 'inspection_assigned',
              title: 'Inspection Assigned to You',
              message: `${machineName} has been assigned to you`,
              href: '/inspections',
            });
          } else if (userRole === 'Client' && requestedBy === userName && status === 'Completed') {
            push({
              type: 'inspection_completed',
              title: 'Inspection Completed',
              message: `Report for ${machineName} is ready to view`,
              href: '/inspections?status=Completed',
            });
          }
        })
        .subscribe();
      channels.push(ch);
    }

    // Admin only: new signup requests
    if (userRole === 'Admin') {
      const ch = supabase
        .channel(`notif:pending:insert:${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pending_users' }, (payload) => {
          const pending = payload.new as any;
          const name = pending.name ?? 'Someone';
          const role = pending.role ?? 'user';
          push({
            type: 'new_user',
            title: 'New Registration Request',
            message: `${name} requested access as ${role}`,
            href: '/admin',
          });
        })
        .subscribe();
      channels.push(ch);
    }

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [userId, userRole, userName, push]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    if (!userId) return;
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveStored(userId, updated);
  };

  const markOneRead = (id: string) => {
    if (!userId) return;
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveStored(userId, updated);
  };

  const clearAll = () => {
    if (!userId) return;
    setNotifications([]);
    saveStored(userId, []);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full text-white hover:bg-white/20 hover:text-white"
          aria-label="Notifications"
        >
          <Bell className={cn(
            "h-5 w-5 transition-transform",
            animating && "animate-bounce"
          )} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 shadow-xl"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-red-500 text-white">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground px-2"
                onClick={markAllRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground/70 mt-1">New notifications will appear here</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="divide-y">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-muted/50",
                    !n.read && "bg-blue-50/60 dark:bg-blue-950/20"
                  )}
                  onClick={() => markOneRead(n.id)}
                >
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-full bg-muted">
                    {notifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm leading-tight",
                        !n.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                      )}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2 flex items-center justify-between bg-muted/20">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearAll}>
              Clear all
            </Button>
            <Link href="/inspections" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                View inspections →
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
