import { getMembers } from "@/server/members";
import { MembersList } from "@/components/members/MembersList";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await getMembers();
  return <MembersList members={members} />;
}
