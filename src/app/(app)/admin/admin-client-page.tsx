
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
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
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
import { updateUserRole, deleteUser, rejectUser } from "@/app/actions/users";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";


function ApproveUserDialog({ user, isOpen, onOpenChange, onApproved }: { user: PendingUser, isOpen: boolean, onOpenChange: (open: boolean) => void, onApproved: (newUser: User) => void }) {
    const [password, setPassword] = useState('');
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleApprove = () => {
        if (password.length < 8) {
            toast({ variant: 'destructive', title: 'Invalid Password', description: 'Password must be at least 8 characters long.'});
            return;
        }

        startTransition(async () => {
            try {
                // Create Firebase Auth user
                const userCredential = await createUserWithEmailAndPassword(auth, user.email, password);
                const newUserId = userCredential.user.uid;
                
                // Create Firestore user document
                const newUser: User = {
                    id: newUserId,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: '',
                };
                
                await setDoc(doc(db, 'users', newUserId), newUser);
                
                // Delete pending request
                await deleteDoc(doc(db, 'pendingUsers', user.id));
                
                toast({ 
                    title: 'User Approved Successfully', 
                    description: `Account created for ${user.email}. Password: ${password}`,
                    duration: 10000,
                });
                
                onApproved(newUser);
                onOpenChange(false);
                setPassword('');
            } catch (error: any) {
                console.error('Error approving user:', error);
                toast({ 
                    variant: 'destructive', 
                    title: 'Approval Failed', 
                    description: error.message || 'An error occurred while approving the user.' 
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
                        Set an initial password for this user. The credentials will be shown to you after approval to share with the user securely.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <p><span className="font-semibold">Email:</span> {user.email}</p>
                    <p><span className="font-semibold">Requested Role:</span> <Badge>{user.role}</Badge></p>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password">
                            Initial Password
                        </Label>
                        <Input
                            id="password"
                            type="text"
                            className="col-span-3"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Set temporary password (min 8 characters)"
                        />
                    </div>
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
  const [isPending, startTransition] = useTransition();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPendingUser, setSelectedPendingUser] = useState<PendingUser | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | "">("");
  const { toast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || currentUser.role !== 'Admin') {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        // Sort users by name
        usersData.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(usersData);
        
        // Fetch pending users
        const pendingSnapshot = await getDocs(collection(db, "pendingUsers"));
        const pendingData = pendingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PendingUser[];
        setPendingUsers(pendingData);
        
        // Fetch completed inspections
        const inspectionsQuery = query(
          collection(db, "inspections"),
          where("status", "==", "Completed")
        );
        const inspectionsSnapshot = await getDocs(inspectionsQuery);
        const inspectionsData = inspectionsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Inspection[];
        
        // Sort by createdAt in JavaScript instead of Firestore
        inspectionsData.sort((a, b) => {
          const dateA = new Date(a.createdAt || '').getTime();
          const dateB = new Date(b.createdAt || '').getTime();
          return dateB - dateA; // desc order
        });
        
        setCompletedInspections(inspectionsData);
      } catch (error) {
        console.error("Error fetching admin data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch users data.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, toast, refreshTrigger]);

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
      const result = await updateUserRole(selectedUser.id, selectedRole);
      if (result.success && result.data) {
        setUsers(users.map(u => u.id === selectedUser.id ? result.data! : u));
        toast({ title: "User Updated", description: "User role has been successfully changed." });
      } else {
        toast({ variant: "destructive", title: "Update Failed", description: result.error });
      }
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;
    
    startTransition(async () => {
      const result = await deleteUser(selectedUser.id);
      if (result.success) {
        setUsers(users.filter(u => u.id !== selectedUser.id));
        toast({ title: "User Deleted", description: "User has been successfully deleted." });
      } else {
        toast({ variant: "destructive", title: "Deletion Failed", description: result.error });
      }
       setIsDeleteDialogOpen(false);
       setSelectedUser(null);
    })
  }

  const onUserApproved = (newUser: User) => {
      if (selectedPendingUser) {
        setPendingUsers(prev => prev.filter(u => u.id !== selectedPendingUser.id));
      }
      setUsers(prev => [...prev, newUser]);
  }
  
  const handleViewInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setIsInspectionDialogOpen(true);
  };

  return (
    <>
    <Tabs defaultValue="users">
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
                                setLoading(true);
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
                    <CardTitle>Completed Inspections</CardTitle>
                    <CardDescription>View details of all completed inspection reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    {completedInspections.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Report No</TableHead>
                                    <TableHead>Machine</TableHead>
                                    <TableHead>Agency</TableHead>
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
                        <p className="text-center text-muted-foreground py-12">No completed inspections found.</p>
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

    