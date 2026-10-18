import type { Metadata } from "next";
import { CheckoutForm } from "./CheckoutForm";
import { getPickupAvailability } from "@/server/services/fulfilment";
import { getStoreSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Ammoun Sweets order.",
  // A checkout page has nothing to offer a search engine and everything to
  // lose from being indexed.
  robots: { index: false, follow: false },
};

/** Pickup availability depends on the current time, so nothing here is cached. */
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const settings = await getStoreSettings();
  const pickupDays = await getPickupAvailability(settings);

  return (
    <div className="bg-cream pt-[4.5rem] lg:pt-[5.25rem]">
      <CheckoutForm
        pickupEnabled={settings.pickupEnabled}
        deliveryEnabled={settings.deliveryEnabled}
        pickupDays={pickupDays}
        deliveryFee={settings.deliveryFee}
        deliveryMinimum={settings.deliveryMinimum}
        freeDeliveryThreshold={settings.freeDeliveryThreshold}
        deliveryPostcodes={settings.deliveryPostcodes}
        taxLabel={settings.taxLabel}
      />
    </div>
  );
}
