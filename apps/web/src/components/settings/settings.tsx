import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useUpdateProfile } from "@/lib/api/mutations";
import { useProfile } from "@/lib/api/queries";
import type { ProfileData } from "@/lib/core/interfaces";
import { useNavigationGuard } from "@/lib/hooks/use-navigation-guard";
import { NewVersionNotice } from "@/components/notices/new-version-notice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdvancedSection } from "./advanced-section";
import { ConnectedAccountsSection } from "./connected-accounts-section";
import { DangerZoneSection } from "./danger-zone-section";
import { DownloadSection } from "./download-section";
import { GoalSection } from "./goal-section";
import { ProfileSection } from "./profile-section";
import { ProgressTrackingSection } from "./progress-tracking-section";
import { SettingsLayout } from "./settings-layout";
import { SharingSection } from "./sharing-section";

export function Settings() {
  const { data: profileData } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileData>();

  // Update form when profile data loads
  useEffect(() => {
    if (profileData) {
      reset(profileData);
    }
  }, [profileData, reset]);

  // Handle unit conversion when toggle is clicked
  const handleUnitChange = (newIsMetric: boolean) => {
    const currentValues = getValues();
    const currentIsMetric = currentValues.useMetric;

    // Only convert if actually changing
    if (currentIsMetric === newIsMetric) {
      return;
    }

    // Update the metric setting first
    setValue("useMetric", newIsMetric, { shouldDirty: true });

    // Convert planned pounds per week
    const currentPlan = currentValues.plannedPoundsPerWeek;
    if (currentPlan && currentPlan !== 0) {
      if (newIsMetric) {
        // Converting from lbs to kg (roughly divide by 2)
        setValue("plannedPoundsPerWeek", currentPlan / 2, { shouldDirty: true });
      } else {
        // Converting from kg to lbs (roughly multiply by 2)
        setValue("plannedPoundsPerWeek", currentPlan * 2, { shouldDirty: true });
      }
    }

    // Convert goal weight
    const currentGoalWeight = currentValues.goalWeight;
    if (currentGoalWeight && currentGoalWeight !== 0) {
      if (newIsMetric) {
        // Converting from lbs to kg (divide by 2.20462 and round)
        const kgValue = Math.round(currentGoalWeight / 2.20462);
        setValue("goalWeight", kgValue, { shouldDirty: true });
      } else {
        // Converting from kg to lbs (multiply by 2.20462 and round)
        const lbsValue = Math.round(currentGoalWeight * 2.20462);
        setValue("goalWeight", lbsValue, { shouldDirty: true });
      }
    }
  };

  // Warn user about unsaved changes when navigating away
  useNavigationGuard(isDirty);

  const onSubmit = async (data: ProfileData) => {
    try {
      // Transform empty strings to undefined for optional fields
      // and handle NaN for number fields
      const cleanedData = {
        ...data,
        goalStart: data.goalStart === "" ? undefined : data.goalStart,
        goalWeight: isNaN(data.goalWeight as number) ? undefined : data.goalWeight,
      };

      const response = await updateProfile.mutateAsync(cleanedData);
      // Reset form state with the actual response data to mark as clean
      reset(response.user);
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  return (
    <SettingsLayout>
      {/* New Version Notice */}
      {profileData?.isMigrated && <NewVersionNotice />}

      {/* Settings Form Card */}
      <Card className="mb-6 py-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ProfileSection register={register} errors={errors} watch={watch} setValue={setValue} control={control} onUnitChange={handleUnitChange} />
          <ProgressTrackingSection register={register} watch={watch} control={control} />
          <GoalSection register={register} errors={errors} watch={watch} control={control} />
          <AdvancedSection register={register} errors={errors} watch={watch} setValue={setValue} control={control} />

          {/* Save button */}
          <div className="flex items-center justify-between p-6">
            <div>
              {isDirty && <p className="text-muted-foreground text-sm">You have unsaved changes</p>}
              {updateProfile.isError && <p className="text-destructive text-sm">Failed to save settings. Please try again.</p>}
              {updateProfile.isSuccess && !isDirty && <p className="text-success text-sm">Settings saved successfully!</p>}
            </div>
            <Button type="submit" disabled={!isDirty || isSubmitting} variant={isDirty && !isSubmitting ? "default" : "outline"}>
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Sharing Card */}
      <Card className="mb-6">
        <SharingSection />
      </Card>

      {/* Connected Accounts Card */}
      <Card className="mb-6">
        <ConnectedAccountsSection />
      </Card>

      {/* Download Card */}
      <DownloadSection />

      {/* Danger Zone Card */}
      <Card className="border-destructive">
        <DangerZoneSection />
      </Card>
    </SettingsLayout>
  );
}
