import { Ornament } from "@/components/Ornament";

/**
 * Email confirmation gate.
 *
 * Shown when someone opens an order URL without the cookie from checkout.
 * Deliberately a plain GET form: the email becomes a query parameter, the page
 * re-renders server-side, and there is no client JavaScript involved in an
 * authorisation decision.
 */
export function OrderLookupForm({
  orderNumber,
  notFoundMessage = false,
}: {
  orderNumber: string;
  notFoundMessage?: boolean;
}) {
  return (
    <div className="bg-cream pt-[4.5rem] lg:pt-[5.25rem]">
      <section className="container-narrow py-16 sm:py-24">
        <div className="mx-auto max-w-md text-center">
          <p className="eyebrow text-gold-700">Order {orderNumber}</p>
          <h1 className="mt-4 font-display text-[2rem] leading-tight text-forest-800">
            Confirm it&rsquo;s you
          </h1>
          <Ornament width="sm" className="mx-auto mt-5" />
          <p className="mt-5 text-[0.95rem] leading-[1.75] text-ink-soft">
            Enter the email address used for this order and we&rsquo;ll show you the details.
          </p>

          {notFoundMessage ? (
            <p
              role="alert"
              className="mt-5 rounded-[10px] border border-red-300 bg-red-50 px-4 py-3 text-[0.88rem] text-red-900"
            >
              We couldn&rsquo;t find an order matching those details.
            </p>
          ) : null}

          <form method="GET" className="on-light mt-7 flex flex-col gap-3">
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-[10px] border border-sand-dark bg-ivory px-4 py-3 text-[0.95rem] text-ink transition-colors duration-300 focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/25"
            />
            <button
              type="submit"
              className="rounded-full bg-gold-400 px-6 py-3.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-forest-900 transition-all duration-300 hover:-translate-y-px hover:bg-gold-300"
            >
              View My Order
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
