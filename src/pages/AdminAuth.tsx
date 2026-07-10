import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAuth() {
  const navigate = useNavigate();

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('admin_verified', 'true');
    toast.success('Access Granted, welcome Master Admin');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Card className="max-w-md w-full rounded-[40px] border-none bg-slate-900 text-white shadow-2xl">
        <CardHeader className="text-center pt-8">
          <div className="mx-auto w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-blue-500/50">
            <ShieldAlert className="text-blue-400 w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-black italic tracking-tighter uppercase mb-2">Admin <span className="text-blue-400">Vault</span></CardTitle>
          <CardDescription className="text-slate-400 italic">Deploying administrative overrides for ecosystem management.</CardDescription>
        </CardHeader>
        <CardContent className="pb-12">
          <form onSubmit={handleAdminVerify} className="space-y-6">
            <Button type="submit" className="w-full h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-lg shadow-xl shadow-blue-500/20">
              OPEN TERMINAL
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
