// JWT token'ı parse ederek kullanıcı bilgisi ve rolünü döndürür
const MODULES = ['rehber', 'gorev', 'izin', 'harc', 'veriYukleme', 'tevhid', 'imarPlanlari', 'ozelSayfalar', 'kullanicilar', 'map'];

// Müdür ve Şef = Manager seviyesi
export const MANAGER_ROLES = ['Admin', 'Müdür', 'Şef'];
const STAFF_ROLES = ['Harita Mühendisi', 'Harita Teknikeri', 'Memur', 'Şehir Plancısı'];

function decodeJwtPayload(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

function parseToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = decodeJwtPayload(token);

    // Token süresi dolmuş mu kontrol et
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return null;
    }

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
  // Admin/Müdür/Şef → tüm modüller açık
  if (MANAGER_ROLES.includes(role)) {
    return Object.fromEntries(MODULES.map(m => [m, { view: true, edit: true }]));
  }
  // Staff rolleri → JWT claim'inden parse et
  try {
    const parsed = JSON.parse(permissionsRaw);
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
  const isManager = MANAGER_ROLES.includes(role);
  const isStaff   = STAFF_ROLES.includes(role);
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
