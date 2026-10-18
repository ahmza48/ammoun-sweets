import { requireAdmin } from "@/server/auth/session";
import { getClosures, getOpeningHours, getStoreSettings } from "@/server/services/settings";
import { describeEnvironment } from "@/server/env";
import { PageHeader } from "../ui";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [settings, hours, closures] = await Promise.all([
    getStoreSettings(),
    getOpeningHours(),
    getClosures(),
  ]);

  return (
    <>
      <PageHeader
        title="Store settings"
        description="Trading hours, pickup and delivery rules, tax and announcements."
      />
      <SettingsForm
        settings={settings}
        hours={hours}
        closures={closures}
        environment={describeEnvironment()}
      />
    </>
  );
}
