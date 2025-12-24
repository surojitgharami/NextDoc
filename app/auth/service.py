"""Auth Service - Business Logic"""
from typing import Optional, List, Tuple
from datetime import datetime
import logging

from .pg_database import AuthDatabase
from .models import User, UserRegister, UserPublic, RoleEnum
from .security import hash_password, verify_password, hash_token

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service for user management"""

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[dict]:
        """Get user by email"""
        row = await AuthDatabase.fetchrow(
            "SELECT * FROM users WHERE email = $1",
            email.lower()
        )
        return dict(row) if row else None

    @staticmethod
    async def get_user_by_id(user_id: int) -> Optional[dict]:
        """Get user by ID"""
        row = await AuthDatabase.fetchrow(
            "SELECT * FROM users WHERE id = $1",
            user_id
        )
        return dict(row) if row else None

    @staticmethod
    async def get_user_roles(user_id: int) -> List[str]:
        """Get user's roles"""
        rows = await AuthDatabase.fetch(
            """
            SELECT r.name FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
            """,
            user_id
        )
        return [row['name'] for row in rows]

    @staticmethod
    async def create_user(data: UserRegister, license_path: Optional[str] = None) -> dict:
        """Create a new user"""
        hashed_pw = hash_password(data.password)
        
        row = await AuthDatabase.fetchrow(
            """
            INSERT INTO users (
                email, hashed_password, full_name, phone_number, 
                date_of_birth, is_doctor_requested, doctor_verification_status,
                license_file_path
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            """,
            data.email.lower(),
            hashed_pw,
            data.full_name,
            data.phone_number,
            data.date_of_birth,
            data.is_doctor,
            "pending" if data.is_doctor else "none",
            license_path
        )
        
        user = dict(row)
        
        # Ensure user role exists
        user_role = await AuthDatabase.fetchrow(
            "SELECT id FROM roles WHERE name = $1",
            "user"
        )
        
        if not user_role:
            # Create user role if it doesn't exist
            user_role = await AuthDatabase.fetchrow(
                "INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id",
                "user",
                "Standard user role"
            )
            logger.warning("⚠️ User role did not exist, created it")
        
        # Assign user role to new user
        try:
            await AuthDatabase.execute(
                "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
                user['id'],
                user_role['id']
            )
            logger.info(f"✅ Created user: {data.email} with role: user")
        except Exception as e:
            logger.error(f"❌ Failed to assign user role: {e}")
        
        return user

    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[dict]:
        """Authenticate user with email and password"""
        user = await AuthService.get_user_by_email(email)
        if not user:
            return None
        if not user['is_active']:
            return None
        if not verify_password(password, user['hashed_password']):
            return None
        return user

    @staticmethod
    async def get_user_with_roles(user_id: int) -> Optional[User]:
        """Get user with their roles"""
        user_data = await AuthService.get_user_by_id(user_id)
        if not user_data:
            return None
        
        roles = await AuthService.get_user_roles(user_id)
        user_data['roles'] = roles
        
        return User(**user_data)

    @staticmethod
    async def update_token_version(user_id: int) -> int:
        """Increment token version (invalidates all refresh tokens)"""
        new_version = await AuthDatabase.fetchval(
            """
            UPDATE users SET token_version = token_version + 1 
            WHERE id = $1 RETURNING token_version
            """,
            user_id
        )
        return new_version

    @staticmethod
    async def store_refresh_token(user_id: int, token: str, expires_at: datetime):
        """Store hashed refresh token"""
        token_hash = hash_token(token)
        await AuthDatabase.execute(
            """
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            """,
            user_id,
            token_hash,
            expires_at
        )

    @staticmethod
    async def verify_refresh_token(user_id: int, token: str) -> bool:
        """Verify refresh token exists and is not revoked"""
        token_hash = hash_token(token)
        row = await AuthDatabase.fetchrow(
            """
            SELECT id FROM refresh_tokens 
            WHERE user_id = $1 AND token_hash = $2 
            AND revoked = FALSE AND expires_at > NOW()
            """,
            user_id,
            token_hash
        )
        return row is not None

    @staticmethod
    async def revoke_refresh_token(token: str):
        """Revoke a specific refresh token"""
        token_hash = hash_token(token)
        await AuthDatabase.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1",
            token_hash
        )

    @staticmethod
    async def revoke_all_user_tokens(user_id: int):
        """Revoke all refresh tokens for a user"""
        await AuthDatabase.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1",
            user_id
        )
        await AuthService.update_token_version(user_id)

    @staticmethod
    async def change_password(user_id: int, new_password: str):
        """Change user password and invalidate all tokens"""
        hashed_pw = hash_password(new_password)
        await AuthDatabase.execute(
            """
            UPDATE users SET hashed_password = $1, updated_at = NOW()
            WHERE id = $2
            """,
            hashed_pw,
            user_id
        )
        await AuthService.revoke_all_user_tokens(user_id)

    @staticmethod
    async def update_user(user_id: int, **kwargs):
        """Update user fields"""
        allowed_fields = ['full_name', 'phone_number', 'date_of_birth']
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields and v is not None}
        
        if not updates:
            return await AuthService.get_user_by_id(user_id)
        
        set_clause = ", ".join([f"{k} = ${i+2}" for i, k in enumerate(updates.keys())])
        values = list(updates.values())
        
        await AuthDatabase.execute(
            f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = $1",
            user_id,
            *values
        )
        
        return await AuthService.get_user_by_id(user_id)

    @staticmethod
    async def get_pending_doctors() -> List[dict]:
        """Get all users pending doctor verification"""
        rows = await AuthDatabase.fetch(
            """
            SELECT id, email, full_name, phone_number, date_of_birth,
                   license_file_path, created_at, doctor_verification_status
            FROM users 
            WHERE is_doctor_requested = TRUE 
            AND doctor_verification_status = 'pending'
            ORDER BY created_at ASC
            """
        )
        return [dict(row) for row in rows]

    @staticmethod
    async def verify_doctor(user_id: int, approved: bool, admin_notes: Optional[str] = None):
        """Approve or reject doctor verification"""
        status = "approved" if approved else "rejected"
        
        await AuthDatabase.execute(
            """
            UPDATE users SET doctor_verification_status = $1, updated_at = NOW()
            WHERE id = $2
            """,
            status,
            user_id
        )
        
        if approved:
            doctor_role = await AuthDatabase.fetchrow(
                "SELECT id FROM roles WHERE name = 'doctor'"
            )
            await AuthDatabase.execute(
                """
                INSERT INTO user_roles (user_id, role_id) 
                VALUES ($1, $2) ON CONFLICT DO NOTHING
                """,
                user_id,
                doctor_role['id']
            )
            logger.info(f"✅ Approved doctor: user_id={user_id}")
        else:
            logger.info(f"❌ Rejected doctor: user_id={user_id}")

    @staticmethod
    async def add_role_to_user(user_id: int, role_name: str):
        """Add a role to user"""
        role = await AuthDatabase.fetchrow(
            "SELECT id FROM roles WHERE name = $1",
            role_name
        )
        if role:
            await AuthDatabase.execute(
                """
                INSERT INTO user_roles (user_id, role_id) 
                VALUES ($1, $2) ON CONFLICT DO NOTHING
                """,
                user_id,
                role['id']
            )

    @staticmethod
    async def remove_role_from_user(user_id: int, role_name: str):
        """Remove a role from user"""
        role = await AuthDatabase.fetchrow(
            "SELECT id FROM roles WHERE name = $1",
            role_name
        )
        if role:
            await AuthDatabase.execute(
                "DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2",
                user_id,
                role['id']
            )

    @staticmethod
    async def get_all_users(skip: int = 0, limit: int = 50) -> Tuple[List[dict], int]:
        """Get all users with pagination (admin only)"""
        total = await AuthDatabase.fetchval("SELECT COUNT(*) FROM users")
        
        rows = await AuthDatabase.fetch(
            """
            SELECT u.*, array_agg(r.name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
            """,
            limit,
            skip
        )
        
        users = []
        for row in rows:
            user = dict(row)
            user['roles'] = [r for r in (user.get('roles') or []) if r]
            users.append(user)
        
        return users, total

    @staticmethod
    async def delete_user(user_id: int):
        """Delete a user and all their associated data"""
        await AuthDatabase.execute(
            "DELETE FROM user_roles WHERE user_id = $1",
            user_id
        )
        await AuthDatabase.execute(
            "DELETE FROM users WHERE id = $1",
            user_id
        )
