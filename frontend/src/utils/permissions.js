export const ROLES = {
  ADMIN: 'ADMIN',
  DEPARTMENT_COORDINATOR: 'DEPARTMENT_COORDINATOR',
  FACULTY: 'FACULTY',
  CLUB_REPRESENTATIVE: 'CLUB_REPRESENTATIVE',
  STUDENT: 'STUDENT',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.DEPARTMENT_COORDINATOR]: 'Department coordinator',
  [ROLES.FACULTY]: 'Faculty',
  [ROLES.CLUB_REPRESENTATIVE]: 'Club representative',
  [ROLES.STUDENT]: 'Student',
}

export function hasAnyRole(userRole, allowedRoles = []) {
  return Boolean(userRole && allowedRoles.includes(userRole))
}

export function canAccess(userRole, allowedRoles = []) {
  if (!allowedRoles.length) return true
  return hasAnyRole(userRole, allowedRoles)
}

export function getVisibleNavigation(userRole) {
  const items = [
    { label: 'Dashboard', path: '/admin', roles: [ROLES.ADMIN] },
    { label: 'Timetable', path: '/admin/timetable', roles: [ROLES.ADMIN] },
    { label: 'Exams', path: '/admin/exams', roles: [ROLES.ADMIN] },
    { label: 'Bookings', path: '/admin/bookings', roles: [ROLES.ADMIN] },
    { label: 'Disruptions', path: '/admin/disruptions', roles: [ROLES.ADMIN] },
    { label: 'Scenarios', path: '/admin/scenarios', roles: [ROLES.ADMIN] },
    { label: 'Conflicts', path: '/admin/conflicts', roles: [ROLES.ADMIN] },
    { label: 'Dataset', path: '/admin/dataset', roles: [ROLES.ADMIN] },
    { label: 'Rooms', path: '/admin/rooms', roles: [ROLES.ADMIN] },
    { label: 'Faculty', path: '/admin/faculty', roles: [ROLES.ADMIN] },
    { label: 'Analytics', path: '/admin/analytics', roles: [ROLES.ADMIN] },
    { label: 'Audit logs', path: '/admin/audit', roles: [ROLES.ADMIN] },
    { label: 'Settings', path: '/admin/settings', roles: [ROLES.ADMIN] },
    { label: 'AI assistant', path: '/assistant', roles: [ROLES.ADMIN, ROLES.DEPARTMENT_COORDINATOR, ROLES.FACULTY] },
    { label: 'Dashboard', path: '/coordinator', roles: [ROLES.DEPARTMENT_COORDINATOR] },
    { label: 'Bookings', path: '/coordinator/bookings', roles: [ROLES.DEPARTMENT_COORDINATOR] },
    { label: 'Timetable', path: '/coordinator/timetable', roles: [ROLES.DEPARTMENT_COORDINATOR] },
    { label: 'Conflicts', path: '/coordinator/conflicts', roles: [ROLES.DEPARTMENT_COORDINATOR] },
    { label: 'Rooms', path: '/coordinator/rooms', roles: [ROLES.DEPARTMENT_COORDINATOR] },
    { label: 'Faculty', path: '/coordinator/faculty', roles: [ROLES.DEPARTMENT_COORDINATOR] },
    { label: 'Dashboard', path: '/faculty', roles: [ROLES.FACULTY] },
    { label: 'Timetable', path: '/faculty/timetable', roles: [ROLES.FACULTY] },
    { label: 'Classes', path: '/faculty/classes', roles: [ROLES.FACULTY] },
    { label: 'Bookings', path: '/faculty/bookings', roles: [ROLES.FACULTY] },
    { label: 'Rooms', path: '/faculty/rooms', roles: [ROLES.FACULTY] },
    { label: 'Dashboard', path: '/club', roles: [ROLES.CLUB_REPRESENTATIVE] },
    { label: 'Bookings', path: '/club/bookings', roles: [ROLES.CLUB_REPRESENTATIVE] },
    { label: 'Dashboard', path: '/student', roles: [ROLES.STUDENT] },
    { label: 'Timetable', path: '/student/timetable', roles: [ROLES.STUDENT] },
    { label: 'Exams', path: '/student/exams', roles: [ROLES.STUDENT] },
    { label: 'Notifications', path: '/notifications', roles: Object.values(ROLES) },
    { label: 'Events', path: '/student/events', roles: [ROLES.STUDENT] },
    { label: 'Next class', path: '/student/next-class', roles: [ROLES.STUDENT] },
  ]

  return items.filter((item) => canAccess(userRole, item.roles))
}

