'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mountain, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { AnimatedSidePanel } from '@/components/auth/animated-side-panel';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Animated left panel */}
      <AnimatedSidePanel />

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center">
              <span 
                className="text-2xl font-bold text-foreground"
                style={{
                  fontFamily: "'Playfair Display', 'Georgia', serif",
                  letterSpacing: "0.02em"
                }}
              >
                Yātra
              </span>
            </Link>
          </div>

          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-foreground">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                If an account with that email exists, we sent a password reset link. Please check your inbox and spam folder.
              </p>
              <Link href="/login">
                <Button className="mt-6" variant="outline">
                  Return to login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-2xl font-bold text-foreground">Forgot your password?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email address and we will send you a link to reset your password.
              </p>

              {error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
