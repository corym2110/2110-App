import type { Product } from "@/types";

// Ported from "2110 POS.dc.html"'s catalog().
export const CATALOG: Product[] = [
  { id: "pt-cory", name: "Personal Training – Cory", category: "Personal Training", price: 115, meta: "1 session" },
  { id: "pt-stu", name: "Personal Training – Stu", category: "Personal Training", price: 125, meta: "1 session" },
  { id: "pt-chris", name: "Personal Training – Chris", category: "Personal Training", price: 130, meta: "1 session" },
  { id: "pt-jhesica", name: "Personal Training – Jhesica", category: "Personal Training", price: 115, meta: "1 session" },
  { id: "pt-cole", name: "Personal Training – Cole", category: "Personal Training", price: 90, meta: "1 session" },
  { id: "pt-group", name: "Group Personal Training", category: "Personal Training", price: 57.5, meta: "Per person" },
  { id: "pt-elite", name: "Elite Dryland Training", category: "Personal Training", price: 250, meta: "Program" },
  { id: "consult", name: "Fitness Consult", category: "Personal Training", price: 50, meta: "Single consult" },

  { id: "mem-2x", name: "Membership – 2x/Week", category: "Memberships", price: 129, meta: "Auto-renews", recur: "/month" },
  { id: "mem-3x", name: "Membership – 3x/Week", category: "Memberships", price: 159, meta: "Auto-renews", recur: "/month" },
  { id: "mem-unl", name: "Membership – Unlimited", category: "Memberships", price: 189, meta: "Auto-renews", recur: "/month" },
  { id: "cls-10", name: "10 Class Pass", category: "Memberships", price: 200, meta: "10 classes" },
  { id: "cls-drop", name: "Class Drop-In", category: "Memberships", price: 25, meta: "Single class" },
  { id: "cls-free", name: "FREE Class Trial", category: "Memberships", price: 0, meta: "First class" },
  { id: "trial-7", name: "First Week FREE! 7 Day Trial", category: "Memberships", price: 0, meta: "7 days" },

  { id: "rem-std", name: "Remote Coaching – Standard", category: "Personal Training", price: 189, meta: "Auto-renews", recur: "/month" },
  { id: "rem-slv", name: "Remote Coaching – Silver", category: "Personal Training", price: 249, meta: "Auto-renews", recur: "/month" },
  { id: "rem-gld", name: "Remote Coaching – Gold", category: "Personal Training", price: 299, meta: "Auto-renews", recur: "/month" },
  { id: "rem-con", name: "Remote Coaching Consult", category: "Personal Training", price: 0, meta: "Intro call" },

  { id: "nut-macro", name: "Nutrition Coaching Macro – Member Add-On", category: "Other", price: 49, meta: "Add-on", recur: "/month" },
  { id: "nut-meal", name: "Nutrition Coaching Meal Plan – Member Add-On", category: "Other", price: 99, meta: "Add-on", recur: "/month" },
  { id: "nut-3mo", name: "Nutrition Coaching – 3 Months", category: "Other", price: 299, meta: "Prepaid" },

  { id: "bb", name: "Blueprint & Baseline Assessment", category: "Assessments", price: 200, meta: "90 min" },
  { id: "bod-1", name: "BodPod – Single", category: "Assessments", price: 75, meta: "Single scan" },
  { id: "bod-3", name: "BodPod – 3 Pack", category: "Assessments", price: 200, meta: "3 scans" },

  { id: "gc-custom", name: "2110 Fitness Gift Card – Custom Amount", category: "Other", price: 0, meta: "Amount at checkout", variablePrice: true },
  { id: "gc-outcome", name: "2110 Fitness Gift Card – Outcome Session", category: "Other", price: 0, meta: "Amount at checkout", variablePrice: true },
  { id: "gc-consult", name: "2110 Fitness Gift Card – Fitness Consult", category: "Other", price: 0, meta: "Amount at checkout", variablePrice: true },
  { id: "gc-group", name: "2110 Fitness Gift Card – Group Training", category: "Other", price: 0, meta: "Amount at checkout", variablePrice: true },
  { id: "gc-bod1", name: "2110 Fitness Gift Card – BodPod Single", category: "Other", price: 0, meta: "Amount at checkout", variablePrice: true },
  { id: "gc-bod3", name: "2110 Fitness Gift Card – BodPod 3 Pack", category: "Other", price: 0, meta: "Amount at checkout", variablePrice: true },
  { id: "gc-cls", name: "2110 Fitness Gift Card – Unlimited Class Membership", category: "Other", price: 0, meta: "Amount at checkout", variablePrice: true },
  { id: "gc-pt", name: "2110 Fitness Gift Card – Personal Training Friends & Family", category: "Other", price: 0, meta: "Amount at checkout", variablePrice: true },

  { id: "tee-99", name: "T-Shirt – 99 Problems & My Gym Ain't One", category: "Other", price: 30, meta: "S–XL" },
  { id: "nike-fleece", name: "NIKE Therma-FIT Fleece Pullover", category: "Other", price: 135, meta: "S–XL" },
];

export function productById(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id);
}

/** Match a schedule session-type + coach to the POS product it should pre-select. */
export function matchProduct(type: string, coachFullName?: string): Product | undefined {
  if (type === "Personal Training") {
    const first = (coachFullName ?? "").split(" ")[0].toLowerCase();
    const own = first ? CATALOG.find((p) => p.category === "Personal Training" && p.name.toLowerCase().endsWith(`– ${first}`)) : undefined;
    return own ?? productById("pt-cory");
  }
  const map: Record<string, string> = {
    "Group Training": "pt-group",
    Class: "cls-drop",
    "Remote Consult": "rem-con",
    Bodpod: "bod-1",
    "Blueprint and Baseline": "bb",
  };
  return map[type] ? productById(map[type]) : undefined;
}
