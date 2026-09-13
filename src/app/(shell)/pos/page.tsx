"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { PlusIcon, PencilIcon } from "@/components/ui/icons";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { useSharedAccountsStore } from "@/stores/sharedAccounts";
import { CATALOG, matchProduct } from "@/data/mock/catalog";
import { MEMBERS } from "@/data/mock/members";
import { money } from "@/lib/time";
import type { Product } from "@/types";

const CATEGORIES: Product["category"][] = ["Personal Training", "Memberships", "Assessments", "Other"];
const PAYMENT_METHODS = ["Card", "Cash", "E-transfer", "Package credit"];

function POSInner() {
  const params = useSearchParams();
  const initialMember = params.get("member") ? decodeURIComponent(params.get("member")!) : "Walk-in";
  const preselect = useMemo(() => {
    const type = params.get("type");
    if (!type) return null;
    const coach = params.get("coach") ? decodeURIComponent(params.get("coach")!) : undefined;
    return matchProduct(decodeURIComponent(type), coach);
  }, [params]);

  const byPayer = useSharedAccountsStore((s) => s.byPayer);

  const [category, setCategory] = useState<Product["category"] | "All">("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>(preselect ? { [preselect.id]: 1 } : {});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [member, setMember] = useState(initialMember);
  const [onBehalf, setOnBehalf] = useState("");
  const [discMode, setDiscMode] = useState<"%" | "$">("%");
  const [discValue, setDiscValue] = useState("");
  const [method, setMethod] = useState("Card");
  const [receipt, setReceipt] = useState<string | null>(null);

  useHeaderAction(
    <HeaderButton
      onClick={() => {
        setCart({});
        setReceipt(null);
      }}
    >
      <PlusIcon size={15} />
      New sale
    </HeaderButton>,
  );

  const visible = CATALOG.filter((p) => {
    if (category !== "All" && p.category !== category) return false;
    if (query.trim() && !p.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  function unitPrice(p: Product): number {
    const v = amounts[p.id];
    if (v != null && v !== "") return Math.max(0, Number(v) || 0);
    return p.variablePrice ? 0 : p.price;
  }

  const lines = CATALOG.filter((p) => cart[p.id] > 0);
  const gross = lines.reduce((a, p) => a + unitPrice(p) * cart[p.id], 0);
  const discRaw = Math.max(0, Number(discValue) || 0);
  const discAmt = Math.min(gross, discMode === "%" ? gross * (Math.min(100, discRaw) / 100) : discRaw);
  const subtotal = gross - discAmt;
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const needsAmount = lines.some((p) => p.variablePrice && !unitPrice(p));

  const linked = byPayer[member] ?? [];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Point of sale</h2>
          <div className="text-[13.5px] text-muted">{lines.length} item{lines.length === 1 ? "" : "s"} in current sale</div>
        </div>
        <div className="ml-auto flex flex-wrap gap-1 rounded-[11px] border border-divider p-1">
          {(["All", ...CATEGORIES] as const).map((c) => (
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] items-start gap-3">
              {visible.map((p) => {
                const qty = cart[p.id] ?? 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}
                    className={`relative flex min-h-[104px] flex-col gap-1 rounded-xl border px-3.5 py-3 text-left hover:bg-row hover:border-accent ${
                      qty > 0 ? "border-accent" : "border-divider"
                    }`}
                  >
                    {qty > 0 && (
                      <span className="absolute right-2 top-2 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-on-accent">
                        {qty}
                      </span>
                    )}
                    <span className="text-[10.5px] font-semibold tracking-wide text-accent uppercase">{p.category}</span>
                    <span className="flex-1 text-pretty text-sm font-medium">{p.name}</span>
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
            <select value={member} onChange={(e) => setMember(e.target.value)} className="h-[38px] rounded-lg border border-divider bg-transparent px-2 text-sm">
              <option value="Walk-in">Walk-in</option>
              {MEMBERS.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {member !== "Walk-in" && (
            <Link href={`/members/${MEMBERS.find((m) => m.name === member)?.id ?? ""}`} className="-mt-1.5 flex items-center gap-1.5 text-[12.5px] text-link hover:text-link-hover">
              View profile
            </Link>
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
              <select value={onBehalf} onChange={(e) => setOnBehalf(e.target.value)} className="h-[34px] w-full rounded-lg border border-divider bg-transparent px-2 text-[13.5px]">
                <option value="">Themselves</option>
                {linked.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
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
            <span className="text-muted">GST (5%)</span>
            <span className="text-right">{money(tax)}</span>
            <span className="text-[17px] font-semibold">Total</span>
            <span className="text-right text-[17px] font-semibold">{money(total)}</span>
          </div>

          <div>
            <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Payment method</div>
            <div className="grid grid-cols-2 gap-1.5">
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
          </div>

          <button
            type="button"
            disabled={lines.length === 0 || needsAmount}
            onClick={() => setReceipt(`${money(total)} charged to ${member}`)}
            className="h-11 rounded-full bg-accent text-[14.5px] font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-45"
          >
            {lines.length === 0 ? "Add items to charge" : `Charge ${money(total)}`}
          </button>

          {receipt && (
            <div className="flex items-center gap-2.5 rounded-lg bg-row px-3.5 py-2.5 text-[13px]">
              <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-ok text-surface">✓</span>
              <span>{receipt}</span>
            </div>
          )}
        </aside>
      </div>
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
