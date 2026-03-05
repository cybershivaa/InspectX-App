
"use client";

import React, { useState, useTransition, useEffect } from "react";
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
import { MoreHorizontal, Loader2, UserPlus, Check, X, FileSearch, Eye } from "lucide-react";
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
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateUserRole, deleteUser, rejectUser, getPendingUsers } from "@/app/actions/users";
import { getUsers, getInspections } from "@/app/actions/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";


function ApproveUserDialog({ user, isOpen, onOpenChange, onApproved, setPendingUsers }: { user: PendingUser, isOpen: boolean, onOpenChange: (open: boolean) => void, onApproved: (newUser: User) => void, setPendingUsers: React.Dispatch<React.SetStateAction<PendingUser[]>> }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleApprove = () => {
      if (!user.password || user.password.length < 8) {
        toast({ variant: 'destructive', title: 'Invalid Request', description: 'Pending user does not have a valid password.' });
        return;
      }

      startTransition(async () => {
        try {
          // All operations (create auth user, insert users table, delete pending_users)
          // are handled server-side via the API route using the service role key.
          const response = await fetch('/api/approve-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              password: user.password,
              name: user.name,
              role: user.role,
              pendingUserId: user.id,
            })
          });
          const result = await response.json();
          if (!response.ok) {
            toast({
              variant: 'destructive',
              title: 'Approval Failed',
              description: result.error || 'An error occurred while approving the user.',
            });
            return;
          }

          const newUser: User = {
            id: result.user?.id || '',
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: ''
          };

          toast({
            title: 'User Approved Successfully',
            description: `Account created for ${user.email}. The user can now login with their credentials.`,
            duration: 5000,
          });
          onApproved(newUser);
          setPendingUsers(prev => prev.filter(u => u.id !== user.id));
          onOpenChange(false);
        } catch (error: any) {
          console.error('Error approving user:', error);
          toast({
            variant: 'destructive',
            title: 'Approval Failed',
            description: error.message || 'An unexpected error occurred.'
          });
        }
      });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Approve User: {user.name}</DialogTitle>
                    <DialogDescription>
                        Approve this user registration request. The user will be able to login with the credentials they provided during signup.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <p><span className="font-semibold">Name:</span> {user.name}</p>
                    <p><span className="font-semibold">Email:</span> {user.email}</p>
                    <p><span className="font-semibold">Requested Role:</span> <Badge>{user.role}</Badge></p>
                    {user.requestedat && (
                      <p className="text-sm text-muted-foreground">
                        Requested on: {(() => {
                          try {
                            return format(new Date(user.requestedat), 'PPp');
                          } catch {
                            return 'Recently';
                          }
                        })()}
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleApprove} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Approve User
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function AdminClientPage() {
  const { user: currentUser } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [completedInspections, setCompletedInspections] = useState<Inspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
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
  const { toast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Fetch users via server action (uses service role key — bypasses RLS, sees all rows)
  const fetchUsers = async () => {
    if (usersLoaded) return;
    try {
      const usersData = await getUsers();
      const sortedUsers = usersData.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(sortedUsers);
      setUsersLoaded(true);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch pending users via server action (uses service role key)
  const fetchPendingUsers = async () => {
    if (pendingLoaded) return;
    try {
      const pendingData = await getPendingUsers();
      setPendingUsers(pendingData);
      setPendingLoaded(true);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    }
  };

  // Fetch inspections via server action (uses service role key)
  const fetchInspections = async () => {
    if (inspectionsLoaded) return;
    try {
      const inspectionsData = await getInspections();
      const sortedInspections = inspectionsData.sort((a, b) => {
        const dateA = new Date((a as any).createdat || (a as any).createdAt || '').getTime();
        const dateB = new Date((b as any).createdat || (b as any).createdAt || '').getTime();
        return dateB - dateA;
      });
      setCompletedInspections(sortedInspections);
      setInspectionsLoaded(true);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    }
  };

  // Initial check - just verify admin status
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Admin') {
      setLoading(false);
      return;
    }
    setLoading(false);
    // Load initial tab data
    fetchUsers();
  }, [currentUser]);

  // Load data when tab changes
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    
    switch(activeTab) {
      case 'users':
        fetchUsers();
        break;
      case 'pending':
        fetchPendingUsers();
        break;
      case 'inspections':
        fetchInspections();
        break;
    }
  }, [activeTab, currentUser, refreshTrigger]);

  const roleColors: Record<Role, string> = {
    Admin: "#e62e00",
    Inspector: "#669999",
    Client: "#b3b3b3",
  };
  
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-12">
            Only administrators can access this page.
          </p>
        </CardContent>
      </Card>
    );
  }

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
            setPendingUsers(prev => prev.filter(u => u.id !== user.id));
            toast({ title: "Request Rejected", description: `The registration request for ${user.name} has been rejected.`});
        } else {
            toast({ variant: 'destructive', title: 'Rejection Failed', description: result.error });
        }
    });
  };

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
  }

  const handleSaveRole = () => {
    if (!selectedUser || !selectedRole) return;

    startTransition(async () => {
      if (!currentUser?.id) {
        toast({ title: "Error", description: "Admin authentication required.", variant: "destructive" });
        return;
      }
      try {
        // Update role in Supabase
        const { error } = await supabase.from('users').update({ role: selectedRole }).eq('id', selectedUser.id);
        if (error) throw error;
        // Update local state
        const updatedUser = { ...selectedUser, role: selectedRole };
        setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
        toast({ title: "User Updated", description: "User role has been successfully changed." });
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      } catch (error: any) {
        console.error("Failed to update user role:", error);
        toast({ 
          variant: "destructive", 
          title: "Update Failed", 
          description: error.message || "An unexpected error occurred." 
        });
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;
    
    startTransition(async () => {
      if (!currentUser?.id) {
        toast({ title: "Error", description: "Admin authentication required.", variant: "destructive" });
        return;
      }
      // Prevent admin from deleting themselves
      if (selectedUser.id === currentUser.id) {
        toast({ 
          variant: "destructive", 
          title: "Deletion Failed", 
          description: "You cannot delete your own account." 
        });
        return;
      }
      try {
        // Delete from Supabase users table
        const { error } = await supabase.from('users').delete().eq('id', selectedUser.id);
        if (error) throw error;
        // Optionally: delete from Supabase Auth via admin API (requires backend function)
        // Update local state
        setUsers(users.filter(u => u.id !== selectedUser.id));
        toast({ 
          title: "User Deleted", 
          description: "User has been deleted." 
        });
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
      } catch (error: any) {
        console.error("Failed to delete user:", error);
        toast({ 
          variant: "destructive", 
          title: "Deletion Failed", 
          description: error.message || "An unexpected error occurred." 
        });
      }
    });
  }

  const onUserApproved = (newUser: User) => {
      if (selectedPendingUser) {
        setPendingUsers(prev => prev.filter(u => u.id !== selectedPendingUser.id));
      }
      // Add to users list immediately and reset loaded flag so tab re-fetches fresh data
      setUsers(prev => {
        const exists = prev.some(u => u.id === newUser.id || u.email === newUser.email);
        return exists ? prev.map(u => u.email === newUser.email ? newUser : u) : [...prev, newUser];
      });
      setUsersLoaded(false); // force re-fetch when User Management tab is visited
  }
  
  const handleViewInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setIsInspectionDialogOpen(true);
  };

  return (
    <>
    <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="pending">
                Pending Requests <Badge className="ml-2">{pendingUsers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inspections">
                Completed Inspections <Badge className="ml-2">{completedInspections.length}</Badge>
            </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
             <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>View and manage all active user accounts.</CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                                setUsersLoaded(false);
                                setRefreshTrigger(prev => prev + 1);
                            }}
                        >
                            Refresh Users
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 text-sm text-muted-foreground">
                        Total Users: <span className="font-semibold">{users.length}</span> (Admins: {users.filter(u => u.role === 'Admin').length}, Inspectors: {users.filter(u => u.role === 'Inspector').length}, Clients: {users.filter(u => u.role === 'Client').length})
                    </div>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                            <Badge 
                                style={{ 
                                backgroundColor: roleColors[user.role],
                                color: 'white',
                                }}
                                className="border-transparent"
                            >
                                {user.role}
                            </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleEditClick(user)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDeleteClick(user)} className="text-red-600">Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="pending">
             <Card>
                <CardHeader>
                    <CardTitle>Pending Registration Requests</CardTitle>
                    <CardDescription>Approve or reject new users who have signed up.</CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingUsers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Requested Role</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingUsers.map((pUser) => (
                                    <TableRow key={pUser.id}>
                                        <TableCell className="font-medium">{pUser.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{pUser.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{pUser.role}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleApproveClick(pUser)} disabled={isPending}>
                                                <Check className="mr-2 h-4 w-4"/> Approve
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleRejectClick(pUser)} disabled={isPending}>
                                                <X className="mr-2 h-4 w-4"/> Reject
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-12">No pending registration requests.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="inspections">
            <Card>
                <CardHeader>
                    <CardTitle>All Inspections</CardTitle>
                    <CardDescription>View details of all inspection reports across all statuses.</CardDescription>
                </CardHeader>
                <CardContent>
                    {completedInspections.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Report No</TableHead>
                                    <TableHead>Machine</TableHead>
                                    <TableHead>Agency</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Inspection Date</TableHead>
                                    <TableHead>Completed By</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {completedInspections.map((inspection) => (
                                    <TableRow key={inspection.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewInspection(inspection)}>
                                        <TableCell className="font-medium">{inspection.fullReportData?.reportNo || 'N/A'}</TableCell>
                                        <TableCell>{inspection.machineName}</TableCell>
                                        <TableCell className="text-muted-foreground">{inspection.fullReportData?.agencyName || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                inspection.status === 'Completed' ? 'default' : 
                                                inspection.status === 'Pending' ? 'secondary' :
                                                inspection.status === 'Failed' ? 'destructive' :
                                                'outline'
                                            }>
                                                {inspection.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{inspection.fullReportData?.inspectionDate ? format(new Date(inspection.fullReportData.inspectionDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                                        <TableCell>{inspection.completedBy || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewInspection(inspection); }}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-12">No inspections found.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
    </Tabs>
      
      
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.name}. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select onValueChange={handleRoleChange} defaultValue={selectedRole}>
                <SelectTrigger className="col-span-3">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for <span className="font-medium">{selectedUser?.name}</span> and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
               {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Inspection Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedInspection?.machineName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedInspection && selectedInspection.fullReportData && (
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Report No</Label>
                      <p className="font-medium">{selectedInspection.fullReportData.reportNo || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Inspection Date</Label>
                      <p className="font-medium">
                        {selectedInspection.fullReportData.inspectionDate 
                          ? format(new Date(selectedInspection.fullReportData.inspectionDate), 'PPP') 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Agency Name</Label>
                      <p className="font-medium">{selectedInspection.fullReportData.agencyName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Area Details</Label>
                      <p className="font-medium">{selectedInspection.fullReportData.areaDetails || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Unit No</Label>
                      <p className="font-medium">{selectedInspection.fullReportData.unitNo || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Machine SL No</Label>
                      <p className="font-medium">{selectedInspection.fullReportData.machineSlNo || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Equipment Details</Label>
                      <p className="font-medium">{selectedInspection.fullReportData.equipmentDetails || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Check Type</Label>
                      <Badge variant="secondary">{selectedInspection.fullReportData.checkType || 'N/A'}</Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge>{selectedInspection.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Equipment Names */}
                {selectedInspection.fullReportData.equipmentName && selectedInspection.fullReportData.equipmentName.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Equipment Names</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedInspection.fullReportData.equipmentName.map((eq: string, idx: number) => (
                          <Badge key={idx} variant="outline">{eq}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Completion Info */}
                {(selectedInspection.completedBy || selectedInspection.completedAt) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Completion Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      {selectedInspection.completedBy && (
                        <div>
                          <Label className="text-muted-foreground">Completed By</Label>
                          <p className="font-medium">{selectedInspection.completedBy}</p>
                        </div>
                      )}
                      {selectedInspection.completedAt && (
                        <div>
                          <Label className="text-muted-foreground">Completed At</Label>
                          <p className="font-medium">
                            {format(new Date(selectedInspection.completedAt), 'PPP p')}
                          </p>
                        </div>
                      )}
                      {selectedInspection.assignedTo && (
                        <div>
                          <Label className="text-muted-foreground">Assigned To</Label>
                          <p className="font-medium">{selectedInspection.assignedTo}</p>
                        </div>
                      )}
                      {selectedInspection.requestedBy && (
                        <div>
                          <Label className="text-muted-foreground">Requested By</Label>
                          <p className="font-medium">{selectedInspection.requestedBy}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Other Remarks */}
                {selectedInspection.fullReportData.otherRemarks && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Other Remarks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedInspection.fullReportData.otherRemarks}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInspectionDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    