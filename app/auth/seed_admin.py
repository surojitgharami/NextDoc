"""Seed Admin User Script"""
import os
import asyncio
import logging
from .pg_database import AuthDatabase
from .security import hash_password

logger = logging.getLogger(__name__)


async def seed_admin():
    """Create initial admin user if not exists"""
    admin_email = os.getenv("ADMIN_EMAIL", "admin@healthchatai.com")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_name = os.getenv("ADMIN_NAME", "System Admin")
    
    if not admin_password:
        logger.warning("⚠️ ADMIN_PASSWORD not set. Skipping admin seed.")
        return
    
    try:
        await AuthDatabase.connect()
        
        existing = await AuthDatabase.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            admin_email.lower()
        )
        
        if existing:
            logger.info(f"✅ Admin user already exists: {admin_email}")
            return
        
        hashed_pw = hash_password(admin_password)
        user = await AuthDatabase.fetchrow(
            """
            INSERT INTO users (email, hashed_password, full_name, is_active)
            VALUES ($1, $2, $3, TRUE)
            RETURNING id
            """,
            admin_email.lower(),
            hashed_pw,
            admin_name
        )
        
        user_role = await AuthDatabase.fetchrow(
            "SELECT id FROM roles WHERE name = 'user'"
        )
        admin_role = await AuthDatabase.fetchrow(
            "SELECT id FROM roles WHERE name = 'admin'"
        )
        
        if user_role:
            await AuthDatabase.execute(
                "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
                user['id'],
                user_role['id']
            )
        
        if admin_role:
            await AuthDatabase.execute(
                "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
                user['id'],
                admin_role['id']
            )
        
        logger.info(f"✅ Created admin user: {admin_email}")
        
    except Exception as e:
        logger.error(f"❌ Failed to seed admin: {e}")
        raise


async def run_seed():
    """Run the seed function"""
    await seed_admin()
    await AuthDatabase.disconnect()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_seed())
