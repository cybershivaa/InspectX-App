
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from '@/hooks/useAppContext';
import { Loader2, Eye, EyeOff, Check } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { db, auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const signupSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(1, "Please confirm your password."),
  role: z.enum(["Inspector", "Client"], { required_error: "You must select a role." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

function LoginForm() {
    const router = useRouter();
    const { login } = useAppContext();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = (values: LoginValues) => {
        startTransition(async () => {
           try {
                const loggedInUser = await login(values.email, values.password);
                if (loggedInUser) {
                    toast({ title: "Login Successful", description: `Welcome back, ${loggedInUser.name}!` });
                    router.push('/dashboard');
                } else {
                     toast({ variant: "destructive", title: "Login Failed", description: "Invalid email or password." });
                }
            } catch (error: any) {
                console.error(error);
                let description = "An unexpected error occurred.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    description = "Invalid email or password.";
                } else if (error.message === 'User not found') {
                    description = "No account found with that email address.";
                }
                toast({ variant: "destructive", title: "Login Failed", description });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter the Email ID" {...field} className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                             <FormControl>
                                <div className="relative">
                                    <Input 
                                      type={showPassword ? 'text' : 'password'} 
                                      placeholder="Enter Password" 
                                      {...field}
                                      className="bg-muted"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(prev => !prev)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                                    </Button>
                                </div>
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="text-right text-sm">
                  <Link href="/forgot-password" className="font-medium text-primary hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                </Button>
            </form>
        </Form>
    );
}


function SignupForm() {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [signupSuccess, setSignupSuccess] = useState(false);

    const form = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: { name: "", email: "", password: "", confirmPassword: "", role: "Client" },
    });
    
    const onSubmit = (values: SignupValues) => {
        startTransition(async () => {
            try {
                // Create Firebase Auth account
                const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
                const firebaseUser = userCredential.user;

                // Create Firestore user document
                const newUser = {
                    id: firebaseUser.uid,
                    name: values.name,
                    email: values.email,
                    role: values.role,
                    avatar: ''
                };

                await setDoc(doc(db, 'users', firebaseUser.uid), newUser);

                setSignupSuccess(true);
                toast({ title: "Account Created", description: "Your account has been created successfully. You can now login." });
            } catch (error: any) {
                console.error("Signup failed:", error);
                let description = "An unexpected error occurred during signup.";
                if (error.code === 'auth/email-already-in-use') {
                    description = "This email is already registered. Please login instead.";
                } else if (error.code === 'auth/weak-password') {
                    description = "Password is too weak. Please use a stronger password.";
                } else if (error.code === 'auth/invalid-email') {
                    description = "Invalid email address.";
                }
                toast({ variant: "destructive", title: "Signup Failed", description });
            }
        });
    };

    if (signupSuccess) {
        return (
            <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Account Created!</AlertTitle>
                <AlertDescription>
                    Your account has been created successfully. Please switch to the Login tab to sign in with your credentials.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your Name" {...field} className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter the Email ID" {...field} className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter Password (min 8 characters)" {...field} className="bg-muted" />
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
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Confirm Password" {...field} className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Register as a...</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Inspector" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Inspector
                            </FormLabel>
                          </FormItem>
                           <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Client" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Client
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                </Button>
            </form>
        </Form>
    );
}

export default function AuthPage() {
  const { user, loading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  
  if (loading || user) return null;

  return (
    <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
            <Card>
                <CardHeader>
                    <CardTitle>Welcome Back!</CardTitle>
                    <CardDescription>Enter your credentials to access your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginForm />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="signup">
            <Card>
                <CardHeader>
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Sign up by filling out your details below to create your account instantly.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SignupForm />
                </CardContent>
            </Card>
        </TabsContent>
    </Tabs>
  );
}
