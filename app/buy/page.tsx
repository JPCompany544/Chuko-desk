import { BuyForm } from "@/components/BuyForm";
import { PageHeader } from "@/components/PageHeader";

export default function BuyPage() {
  return (
    <>
      <PageHeader
        kicker="Buy"
        title="Withdraw USDT or USDC."
        lede="Spend USD balance and send stablecoins to an external wallet. The withdrawal PIN stays in the server environment."
      />
      <BuyForm />
    </>
  );
}
