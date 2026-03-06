"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal, Loader2, Check, X, Eye, Users, ShieldCheck,
  UserCheck, ClipboardList, RefreshCw, Search, ChevronRight,
  AlertCircle, Clock, CheckCircle, FileText, TrendingUp, UserPlus,
  BarChart3, Shield, Activity, Inbox, ArrowUpRight, Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role, User, PendingUser, Inspection } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/hooks/useAppContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { rejectUser, getPendingUsers } from "@/app/actions/users";
import { getUsers, getInspections } from "@/app/actions/data";
import { getActivityLogs, createActivityLog } from "@/app/actions/activity-logs";
import type { ActivityLog } from "@/app/actions/activity-logs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";


/* ───────────────────────────────────────────────────────────────────
   Approve User Dialog
   ─────────────────────────────────────────────────────────────────── */
function ApproveUserDialog({
  user,
  isOpen,
  onOpenChange,
  onApproved,
  setPendingUsers,
}: {
  user: PendingUser;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: (newUser: User) => void;
  setPendingUsers: React.Dispatch<React.SetStateAction<PendingUser[]>>;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleApprove = () => {
    if (!user.password || user.password.length < 8) {
      toast({
        variant: "destructive",
        title: "Invalid Request",
        description: "Pending user does not have a valid password.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/approve-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            password: user.password,
            name: user.name,
            role: user.role,
            pendingUserId: user.id,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          toast({
            variant: "destructive",
            title: "Approval Failed",
            description:
              result.error || "An error occurred while approving the user.",
          });
          return;
        }

        const newUser: User = {
          id: result.user?.id || "",
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: "",
        };

        toast({
          title: "User Approved",
          description: "Account created for " + user.email + ".",
          duration: 5000,
        });

        // Log the approval
        createActivityLog({
          action: "USER_APPROVED",
          entity_type: "user",
          entity_id: user.id,
          entity_name: user.name,
          details: "Registration approved for " + user.name + " (" + user.email + ") as " + user.role,
          performed_by: "Admin",
          performed_by_role: "Admin",
        });

        onApproved(newUser);
        setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
        onOpenChange(false);
      } catch (error: any) {
        console.error("Error approving user:", error);
        toast({
          variant: "destructive",
          title: "Approval Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            Approve Registration
          </DialogTitle>
          <DialogDescription>
            Review and approve this user&apos;s registration request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-base">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {user.role}
            </Badge>
          </div>
          {user.requestedat && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Requested:{" "}
              {(() => {
                try {
                  return format(new Date(user.requestedat), "PPp");
                } catch {
                  return "Recently";
                }
              })()}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/* ───────────────────────────────────────────────────────────────────
   Add User Dialog – Admin can directly create users with any role
   ─────────────────────────────────────────────────────────────────── */
function AddUserDialog({
  isOpen,
  onOpenChange,
  onUserAdded,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: (newUser: User) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user: currentUser } = useAppContext();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Inspector" as Role,
  });
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
    setShowPassword(true);
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "", role: "Inspector" });
    setShowPassword(false);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Employee name is required." });
      return;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({ variant: "destructive", title: "Error", description: "A valid email address is required." });
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 8 characters." });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/approve-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
            name: formData.name.trim(),
            role: formData.role,
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          toast({
            variant: "destructive",
            title: "Failed to Create User",
            description: result.error || "An error occurred.",
          });
          return;
        }

        const newUser: User = {
          id: result.user?.id || "",
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          avatar: "",
        };

        toast({
          title: "User Created Successfully",
          description: `Account created for ${formData.name} (${formData.role}).`,
        });

        // Log the action
        createActivityLog({
          action: "USER_CREATED",
          entity_type: "user",
          entity_id: newUser.id,
          entity_name: newUser.name,
          details: `${newUser.name} (${newUser.email}) was created as ${newUser.role} by admin`,
          performed_by: currentUser?.name || "Admin",
          performed_by_role: "Admin",
        });

        onUserAdded(newUser);
        resetForm();
        onOpenChange(false);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Failed to Create User",
          description: error.message || "An unexpected error occurred.",
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account with a specific role. The user will be able to login immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="add-user-name" className="text-sm font-medium">Employee Name</Label>
            <Input
              id="add-user-name"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="h-10"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="add-user-email" className="text-sm font-medium">Email Address</Label>
            <Input
              id="add-user-email"
              type="email"
              placeholder="e.g. rahul@company.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="h-10"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="add-user-password" className="text-sm font-medium">Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="add-user-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <X className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs whitespace-nowrap" onClick={generatePassword}>
                Generate
              </Button>
            </div>
            {formData.password && showPassword && (
              <p className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-1.5 rounded-md font-mono select-all break-all">
                {formData.password}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <Select value={formData.role} onValueChange={(v) => setFormData((prev) => ({ ...prev, role: v as Role }))}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Inspector">Inspector</SelectItem>
                <SelectItem value="Client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/* ───────────────────────────────────────────────────────────────────
   Stats Card
   ─────────────────────────────────────────────────────────────────── */
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  iconBg,
  iconColor,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className={"absolute top-0 left-0 right-0 h-1 bg-gradient-to-r " + gradient} />
      <div className="p-3 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 truncate">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">{value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">{subtitle}</p>
          </div>
          <div
            className={
              "flex-shrink-0 ml-2 sm:ml-3 w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform " +
              iconBg
            }
          >
            <Icon className={"h-4 w-4 sm:h-5 sm:w-5 " + iconColor} />
          </div>
        </div>
      </div>
    </div>
  );
}


/* ───────────────────────────────────────────────────────────────────
   Main Admin Page
   ─────────────────────────────────────────────────────────────────── */
export function AdminClientPage() {
  const { user: currentUser } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [completedInspections, setCompletedInspections] = useState<Inspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [inspectionsLoaded, setInspectionsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPendingUser, setSelectedPendingUser] = useState<PendingUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | "">("");
  const [userSearch, setUserSearch] = useState("");
  const [inspectionSearch, setInspectionSearch] = useState("");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLogsLoaded, setActivityLogsLoaded] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const { toast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /* ── Fetchers (with client-side fallback) ── */
  const fetchUsers = async () => {
    try {
      let usersData = await getUsers();
      // Fallback: if server action returned empty, try client-side fetch
      if (usersData.length === 0) {
        const { data } = await supabase.from('users').select('*');
        if (data && data.length > 0) usersData = data as User[];
      }
      setUsers(usersData.sort((a, b) => a.name.localeCompare(b.name)));
      setUsersLoaded(true);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Last resort: try client-side
      try {
        const { data } = await supabase.from('users').select('*');
        if (data) setUsers((data as User[]).sort((a, b) => a.name.localeCompare(b.name)));
        setUsersLoaded(true);
      } catch {}
    }
  };

  const fetchPendingUsers = async () => {
    try {
      let pendingData = await getPendingUsers();
      // Fallback: if server action returned empty, try client-side fetch
      if (pendingData.length === 0) {
        const { data } = await supabase.from('pending_users').select('*');
        if (data && data.length > 0) pendingData = data as PendingUser[];
      }
      setPendingUsers(pendingData);
      setPendingLoaded(true);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      try {
        const { data } = await supabase.from('pending_users').select('*');
        if (data) setPendingUsers(data as PendingUser[]);
        setPendingLoaded(true);
      } catch {}
    }
  };

  const fetchInspections = async () => {
    try {
      let inspectionsData = await getInspections();
      // Fallback: if server action returned empty, try client-side fetch
      if (inspectionsData.length === 0) {
        const { data } = await supabase.from('inspections').select('*').order('createdat', { ascending: false });
        if (data && data.length > 0) inspectionsData = data as Inspection[];
      }
      const sorted = inspectionsData.sort((a, b) => {
        const dateA = new Date(
          (a as any).createdat || (a as any).createdAt || ""
        ).getTime();
        const dateB = new Date(
          (b as any).createdat || (b as any).createdAt || ""
        ).getTime();
        return dateB - dateA;
      });
      setCompletedInspections(sorted);
      setInspectionsLoaded(true);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      try {
        const { data } = await supabase.from('inspections').select('*').order('createdat', { ascending: false });
        if (data) setCompletedInspections(data as Inspection[]);
        setInspectionsLoaded(true);
      } catch {}
    }
  };

  const fetchActivityLogs = async () => {
    try {
      let logs = await getActivityLogs(200);
      // Fallback: if server action returned empty, try client-side fetch
      if (logs.length === 0) {
        const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200);
        if (data && data.length > 0) logs = data as ActivityLog[];
      }
      setActivityLogs(logs);
      setActivityLogsLoaded(true);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      try {
        const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200);
        if (data) setActivityLogs(data as ActivityLog[]);
        setActivityLogsLoaded(true);
      } catch {}
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Admin") {
      setLoading(false);
      return;
    }
    setLoading(false);
    Promise.all([fetchUsers(), fetchPendingUsers(), fetchInspections(), fetchActivityLogs()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Admin") return;
    switch (activeTab) {
      case "users":
        if (!usersLoaded) fetchUsers();
        break;
      case "pending":
        if (!pendingLoaded) fetchPendingUsers();
        break;
      case "inspections":
        if (!inspectionsLoaded) fetchInspections();
        break;
      case "activity-logs":
        if (!activityLogsLoaded) fetchActivityLogs();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUser, refreshTrigger]);

  /* ── Computed ── */
  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      admins: users.filter((u) => u.role === "Admin").length,
      inspectors: users.filter((u) => u.role === "Inspector").length,
      clients: users.filter((u) => u.role === "Client").length,
      pendingRequests: pendingUsers.length,
      totalInspections: completedInspections.length,
      completedInspections: completedInspections.filter(
        (i) => i.status === "Completed"
      ).length,
      pendingInspections: completedInspections.filter(
        (i) => i.status === "Pending"
      ).length,
      upcomingInspections: completedInspections.filter(
        (i) => i.status === "Upcoming"
      ).length,
      failedInspections: completedInspections.filter(
        (i) => i.status === "Failed" || i.status === "Partial"
      ).length,
    }),
    [users, pendingUsers, completedInspections]
  );

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredInspections = useMemo(() => {
    if (!inspectionSearch.trim()) return completedInspections;
    const q = inspectionSearch.toLowerCase();
    return completedInspections.filter(
      (i) =>
        i.machineName?.toLowerCase().includes(q) ||
        i.fullReportData?.reportNo?.toLowerCase().includes(q) ||
        i.fullReportData?.agencyName?.toLowerCase().includes(q) ||
        i.status?.toLowerCase().includes(q)
    );
  }, [completedInspections, inspectionSearch]);

  const filteredActivityLogs = useMemo(() => {
    if (!activitySearch.trim()) return activityLogs;
    const q = activitySearch.toLowerCase();
    return activityLogs.filter(
      (log) =>
        log.performed_by?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.entity_name?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q)
    );
  }, [activityLogs, activitySearch]);

  const roleColors: Record<Role, string> = {
    Admin: "bg-red-500/10 text-red-700 border-red-200",
    Inspector: "bg-teal-500/10 text-teal-700 border-teal-200",
    Client: "bg-slate-500/10 text-slate-700 border-slate-200",
  };

  const statusStyles: Record<string, string> = {
    Completed: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    Pending: "bg-amber-500/10 text-amber-700 border-amber-200",
    Upcoming: "bg-blue-500/10 text-blue-700 border-blue-200",
    Failed: "bg-red-500/10 text-red-700 border-red-200",
    Partial: "bg-orange-500/10 text-orange-700 border-orange-200",
  };

  /* ── Guards ── */
  if (loading) {
    return (
      <div className="space-y-6 p-3 sm:p-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "Admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Only administrators can access this panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Handlers ── */
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setIsEditDialogOpen(true);
  };
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  const handleApproveClick = (user: PendingUser) => {
    setSelectedPendingUser(user);
    setIsApproveDialogOpen(true);
  };

  const handleRejectClick = (user: PendingUser) => {
    startTransition(async () => {
      const result = await rejectUser(user.id);
      if (result.success) {
        setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
        toast({
          title: "Request Rejected",
          description:
            "Registration request for " + user.name + " has been rejected.",
        });

        // Log the rejection
        await createActivityLog({
          action: "USER_REJECTED",
          entity_type: "user",
          entity_id: user.id,
          entity_name: user.name,
          details: "Registration request for " + user.name + " (" + user.email + ") as " + user.role + " was rejected",
          performed_by: currentUser?.name || "Admin",
          performed_by_role: "Admin",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Rejection Failed",
          description: result.error,
        });
      }
    });
  };

  const handleSaveRole = () => {
    if (!selectedUser || !selectedRole) return;
    startTransition(async () => {
      if (!currentUser?.id) {
        toast({
          title: "Error",
          description: "Admin authentication required.",
          variant: "destructive",
        });
        return;
      }
      try {
        const { error } = await supabase
          .from("users")
          .update({ role: selectedRole })
          .eq("id", selectedUser.id);
        if (error) throw error;
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id
              ? { ...selectedUser, role: selectedRole as Role }
              : u
          )
        );
        toast({
          title: "Role Updated",
          description:
            selectedUser.name + "'s role changed to " + selectedRole + ".",
        });

        // Log the role change
        await createActivityLog({
          action: "USER_ROLE_CHANGED",
          entity_type: "user",
          entity_id: selectedUser.id,
          entity_name: selectedUser.name,
          details: selectedUser.name + "'s role changed from " + selectedUser.role + " to " + selectedRole,
          performed_by: currentUser?.name || "Admin",
          performed_by_role: "Admin",
        });

        setIsEditDialogOpen(false);
        setSelectedUser(null);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;
    startTransition(async () => {
      if (!currentUser?.id) {
        toast({
          title: "Error",
          description: "Admin authentication required.",
          variant: "destructive",
        });
        return;
      }
      if (selectedUser.id === currentUser.id) {
        toast({
          variant: "destructive",
          title: "Cannot Delete",
          description: "You cannot delete your own account.",
        });
        return;
      }
      try {
        const { error } = await supabase
          .from("users")
          .delete()
          .eq("id", selectedUser.id);
        if (error) throw error;
        setUsers(users.filter((u) => u.id !== selectedUser.id));
        toast({
          title: "User Deleted",
          description: selectedUser.name + "'s account has been removed.",
        });

        // Log the deletion
        await createActivityLog({
          action: "USER_DELETED",
          entity_type: "user",
          entity_id: selectedUser.id,
          entity_name: selectedUser.name,
          details: "User account for " + selectedUser.name + " (" + selectedUser.email + ") was deleted",
          performed_by: currentUser?.name || "Admin",
          performed_by_role: "Admin",
        });

        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Deletion Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    });
  };

  const onUserApproved = (newUser: User) => {
    setPendingUsers((prev) =>
      prev.filter((u) => u.id !== selectedPendingUser?.id)
    );
    setUsers((prev) => {
      const exists = prev.some(
        (u) => u.id === newUser.id || u.email === newUser.email
      );
      return exists
        ? prev.map((u) => (u.email === newUser.email ? newUser : u))
        : [...prev, newUser];
    });
    setUsersLoaded(false);
  };

  const handleViewInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setIsInspectionDialogOpen(true);
  };

  const handleRefreshAll = () => {
    setUsersLoaded(false);
    setPendingLoaded(false);
    setInspectionsLoaded(false);
    setActivityLogsLoaded(false);
    setRefreshTrigger((prev) => prev + 1);
    Promise.all([fetchUsers(), fetchPendingUsers(), fetchInspections(), fetchActivityLogs()]);
    toast({ title: "Refreshing", description: "All data is being refreshed." });
  };

  /* ── Helpers ── */
  const dot = " \u00b7 ";
  const dash = " \u2014 ";

  const inspectionStatusIcon = (status: string) => {
    if (status === "Completed")
      return (
        <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600">
          <CheckCircle className="h-4 w-4" />
        </div>
      );
    if (status === "Pending")
      return (
        <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
          <Clock className="h-4 w-4" />
        </div>
      );
    if (status === "Failed")
      return (
        <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-red-100 text-red-600">
          <AlertCircle className="h-4 w-4" />
        </div>
      );
    return (
      <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
        <Clock className="h-4 w-4" />
      </div>
    );
  };

  /* ── Render ── */
  return (
    <>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 text-white shadow-xl">
          <div className="absolute inset-0 opacity-40 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Admin Control Panel
                </h1>
                <p className="text-xs sm:text-sm text-white/60">
                  Manage users, approvals, and inspections
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshAll}
              className="rounded-lg w-full sm:w-auto"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh All
            </Button>
          </div>
        </div>

        {/* ── Overview Stats ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            subtitle={
              stats.admins +
              " Admin" +
              dot +
              stats.inspectors +
              " Inspector" +
              dot +
              stats.clients +
              " Client"
            }
            icon={Users}
            gradient="from-blue-500 to-indigo-600"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Pending Requests"
            value={stats.pendingRequests}
            subtitle={
              stats.pendingRequests > 0 ? "Awaiting approval" : "All caught up!"
            }
            icon={UserPlus}
            gradient="from-amber-400 to-orange-500"
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />
          <StatsCard
            title="Total Inspections"
            value={stats.totalInspections}
            subtitle={
              stats.completedInspections +
              " completed" +
              dot +
              stats.pendingInspections +
              " pending"
            }
            icon={ClipboardList}
            gradient="from-emerald-500 to-green-600"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <StatsCard
            title="Alerts"
            value={stats.failedInspections}
            subtitle={
              stats.failedInspections > 0
                ? "Failed or partial inspections"
                : "No issues detected"
            }
            icon={AlertCircle}
            gradient="from-rose-500 to-red-600"
            iconBg="bg-rose-100"
            iconColor="text-rose-600"
          />
        </div>

        {/* ── Tab Navigation ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full overflow-x-auto h-12 rounded-xl bg-muted/50 p-1 gap-1">
            <TabsTrigger
              value="overview"
              className="rounded-lg data-[state=active]:shadow-sm text-xs sm:text-sm font-medium flex-shrink-0"
            >
              <BarChart3 className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-lg data-[state=active]:shadow-sm text-xs sm:text-sm font-medium flex-shrink-0"
            >
              <Users className="mr-1 sm:mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="rounded-lg data-[state=active]:shadow-sm text-xs sm:text-sm font-medium relative flex-shrink-0"
            >
              <Inbox className="mr-1 sm:mr-2 h-4 w-4" />
              Pending
              {stats.pendingRequests > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-[10px] text-white font-bold flex items-center justify-center">
                  {stats.pendingRequests}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="inspections"
              className="rounded-lg data-[state=active]:shadow-sm text-xs sm:text-sm font-medium flex-shrink-0"
            >
              <FileText className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Inspections</span>
              <span className="sm:hidden">Insp.</span>
            </TabsTrigger>
            <TabsTrigger
              value="activity-logs"
              className="rounded-lg data-[state=active]:shadow-sm text-xs sm:text-sm font-medium flex-shrink-0"
            >
              <Activity className="mr-1 sm:mr-2 h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* System Activity */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    System Activity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live platform overview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      {
                        label: "Completed Inspections",
                        value: stats.completedInspections,
                        color: "bg-emerald-500",
                        total: stats.totalInspections,
                      },
                      {
                        label: "Pending Inspections",
                        value: stats.pendingInspections,
                        color: "bg-amber-500",
                        total: stats.totalInspections,
                      },
                      {
                        label: "Upcoming Inspections",
                        value: stats.upcomingInspections,
                        color: "bg-blue-500",
                        total: stats.totalInspections,
                      },
                      {
                        label: "Failed / Partial",
                        value: stats.failedInspections,
                        color: "bg-rose-500",
                        total: stats.totalInspections,
                      },
                    ].map((item) => {
                      const pct =
                        item.total > 0
                          ? Math.round((item.value / item.total) * 100)
                          : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-muted-foreground">
                              {item.label}
                            </span>
                            <span className="font-semibold">{item.value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={
                                "h-full rounded-full transition-all duration-500 " +
                                item.color
                              }
                              style={{ width: pct + "%" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* User Distribution */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    User Distribution
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Active accounts by role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(
                      [
                        {
                          role: "Admin",
                          count: stats.admins,
                          icon: ShieldCheck,
                          color: "text-red-600",
                          bg: "bg-red-50",
                        },
                        {
                          role: "Inspector",
                          count: stats.inspectors,
                          icon: UserCheck,
                          color: "text-teal-600",
                          bg: "bg-teal-50",
                        },
                        {
                          role: "Client",
                          count: stats.clients,
                          icon: Users,
                          color: "text-slate-600",
                          bg: "bg-slate-50",
                        },
                      ] as const
                    ).map((item) => (
                      <div
                        key={item.role}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className={
                            "h-10 w-10 rounded-xl flex items-center justify-center " +
                            item.bg
                          }
                        >
                          <item.icon className={"h-5 w-5 " + item.color} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.role}s</p>
                          <p className="text-xs text-muted-foreground">
                            {item.count} active account
                            {item.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-muted-foreground/60">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                  {stats.pendingRequests > 0 && (
                    <>
                      <Separator className="my-4" />
                      <Button
                        variant="outline"
                        className="w-full justify-between rounded-xl"
                        onClick={() => setActiveTab("pending")}
                      >
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          {stats.pendingRequests} pending request
                          {stats.pendingRequests !== 1 ? "s" : ""} to review
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Recent Inspections Preview */}
              <Card className="md:col-span-2 rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        Recent Inspections
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Last 5 inspection activities
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => setActiveTab("inspections")}
                    >
                      View All <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {completedInspections.length > 0 ? (
                    <div className="space-y-3">
                      {completedInspections.slice(0, 5).map((inspection) => (
                        <div
                          key={inspection.id}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => handleViewInspection(inspection)}
                        >
                          {inspectionStatusIcon(inspection.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {inspection.machineName || "Unnamed Machine"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Requested by{" "}
                              <span className="font-medium text-foreground">
                                {inspection.requestedBy || "N/A"}
                              </span>
                              {inspection.assignedTo ? (
                                <>
                                  {dot}Assigned to{" "}
                                  <span className="font-medium text-foreground">
                                    {inspection.assignedTo}
                                  </span>
                                </>
                              ) : (
                                <>
                                  {dot}
                                  <span className="text-amber-600 font-medium">
                                    Unassigned
                                  </span>
                                </>
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {inspection.dueDate
                                ? "Due: " + inspection.dueDate
                                : ""}
                              {inspection.priority
                                ? (inspection.dueDate ? dot : "") +
                                  "Priority: " +
                                  inspection.priority
                                : ""}
                              {inspection.createdAt
                                ? (inspection.dueDate || inspection.priority
                                    ? dot
                                    : "") +
                                  (() => {
                                    try {
                                      return format(
                                        new Date(inspection.createdAt),
                                        "MMM dd, yyyy"
                                      );
                                    } catch {
                                      return "";
                                    }
                                  })()
                                : ""}
                            </p>
                          </div>
                          <Badge
                            className={
                              "text-[10px] border " +
                              (statusStyles[inspection.status] || "")
                            }
                            variant="outline"
                          >
                            {inspection.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-sm">No inspections yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Users Tab ── */}
          <TabsContent value="users" className="mt-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">User Management</CardTitle>
                    <CardDescription className="text-xs">
                      {stats.totalUsers} total{dot}
                      {stats.admins} Admin{dot}
                      {stats.inspectors} Inspector{dot}
                      {stats.clients} Client
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="pl-9 h-9 w-full sm:w-56 rounded-lg text-sm"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="rounded-lg gap-1.5 text-xs"
                      onClick={() => setIsAddUserDialogOpen(true)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Add User
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        setUsersLoaded(false);
                        setRefreshTrigger((prev) => prev + 1);
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border overflow-hidden table-responsive">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">User</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="text-right font-semibold">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">
                                {user.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                "text-xs border " + roleColors[user.role]
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-lg"
                              >
                                <DropdownMenuLabel className="text-xs">
                                  Actions
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onSelect={() => handleEditClick(user)}
                                  className="text-sm"
                                >
                                  Edit Role
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleDeleteClick(user)}
                                  className="text-red-600 text-sm"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-12 text-muted-foreground text-sm"
                          >
                            {userSearch
                              ? "No users match your search."
                              : "No users found."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pending Tab ── */}
          <TabsContent value="pending" className="mt-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Pending Registrations
                      {pendingUsers.length > 0 && (
                        <Badge
                          className="bg-amber-500/10 text-amber-700 border-amber-200 text-xs"
                          variant="outline"
                        >
                          {pendingUsers.length} pending
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Approve or reject new user sign-up requests.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pendingUsers.length > 0 ? (
                  <div className="space-y-3">
                    {pendingUsers.map((pUser) => (
                      <div
                        key={pUser.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                          {pUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{pUser.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pUser.email}
                          </p>
                          {pUser.requestedat && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {(() => {
                                try {
                                  return format(
                                    new Date(pUser.requestedat),
                                    "PPp"
                                  );
                                } catch {
                                  return "Recently";
                                }
                              })()}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {pUser.role}
                        </Badge>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex-1 sm:flex-none"
                            onClick={() => handleApproveClick(pUser)}
                            disabled={isPending}
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg border-red-200 text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                            onClick={() => handleRejectClick(pUser)}
                            disabled={isPending}
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="font-medium mb-1">All caught up!</p>
                    <p className="text-xs">No pending registration requests.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Inspections Tab ── */}
          <TabsContent value="inspections" className="mt-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">All Inspections</CardTitle>
                    <CardDescription className="text-xs">
                      {stats.totalInspections} total{dot}
                      {stats.completedInspections} completed{dot}
                      {stats.pendingInspections} pending{dot}
                      {stats.failedInspections} alerts
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search inspections..."
                      className="pl-9 h-9 w-full sm:w-56 rounded-lg text-sm"
                      value={inspectionSearch}
                      onChange={(e) => setInspectionSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredInspections.length > 0 ? (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-semibold">
                            Report No
                          </TableHead>
                          <TableHead className="font-semibold">
                            Machine
                          </TableHead>
                          <TableHead className="font-semibold">
                            Agency
                          </TableHead>
                          <TableHead className="font-semibold">
                            Status
                          </TableHead>
                          <TableHead className="font-semibold">Date</TableHead>
                          <TableHead className="font-semibold">
                            Completed By
                          </TableHead>
                          <TableHead className="text-right font-semibold">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInspections.map((inspection) => (
                          <TableRow
                            key={inspection.id}
                            className="cursor-pointer hover:bg-muted/30 group"
                            onClick={() => handleViewInspection(inspection)}
                          >
                            <TableCell className="font-medium text-sm">
                              {inspection.fullReportData?.reportNo || "N/A"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {inspection.machineName}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {inspection.fullReportData?.agencyName || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  "text-[10px] border " +
                                  (statusStyles[inspection.status] || "")
                                }
                              >
                                {inspection.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {inspection.fullReportData?.inspectionDate
                                ? format(
                                    new Date(
                                      inspection.fullReportData.inspectionDate
                                    ),
                                    "MMM dd, yyyy"
                                  )
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {inspection.completedBy || "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewInspection(inspection);
                                }}
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm">
                      {inspectionSearch
                        ? "No inspections match your search."
                        : "No inspections found."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Activity Logs Tab ── */}
          <TabsContent value="activity-logs" className="mt-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-violet-600" />
                      Activity Logs
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Track every action performed on inspection calls
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search logs..."
                        className="pl-9 h-9 w-full sm:w-56 rounded-lg text-sm"
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        setActivityLogsLoaded(false);
                        fetchActivityLogs();
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredActivityLogs.length > 0 ? (
                  <div className="rounded-xl border overflow-hidden table-responsive">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-semibold">Date & Time</TableHead>
                          <TableHead className="font-semibold">Employee</TableHead>
                          <TableHead className="font-semibold">Role</TableHead>
                          <TableHead className="font-semibold">Action</TableHead>
                          <TableHead className="font-semibold">Inspection / Entity</TableHead>
                          <TableHead className="font-semibold">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActivityLogs.map((log) => {
                          const actionColors: Record<string, string> = {
                            INSPECTION_CREATED: "bg-blue-500/10 text-blue-700 border-blue-200",
                            INSPECTION_ASSIGNED: "bg-green-500/10 text-green-700 border-green-200",
                            INSPECTION_COMPLETED: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
                            INSPECTION_STATUS_UPDATED: "bg-amber-500/10 text-amber-700 border-amber-200",
                            USER_ROLE_CHANGED: "bg-purple-500/10 text-purple-700 border-purple-200",
                            USER_APPROVED: "bg-teal-500/10 text-teal-700 border-teal-200",
                            USER_REJECTED: "bg-red-500/10 text-red-700 border-red-200",
                          };
                          const actionColor = actionColors[log.action] || "bg-gray-500/10 text-gray-700 border-gray-200";
                          const actionLabel = log.action
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase());

                          return (
                            <TableRow key={log.id} className="group">
                              <TableCell className="text-sm whitespace-nowrap">
                                {(() => {
                                  try {
                                    return format(new Date(log.timestamp), "MMM dd, yyyy HH:mm");
                                  } catch {
                                    return "N/A";
                                  }
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-200 to-violet-300 flex items-center justify-center text-[10px] font-bold text-violet-700">
                                    {log.performed_by?.charAt(0)?.toUpperCase() || "?"}
                                  </div>
                                  <span className="text-sm font-medium">{log.performed_by || "Unknown"}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {log.performed_by_role || "N/A"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={"text-[10px] border " + actionColor}>
                                  {actionLabel}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {log.entity_name || "N/A"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                {log.details || "N/A"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Activity className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm">
                      {activitySearch
                        ? "No logs match your search."
                        : "No activity logs found yet."}
                    </p>
                    <p className="text-xs mt-1">
                      Logs will appear when inspections are created, assigned, or completed.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         Dialogs
         ══════════════════════════════════════════════════════════════ */}

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Edit User Role
            </DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl mb-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-bold text-slate-600">
                {selectedUser?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{selectedUser?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedUser?.email}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                New Role
              </Label>
              <Select
                onValueChange={(v) => setSelectedRole(v as Role)}
                defaultValue={selectedRole || undefined}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Inspector">Inspector</SelectItem>
                  <SelectItem value="Client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">{selectedUser?.name}</span>
              &apos;s account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 rounded-lg"
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Dialog */}
      {selectedPendingUser && (
        <ApproveUserDialog
          user={selectedPendingUser}
          isOpen={isApproveDialogOpen}
          onOpenChange={setIsApproveDialogOpen}
          onApproved={onUserApproved}
          setPendingUsers={setPendingUsers}
        />
      )}

      {/* Inspection Details Dialog */}
      <Dialog
        open={isInspectionDialogOpen}
        onOpenChange={setIsInspectionDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Inspection Details
            </DialogTitle>
            <DialogDescription>
              {selectedInspection?.machineName}
              {dash}
              {selectedInspection?.fullReportData?.reportNo || "N/A"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedInspection && selectedInspection.fullReportData && (
              <div className="space-y-5">
                {/* Basic Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Report No",
                      value: selectedInspection.fullReportData.reportNo,
                    },
                    {
                      label: "Inspection Date",
                      value: selectedInspection.fullReportData.inspectionDate
                        ? format(
                            new Date(
                              selectedInspection.fullReportData.inspectionDate
                            ),
                            "PPP"
                          )
                        : "N/A",
                    },
                    {
                      label: "Agency",
                      value: selectedInspection.fullReportData.agencyName,
                    },
                    {
                      label: "Area",
                      value: selectedInspection.fullReportData.areaDetails,
                    },
                    {
                      label: "Unit No",
                      value: selectedInspection.fullReportData.unitNo,
                    },
                    {
                      label: "Machine SL No",
                      value: selectedInspection.fullReportData.machineSlNo,
                    },
                    {
                      label: "Check Type",
                      value: selectedInspection.fullReportData.checkType,
                    },
                    { label: "Status", value: selectedInspection.status },
                    {
                      label: "Completed By",
                      value: selectedInspection.completedBy || "N/A",
                    },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-xl bg-muted/30">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium">
                        {item.value || "N/A"}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Equipment Details */}
                {selectedInspection.fullReportData.equipmentDetails && (
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Equipment Details
                    </p>
                    <p className="text-sm">
                      {selectedInspection.fullReportData.equipmentDetails}
                    </p>
                  </div>
                )}

                {/* Equipment Names */}
                {selectedInspection.fullReportData.equipmentName?.length >
                  0 && (
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Equipment Types
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedInspection.fullReportData.equipmentName.map(
                        (eq: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="rounded-lg text-xs"
                          >
                            {eq}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Completion Info */}
                {(selectedInspection.completedBy ||
                  selectedInspection.completedAt ||
                  selectedInspection.requestedBy) && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: "Requested By",
                        value: selectedInspection.requestedBy,
                      },
                      {
                        label: "Assigned To",
                        value: selectedInspection.assignedTo,
                      },
                      {
                        label: "Completed By",
                        value: selectedInspection.completedBy,
                      },
                      {
                        label: "Completed At",
                        value: selectedInspection.completedAt
                          ? format(
                              new Date(selectedInspection.completedAt),
                              "PPP p"
                            )
                          : undefined,
                      },
                    ]
                      .filter((i) => i.value)
                      .map((item) => (
                        <div
                          key={item.label}
                          className="p-3 rounded-xl bg-muted/30"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                            {item.label}
                          </p>
                          <p className="text-sm font-medium">{item.value}</p>
                        </div>
                      ))}
                  </div>
                )}

                {/* Remarks */}
                {selectedInspection.fullReportData.otherRemarks && (
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Other Remarks
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedInspection.fullReportData.otherRemarks}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInspectionDialogOpen(false)}
              className="rounded-lg"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        onUserAdded={(newUser) => {
          setUsers((prev) => [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name)));
        }}
      />
    </>
  );
}
