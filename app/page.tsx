import { Overview } from "@/components/Overview";
import { PageHeader } from "@/components/PageHeader";

export default function HomePage() {
  return (
    <>
      <PageHeader
        kicker="Sandbox desk"
        title="Buy stablecoins. Take deposits."
        lede="CHUKO talks to the Breet sandbox from the server. Buy sends USDT or USDC out of the USD balance. Sell opens a deposit address and can mock a trade into it."
      />
      <Overview />
    </>
  );
}
