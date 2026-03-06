
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/hooks/useAppContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LogOut, User, Zap, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { NotificationBell } from '@/components/NotificationBell';

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).toLowerCase();

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="hidden sm:flex flex-col items-center justify-center bg-white/20 border border-white/30 rounded-xl px-5 py-1.5 leading-tight shadow-sm">
      <span className="text-sm font-bold text-white tracking-wide">{timeStr}</span>
      <span className="text-xs text-blue-100">{dateStr}</span>
    </div>
  );
}

export function Header() {
  const { user, logout } = useAppContext();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0]?.[0]?.toUpperCase() || '';
  };

  const roleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':    return 'bg-red-100 text-red-700 border-red-300';
      case 'manager':  return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'inspector': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'client':   return 'bg-green-100 text-green-700 border-green-300';
      default:         return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-2 sm:gap-3 border-b bg-gradient-to-r from-blue-900 to-blue-400 px-2 sm:px-4 md:px-6 shadow-sm">
      {/* Left: Sidebar trigger + Role badge */}
      <SidebarTrigger className="text-white hover:text-blue-100" />

      {user && (
        <span className={`hidden sm:inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${roleBadgeColor(user.role)}`}>
          {user.role}
        </span>
      )}

      {/* Center: Live clock */}
      <div className="flex flex-1 items-center justify-center">
        <LiveClock />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Lightning/activity icon */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-white hover:text-white hover:bg-white/20"
          aria-label="Activity"
        >
          <Zap className="h-5 w-5" />
        </Button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* User info + avatar dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 rounded-full pr-2 pl-1 hover:bg-white/20 h-auto py-1"
              >
                <Avatar className="h-9 w-9 border-2 border-white/50">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-white/30 text-white font-bold text-sm">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-white">{user.name}</span>
                  <span className="text-xs text-blue-100 uppercase tracking-wide">{user.role}</span>
                </div>
                <ChevronDown className="hidden sm:block h-4 w-4 text-white/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
