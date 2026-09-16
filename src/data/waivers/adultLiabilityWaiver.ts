/** Combines the business's "Terms & Conditions" and "General Assumption of Risk & Limitation of
    Liability" documents into the single waiver an adult signs at intake — their content overlaps
    substantially (both cover the liability release), so they're presented as one signed document
    rather than two. Reviewed against the source Word documents on 2026-09-16. */
export const ADULT_LIABILITY_WAIVER_VERSION = "2026-09-16";

export interface WaiverBlock {
  heading?: string;
  body: string;
}

export const ADULT_LIABILITY_WAIVER: WaiverBlock[] = [
  {
    heading: "Contract Terms & Conditions",
    body:
      "All services purchased from 2110 Fitness Inc. must be preceded by the applicant acknowledging, by way of completing a PAR-Q form and/or Client Information/Waiver form, that he/she has no physical limitations preventing him/her from participation. All applicants under the age of 18 years must have consent, in written form, from a parent or guardian. The applicant also agrees to abide by the rules and regulations of 2110 Fitness Inc. and acknowledges that these rules and regulations may change from time to time. Furthermore, all applicants release 2110 Fitness Inc., its owners, directors, managers and all employees of all liability regarding (1) any injury to self or child, and (2) any loss or damage to personal property. If purchasing packages that require payment to be made in installments, the applicant agrees to approve such installments be made by credit card on the dates pre-determined in the services contract.",
  },
  {
    heading: "Registration & Purchase",
    body:
      "To register or purchase from the 2110 Fitness Inc. online booking system, you must be over eighteen years of age unless having predicated written consent. You must ensure that the details provided by you on registration or at any time are correct and complete.",
  },
  {
    heading: "General Assumption of Risk & Limitation of Liability",
    body:
      'By signing this contract, enrolling online, and/or attending classes, events, activities, and other programs of 2110 Fitness whether online or in the 2110 Fitness facility or using 2110 Fitness’ equipment, you hereby acknowledge and agree, on behalf of yourself, your heirs, personal representatives and/or assigns (collectively "you" and/or "yourself"), that (a) there are certain inherent risks and dangers in the potentially strenuous nature of the 2110 Fitness workout program (b) you have voluntarily chosen to participate in an intense physical exercise program, (c) 2110 Fitness strongly recommends that you consult with your physician prior to commencing any classes; (d) you have been fully informed of the strenuous nature of this exercise program and the possibility of adverse physiological occurrences including, but not limited to: abnormal blood pressure, fainting, heart attack or death; and (e) you assume all risk for your health and well-being, and fully release and hold harmless for any responsibility, cost or damages of 2110 Fitness, its instructors, members and employees for any injury, harm or loss you may suffer, including death, as a result of participation in any 2110 Fitness’ activities.',
  },
  {
    body:
      "If you are enrolling a minor (15–18 years of age, or older if applicable in the minor’s state of residence), the above release applies equally to said minor. No one under 15 years of age may participate. A minor 15–18 years of age may participate only with a parent or legal guardian present.",
  },
  {
    body:
      'By signing this document, enrolling online, and/or attending in person classes, events, activities, and other programs and/or entering the 2110 Fitness facility and using equipment, you voluntarily agree, on behalf of yourself, your heirs, personal representatives and/or assigns, and any minor child you may enroll: (a) to assume all of the foregoing risks and accept sole responsibility for any injury, illness, damage, loss, claim, liability, or expense, of any kind (including, but not limited to, personal injury, disability, and death) that may occur to you or your family members in connection with attendance at 2110 Fitness or as a result of participation in programs at/from 2110 Fitness ("Claims"); and (b) covenant not to sue, 2110 Fitness, its instructors, clients, and employees, from the Claims, including all liabilities, claims, actions, damages, costs or expenses of any kind arising out of or relating thereto, based on the actions, omissions, or negligence of 2110 Fitness, its instructors, members, and employees, whether a COVID-19 infection occurs before, during, or after attending the 2110 Fitness facility or participating in any 2110 Fitness program.',
  },
  {
    heading: "Non-Recording of Live Studio/Online Classes Agreement",
    body:
      "You acknowledge and agree that any type of recording or transmission (video, audio, still photography, streaming, social media posting, etc.) of any live 2110 Fitness class or activity, whether in person or online, is strictly prohibited without the prior written consent of an authorized corporate officer of 2110 Fitness. 2110 Fitness instructors are not authorized to provide consent. This includes even a temporary recording/transmission of a live 2110 Fitness virtual class via online platforms such as SnapChat, Facebook, or Instagram. You are, however, permitted to record and post lawful, non-offensive content related to your participation in a 2110 Fitness virtual or facility class before and/or after a class with the consent of each participant who is identified in your content.",
  },
  {
    body:
      "Any violation of this policy is grounds for exclusion from participation in any 2110 Fitness activity. You further agree to indemnify, defend, and hold harmless 2110 Fitness, its officers, directors, employees, agents, and instructors, from and against any claims, lawsuits or other actions, and all resulting loss, damage or cost of any kind (including reasonable attorneys’ fees), resulting from your violation of this policy.",
  },
  {
    heading: "Non-Harassment Policy",
    body:
      "2110 Fitness disapproves of any unwelcomed, inappropriate and/or offensive conduct by its personnel or its members. If you believe you have been subject to unwelcomed, inappropriate, and/or offensive conduct by any 2110 Fitness personnel, including while participating in a 2110 Fitness Virtual At-Home Individual or Group Session, at the 2110 Fitness facility, or any other 2110 Fitness-related context, we encourage you to clearly and promptly tell the person engaging in the conduct that is unwelcomed and offensive (if you are comfortable doing so). We also ask that you promptly notify a member of 2110 Fitness at admin@2110fitness.com.",
  },
  {
    body:
      "When making a report or complaint, we strongly recommend that you provide as much specific information as possible in writing, including the following regarding each alleged incident: date, time, place (the facility or time/type of virtual class), names of any witnesses, what was said or done, and any other relevant surrounding facts/circumstances.",
  },
  {
    body:
      "2110 Fitness will strive to appropriately investigate any reported incidents and seek to provide due process for all parties. 2110 Fitness’s responsive actions, however, cannot be known in advance since they will vary depending upon the nature of the allegations. 2110 Fitness strives to maintain confidentiality throughout the investigative process to the extent practicable. However, our duty to investigate and take corrective action as appropriate may require the disclosure of certain information, and therefore confidentiality cannot be guaranteed.",
  },
  {
    body: "Any disputes or complaints not resolved via this complaint process will be subject to the Arbitration of Disputes Agreement below.",
  },
  {
    heading: "Arbitration of Disputes Agreement",
    body:
      "Please read the following carefully — it may significantly affect your legal rights, including your right to file a lawsuit in court. If you and 2110 Fitness do not reach an agreed upon solution within a period of thirty (30) days from the time informal dispute resolution is pursued pursuant to the immediately preceding paragraph, then either party may initiate binding arbitration. All claims arising out of or relating to your use of the Services (including the formation, performance and breach of arbitration agreement), your and our relationship and/or your use of the Services shall be finally settled by binding arbitration administered by the Canadian Arbitration Association, excluding any rules or procedures governing or permitting class actions.",
  },
  {
    body:
      "Each party will have the right to use legal counsel in connection with arbitration at its own expense. You and 2110 Fitness shall select a single neutral arbitrator in accordance with the Commercial Arbitration Act. The arbitrator, and not any federal, provincial, or local court or agency, shall have exclusive authority to resolve all disputes arising out of or relating to the interpretation, applicability, enforceability or formation of this arbitration agreement, including, but not limited to, any claim that all or any part of this Agreement is void or voidable. The arbitrator shall be empowered to grant whatever relief would be available in a court under law or in equity. The arbitrator’s award shall be in writing and provide a statement of the essential findings and conclusions, shall be binding on you and us and may be entered as a judgment in any court of competent jurisdiction. The interpretation and enforcement of this arbitration agreement and all other agreements between you and 2110 Fitness shall be subject to the Commercial Arbitration Act.",
  },
  {
    body: "The current Canadian Arbitration Association Rules governing the arbitration may be accessed at canadianarbitrationassociation.ca.",
  },
  {
    body:
      "You and 2110 Fitness understand that, absent this mandatory provision, you and 2110 Fitness would have the right to sue in court and have a jury trial. You and 2110 Fitness further understand that the right to discovery may be more limited in arbitration than in court.",
  },
  {
    heading: "Class Action and Class Arbitration Waiver",
    body:
      'You and 2110 Fitness each further agree that any arbitration shall be conducted in our respective individual capacities only and not as a class, collective, or representative ("Class") action, and you and 2110 Fitness each expressly waive our respective right to file a Class action or seek relief on a Class basis. If any court or arbitrator determines that the class action waiver set forth in this paragraph is void or unenforceable for any reason or that an arbitration can proceed on a Class basis, then the arbitration provision set forth above shall be deemed null and void in its entirety and you and 2110 Fitness shall be deemed to have not agreed to arbitrate disputes.',
  },
  {
    body:
      "Exception — Small Claims Court Claims. Notwithstanding your and 2110 Fitness agreement to resolve all disputes through arbitration, either you or 2110 Fitness may seek relief in a small claims court for disputes or claims within the scope of that court’s jurisdiction.",
  },
  {
    heading: "14 Day Right to Opt-Out",
    body:
      "You have the right to opt-out and not be bound by the arbitration and Class action waiver provisions set forth above by sending written notice of your decision to opt-out by emailing us at admin@2110fitness.com and providing the following information: (i) your name, (ii) your mailing address; (iii) a statement of your wish not to resolve disputes with 2110 Fitness through arbitration. The notice must be sent within fourteen (14) days of your agreement to the Terms of Use, otherwise you shall be bound to arbitrate disputes in accordance with the terms of this Section. If you opt-out of these arbitration provisions, 2110 Fitness also will not be bound by them.",
  },
  {
    heading: "Exclusive Venue for Litigation and Governing Law",
    body:
      "To the extent that the arbitration provisions set forth above do not apply or if you have opted out of arbitration, you and 2110 Fitness expressly consent that any litigation between you and us shall be filed exclusively in provincial or federal courts located in and governed by the laws of the Province in which the dispute arose (except for small claims court actions which may be brought in the county where you reside), or, if in connection with 2110 Fitness Virtual Sessions, the province in which the class was taught, without giving effect to any principles of conflicts of law. In the event of litigation, you and 2110 Fitness agree to waive, to the maximum extent permitted by law, any right to a jury trial, except where a jury trial waiver is not permissible under applicable law.",
  },
];
