import { createHash, randomUUID } from "crypto"

export type AuthProvider = "credentials" | "google" | "github"

type StoredUser = {
  id: string
  email: string
  name: string
  passwordHash?: string
  provider: AuthProvider
  createdAt: number
}

type SessionRecord = {
  token: string
  userId: string
  createdAt: number
}

type AuthStore = {
  usersById: Map<string, StoredUser>
  usersByEmail: Map<string, StoredUser>
  sessions: Map<string, SessionRecord>
}

declare global {
  // eslint-disable-next-line no-var
  var __newsletterAuthStore: AuthStore | undefined
}

const store: AuthStore = globalThis.__newsletterAuthStore ?? {
  usersById: new Map<string, StoredUser>(),
  usersByEmail: new Map<string, StoredUser>(),
  sessions: new Map<string, SessionRecord>(),
}

globalThis.__newsletterAuthStore = store

export class AuthStoreError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "AuthStoreError"
    this.status = status
  }
}

export type PublicUser = {
  id: string
  email: string
  name: string
  provider: AuthProvider
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex")
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
  }
}

export function createCredentialUser(input: { name: string; email: string; password: string }) {
  const email = normalizeEmail(input.email)

  if (store.usersByEmail.has(email)) {
    throw new AuthStoreError("Email already registered", 409)
  }

  const user: StoredUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash: hashPassword(input.password),
    provider: "credentials",
    createdAt: Date.now(),
  }

  store.usersById.set(user.id, user)
  store.usersByEmail.set(user.email, user)

  return toPublicUser(user)
}

export function loginWithCredentials(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email)
  const user = store.usersByEmail.get(email)

  if (!user || !user.passwordHash) {
    throw new AuthStoreError("Invalid email or password", 401)
  }

  const incomingHash = hashPassword(input.password)
  if (incomingHash !== user.passwordHash) {
    throw new AuthStoreError("Invalid email or password", 401)
  }

  return toPublicUser(user)
}

export function loginWithSocial(provider: Exclude<AuthProvider, "credentials">) {
  const email = `${provider}.user@mailerblaster.local`
  const existing = store.usersByEmail.get(email)

  if (existing) {
    return toPublicUser(existing)
  }

  const user: StoredUser = {
    id: randomUUID(),
    name: provider === "google" ? "Google User" : "GitHub User",
    email,
    provider,
    createdAt: Date.now(),
  }

  store.usersById.set(user.id, user)
  store.usersByEmail.set(user.email, user)

  return toPublicUser(user)
}

export function createSessionForUser(userId: string) {
  const user = store.usersById.get(userId)
  if (!user) {
    throw new AuthStoreError("User not found", 404)
  }

  const token = randomUUID()
  store.sessions.set(token, {
    token,
    userId,
    createdAt: Date.now(),
  })

  return token
}

export function getUserFromSession(token: string | undefined) {
  if (!token) return null

  const session = store.sessions.get(token)
  if (!session) return null

  const user = store.usersById.get(session.userId)
  if (!user) return null

  return toPublicUser(user)
}

export function deleteSession(token: string | undefined) {
  if (!token) return
  store.sessions.delete(token)
}
