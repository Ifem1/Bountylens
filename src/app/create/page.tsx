import { CreateBountyForm } from "@/components/CreateBountyForm";

export default function CreatePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">Create a Bounty</h1>
        <p className="text-sm text-[#94A3B8]">
          Define your criteria carefully — they lock on-chain when the first submission arrives.
        </p>
      </div>
      <CreateBountyForm />
    </div>
  );
}
