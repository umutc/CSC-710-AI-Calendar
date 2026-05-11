import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import {
  Calendar,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Play,
} from "lucide-react";

// ─── Zod schemas ───────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(3, "Display name must be 3–30 characters")
      .max(30, "Display name must be 3–30 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

// ─── Component ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const { signIn, signUp, signInDemo } = useAuth();
  const navigate = useNavigate();

  // ── Login form ──────────────────────────────────────────────────────────
  const loginForm = useForm<LoginData>({
    defaultValues: { email: "", password: "" },
  });

  // ── Register form ───────────────────────────────────────────────────────
  const registerForm = useForm<RegisterData>({
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const activeForm = mode === "login" ? loginForm : registerForm;
  const isSubmitting = activeForm.formState.isSubmitting;

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleLogin(data: LoginData) {
    setError(null);
    try {
      const result = loginSchema.safeParse(data);
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
      await signIn(data.email, data.password);
      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  async function handleRegister(data: RegisterData) {
    setError(null);
    try {
      const result = registerSchema.safeParse(data);
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
      await signUp(data.email, data.password, data.displayName);
      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed");
    }
  }

  async function handleDemo() {
    setError(null);
    setDemoLoading(true);
    try {
      await signInDemo();
      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Demo login failed");
    } finally {
      setDemoLoading(false);
    }
  }

  function switchMode() {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
    loginForm.reset();
    registerForm.reset();
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="absolute top-[-30%] right-[-15%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-600/15" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-[80px] dark:bg-violet-600/10" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Back to landing */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-8 group dark:text-slate-500 dark:hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dayforma
        </button>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 mb-4">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
              {mode === "login"
                ? "Sign in to your Dayforma account"
                : "Start shaping your day"}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-100 border border-red-400/40 text-red-700 text-sm text-center animate-shake dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ─── Login Form ─────────────────────────────────────────────── */}
          {mode === "login" && (
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="space-y-4"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    className="input-field pl-10"
                    {...loginForm.register("email", {
                      required: "Email is required",
                    })}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-red-600 mt-1 dark:text-red-400">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                    {...loginForm.register("password", {
                      required: "Password is required",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors dark:hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-red-600 mt-1 dark:text-red-400">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}

          {/* ─── Register Form ──────────────────────────────────────────── */}
          {mode === "register" && (
            <form
              onSubmit={registerForm.handleSubmit(handleRegister)}
              className="space-y-4"
            >
              {/* Display Name */}
              <div>
                <label
                  htmlFor="register-name"
                  className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300"
                >
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="register-name"
                    type="text"
                    placeholder="Jane Doe"
                    className="input-field pl-10"
                    {...registerForm.register("displayName", {
                      required: "Display name is required",
                      minLength: {
                        value: 3,
                        message: "At least 3 characters",
                      },
                      maxLength: {
                        value: 30,
                        message: "At most 30 characters",
                      },
                    })}
                  />
                </div>
                {registerForm.formState.errors.displayName && (
                  <p className="text-xs text-red-600 mt-1 dark:text-red-400">
                    {registerForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="register-email"
                  className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    className="input-field pl-10"
                    {...registerForm.register("email", {
                      required: "Email is required",
                    })}
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-red-600 mt-1 dark:text-red-400">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="register-password"
                  className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    className="input-field pl-10 pr-10"
                    {...registerForm.register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "At least 8 characters",
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors dark:hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-red-600 mt-1 dark:text-red-400">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="register-confirm"
                  className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="register-confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    className="input-field pl-10"
                    {...registerForm.register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (v) =>
                        v === registerForm.getValues("password") ||
                        "Passwords do not match",
                    })}
                  />
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1 dark:text-red-400">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          )}

          {/* Removed Demo Button */}

          {/* ─── Toggle mode ────────────────────────────────────────────── */}
          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              id="toggle-mode-btn"
              onClick={switchMode}
              className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
