export const ROLE_CODES = ['cliente', 'barbero', 'comercial', 'admin'] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export function isRoleCode(value: string): value is RoleCode {
  return (ROLE_CODES as readonly string[]).includes(value);
}

export function roleHomePath(role: RoleCode): string {
  switch (role) {
    case 'cliente':
      return '/client/home';
    case 'barbero':
      return '/barber/dashboard';
    case 'comercial':
      return '/commercial/dashboard';
    case 'admin':
      return '/admin/dashboard';
  }
}
