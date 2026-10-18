"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { sumWeight } from "@/lib/weight";

/**
 * Cart state.
 *
 * ── What the cart is allowed to remember ──────────────────────────────────
 * Variant id, quantity, and *display-only* copies of the name, price and
 * image so the drawer can render instantly without a round trip. The prices
 * held here are never sent to the server and never decide what anyone is
 * charged — checkout re-prices the whole cart from ids alone
 * (`src/server/services/pricing.ts`). A customer who edits localStorage
 * changes what their own screen says and nothing else.
 *
 * ── Why useSyncExternalStore ──────────────────────────────────────────────
 * localStorage is an external store, and this is the hook React provides for
 * subscribing to one. It gives a correct server snapshot (an empty cart) and
 * swaps to the real contents after hydration, which is exactly the behaviour
 * a "read it in an effect and setState" version fakes — except that version
 * causes a cascading re-render and a flash of the wrong item count.
 *
 * Reads are defensive: anything malformed is discarded rather than crashing
 * the app, because this value is entirely under the user's control.
 */

export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  /** Display only — re-priced server-side at checkout. */
  unitPrice: number;
  /**
   * Net weight of one unit, or null when the size is not sold by weight.
   * Display only, like the price: the authoritative figure comes from the
   * server. Optional on the type so a cart saved before this existed still
   * parses instead of being thrown away.
   */
  weightGrams?: number | null;
  image: string | null;
  quantity: number;
  maxQuantity: number | null;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  /** Indicative only; the authoritative figure comes from the server. */
  estimatedSubtotal: number;
  /** Total weight of the lines that have one, in grams. Indicative only. */
  estimatedWeightGrams: number;
  /** Lines with no published weight, so the UI can qualify the total. */
  unweighedLines: number;
  isOpen: boolean;
  hydrated: boolean;
  addItem: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  /** Announced to screen readers after a change. */
  lastAction: string;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "ammoun.cart.v1";
const CART_EVENT = "ammoun:cart";
const MAX_LINES = 50;
const MAX_QTY = 99;

const EMPTY: CartLine[] = [];

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.variantId === "string" &&
    typeof v.productId === "string" &&
    typeof v.productSlug === "string" &&
    typeof v.productName === "string" &&
    typeof v.variantName === "string" &&
    typeof v.unitPrice === "number" &&
    Number.isFinite(v.unitPrice) &&
    typeof v.quantity === "number" &&
    Number.isInteger(v.quantity) &&
    v.quantity > 0
  );
}

function parse(raw: string | null): CartLine[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const lines = parsed
      .filter(isCartLine)
      .slice(0, MAX_LINES)
      .map((l) => ({ ...l, quantity: Math.min(MAX_QTY, Math.max(1, l.quantity)) }));
    return lines.length > 0 ? lines : EMPTY;
  } catch {
    // Private browsing, disabled storage, or someone's hand-edited JSON.
    return EMPTY;
  }
}

/**
 * useSyncExternalStore demands a *stable* snapshot — returning a freshly
 * parsed array every call would loop forever. Cache against the raw string so
 * the same reference comes back until storage actually changes.
 */
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY;

function readStore(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parse(raw);
  }
  return cachedLines;
}

function writeStore(lines: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Quota or disabled storage — keep the in-memory value working.
  }
  // Same-tab listeners; `storage` only fires in *other* tabs.
  window.dispatchEvent(new Event(CART_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener(CART_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CART_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = () => EMPTY;

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, readStore, serverSnapshot);

  // False during SSR and the hydration pass, true afterwards — used to keep
  // the badge blank until we genuinely know what is in the cart.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [lastAction, setLastAction] = useState("");

  const update = useCallback((next: (current: CartLine[]) => CartLine[]) => {
    writeStore(next(readStore()));
  }, []);

  const addItem = useCallback(
    (line: Omit<CartLine, "quantity">, quantity = 1) => {
      update((current) => {
        const existing = current.find((l) => l.variantId === line.variantId);
        const ceiling = Math.min(MAX_QTY, line.maxQuantity ?? MAX_QTY);

        if (existing) {
          return current.map((l) =>
            l.variantId === line.variantId
              ? { ...l, ...line, quantity: Math.min(ceiling, l.quantity + quantity) }
              : l,
          );
        }
        if (current.length >= MAX_LINES) return current;
        return [...current, { ...line, quantity: Math.min(ceiling, quantity) }];
      });

      setLastAction(`${line.productName}, ${line.variantName}, added to cart`);
      setIsOpen(true);
    },
    [update],
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number) => {
      update((current) => {
        if (quantity <= 0) return current.filter((l) => l.variantId !== variantId);
        return current.map((l) =>
          l.variantId === variantId
            ? {
                ...l,
                quantity: Math.min(MAX_QTY, Math.min(l.maxQuantity ?? MAX_QTY, quantity)),
              }
            : l,
        );
      });
      setLastAction("Cart updated");
    },
    [update],
  );

  const removeItem = useCallback(
    (variantId: string) => {
      const line = readStore().find((l) => l.variantId === variantId);
      update((current) => current.filter((l) => l.variantId !== variantId));
      if (line) setLastAction(`${line.productName} removed from cart`);
    },
    [update],
  );

  const clear = useCallback(() => {
    update(() => EMPTY);
    setLastAction("Cart cleared");
  }, [update]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const estimatedSubtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const { totalGrams, unweighedLines } = sumWeight(
      lines.map((l) => ({ weightGrams: l.weightGrams ?? null, quantity: l.quantity })),
    );
    return {
      lines,
      itemCount,
      estimatedSubtotal,
      estimatedWeightGrams: totalGrams,
      unweighedLines,
      isOpen,
      hydrated,
      addItem,
      setQuantity,
      removeItem,
      clear,
      openCart,
      closeCart,
      lastAction,
    };
  }, [
    lines,
    isOpen,
    hydrated,
    addItem,
    setQuantity,
    removeItem,
    clear,
    openCart,
    closeCart,
    lastAction,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}

export const CART_STORAGE_KEY = STORAGE_KEY;
