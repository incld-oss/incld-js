"use client"

import { IncldProvider, type IncldProviderProps } from "@incld/react"

export function Providers({ children }: { children: IncldProviderProps["children"] }) {
 return (
  <IncldProvider
   baseUrl="/api/incld"
   appearance={{ colorScheme: "system", accentColor: "indigo" }}
   onError={(error) => console.error(error.code, error.requestId)}
  >
   {children}
  </IncldProvider>
 )
}
