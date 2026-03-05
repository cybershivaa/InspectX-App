
"use client";

import React, { useState, useTransition, useRef } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppContext } from "@/hooks/useAppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Camera, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/app/actions/users';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
// All Firebase logic replaced with Supabase equivalents below


const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  avatar: z.string().optional(),
});

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters long."),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

function ChangePasswordForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { logout } = useAppContext();
    const [isPending, startTransition] = useTransition();
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const form = useForm<PasswordFormValues>({
      resolver: zodResolver(passwordFormSchema),
      defaultValues: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }
    });

    const onSubmit = (values: PasswordFormValues) => {
      startTransition(async () => {
        // Supabase password update logic
        const { error } = await supabase.auth.updateUser({ password: values.newPassword });
        if (error) {
          toast({
            variant: "destructive",
            title: "Password Change Failed",
            description: error.message || "An error occurred while changing your password.",
          });
        } else {
          toast({
            title: "Password Changed Successfully",
            description: "Please log in with your new password.",
          });
          await supabase.auth.signOut();
          window.location.href = '/login';
        }
      });
    }

    return (
         <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Update your password here. For security, you will be logged out after a successful password change.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Password</FormLabel>
                                     <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showCurrentPassword ? "text" : "password"}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowCurrentPassword(prev => !prev)}
                                            >
                                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                     <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showNewPassword ? "text" : "password"}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowNewPassword(prev => !prev)}
                                            >
                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm New Password</FormLabel>
                                     <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowConfirmPassword(prev => !prev)}
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isPending}>
                             {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Change Password
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    )
}

export default function ProfilePage() {
  const { user, updateUser } = useAppContext();
  const [profilePending, startProfileTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      avatar: user?.avatar || "",
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        avatar: user.avatar,
      });
    }
  }, [user, form]);


  if (!user) {
    return (
       <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-12">Please log in to view your profile.</p>
        </CardContent>
      </Card>
    );
  }
  

     // Supabase Storage: Avatar upload
     const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
         const file = event.target.files?.[0];
         if (!file || !user) return;
         setIsUploading(true);
         try {
             // Upload to Supabase Storage bucket 'avatars' with user id as filename
             const fileExt = file.name.split('.').pop();
             const filePath = `${user.id}.${fileExt}`;
             const { data, error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true, contentType: file.type });
             if (error) throw error;
             // Get public URL
             const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
             const publicUrl = publicUrlData?.publicUrl;
             if (!publicUrl) throw new Error('Failed to get public URL for avatar.');
             form.setValue('avatar', publicUrl);
             startProfileTransition(async () => {
                 const result = await updateUserProfile(user.id, form.getValues('name'), publicUrl);
                 if (result.success && result.data) {
                     updateUser(result.data);
                     toast({
                         title: "Avatar Updated",
                         description: "Your new profile photo has been saved.",
                     });
                 } else {
                     toast({ variant: "destructive", title: "Update Failed", description: result.error, });
                 }
             });
         } catch (error) {
             toast({
                 variant: "destructive",
                 title: "Upload Failed",
                 description: error instanceof Error ? error.message : 'There was an error uploading your photo.',
             });
         } finally {
             setIsUploading(false);
         }
     };


  const onSubmit = (values: ProfileFormValues) => {
    startProfileTransition(async () => {
      const result = await updateUserProfile(user.id, values.name, values.avatar);
      if (result.success && result.data) {
        updateUser(result.data);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: result.error,
        });
      }
    });
  };

  const avatarValue = form.watch('avatar');
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Card */}
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your profile information below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

              {/* Avatar section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-28 w-28 ring-4 ring-primary/20 shadow-lg">
                    <AvatarImage src={avatarValue || user.avatar} alt={user.name} className="object-cover" />
                    <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isUploading
                      ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                      : <Camera className="h-6 w-6 text-white" />
                    }
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xl font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Badge
                    style={{
                      backgroundColor:
                        user.role === 'Admin' ? '#e62e00' :
                        user.role === 'Inspector' ? '#1d7a8a' : '#6b7280',
                    }}
                    className="text-white px-3 py-0.5"
                  >
                    {user.role}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Click on the photo to change it</p>
              </div>

              <div className="border-t pt-6 space-y-5">
                {/* Name field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email — read-only */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email Address</label>
                  <Input
                    value={user.email}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed. Contact an admin if needed.</p>
                </div>

                {/* Role — read-only */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Role</label>
                  <Input
                    value={user.role}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Your role is managed by the admin.</p>
                </div>

                {/* User ID — read-only */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">User ID</label>
                  <Input
                    value={user.id}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed font-mono text-xs"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button type="submit" disabled={profilePending || isUploading} className="w-full sm:w-auto">
                {(profilePending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Change Password Card */}
      <ChangePasswordForm />
    </div>
  );
}