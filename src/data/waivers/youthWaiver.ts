import type { WaiverBlock } from "./adultLiabilityWaiver";

/** Reviewed against the source "Youth Waiver" Word document on 2026-09-16. The pickup-authorized
    list is a free-text field captured separately at signing rather than baked into this content. */
export const YOUTH_WAIVER_VERSION = "2026-09-16";

export const YOUTH_WAIVER: WaiverBlock[] = [
  {
    heading: "2110 Fitness Youth Waiver Form",
    body: "This form gives permission for a child/youth to participate in fitness activities at 2110 Fitness.",
  },
  {
    body:
      "By signing this contract, enrolling online, and/or attending classes, events, activities, and other programs of 2110 Fitness whether online or in the 2110 Fitness facility or using 2110 Fitness’ equipment, the undersigned guardian hereby acknowledges and agrees that (a) there are certain inherent risks and dangers in the potentially strenuous nature of a 2110 Fitness training program; (b) they have voluntarily chosen to allow their child to participate in an intense physical exercise program; (c) 2110 Fitness strongly recommends consulting with the child’s physician prior to commencing any training programs if there are any concerns; (d) they have been fully informed of the strenuous nature of the exercise program and the possibility of adverse physiological occurrences including, but not limited to: abnormal blood pressure, fainting, heart attack, or death; and (e) they assume all risk for the health and well-being of their child, and fully release and hold harmless for any responsibility, cost, or damages of 2110 Fitness, its instructors, members and employees for any injury, harm, or loss the child may suffer, including death, as a result of participation in any 2110 Fitness activities.",
  },
  {
    body:
      "If a medical emergency arises, reasonable effort will be made to contact the child's guardian but priority will be to ensure the child's well-being, and appropriate action — including initiation of medical treatment — may be taken without the guardian's consultation.",
  },
  {
    body:
      "In consideration of the child's voluntary participation in group or individual fitness activities, the guardian releases 2110 Fitness, its directors, trainers, employees, and all organizations or individuals assisting in promoting, conducting, and otherwise affiliated with 2110 Fitness and the activities offered by the facility from any and all causes of action or claims, including claims for negligence (but not willful, fraudulent, or malicious conduct) for any damages, expenses, losses, or injuries arising from or relating to the child's participation.",
  },
];
