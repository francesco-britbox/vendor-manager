'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Mail,
  Shield,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Edit2,
  X,
  Check,
  Upload,
} from 'lucide-react';

interface ProfileManagementProps {
  initialData: {
    id: string;
    name: string;
    email: string;
    permissionLevel: string;
  };
}

// Password strength levels
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

// Password requirements interface
interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

// Allowed image types and size
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * Validate password client-side for real-time feedback
 */
function validatePasswordStrength(password: string): {
  strength: PasswordStrength;
  requirements: PasswordRequirements;
} {
  const requirements: PasswordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const requirementsMet = Object.values(requirements).filter(Boolean).length;
  let strength: PasswordStrength;

  if (requirementsMet <= 2) {
    strength = 'weak';
  } else if (requirementsMet === 3) {
    strength = 'fair';
  } else if (requirementsMet === 4) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  // Bonus for longer passwords
  if (password.length >= 12 && requirementsMet >= 4) {
    strength = 'strong';
  }

  return { strength, requirements };
}

/**
 * Get strength color
 */
function getStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'fair':
      return 'bg-orange-500';
    case 'good':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
    default:
      return 'bg-gray-300';
  }
}

/**
 * Get strength label
 */
function getStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'fair':
      return 'Fair';
    case 'good':
      return 'Good';
    case 'strong':
      return 'Strong';
    default:
      return '';
  }
}

/**
 * Profile Management Component
 * Allows users to update their name, password, and profile picture
 */
