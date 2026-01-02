
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 space-y-8">
       <div className="flex flex-col items-center gap-4 text-center">
         <h1 className="text-5xl font-bold" style={{ color: '#002b80' }}>InspectX</h1>
       </div>
      {children}
    </div>
  );
}
