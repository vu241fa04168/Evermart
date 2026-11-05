export function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, address: user.address || null, createdAt: user.createdAt }
}

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}
