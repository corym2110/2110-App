import { notFound } from "next/navigation";
import { getMemberById, getMembers, getSharedAccountLinks } from "@/server/members";
import { MemberProfile } from "@/components/members/MemberProfile";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();

  const [links, allMembers] = await Promise.all([getSharedAccountLinks(id), getMembers()]);
  const candidates = allMembers.filter((m) => m.id !== id).map((m) => ({ id: m.id, name: m.name }));

  return <MemberProfile member={member} paysFor={links.paysFor} paidBy={links.paidBy} candidates={candidates} />;
}
