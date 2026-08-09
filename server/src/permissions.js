export const PERMISSIONS = Object.freeze({
  OPERATIONAL_READ:'operational.read',
  OPERATIONAL_WRITE:'operational.write',
  OPERATIONAL_DELETE:'operational.delete',
  OFFICE_USERS_MANAGE:'office.users.manage',
  VALIDATION_READ:'validation.read',
  VALIDATION_EXECUTE:'validation.execute',
  SYSTEM_ADMIN:'system.admin'
});

const matrix = new Map([
  ['office-user', new Set([PERMISSIONS.OPERATIONAL_READ,PERMISSIONS.OPERATIONAL_WRITE,PERMISSIONS.OPERATIONAL_DELETE])],
  ['office-admin', new Set([PERMISSIONS.OPERATIONAL_READ,PERMISSIONS.OPERATIONAL_WRITE,PERMISSIONS.OPERATIONAL_DELETE,PERMISSIONS.OFFICE_USERS_MANAGE])],
  ['safety-environment-director', new Set([PERMISSIONS.OPERATIONAL_READ,PERMISSIONS.OPERATIONAL_WRITE,PERMISSIONS.VALIDATION_READ])],
  ['safety-environment-staff', new Set([PERMISSIONS.OPERATIONAL_READ,PERMISSIONS.VALIDATION_READ])],
  ['safety-environment-admin', new Set(Object.values(PERMISSIONS))],
  ['validator', new Set([PERMISSIONS.VALIDATION_READ,PERMISSIONS.VALIDATION_EXECUTE])],
  ['revision-validator', new Set([PERMISSIONS.VALIDATION_READ,PERMISSIONS.VALIDATION_EXECUTE])],
  ['guest', new Set()]
]);

export const hasPermission = (role, permission) => Boolean(matrix.get(role)?.has(permission));
export const requirePermission = permission => (req,res,next) => hasPermission(req.user?.role,permission)
  ? next()
  : res.status(403).json({error:'この操作を行う権限がありません。'});
export const rolePermissionSnapshot = () => Object.fromEntries([...matrix.entries()].map(([role,set])=>[role,[...set].sort()]));
