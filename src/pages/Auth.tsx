import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MessageCircle, Phone, Video, Shield } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success("Welcome back!");
      } else {
        await signUp(email, password, username, displayName);
        toast.success("Account created! Check your email to verify.");
      }
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: MessageCircle, label: "Real-time Chat", desc: "Instant messaging with read receipts" },
    { icon: Video, label: "Video Calls", desc: "Crystal clear video conversations" },
    { icon: Phone, label: "Voice Calls", desc: "HD voice calling anywhere" },
    { icon: Shield, label: "Secure", desc: "End-to-end encrypted" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary opacity-90" />
        <div className="relative z-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-display font-bold text-primary-foreground mb-4"
          >
            TalkFree
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-primary-foreground/80 text-lg mb-12"
          >
            Connect with anyone, anywhere, anytime
          </motion.p>
          <div className="grid grid-cols-2 gap-6 max-w-md">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4 text-left"
              >
                <f.icon className="h-6 w-6 text-primary-foreground mb-2" />
                <h3 className="text-primary-foreground font-semibold text-sm">{f.label}</h3>
                <p className="text-primary-foreground/60 text-xs mt-1">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-display font-bold text-primary">TalkFree</h1>
            <p className="text-muted-foreground text-sm mt-1">Connect freely</p>
          </div>

          <h2 className="text-2xl font-display font-bold mb-2">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isLogin ? "Sign in to continue chatting" : "Join TalkFree today"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    required={!isLogin}
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Doe"
                    required={!isLogin}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
