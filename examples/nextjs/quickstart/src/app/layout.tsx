import type { Metadata } from "next"
import type { ReactNode } from "react"
import "@incld/react/styles.css"
import "@incld/react-schedules/styles.css"

export const metadata: Metadata = {
 title: "incld quickstart contract",
 description: "Compiling fixture for the published Next.js quickstart",
}

export default function RootLayout({ children }: { children: ReactNode }) {
 return (
  <html lang="en">
   <body>{children}</body>
  </html>
 )
}
