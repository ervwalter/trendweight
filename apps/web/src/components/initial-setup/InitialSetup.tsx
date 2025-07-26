import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { BasicProfileSettings } from "../settings/BasicProfileSettings";
import { StartDateSettings } from "../settings/StartDateSettings";
import { useUpdateProfile } from "../../lib/api/mutations";
import { shouldUseMetric, extractFirstName } from "../../lib/utils/locale";
import { useAuth } from "../../lib/auth/useAuth";
import type { ProfileData } from "../../lib/core/interfaces";
import { Heading } from "../ui/Heading";
import { Button } from "../ui/Button";

export function InitialSetup() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileData>({
    defaultValues: {
      firstName: "",
      useMetric: shouldUseMetric(),
      hideDataBeforeStart: false,
    },
  });

  // Set default first name from auth user
  useEffect(() => {
    if (session?.user) {
      const metadata = session.user.user_metadata;
      if (metadata?.full_name) {
        setValue("firstName", extractFirstName(metadata.full_name));
      } else if (metadata?.name) {
        setValue("firstName", extractFirstName(metadata.name));
      }
    }
  }, [session, setValue]);

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
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <Heading level={1}>Welcome to TrendWeight!</Heading>
          <p className="mt-2 text-gray-600">Let's set up your profile to get started.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
          <BasicProfileSettings register={register} errors={errors} control={control} />

          <div>
            <h2 className="mb-4 text-lg font-medium text-gray-900">Progress Tracking (Optional)</h2>
            <StartDateSettings register={register} control={control} watch={watch} />
          </div>

          <div className="flex items-center justify-between">
            <div>{updateProfile.isError && <p className="text-sm text-red-600">Failed to create profile. Please try again.</p>}</div>
            <Button type="submit" disabled={isSubmitting} variant="primary">
              {isSubmitting ? "Creating Profile..." : "Continue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
