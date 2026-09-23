"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Select } from "@/components/ui/Select";
import { PlusIcon, PencilIcon } from "@/components/ui/icons";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { useMembers } from "@/lib/useMembers";
import { useCoaches } from "@/lib/useCoaches";
import { getSharedAccountLinks, type SharedAccountLink } from "@/server/members";
import { createSale } from "@/server/sales";
import { createSessionCreditsForSale } from "@/server/billing";
import { chargeCardOnFile, getCardOnFile, type CloverCard } from "@/server/clover";
import { CardOnFileDialog } from "@/components/members/CardOnFileDialog";
import { PREBILL_TYPES, type PreBillType } from "@/lib/prebill";
import { getBusinessSettings } from "@/server/settings";
import { parseTaxRate } from "@/lib/tax";
import { matchProduct } from "@/lib/matchProduct";
import { useProducts } from "@/lib/useProducts";
import { sessionTypeColor, shortLabel } from "@/data/mock/sessionTypes";
import { useThemeStore } from "@/stores/theme";
import { money } from "@/lib/time";
import { PRODUCT_CATEGORIES, type Product } from "@/types";

const CATEGORIES = PRODUCT_CATEGORIES;
const PAYMENT_METHODS = ["Card", "Cash", "E-transfer", "Package credit"];

function POSInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialMemberName = params.get("member") ? decodeURIComponent(params.get("member")!) : null;

  const members = useMembers();
  const coaches = useCoaches();
  const products = useProducts();
  const dark = useThemeStore((s) => s.theme === "dark");

  /** Seeds the cart from the URL — either one product via `type`/`coach`/`qty` (the single-session
      "Go to store" / "Bill this client" links), or several at once via repeated `item=type|coach|qty`
      params (a combined "Bill via POS" from the Upcoming cycle tally, when one coach bills on
      behalf of more than one coach's sessions in the same checkout). `coach` here is a coach's
      full name (baked into those links elsewhere), resolved to an id locally since matching is
      now coachId-based. */
  const initialCart = useMemo(() => {
    const cart: Record<string, number> = {};
    const coachIdByName = (name: string) => coaches.find((c) => c.name === name)?.id;
    const itemParams = params.getAll("item");
    if (itemParams.length > 0) {
      for (const raw of itemParams) {
        const [type, coach, qtyStr] = decodeURIComponent(raw).split("|");
        const product = matchProduct(type, coach ? coachIdByName(coach) : undefined, products);
        if (!product) continue;
        cart[product.id] = (cart[product.id] ?? 0) + Math.max(1, Number(qtyStr) || 1);
      }
      return cart;
    }
    const type = params.get("type");
    if (!type) return cart;
    const coach = params.get("coach") ? decodeURIComponent(params.get("coach")!) : undefined;
    const product = matchProduct(decodeURIComponent(type), coach ? coachIdByName(coach) : undefined, products);
    if (product) cart[product.id] = Math.max(1, Number(params.get("qty")) || 1);
    return cart;
  }, [params, coaches, products]);

  const [category, setCategory] = useState<Product["category"]>("Personal Training");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  // initialCart depends on `products` (DB-backed, loads async), so it isn't ready on the very
  // first render the way it was when the catalog was a static import — apply it once products
  // have actually loaded, instead of as the useState initializer (which only ever runs once, on
  // mount, before that data exists).
  const appliedInitialCart = useRef(false);
  useEffect(() => {
    Promise.resolve().then(() => {
      if (appliedInitialCart.current || products.length === 0) return;
      appliedInitialCart.current = true;
      if (Object.keys(initialCart).length > 0) setCart(initialCart);
    });
  }, [products, initialCart]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  /** Selected member's id, or "" for Walk-in. null = not yet chosen, fall back to the ?member= query param once members load. */
  const [chosenMember, setChosenMember] = useState<string | null>(null);
  const [onBehalf, setOnBehalf] = useState("");
  const [linked, setLinked] = useState<SharedAccountLink[]>([]);
  const [discMode, setDiscMode] = useState<"%" | "$">("%");
  const [discValue, setDiscValue] = useState("");
  const [method, setMethod] = useState("Card");
  const [invoiceUnpaid, setInvoiceUnpaid] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [taxRate, setTaxRate] = useState(0.05);
  const [cardOnFile, setCardOnFile] = useState<CloverCard | null | undefined>(undefined);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);

  useEffect(() => {
    getBusinessSettings().then((s) => setTaxRate(parseTaxRate(s.salesTax)));
  }, []);

  const member = chosenMember ?? members.find((m) => m.name === initialMemberName)?.id ?? "";
  const setMember = (id: string) => setChosenMember(id);

  // Reset the "purchasing for" pick and cached links whenever the selected member changes.
  const [linksMember, setLinksMember] = useState(member);
  if (member !== linksMember) {
    setLinksMember(member);
    setOnBehalf("");
    setLinked([]);
    setInvoiceUnpaid(false);
  }

  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    getSharedAccountLinks(member).then((links) => {
      if (!cancelled) setLinked(links.paysFor);
    });
    return () => {
      cancelled = true;
    };
  }, [member]);

  function refetchCardOnFile() {
    if (member) getCardOnFile(member).then(setCardOnFile);
  }
  useEffect(() => {
    Promise.resolve().then(() => {
      setCardOnFile(undefined);
      if (member) getCardOnFile(member).then(setCardOnFile);
    });
  }, [member]);

  const selectedMember = member ? members.find((m) => m.id === member) : undefined;
  const memberName = selectedMember?.name ?? "Walk-in";
  const memberCoachId = selectedMember ? coaches.find((c) => c.name === selectedMember.coach)?.id : undefined;

  useHeaderAction(
    <HeaderButton
      onClick={() => {
        setCart({});
        setSaleError(null);
        setInvoiceUnpaid(false);
      }}
    >
      <PlusIcon size={15} />
      New sale
    </HeaderButton>,
  );

  const visible = products.filter((p) => {
    if (p.category !== category) return false;
    if (query.trim() && !p.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  function unitPrice(p: Product): number {
    const v = amounts[p.id];
    if (v != null && v !== "") return Math.max(0, Number(v) || 0);
    return p.variablePrice ? 0 : p.price;
  }

  const lines = products.filter((p) => cart[p.id] > 0);
  const gross = lines.reduce((a, p) => a + unitPrice(p) * cart[p.id], 0);
  const discRaw = Math.max(0, Number(discValue) || 0);
  const discAmt = Math.min(gross, discMode === "%" ? gross * (Math.min(100, discRaw) / 100) : discRaw);
  const subtotal = gross - discAmt;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const needsAmount = lines.some((p) => p.variablePrice && !unitPrice(p));
  const wantsCardCharge = method === "Card" && !invoiceUnpaid;

  async function runCharge() {
    let chargedButUnrecorded = false;
    if (wantsCardCharge && member) {
      const result = await chargeCardOnFile(member, Math.round(total * 100), "CAD");
      if (!result.ok) {
        setSaleError(result.error ?? "Card was declined.");
        return;
      }
      chargedButUnrecorded = true;
    }
    const summary = lines.map((p) => (cart[p.id] > 1 ? `${p.name} x${cart[p.id]}` : p.name)).join(", ");
    const lineItems = lines.map((p) => ({ description: p.name, quantity: cart[p.id], unitPrice: unitPrice(p) }));
    if (discAmt > 0) lineItems.push({ description: "Discount", quantity: 1, unitPrice: -discAmt });
    try {
      const saleId = await createSale({
        memberId: member || undefined,
        coachId: memberCoachId,
        summary,
        total,
        method: invoiceUnpaid ? "Invoice" : method,
        paid: !invoiceUnpaid,
        lineItems,
        taxRate,
      });
      chargedButUnrecorded = false;
      if (member) {
        const prebillItems = lines
          .filter((p) => p.sessionType && (PREBILL_TYPES as readonly string[]).includes(p.sessionType))
          .map((p) => ({
            sessionType: p.sessionType as PreBillType,
            unitPrice: unitPrice(p),
            quantity: cart[p.id],
            coachId: p.coachId ?? memberCoachId,
          }));
        if (prebillItems.length > 0) await createSessionCreditsForSale(saleId, member, prebillItems);
      }
      setCart({});
      router.push(`/invoices/${saleId}`);
    } catch {
      // The card charge above can succeed and then this step still fail (network blip, etc.) -
      // that's a real charge with nothing recorded, so this must never read as "try again" and
      // invite a second charge for the same sale.
      setSaleError(
        chargedButUnrecorded
          ? `${memberName}'s card was charged ${money(total)} but the sale failed to save. Don't charge again — record this manually and check Clover's dashboard for the charge.`
          : "Couldn't record that sale. Try again.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Point of sale</h2>
          <div className="text-[13.5px] text-muted">{lines.length} item{lines.length === 1 ? "" : "s"} in current sale</div>
        </div>
        <div className="ml-auto flex flex-wrap gap-1 rounded-[11px] border border-divider p-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] ${category === c ? "bg-row font-semibold text-fg" : "text-muted"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card className="px-5 py-[18px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className="mb-3 h-9 w-full rounded-lg border border-divider bg-transparent px-3 text-sm"
            />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] items-stretch gap-3">
              {visible.map((p) => {
                const qty = cart[p.id] ?? 0;
                const color = p.sessionType ? sessionTypeColor(p.sessionType, dark) : undefined;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}
                    style={color ? { borderLeftColor: color, borderLeftWidth: 3 } : undefined}
                    className={`relative flex h-[136px] flex-col gap-1 rounded-xl border px-3.5 py-3 text-left hover:bg-row hover:border-accent ${
                      qty > 0 ? "border-accent" : "border-divider"
                    }`}
                  >
                    {qty > 0 && (
                      <span className="absolute right-2 top-2 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-on-accent">
                        {qty}
                      </span>
                    )}
                    <span className="text-[10.5px] font-semibold tracking-wide uppercase" style={color ? { color } : undefined}>
                      {p.sessionType ? shortLabel(p.sessionType) : p.category}
                    </span>
                    <span className="line-clamp-2 flex-1 text-pretty text-sm font-medium">{p.name}</span>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[15px] font-semibold tabular-nums">
                        {p.price ? money(p.price) : "$0"}
                        {p.recur && <span className="text-xs font-normal text-muted">{p.recur}</span>}
                      </span>
                      <span className="text-[11.5px] text-muted">{p.meta}</span>
                    </span>
                  </button>
                );
              })}
              {visible.length === 0 && <div className="col-span-full px-1 py-6 text-[13.5px] text-muted">No products match &quot;{query}&quot;.</div>}
            </div>
          </Card>
        </div>

        <aside className="card-shadow sticky top-[82px] flex flex-col gap-3.5 rounded-2xl bg-surface px-[22px] py-5">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-[15.5px] font-semibold">Current sale</h5>
            <button type="button" onClick={() => setCart({})} className="text-[12.5px] text-muted hover:text-bad">
              Clear
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Member</span>
            <Select
              value={member}
              onChange={setMember}
              options={[{ value: "", label: "Walk-in" }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
              className="h-[38px] rounded-lg px-2 text-sm"
            />
          </label>
          {member && (
            <div className="-mt-1.5 flex items-center gap-2.5">
              <Link href={`/members/${member}`} className="text-[12.5px] text-link hover:text-link-hover">
                View profile
              </Link>
              {selectedMember && selectedMember.balance > 0 && (
                <span className="text-[12.5px] text-bad">{money(selectedMember.balance)} already due</span>
              )}
            </div>
          )}

          <div className="h-px bg-divider" />

          {lines.length === 0 && <div className="py-4 text-[13.5px] text-muted">No items yet. Tap a product to start a sale.</div>}

          <div className="flex flex-col gap-2.5">
            {lines.map((p) => {
              const u = unitPrice(p);
              const overridden = !p.variablePrice && amounts[p.id] != null && amounts[p.id] !== "" && Number(amounts[p.id]) !== p.price;
              return (
                <div key={p.id} className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-pretty text-[13.5px] font-medium">{p.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11.5px] tabular-nums ${overridden ? "text-accent" : "text-muted"}`}>
                        {p.variablePrice && !u ? "Enter an amount" : overridden ? `${money(u)} each · was ${money(p.price)}` : `${money(u)} each`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditing((s) => ({ ...s, [p.id]: !s[p.id] }))}
                        title="Override price"
                        className="grid h-5 w-5 flex-none place-items-center rounded text-muted hover:bg-row hover:text-fg"
                      >
                        <PencilIcon size={11} />
                      </button>
                    </div>
                    {(p.variablePrice || editing[p.id]) && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-xs text-muted">$</span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={amounts[p.id] ?? ""}
                          placeholder={p.variablePrice ? "0.00" : p.price.toFixed(2)}
                          onChange={(e) => setAmounts((a) => ({ ...a, [p.id]: e.target.value }))}
                          className="h-7 w-20 rounded-md border border-divider bg-transparent px-2 text-[12.5px] tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => setAmounts((a) => { const n = { ...a }; delete n[p.id]; return n; })}
                          className="text-[11.5px] text-muted hover:text-fg"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-none items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setCart((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}
                      className="grid h-[26px] w-[26px] place-items-center rounded-lg border border-divider text-muted hover:bg-row hover:text-fg"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-[13px] tabular-nums">{cart[p.id]}</span>
                    <button
                      type="button"
                      onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}
                      className="grid h-[26px] w-[26px] place-items-center rounded-lg border border-divider text-muted hover:bg-row hover:text-fg"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-16 flex-none text-right text-[13.5px] font-medium tabular-nums">{money(u * cart[p.id])}</span>
                </div>
              );
            })}
          </div>

          <div className="h-px bg-divider" />

          <div>
            <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Discount</div>
            <div className="flex items-center gap-1.5">
              {(["%", "$"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiscMode(d)}
                  className={`h-[34px] w-9 flex-none rounded-lg border text-[13px] ${discMode === d ? "border-accent bg-row font-semibold" : "border-divider"}`}
                >
                  {d}
                </button>
              ))}
              <input
                type="number"
                min={0}
                step={5}
                value={discValue}
                onChange={(e) => setDiscValue(e.target.value)}
                placeholder="0"
                className="h-[34px] min-w-0 flex-1 rounded-lg border border-divider bg-transparent px-2.5 text-[13.5px] tabular-nums"
              />
              <button type="button" onClick={() => setDiscValue("")} className="h-[34px] flex-none rounded-lg border border-divider px-2.5 text-[12.5px] text-muted hover:bg-row hover:text-fg">
                Clear
              </button>
            </div>
          </div>

          {linked.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Purchasing for</div>
              <Select
                value={onBehalf}
                onChange={setOnBehalf}
                placeholder="Themselves"
                options={[{ value: "", label: "Themselves" }, ...linked.map((l) => ({ value: l.id, label: l.name }))]}
                className="h-[34px] w-full rounded-lg px-2 text-[13.5px]"
              />
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[13.5px] tabular-nums">
            {discAmt > 0 && (
              <>
                <span className="text-muted">Items</span>
                <span className="text-right">{money(gross)}</span>
                <span className="text-accent">Discount</span>
                <span className="text-right text-accent">−{money(discAmt)}</span>
              </>
            )}
            <span className="text-muted">Subtotal</span>
            <span className="text-right">{money(subtotal)}</span>
            <span className="text-muted">Tax ({(taxRate * 100).toFixed(taxRate * 100 === Math.round(taxRate * 100) ? 0 : 2)}%)</span>
            <span className="text-right">{money(tax)}</span>
            <span className="text-[17px] font-semibold">Total</span>
            <span className="text-right text-[17px] font-semibold">{money(total)}</span>
          </div>

          <div>
            <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Payment method</div>
            <div className={`grid grid-cols-2 gap-1.5 ${invoiceUnpaid ? "pointer-events-none opacity-40" : ""}`}>
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`h-9 rounded-lg border text-[13px] ${method === m ? "border-accent bg-row font-semibold" : "border-divider"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            {wantsCardCharge && !member && (
              <div className="mt-1.5 text-[12px] text-bad">Select a member to charge a card.</div>
            )}
            {wantsCardCharge && member && cardOnFile === null && (
              <div className="mt-1.5 text-[12px] text-accent">No card on file for {memberName} — add one to charge.</div>
            )}
          </div>

          {member && (
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={invoiceUnpaid} onChange={(e) => setInvoiceUnpaid(e.target.checked)} className="h-4 w-4" />
              Leave unpaid — invoice {memberName} for this later
            </label>
          )}

          {saleError && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">{saleError}</div>}

          <button
            type="button"
            disabled={lines.length === 0 || needsAmount || isPending || (wantsCardCharge && !member)}
            onClick={() => {
              setSaleError(null);
              if (wantsCardCharge && member && cardOnFile === null) {
                setCardDialogOpen(true);
                return;
              }
              startTransition(runCharge);
            }}
            className="h-11 rounded-full bg-accent text-[14.5px] font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-45"
          >
            {lines.length === 0 ? "Add items to charge" : isPending ? "Charging…" : invoiceUnpaid ? `Add ${money(total)} to account` : `Charge ${money(total)}`}
          </button>
        </aside>
      </div>

      {cardDialogOpen && member && (
        <CardOnFileDialog
          memberId={member}
          memberName={memberName}
          onClose={() => setCardDialogOpen(false)}
          onSaved={() => {
            refetchCardOnFile();
            setCardDialogOpen(false);
            startTransition(runCharge);
          }}
        />
      )}
    </div>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={null}>
      <POSInner />
    </Suspense>
  );
}
