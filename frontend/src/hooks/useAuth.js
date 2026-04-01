// JWT token'ı parse ederek kullanıcı bilgisi ve rolünü döndürür
function parseToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));

    const role =
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      payload['role'] ||
      null;

    const name =
      payload['FullName'] ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      '';

    const department = payload['Department'] || '';

    const id =
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      payload['sub'] ||
      null;

    return { id, name, department, role };
  } catch {
    return null;
  }
}

export function useAuth() {
  const user = parseToken();

  const role = user?.role ?? null;
  const isAdmin   = role === 'Admin';
  const isManager = role === 'Manager' || role === 'Admin';
  const isStaff   = role === 'Staff';
  const isLoggedIn = !!user;

  function hasRole(...roles) {
    return roles.includes(role);
  }

  return { user, role, isAdmin, isManager, isStaff, isLoggedIn, hasRole };
}
