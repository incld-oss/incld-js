export interface QuickstartSession {
  user: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  organizationId: string;
}

export async function auth(): Promise<QuickstartSession | null> {
  // Replace this fixture with the server-side session lookup from your auth provider.
  return null;
}
