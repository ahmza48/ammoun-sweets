import Link from "next/link";
import { tryGetStoreSettings } from "@/server/services/settings";

/**
 * Admin-controlled announcement strip ("Eid orders now open", "Pickup closes
 * at 8pm tonight").
 *
 * A Server Component that reads settings directly — it renders nothing at all
 * when the announcement is switched off, so there is no layout shift and no
 * client JavaScript for a feature that is usually dormant.
 *
 * `tryGetStoreSettings` is used rather than the throwing variant because a
 * decorative banner must never be the thing that breaks every page on a
 * freshly-deployed, not-yet-seeded database.
 */

export async function AnnouncementBar() {
  const settings = await tryGetStoreSettings();
  if (!settings?.announcementEnabled || !settings.announcementText?.trim()) return null;

  const hasLink =
    Boolean(settings.announcementLinkHref?.trim()) &&
    Boolean(settings.announcementLinkLabel?.trim());

  return (
    <div className="relative z-[55] bg-forest-950 text-cream">
      <div className="container-page">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2.5 text-center">
          <svg viewBox="0 0 12 12" className="h-2 w-2 shrink-0 text-gold-400" fill="currentColor" aria-hidden="true">
            <path d="M6 0c.5 3.2 2.3 5 5.5 6C8.3 7 6.5 8.8 6 12c-.5-3.2-2.3-5-5.5-6C3.7 5 5.5 3.2 6 0Z" />
          </svg>
          <p className="text-[0.82rem] leading-snug text-cream/90">
            {settings.announcementText}
          </p>
          {hasLink ? (
            <Link
              href={settings.announcementLinkHref!}
              className="text-[0.82rem] font-semibold text-gold-300 underline-offset-4 transition-colors duration-300 hover:text-gold-200 hover:underline"
            >
              {settings.announcementLinkLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
