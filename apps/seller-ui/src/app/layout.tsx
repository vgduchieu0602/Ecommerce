import Providers from "apps/seller-ui/src/app/provider";
import "./global.css";
import { Poppins } from "next/font/google";

export const metadata = {
  title: "TrungFood Seller",
  description: "TrungFood for seller",
};

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`min-h-screen font-sans antialiased ${poppins.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
