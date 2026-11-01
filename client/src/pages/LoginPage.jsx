import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { normalizeApiError, applyFieldErrors } from '../api/errors.js';

const schema = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') });

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const submit = async (values) => {
    try {
      await login(values);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (error) {
      const normalized = normalizeApiError(error);
      applyFieldErrors(normalized, setError);
      toast.error(normalized.status === 429 ? 'Too many attempts. Please wait and try again.' : normalized.message);
    }
  };
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950"><form onSubmit={handleSubmit(submit)} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-8 flex items-center gap-2 text-xl font-bold text-brand-700"><ShieldCheck /> TherapySession Admin</div><h1 className="text-2xl font-semibold">Sign in</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Appointment administration with privacy built in.</p><div className="mt-6 space-y-4"><Input label="Email" id="email" type="email" autoComplete="username" error={errors.email?.message} {...register('email')} /><div className="relative"><Input label="Password" id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" error={errors.password?.message} {...register('password')} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-8" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><Button className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button></div></form></main>;
}
