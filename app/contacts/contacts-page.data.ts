export type ContactRecord = {
  id: string
  name: string
  email: string
  source: "import" | "manual"
  status: "subscribed" | "unsubscribed"
  addedAt: string
}

export const initialContacts: ContactRecord[] = [
  { id: "ct-1", name: "Olivia Chen", email: "olivia@omakase.co", source: "import", status: "subscribed", addedAt: "2026-02-12" },
  { id: "ct-2", name: "Noah Patel", email: "noah@northfork.io", source: "manual", status: "subscribed", addedAt: "2026-02-14" },
  { id: "ct-3", name: "Ava Silva", email: "ava@gardenmail.net", source: "import", status: "unsubscribed", addedAt: "2026-02-16" },
]

export const contactsPageCopy = {
  title: "Contacts",
  subtitle: "Upload CSV files, add contacts manually, and manage your list in one place.",
}
