"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/hooks/useAppContext";
import Link from "next/link";

interface PendingInspection {
  id: string;
  machinename: string;
  requestedby: string;
  status: string;
  createdat: string;
}

export function PendingInspectionWarning() {
  const { user } = useAppContext();
  const [pendingCalls, setPendingCalls] = useState<PendingInspection[]>([]);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = user?.role === "Admin";

  const checkPendingCalls = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase
        .from("inspections")
        .select("id, machinename, requestedby, status, createdat")
        .or("status.eq.Upcoming,and(status.eq.Pending,assignedto.is.null)")
        .order("createdat", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Pending check error:", error.message);
        return;
      }

      const unacknowledged = ((data as PendingInspection[]) || []).filter(
        (insp) => !dismissed.has(insp.id)
      );

      if (unacknowledged.length > 0) {
        setPendingCalls(unacknowledged);
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch (err) {
      console.error("Error checking pending calls:", err);
    }
  }, [isAdmin, dismissed]);

  useEffect(() => {
    if (!isAdmin) return;

    // Load dismissed IDs from sessionStorage
    try {
      const stored = sessionStorage.getItem("dismissed_pending_warnings");
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch {}

    // Initial check
    checkPendingCalls();

    // Poll every 10 seconds
    intervalRef.current = setInterval(checkPendingCalls, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAdmin, checkPendingCalls]);

  const handleDismiss = () => {
    const newDismissed = new Set(dismissed);
    pendingCalls.forEach((c) => newDismissed.add(c.id));
    setDismissed(newDismissed);
    setVisible(false);

    // Persist to sessionStorage so popup doesn't repeat in same session
    try {
      sessionStorage.setItem(
        "dismissed_pending_warnings",
        JSON.stringify(Array.from(newDismissed))
      );
    } catch {}
  };

  const handleDismissOne = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);

    const remaining = pendingCalls.filter((c) => c.id !== id);
    setPendingCalls(remaining);
    if (remaining.length === 0) setVisible(false);

    try {
      sessionStorage.setItem(
        "dismissed_pending_warnings",
        JSON.stringify(Array.from(newDismissed))
      );
    } catch {}
  };

  if (!isAdmin || !visible || pendingCalls.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md w-auto sm:w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 border border-amber-300 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              Pending Inspection Calls
            </p>
            <p className="text-xs text-white/80">
              {pendingCalls.length} unassigned inspection
              {pendingCalls.length !== 1 ? "s" : ""} need attention
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20 hover:text-white rounded-full"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="max-h-60 overflow-y-auto">
          {pendingCalls.slice(0, 5).map((call) => (
            <div
              key={call.id}
              className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {call.machinename || "Unnamed Machine"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Requested by {call.requestedby || "Unknown"} &middot;{" "}
                  {call.status}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link href="/inspections">
                  <Button
                    size="sm"
                    className="h-7 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => handleDismissOne(call.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {pendingCalls.length > 5 && (
          <div className="px-4 py-2 bg-muted/20 border-t">
            <p className="text-xs text-muted-foreground text-center">
              + {pendingCalls.length - 5} more pending inspections
            </p>
          </div>
        )}

        <div className="px-4 py-2 bg-muted/10 border-t flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={handleDismiss}
          >
            Dismiss All
          </Button>
          <Link href="/inspections">
            <Button
              size="sm"
              className="h-7 text-xs rounded-lg"
            >
              View All Inspections
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
