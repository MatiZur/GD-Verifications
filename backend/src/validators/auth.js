export function validateRegistration({ username, email, password } = {}) {
  if (!username || !email || !password) return 'Todos los campos son obligatorios';
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return 'El usuario debe tener entre 3 y 30 caracteres y solo puede contener letras, números y guiones bajos';
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'El email no es válido';
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return 'La contraseña debe tener entre 8 y 72 caracteres';
  }
  return null;
}
