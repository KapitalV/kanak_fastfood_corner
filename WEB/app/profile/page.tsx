"use client";

import { useAuthProfile } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProfileSkeleton } from "@/components/ui/skeleton";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { uploadAvatar, UploadError } from "@/services/storage.service";
import { Camera } from "lucide-react";
import Image from "next/image";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const { data, isLoading } = useAuthProfile();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const publicUrl = await uploadAvatar(file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", data?.profile?.id ?? "");
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      success("Avatar updated", "Your profile picture has been saved.");
    } catch (err) {
      const message = err instanceof UploadError ? err.message : "Upload failed. Please try again.";
      toastError("Avatar not updated", message);
    } finally {
      setAvatarUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (data?.profile) {
      reset({
        name: data.profile.name,
        phone: data.profile.phone || "",
      });
    }
  }, [data, reset]);

  if (isLoading || !data) return <ProfileSkeleton />;

  const { profile, user } = data;
  if (!profile) return null;

  async function onSubmit(values: FormValues) {
    const { error } = await supabase
      .from("profiles")
      .update({
        name: values.name,
        phone: values.phone || null,
      })
      .eq("id", profile!.id);

    if (error) {
      toastError("Failed to update profile", error.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
    success("Profile updated", "Your changes have been saved.");
    setIsEditing(false);
  }

  async function changePassword() {
    if (password.length < 8 || password !== confirmPassword) {
      toastError("Password not changed", "Use at least 8 characters and make both fields match.");
      return;
    }
    setAccountBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setAccountBusy(false);
    if (error) return toastError("Password not changed", error.message);
    setPassword("");
    setConfirmPassword("");
    success("Password updated", "Your password has been changed.");
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your account and personal data? This cannot be undone.")) return;
    setAccountBusy(true);
    const response = await fetch("/api/account/delete", { method: "DELETE" });
    const result = await response.json() as { error?: string };
    setAccountBusy(false);
    if (!response.ok) return toastError("Account not deleted", result.error ?? "Please contact support.");
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <div className="space-y-6">
      {/* Avatar upload */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={avatarUploading}
          onClick={() => fileInputRef.current?.click()}
          className="group relative size-24 rounded-full overflow-hidden border-4 border-orange-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          aria-label="Change profile picture"
        >
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="size-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-black">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
            {avatarUploading ? (
              <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="size-6 text-white" />
            )}
          </div>
        </button>
        <p className="text-xs text-stone-500">Click to change photo · JPG, PNG, WebP, GIF · max 2 MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Wallet / Stats Card */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-orange-50 border-orange-100 ring-0">
          <CardBody className="p-4 sm:p-6 text-center">
            <p className="text-sm font-semibold text-orange-600">Wallet Balance</p>
            <p className="mt-1 text-2xl font-black text-stone-900">
              {formatCurrency(profile.wallet_balance)}
            </p>
          </CardBody>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 ring-0">
          <CardBody className="p-4 sm:p-6 text-center">
            <p className="text-sm font-semibold text-emerald-600">Reward Points</p>
            <p className="mt-1 text-2xl font-black text-stone-900">
              {profile.reward_points} pts
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <h2 className="text-lg font-bold text-stone-900">Personal Information</h2>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardBody>
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" error={errors.name?.message} required id="name">
                  <Input id="name" {...register("name")} />
                </Field>
                <Field label="Phone number" error={errors.phone?.message} id="phone">
                  <Input id="phone" {...register("phone")} />
                </Field>
              </div>
              
              <Field label="Email address (Cannot be changed here)" id="email">
                <Input id="email" value={user?.email || ""} disabled />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-stone-500">Full name</p>
                <p className="mt-1 font-semibold text-stone-900">{profile.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-500">Phone number</p>
                <p className="mt-1 font-semibold text-stone-900">
                  {profile.phone || "Not provided"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-stone-500">Email address</p>
                <p className="mt-1 font-semibold text-stone-900">
                  {user?.email || "Not provided"}
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-bold text-stone-900">Security</h2></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="password" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
          </div>
          <Button variant="secondary" loading={accountBusy} onClick={changePassword}>Change password</Button>
          <div className="border-t border-stone-100 pt-4"><p className="text-sm text-stone-500">Deleting your account removes your profile and signed-in access. Completed orders may remain for legal and financial records.</p><Button className="mt-3" variant="danger" loading={accountBusy} onClick={deleteAccount}>Delete account</Button></div>
        </CardBody>
      </Card>
    </div>
  );
}
