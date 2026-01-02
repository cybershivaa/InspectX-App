
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
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from 'next/navigation';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';


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
            const user = auth.currentUser;
            if (!user || !user.email) {
                 toast({ variant: "destructive", title: "Authentication Error", description: "Could not find logged in user." });
                 return;
            }

            const credential = EmailAuthProvider.credential(user.email, values.currentPassword);

            try {
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, values.newPassword);
                toast({
                    title: "Password Changed Successfully",
                    description: "Please log in with your new password.",
                });
                await logout();
                router.push('/login');

            } catch (error: any) {
                let description = "An unexpected error occurred.";
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    description = "The current password you entered is incorrect.";
                }
                 toast({
                    variant: "destructive",
                    title: "Password Change Failed",
                    description,
                });
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
  
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && user) {
      setIsUploading(true);
      try {
        const storageRef = ref(storage, `avatars/${user.id}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        form.setValue('avatar', downloadURL);

        startProfileTransition(async () => {
          const result = await updateUserProfile(user.id, form.getValues('name'), downloadURL);
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
          description: "There was an error uploading your photo.",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };


  const onSubmit = (values: ProfileFormValues) => {
    startProfileTransition(async () => {
      const result = await updateUserProfile(user.id, values.name, values.avatar);
      if (result.success && result.data) {
        updateUser(result.data);
        toast({
          title: "Profile Updated",
          description: "Your changes have been saved successfully.",
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

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0]?.[0]?.toUpperCase() || '';
  }

  const isPending = profilePending || isUploading;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>View and manage your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                 <Avatar className="h-24 w-24">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-3xl">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4"/>}
                    {isUploading ? 'Uploading...' : 'Change Photo'}
                  </Button>
                  <Input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isUploading}
                  />
                  <div className="space-y-1 text-center">
                      <h2 className="text-2xl font-bold">{user.name}</h2>
                      <p className="text-muted-foreground">{user.email}</p>
                      <Badge>{user.role}</Badge>
                  </div>
              </div>
               <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <Input defaultValue={user.email} disabled />
              </FormItem>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <ChangePasswordForm />
    </div>
  );
}
