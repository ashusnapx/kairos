import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "KAIROS — KYC Autonomous Intelligence & Risk Oversight System",
  description: "From document verification to explainable trust decisions.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#12121a",
              border: "1px solid #2a2a3a",
              color: "#e2e8f0",
            },
          }}
        />
      </body>
    </html>
  )
}

function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
