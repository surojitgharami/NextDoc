# Middleware Documentation

## Route Protection Strategy

This application uses role-based access control (RBAC) to protect routes. The middleware ensures:

1. **Authentication Check**: All protected routes require a valid access token
2. **Role Verification**: Routes check if the user has the required role(s)
3. **Graceful Redirects**: Unauthorized users are redirected to appropriate pages

## Implementation in Frontend

The authentication guard is implemented in the AuthProvider context:

```typescript
// frontend/client/src/context/auth-context.tsx
- getToken(): Retrieves the access token from localStorage
- hasRole(role): Checks if user has a specific role
- useAuth(): Hook to access auth context
```

## Route Protection Pattern

```typescript
// Protected routes use the ProtectedRoute component in App.tsx
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <Navigate to="/sign-in" />;
  
  return <Component />;
}
```

## Role-Based Navigation

Navigation items are filtered by user roles in AppLayout:

```typescript
// frontend/client/src/utils/navItems.ts
- Each NavItem has an associated roles array
- getNavItemsForUser(userRoles) filters items based on user's roles
- Sidebar only displays items the user has access to
```

## Backend API Security

All API endpoints require:
1. Valid JWT token in Authorization header
2. Token validation through `get_current_user` dependency
3. Role-specific endpoints use `require_admin` or similar guards

```python
# Backend route protection
@router.get("/admin/pending-doctors")
async def get_pending_doctors(current_user: User = Depends(require_admin)):
    # Only admins can access this endpoint
```

## User Roles

- **user**: Regular patient access (chat, history, profile)
- **doctor**: Doctor access (requires admin approval after registration)
- **admin**: Full system access (doctor verification, user management, reports)

## Access Control Workflow

1. User registers → Initially gets "user" role
2. If registering as doctor → Marked as pending
3. Admin approves → "doctor" role assigned
4. On next login → User sees doctor-specific features

## Client-Side Guards (User Dashboard)

```typescript
// Doctor Dashboard enforces role check on load
useEffect(() => {
  if (user && !hasRole("doctor")) {
    setLocation("/dashboard");
  }
}, [user, hasRole, setLocation]);
```

## Security Notes

- Tokens are validated on every API request
- Role assignment is server-side (cannot be forged client-side)
- Unauthorized access attempts are logged
- Expired tokens trigger refresh or logout flow
