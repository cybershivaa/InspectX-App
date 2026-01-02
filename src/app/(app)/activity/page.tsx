"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PlusCircle, FileText, Trash2, Download, Loader2, Edit2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface Activity {
  id: string;
  type: 'note' | 'pdf';
  title: string;
  content?: string;
  pdfUrl?: string;
  pdfName?: string;
  createdBy: string;
  createdAt: string;
}

export default function ActivityPage() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<'note' | 'pdf'>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, "activities"),
        where("createdBy", "==", user.name)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      
      // Sort by createdAt in JavaScript instead of Firestore
      const sortedData = data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setActivities(sortedData);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load activities.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async () => {
    if (!user) return;
    
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a title.",
      });
      return;
    }

    if (activityType === 'note' && !content.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter note content.",
      });
      return;
    }

    if (activityType === 'pdf' && !pdfFile && !isEditMode) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a PDF file.",
      });
      return;
    }

    setUploading(true);

    try {
      let pdfUrl = '';
      let pdfName = '';

      if (activityType === 'pdf' && pdfFile) {
        const storageRef = ref(storage, `activities/${user.id}/${Date.now()}_${pdfFile.name}`);
        await uploadBytes(storageRef, pdfFile);
        pdfUrl = await getDownloadURL(storageRef);
        pdfName = pdfFile.name;
      }

      if (isEditMode && editingId) {
        // Update existing activity
        const updateData: any = {
          title: title.trim(),
        };
        
        if (activityType === 'note') {
          updateData.content = content.trim();
        }
        
        if (pdfUrl && pdfName) {
          updateData.pdfUrl = pdfUrl;
          updateData.pdfName = pdfName;
        }

        await updateDoc(doc(db, "activities", editingId), updateData);

        toast({
          title: "Success",
          description: `${activityType === 'note' ? 'Note' : 'PDF'} updated successfully.`,
        });
      } else {
        // Create new activity
        const activityData = {
          type: activityType,
          title: title.trim(),
          ...(activityType === 'note' ? { content: content.trim() } : {}),
          ...(activityType === 'pdf' ? { pdfUrl, pdfName } : {}),
          createdBy: user.name,
          createdAt: new Date().toISOString(),
        };

        await addDoc(collection(db, "activities"), activityData);

        toast({
          title: "Success",
          description: `${activityType === 'note' ? 'Note' : 'PDF'} added successfully.`,
        });
      }

      // Reset form
      setTitle('');
      setContent('');
      setPdfFile(null);
      setIsDialogOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      fetchActivities();
    } catch (error) {
      console.error("Error saving activity:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} activity.`,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (activity: Activity) => {
    setIsEditMode(true);
    setEditingId(activity.id);
    setActivityType(activity.type);
    setTitle(activity.title);
    if (activity.type === 'note') {
      setContent(activity.content || '');
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteDoc(doc(db, "activities", deleteId));
      toast({
        title: "Success",
        description: "Activity deleted successfully.",
      });
      setActivities(prev => prev.filter(a => a.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete activity.",
      });
    }
  };

  if (!user || user.role !== 'Client') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only clients can access the Activity page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity</h1>
          <p className="text-muted-foreground mt-1">Manage your notes and documents</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No activities yet</p>
            <p className="text-sm text-muted-foreground mb-4">Start by adding a note or uploading a PDF</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Activity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{activity.title}</CardTitle>
                      <Badge variant={activity.type === 'note' ? 'secondary' : 'default'}>
                        {activity.type === 'note' ? 'Note' : 'PDF'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Created: {format(new Date(activity.createdAt), 'PPp')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(activity)}
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(activity.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activity.type === 'note' ? (
                  <p className="text-sm whitespace-pre-wrap">{activity.content}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">{activity.pdfName}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={activity.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-3 w-3" />
                        Download
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Activity Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setIsEditMode(false);
          setEditingId(null);
          setTitle('');
          setContent('');
          setPdfFile(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update your note or document' : 'Create a note or upload a PDF document'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!isEditMode && (
              <div className="flex gap-4">
                <Button
                  variant={activityType === 'note' ? 'default' : 'outline'}
                  onClick={() => setActivityType('note')}
                  className="flex-1"
                >
                  Note
                </Button>
                <Button
                  variant={activityType === 'pdf' ? 'default' : 'outline'}
                  onClick={() => setActivityType('pdf')}
                  className="flex-1"
                >
                  PDF Document
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title"
              />
            </div>

            {activityType === 'note' ? (
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your note..."
                  rows={8}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="pdf">PDF File {!isEditMode && '*'}</Label>
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
                {pdfFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {pdfFile.name}
                  </p>
                )}
                {isEditMode && !pdfFile && (
                  <p className="text-sm text-muted-foreground">
                    Keep existing PDF or upload a new one
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setIsEditMode(false);
                setEditingId(null);
                setTitle('');
                setContent('');
                setPdfFile(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleAddActivity} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Uploading...'}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Update Activity
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Activity
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this activity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
