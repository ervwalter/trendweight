import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { BasicProfileSettings } from "@/components/settings/basic-profile-settings";
import { StartDateSettings } from "@/components/settings/start-date-settings";
import { useUpdateProfile } from "@/lib/api/mutations";
import { shouldUseMetric, extractFirstName } from "@/lib/utils/locale";
import { useAuth } from "@/lib/auth/use-auth";
import type { ProfileData } from "@/lib/core/interfaces";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function InitialSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<ProfileData>({
    defaultValues: {
      firstName: "",
      useMetric: shouldUseMetric(),
      hideDataBeforeStart: false,
    },
  });

  // Prefill the first name from the auth user. Depend on the string (useAuth returns a fresh
  // user object every render) and leave a touched or filled field alone so a re-render after a
  // validation error never overwrites what the user typed or cleared.
  const displayName = user?.displayName;
  useEffect(() => {
    if (!displayName) return;
    if (touchedFields.firstName || getValues("firstName")) return;
    setValue("firstName", extractFirstName(displayName));
  }, [displayName, touchedFields.firstName, getValues, setValue]);

  const onSubmit = async (data: ProfileData) => {
    try {
      await updateProfile.mutateAsync(data);
      // Redirect to dashboard after successful profile creation
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      console.error("Failed to create profile:", error);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to TrendWeight!</CardTitle>
          <CardDescription>Let's set up your profile to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <BasicProfileSettings register={register} errors={errors} control={control} />

            <div>
              <h2 className="text-foreground mb-4 text-lg font-medium">Progress Tracking (Optional)</h2>
              <StartDateSettings register={register} errors={errors} control={control} watch={watch} />
            </div>

            <div className="flex items-center justify-between">
              <div>{updateProfile.isError && <p className="text-destructive text-sm">Failed to create profile. Please try again.</p>}</div>
              <Button type="submit" disabled={isSubmitting} variant="default">
                {isSubmitting ? "Creating Profile..." : "Continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
