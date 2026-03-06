
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from '@/hooks/useAppContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

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
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                                <Input placeholder="shivamkumar07513@gmail.com" {...field} className="bg-white rounded-xl border-gray-200" />
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
                                      placeholder="••••••••••" 
                                      {...field}
                                      className="bg-white rounded-xl border-gray-200"
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
                <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
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
    <div className="flex min-h-screen w-full overflow-hidden">
      {/* LEFT PANEL */}
      <div className="relative hidden md:flex w-[45%] flex-col items-center justify-center overflow-hidden">
        {/* Electrical dark background with SVG circuit pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a2e] via-[#0d1b4b] to-[#0a2a1a]" />
        {/* Circuit/electrical SVG pattern overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M10 10 h20 v20 h20 v-20 h20" stroke="#00e5ff" strokeWidth="1" fill="none"/>
              <circle cx="10" cy="10" r="2.5" fill="#00e5ff"/>
              <circle cx="50" cy="10" r="2.5" fill="#00e5ff"/>
              <circle cx="30" cy="30" r="2.5" fill="#00bfff"/>
              <path d="M10 50 h15 v-10 h10 v10 h15" stroke="#00bfff" strokeWidth="1" fill="none"/>
              <circle cx="10" cy="50" r="2" fill="#00bfff"/>
              <circle cx="70" cy="50" r="2" fill="#00bfff"/>
              <path d="M0 70 h30 M50 70 h30" stroke="#00e5ff" strokeWidth="0.8" fill="none"/>
              <circle cx="30" cy="70" r="1.5" fill="#39ff14"/>
              <circle cx="50" cy="70" r="1.5" fill="#39ff14"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)"/>
        </svg>
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl" />
        {/* Lightning bolt decorations */}
        <svg className="absolute top-8 right-8 opacity-30 w-12 h-12" viewBox="0 0 24 24" fill="#facc15">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <svg className="absolute bottom-12 left-10 opacity-20 w-8 h-8" viewBox="0 0 24 24" fill="#00e5ff">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center w-28 h-28 rounded-full bg-white/10 border-2 border-cyan-400/40 shadow-lg shadow-cyan-500/20 backdrop-blur-sm">
            <img src="/ntpc-logo.png" alt="InspectX Logo" className="h-20 w-20 object-contain drop-shadow-lg" />
          </div>
          {/* Brand name */}
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight">
              <span className="text-cyan-400">Inspect</span><span className="text-white">X</span>
            </h1>
            <p className="mt-2 text-blue-200/80 text-base font-medium tracking-widest uppercase">Electrical Inspection System</p>
          </div>
          {/* Divider */}
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          {/* Tagline */}
          <p className="text-blue-100/60 text-sm max-w-xs leading-relaxed">
            Powered by NTPC — ensuring safe, smart and efficient electrical inspections.
          </p>
          {/* Bottom bar chart decoration */}
          <div className="flex items-end gap-1.5 mt-4 opacity-30">
            {[40,60,45,75,55,80,50,65,70,48].map((h, i) => (
              <div key={i} className="w-3 rounded-t bg-blue-300" style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #e8f0fe 0%, #f0f4ff 30%, #faf5ff 60%, #e0f2fe 100%)',
        }}
      >
        {/* Decorative background blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #c7d2fe, #a5f3fc)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #ddd6fe, #bfdbfe)' }} />
        <div className="absolute top-1/2 left-[-40px] w-40 h-40 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #a5b4fc, #67e8f9)' }} />
        {/* Dot grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#6366f1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>

        <div className="relative z-10 w-full max-w-md px-2 sm:px-0">
          {/* Logo above card */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(224,242,254,0.8))',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.8)',
                boxShadow: '0 4px 24px rgba(99,102,241,0.15)',
              }}>
              <img src="/logo.png" alt="InspectX" className="w-14 h-14 object-contain" />
            </div>
          </div>

          <Card className="border-0 rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(240,245,255,0.92) 50%, rgba(255,255,255,0.95) 100%)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              boxShadow: '0 20px 60px rgba(99,102,241,0.15), 0 4px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,1) inset',
              border: '1px solid rgba(255,255,255,0.85)',
            }}
          >
            {/* Colored top accent bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6366f1, #38bdf8, #818cf8)' }} />
            <CardHeader className="pb-2 pt-5 sm:pt-7 px-5 sm:px-8">
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">Welcome Back!</CardTitle>
              <CardDescription className="text-gray-500">Sign in to your InspectX account</CardDescription>
            </CardHeader>
            <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8">
              <LoginForm />
              <div className="mt-5 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-semibold text-indigo-600 hover:underline">
                  Request Access
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
