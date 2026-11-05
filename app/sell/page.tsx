import { PageHeader } from "@/components/PageHeader";
import { SellDesk } from "@/components/SellDesk";

export default function SellPage() {
  return (
    <>
      <PageHeader
        kicker="Sell"
        title="Take a crypto deposit."
        lede="Choose a token, then a network when the token has more than one. Breet creates the deposit address for that asset."
      />
      <SellDesk />
    </>
  );
}
