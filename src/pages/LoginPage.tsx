import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) toast.error(error.message);
      else toast.success("Conta criada! Verifique seu email.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">OTOVISION</h1>
          <p className="text-xs text-muted-foreground mt-1">Gestão de Obra</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSignUp ? "Criar Conta" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline">
            {isSignUp ? "Entrar" : "Criar conta"}
          </button>
        </p>
      </div>
    </div>
  );
}
