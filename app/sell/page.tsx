import { PageHeader } from "@/components/PageHeader";
import { SellDesk } from "@/components/SellDesk";

export default function SellPage() {
  return (
    <>
      <PageHeader
        kicker="Sell"
        title="Open an address, then mock the deposit."
        lede="Generate a permanent Breet deposit address for a sandbox asset. Mock trade credits that address without sending real crypto."
      />
      <SellDesk />
    </>
  );
}
