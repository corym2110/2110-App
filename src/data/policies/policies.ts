import type { WaiverBlock } from "@/data/waivers/adultLiabilityWaiver";

/** Reference-only business policies — not e-signed, just linked/printed for a client to read.
    Reviewed against the source Word documents on 2026-09-16. */

export const CANCELLATION_POLICY: WaiverBlock[] = [
  {
    heading: "Cancellation",
    body:
      "24 hours notice is required for cancellation of personal training and group training sessions. Missed sessions without the appropriate notice will be charged as if attended. Extenuating Circumstances — cancellation is permitted where an individual is not able to participate in their session due to unforeseen or uncontrollable circumstances. Examples of extenuating circumstances include but are not limited to significant illness or injury, the death of a close family member, personal trauma, being a victim of crime, natural disaster, etc.",
  },
  {
    heading: "Private Training",
    body:
      "If your scheduling conflict is known in advance and we are notified at least 24 hours ahead of time, it MAY be possible to make the session up at a later date or with a different trainer. However this cannot be guaranteed. Any sessions missed with less than 24 hours notification are forfeited. If you have not already paid for the session, your account/card will be charged for the full amount of the session. If no card/account information is present, no further sessions will be conducted until the outstanding payment is received. Additionally, reserved time slots may be lost if payment is not made in a timely manner.",
  },
  {
    heading: "Classes",
    body:
      "If your scheduling conflict is known in advance and we are notified at least 24 hours ahead of time, it MAY be possible to make the session up at a later date or with a different group. However this cannot be guaranteed. Any classes missed without 24 hour notification are forfeited. If you have not already paid for the class, your account/card will be charged for the full amount of the session.",
  },
  {
    heading: "Membership",
    body:
      "Must notify the facility that there is a wish to cancel the membership prior to renewal date. There is no fee for cancellation. Memberships can be put on hold if the member will be absent for a minimum two week time period. Memberships may also be put on hold indefinitely if the member will be absent for an undetermined period of time. Notice must be given prior to absence and cannot be back dated. Following an initial hold request, if within a three week period, the member requests a second hold period when a membership renewal is to occur, the member will be subject to a $100.00 administration fee.",
  },
  {
    heading: "BodPod",
    body:
      "If 24 hours or more is given for a cancellation and/or return of BodPod Purchase, there will be a return issued to the purchaser. If BodPods have been purchased in a package, the lowest denomination of dollar value to that package will be issued back to the customer for the return. All Bodpods expire 1 year post purchase.",
  },
];

export const REFUND_POLICY: WaiverBlock[] = [
  {
    heading: "Private Training",
    body:
      "Missed sessions without the appropriate notice will be charged as if attended. Medical Cancellations — cancellation is permitted where an individual is not able to participate in a single session for medical reasons. A doctor’s note confirming that the client was not permitted to participate is required within seven (7) days of the missed session and, upon receipt, a credit will be issued and a make-up session will be scheduled. If that is not possible due to circumstances regarding the doctor's note, a refund will be issued.",
  },
  {
    heading: "BodPod",
    body:
      "If 24 hours or more is given for a cancellation and/or return of a BodPod purchase, there will be a return issued to the purchaser. If BodPods have been purchased in a package, the lowest denomination of dollar value to that package will be issued back to the customer for the return. All BodPods expire 1 year post purchase.",
  },
  {
    heading: "Classes",
    body:
      "If your scheduling conflict is known in advance and we are notified at least 24 hours ahead of time, it MAY be possible to return the class purchase. If you are returning unused classes you will only be refunded the classes you did not use.",
  },
  {
    heading: "Membership",
    body: "All memberships must notify before the renewal date if they are going to be cancelled. There is no return policy for a membership that has been renewed and the individual did not notify prior to the renewal date.",
  },
];

export const PRIVACY_POLICY: WaiverBlock[] = [
  {
    heading: "Your Privacy",
    body:
      "2110 Fitness Inc. respects your privacy and pledges to maintain the confidentiality of your personal information. All personal information you share with us is maintained in accordance with the Personal Information Protection and Electronic Documents Act (2000). For questions regarding our privacy policy please write to: Privacy Policy, 2110 Fitness Inc., Calgary, Alberta, Canada, T2H 0C6.",
  },
  {
    heading: "Legal Obligation of Information Release",
    body:
      "2110 Fitness Inc. will release any information that is required to be released by law or court order. In exceptional circumstances it may be necessary that we disclose your personally identifiable information if we believe in good faith that disclosure is otherwise necessary or advisable to protect 2110 Fitness Inc.'s interests. We will seek to ensure that any proposed disclosure is required in the circumstances and then ensure that we disclose only the information that is required.",
  },
  {
    heading: "Use of Your Information",
    body:
      "2110 Fitness Inc. obtains most of our information through signing waivers and completion of PAR-Q forms and, with your consent, may also obtain personal information about you from third parties (such as a parent, guardian, or coach registering and paying for you). Under no circumstances do we sell participant information to others, and we will not share health information provided in connection with a program, program withdrawal, or refund request except with your consent.",
  },
  {
    heading: "Securing Your Information",
    body: "2110 Fitness Inc. uses secure server software (SSL) to protect your credit card and personal information against fraudulent use.",
  },
  {
    heading: "Collection of Information",
    body:
      "We collect personally identifiable information — names, postal addresses, email addresses, etc. — when voluntarily submitted, and use it only to fulfill your specific request unless you give us permission to use it another way (for example, adding you to a mailing list).",
  },
  {
    heading: "Cookie/Tracking Technology",
    body:
      "Our site may use cookies and tracking technology to understand browser type, visitor counts, and site usage, and to customize the site. Personal information is not collected via cookies, though cookies may be tied to information you've previously provided.",
  },
  {
    heading: "Distribution of Information",
    body:
      "We may share information with governmental agencies or other companies assisting in fraud prevention or investigation, when permitted or required by law or to protect against or investigate actual or potential fraud. This information is never provided to these companies for marketing purposes.",
  },
];