export function ProfileManagement({ initialData }: ProfileManagementProps) {
  // Profile state
  const [name, setName] = React.useState(initialData.name);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [isSavingName, setIsSavingName] = React.useState(false);
  const [nameSuccess, setNameSuccess] = React.useState<string | null>(null);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  // Password strength validation
  const passwordValidation = React.useMemo(() => {
    if (!newPassword) {
      return {
        strength: 'weak' as PasswordStrength,
        requirements: {
          minLength: false,
          hasUppercase: false,
          hasLowercase: false,
          hasNumber: false,
          hasSpecialChar: false,
        },
      };
    }
    return validatePasswordStrength(newPassword);
  }, [newPassword]);

  // Profile picture state
  const [hasProfilePicture, setHasProfilePicture] = React.useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [pictureError, setPictureError] = React.useState<string | null>(null);
  const [pictureSuccess, setPictureSuccess] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load profile picture on mount
  React.useEffect(() => {
    checkProfilePicture();
  }, []);

  // Clear success messages after a delay
  React.useEffect(() => {
    if (nameSuccess) {
      const timer = setTimeout(() => setNameSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [nameSuccess]);

  React.useEffect(() => {
    if (passwordSuccess) {
      const timer = setTimeout(() => setPasswordSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordSuccess]);

  React.useEffect(() => {
    if (pictureSuccess) {
      const timer = setTimeout(() => setPictureSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pictureSuccess]);

  /**
   * Check if user has a profile picture
   */
  async function checkProfilePicture() {
    try {
      const response = await fetch('/api/user/profile-picture', {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok) {
        setHasProfilePicture(true);
        // Create a blob URL for the image
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setProfilePictureUrl(url);
      } else {
        setHasProfilePicture(false);
        setProfilePictureUrl(null);
      }
    } catch {
      setHasProfilePicture(false);
      setProfilePictureUrl(null);
    }
  }

  /**
   * Handle name save
   */
  async function handleSaveName() {
    setNameError(null);
    setNameSuccess(null);

    // Validate name
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }

    if (name.trim().length > 255) {
      setNameError('Name must be at most 255 characters');
      return;
    }

    setIsSavingName(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setNameSuccess('Name updated successfully');
        setIsEditingName(false);
      } else {
        setNameError(data.error || 'Failed to update name');
      }
    } catch {
      setNameError('Network error. Please try again.');
    } finally {
      setIsSavingName(false);
    }
  }

  /**
   * Handle password change
   */
  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate inputs
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // Check all requirements are met
    const allRequirementsMet = Object.values(passwordValidation.requirements).every(Boolean);
    if (!allRequirementsMet) {
      setPasswordError('Password does not meet all requirements');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordSuccess('Password changed successfully');
        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch {
      setPasswordError('Network error. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  /**
   * Handle file selection
   */
  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    setPictureError(null);
    setPictureSuccess(null);

    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPictureError('Only PNG and JPEG images are allowed');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setPictureError(`File size (${sizeMB}MB) exceeds maximum of 1MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
  }

  /**
   * Handle profile picture upload
   */
  async function handleUploadPicture() {
    if (!selectedFile) return;

    setPictureError(null);
    setPictureSuccess(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (data.success) {
        setPictureSuccess('Profile picture updated successfully');
        setHasProfilePicture(true);
        setProfilePictureUrl(previewUrl);
        setPreviewUrl(null);
        setSelectedFile(null);
        // Refresh the profile picture
        setTimeout(() => checkProfilePicture(), 500);
      } else {
        setPictureError(data.error || 'Failed to upload picture');
      }
    } catch {
      setPictureError('Network error. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  /**
   * Handle profile picture deletion
   */
  async function handleDeletePicture() {
    setPictureError(null);
    setPictureSuccess(null);
    setIsDeleting(true);

    try {
      const response = await fetch('/api/user/profile-picture', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setPictureSuccess('Profile picture removed');
        setHasProfilePicture(false);
        setProfilePictureUrl(null);
        setPreviewUrl(null);
        setSelectedFile(null);
      } else {
        setPictureError(data.error || 'Failed to delete picture');
      }
    } catch {
      setPictureError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  /**
   * Cancel file selection
   */
  function handleCancelSelection() {
    setPreviewUrl(null);
    setSelectedFile(null);
    setPictureError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  /**
   * Cancel name editing
   */
  function handleCancelNameEdit() {
    setName(initialData.name);
    setIsEditingName(false);
    setNameError(null);
  }

  /**
   * Cancel password change
   */
  function handleCancelPasswordChange() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordForm(false);
    setPasswordError(null);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center space-y-4">
          {/* Profile Picture Display */}
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-background shadow-lg"
              role="img"
              aria-label="Profile picture"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            {/* Camera overlay button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
              aria-label="Change profile picture"
              disabled={isUploading || isDeleting}
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload profile picture"
          />

          {/* Upload Progress */}
          {isUploading && (
            <div className="w-full max-w-xs space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Preview Actions */}
          {previewUrl && !isUploading && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUploadPicture}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Save Photo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelSelection}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {/* Picture Actions (no preview) */}
          {!previewUrl && !isUploading && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isDeleting}
              >
                <Camera className="h-4 w-4 mr-2" />
                {hasProfilePicture ? 'Change Photo' : 'Add Photo'}
              </Button>
              {hasProfilePicture && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeletePicture}
                  disabled={isUploading || isDeleting}
                  className="text-destructive hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remove
                </Button>
              )}
            </div>
          )}

          {/* Picture Messages */}
          {pictureError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {pictureError}
            </div>
          )}
          {pictureSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {pictureSuccess}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            PNG or JPEG, max 1MB
          </p>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Name Section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            Name
          </Label>
          {isEditingName ? (
            <div className="space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className={nameError ? 'border-destructive' : ''}
                disabled={isSavingName}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={isSavingName}
                >
                  {isSavingName ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelNameEdit}
                  disabled={isSavingName}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-medium">{name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingName(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          {nameSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {nameSuccess}
            </div>
          )}
        </div>

        {/* Email Section (Read-only) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            Email
          </Label>
          <div className="flex items-center justify-between">
            <span className="font-medium">{initialData.email}</span>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              Read-only
            </span>
          </div>
        </div>

        {/* Permission Level Section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            Permission Level
          </Label>
          <span className="font-medium capitalize">{initialData.permissionLevel}</span>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Password Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              Password
            </Label>
            {!showPasswordForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </Button>
            )}
          </div>

          {showPasswordForm && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    disabled={isChangingPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={isChangingPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-2">
                    {/* Strength Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthColor(
                            passwordValidation.strength
                          )}`}
                          style={{
                            width:
                              passwordValidation.strength === 'weak'
                                ? '25%'
                                : passwordValidation.strength === 'fair'
                                ? '50%'
                                : passwordValidation.strength === 'good'
                                ? '75%'
                                : '100%',
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          passwordValidation.strength === 'weak'
                            ? 'text-red-500'
                            : passwordValidation.strength === 'fair'
                            ? 'text-orange-500'
                            : passwordValidation.strength === 'good'
                            ? 'text-yellow-600'
                            : 'text-green-500'
                        }`}
                      >
                        {getStrengthLabel(passwordValidation.strength)}
                      </span>
                    </div>

                    {/* Requirements Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                      <div
                        className={`flex items-center gap-1 ${
                          passwordValidation.requirements.minLength
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {passwordValidation.requirements.minLength ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border" />
                        )}
                        At least 8 characters
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordValidation.requirements.hasUppercase
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {passwordValidation.requirements.hasUppercase ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border" />
                        )}
                        One uppercase letter
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordValidation.requirements.hasLowercase
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {passwordValidation.requirements.hasLowercase ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border" />
                        )}
                        One lowercase letter
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordValidation.requirements.hasNumber
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {passwordValidation.requirements.hasNumber ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border" />
                        )}
                        One number
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordValidation.requirements.hasSpecialChar
                            ? 'text-green-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {passwordValidation.requirements.hasSpecialChar ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border" />
                        )}
                        One special character
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={isChangingPassword}
                    className={`pr-10 ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-destructive'
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
                {confirmPassword && newPassword === confirmPassword && confirmPassword.length > 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Password Error/Success */}
              {passwordError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {passwordSuccess}
                </div>
              )}

              {/* Password Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={
                    isChangingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword ||
                    !Object.values(passwordValidation.requirements).every(Boolean)
                  }
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelPasswordChange}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
              </div>

              {/* Password Note */}
              <p className="text-xs text-muted-foreground">
                Password is case-sensitive. After changing your password, you may need to sign in again.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
