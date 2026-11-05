import { PageHeader } from "@/components/PageHeader";
import { SellDesk } from "@/components/SellDesk";

export default function SellPage() {
  return (
    <>
      <PageHeader
        kicker="Sell"
        title="Take a crypto deposit."
        lede="Choose a token, then its network, and generate a permanent Breet address. A sandbox mock deposit stays available after the address exists."
      />
      <SellDesk />
    </>
  );
}
