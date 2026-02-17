export const ROLE_CODES = ['client', 'barber', 'commercial', 'admin'] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export function isRoleCode(value: string): value is RoleCode {
  return (ROLE_CODES as readonly string[]).includes(value);
}

export function roleHomePath(role: RoleCode): string {
  switch (role) {
    case 'client':
      return '/client/home';
    case 'barber':
      return '/barber/dashboard';
    case 'commercial':
      return '/commercial/dashboard';
    case 'admin':
      return '/admin/dashboard';
  }
}
