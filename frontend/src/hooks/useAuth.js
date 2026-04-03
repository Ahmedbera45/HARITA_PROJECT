// JWT token'ı parse ederek kullanıcı bilgisi ve rolünü döndürür
const MODULES = ['rehber', 'gorev', 'izin', 'harc', 'veriYukleme', 'tevhid', 'imarPlanlari', 'ozelSayfalar', 'kullanicilar'];

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

    const permissionsRaw = payload['Permissions'] || '{}';

    return { id, name, department, role, permissionsRaw };
  } catch {
    return null;
  }
}

function buildPermissions(role, permissionsRaw) {
  // Admin/Manager → all true
  if (role === 'Admin' || role === 'Manager') {
    return Object.fromEntries(MODULES.map(m => [m, { view: true, edit: true }]));
  }
  // Staff → parse from JWT claim
  try {
    const parsed = JSON.parse(permissionsRaw);
    // Ensure all modules present (default false if missing)
    const result = {};
    MODULES.forEach(m => {
      result[m] = { view: !!(parsed[m]?.view), edit: !!(parsed[m]?.edit) };
    });
    return result;
  } catch {
    return Object.fromEntries(MODULES.map(m => [m, { view: false, edit: false }]));
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

  const userId = user?.id ?? null;
  const permissions = buildPermissions(role, user?.permissionsRaw ?? '{}');

  const canView = (module) => !!(permissions[module]?.view);
  const canEdit = (module) => !!(permissions[module]?.edit);

  return { user, userId, role, isAdmin, isManager, isStaff, isLoggedIn, hasRole, permissions, canView, canEdit };
}
