import { desc } from "drizzle-orm";
import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db";
import { cateringEnquiries } from "@/server/db/schema";
import { formatAuPhone } from "@/lib/validation";
import { Card, EmptyState, PageHeader } from "../ui";
import { EnquiryStatusControl } from "./EnquiryStatusControl";

export const dynamic = "force-dynamic";

/**
 * Catering enquiries from the public form.
 *
 * Stored in the database rather than only emailed, so nothing is lost to a
 * spam filter and the shop can see what is still outstanding.
 */
export default async function AdminEnquiriesPage() {
  await requireStaff();

  const enquiries = await db
    .select()
    .from(cateringEnquiries)
    .orderBy(desc(cateringEnquiries.createdAt))
    .limit(200);

  const open = enquiries.filter((e) => e.status !== "CLOSED");

  return (
    <>
      <PageHeader
        title="Catering enquiries"
        description={`${open.length} open · ${enquiries.length} total`}
      />

      <div className="px-5 py-6 sm:px-8">
        {enquiries.length === 0 ? (
          <Card>
            <EmptyState
              title="No enquiries yet"
              description="Enquiries from the Catering & Events page will land here."
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {enquiries.map((enquiry) => (
              <li key={enquiry.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-forest-800">{enquiry.name}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.82rem] text-ink-soft">
                        {enquiry.email ? (
                          <a href={`mailto:${enquiry.email}`} className="break-all text-forest-700 underline-offset-4 hover:underline">
                            {enquiry.email}
                          </a>
                        ) : null}
                        {enquiry.phone ? (
                          <a href={`tel:${enquiry.phone}`} className="text-forest-700 underline-offset-4 hover:underline">
                            {formatAuPhone(enquiry.phone)}
                          </a>
                        ) : null}
                      </p>
                    </div>
                    <EnquiryStatusControl id={enquiry.id} status={enquiry.status} />
                  </div>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[0.82rem]">
                    {enquiry.eventDate ? (
                      <div className="flex gap-2">
                        <dt className="text-ink-faint">Date</dt>
                        <dd className="text-ink">{enquiry.eventDate}</dd>
                      </div>
                    ) : null}
                    {enquiry.guests ? (
                      <div className="flex gap-2">
                        <dt className="text-ink-faint">Guests</dt>
                        <dd className="text-ink">{enquiry.guests}</dd>
                      </div>
                    ) : null}
                    {enquiry.occasion ? (
                      <div className="flex gap-2">
                        <dt className="text-ink-faint">Occasion</dt>
                        <dd className="text-ink">{enquiry.occasion}</dd>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <dt className="text-ink-faint">Received</dt>
                      <dd className="text-ink">
                        {enquiry.createdAt.toLocaleString("en-AU", {
                          timeZone: "Australia/Sydney",
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </dd>
                    </div>
                  </dl>

                  {enquiry.message ? (
                    <p className="mt-3 rounded-[8px] bg-[#fbfbfa] px-4 py-3 text-[0.88rem] leading-relaxed text-ink">
                      {enquiry.message}
                    </p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
