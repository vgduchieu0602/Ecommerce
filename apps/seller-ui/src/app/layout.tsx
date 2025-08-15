import Providers from "apps/seller-ui/src/app/provider";
import "./global.css";

export const metadata = {
  title: "TrungFood Seller",
  description: "TrungFood for seller",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
