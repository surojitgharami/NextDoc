"""PostgreSQL Database Connection for Authentication"""
import os
import asyncpg
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class AuthDatabase:
    """PostgreSQL connection manager for auth operations"""
    
    _pool: Optional[asyncpg.Pool] = None
    
    @classmethod
    async def connect(cls) -> asyncpg.Pool:
        """Create connection pool to PostgreSQL"""
        if cls._pool is None:
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL environment variable is required")
            
            try:
                cls._pool = await asyncpg.create_pool(
                    database_url,
                    min_size=1,
                    max_size=5,
                    command_timeout=60,
                    timeout=30,
                    statement_cache_size=0
                )
                logger.info("✅ Connected to PostgreSQL auth database")
            except Exception as e:
                logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
                raise
        return cls._pool
    
    @classmethod
    async def disconnect(cls):
        """Close connection pool"""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None
            logger.info("🔌 Disconnected from PostgreSQL auth database")
    
    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        """Get or create connection pool"""
        if cls._pool is None:
            await cls.connect()
        return cls._pool or await cls.connect()
    
    @classmethod
    async def execute(cls, query: str, *args):
        """Execute a query"""
        pool = await cls.get_pool()
        return await pool.execute(query, *args)
    
    @classmethod
    async def fetch(cls, query: str, *args):
        """Fetch multiple rows"""
        pool = await cls.get_pool()
        return await pool.fetch(query, *args)
    
    @classmethod
    async def fetchrow(cls, query: str, *args):
        """Fetch single row"""
        pool = await cls.get_pool()
        return await pool.fetchrow(query, *args)
    
    @classmethod
    async def fetchval(cls, query: str, *args):
        """Fetch single value"""
        pool = await cls.get_pool()
        return await pool.fetchval(query, *args)
