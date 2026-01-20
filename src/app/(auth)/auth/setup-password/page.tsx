'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';

// Password validation rules
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULES = {
  minLength: { label: `At least ${PASSWORD_MIN_LENGTH} characters`, regex: /.{8,}/ },
  uppercase: { label: 'One uppercase letter', regex: /[A-Z]/ },
  lowercase: { label: 'One lowercase letter', regex: /[a-z]/ },
  number: { label: 'One number', regex: /\d/ },
  special: { label: 'One special character', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
};

function SetupPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  // State
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    email: string;
    userName: string;
    type: 'invitation' | 'reset';
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsVerifying(false);
        setVerifyError('No token provided. Please use the link from your email.');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-token?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (data.success && data.data?.valid) {
          setIsValid(true);
          setTokenInfo({
            email: data.data.email,
            userName: data.data.userName,
            type: data.data.type,
          });
        } else {
          setVerifyError(data.data?.error || 'Invalid or expired link');
        }
      } catch (error) {
        setVerifyError('Failed to verify link. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  // Calculate password strength
  const passwordValidation = Object.entries(PASSWORD_RULES).map(([key, rule]) => ({
    key,
    label: rule.label,
    valid: rule.regex.test(password),
  }));

  const allRulesValid = passwordValidation.every((rule) => rule.valid);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allRulesValid && passwordsMatch && !isSubmitting;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setSubmitError(data.error || 'Failed to set password');
      }
    } catch (error) {
      setSubmitError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Verifying your link...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (!isValid) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Link Invalid or Expired</CardTitle>
          <CardDescription className="mt-2">
            {verifyError || 'This link is no longer valid.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Password reset and invitation links expire for security reasons.
            If you need a new link, please contact your administrator or request a new password reset.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full"
            >
              Request New Password Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Password Set Successfully!</CardTitle>
          <CardDescription className="mt-2">
            Your password has been set. You can now sign in with your new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Redirecting to login page...
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Go to Login Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main form
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {tokenInfo?.type === 'invitation' ? 'Welcome!' : 'Reset Your Password'}
        </CardTitle>
        <CardDescription className="text-center">
          {tokenInfo?.type === 'invitation'
            ? `Hello ${tokenInfo.userName}, set your password to get started.`
            : 'Enter your new password below.'}
        </CardDescription>
        {tokenInfo?.email && (
          <p className="text-sm text-muted-foreground text-center pt-2">
            Account: <strong>{tokenInfo.email}</strong>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
              {submitError}
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1">
              {passwordValidation.map((rule) => (
                <div key={rule.key} className="flex items-center gap-1.5 text-xs">
                  {rule.valid ? (
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={rule.valid ? 'text-green-600' : 'text-muted-foreground'}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Passwords match
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting Password...
              </>
            ) : (
              'Set Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SetupPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        }
      >
        <SetupPasswordContent />
      </Suspense>
    </div>
  );
}
