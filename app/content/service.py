"""Content Management Service - Business logic for Terms & Privacy Policy"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional
import logging

from .models import ContentType, ContentUpdate, ContentResponse

logger = logging.getLogger(__name__)


class ContentService:
    """Service for managing legal content (Terms & Privacy Policy)"""

    @staticmethod
    async def get_content(db: AsyncIOMotorDatabase, content_type: ContentType) -> Optional[ContentResponse]:
        """
        Get current content by type
        
        Args:
            db: MongoDB database instance
            content_type: Type of content (terms or privacy_policy)
            
        Returns:
            ContentResponse or None if not found
        """
        try:
            doc = await db.content_pages.find_one({"content_type": content_type.value})
            
            if not doc:
                return None
            
            return ContentResponse(
                content_type=doc["content_type"],
                title=doc["title"],
                content=doc["content"],
                updated_at=doc["updated_at"]
            )
        except Exception as e:
            logger.error(f"Error fetching content {content_type}: {e}")
            return None

    @staticmethod
    async def update_content(
        db: AsyncIOMotorDatabase, 
        content_type: ContentType, 
        data: ContentUpdate
    ) -> ContentResponse:
        """
        Update or create content (upsert)
        
        Args:
            db: MongoDB database instance
            content_type: Type of content
            data: Content update data
            
        Returns:
            Updated ContentResponse
        """
        try:
            now = datetime.utcnow()
            
            # Upsert: update if exists, create if not
            result = await db.content_pages.update_one(
                {"content_type": content_type.value},
                {
                    "$set": {
                        "title": data.title,
                        "content": data.content,
                        "updated_at": now
                    },
                    "$setOnInsert": {
                        "content_type": content_type.value,
                        "created_at": now
                    }
                },
                upsert=True
            )
            
            logger.info(f"✅ Updated content: {content_type.value}")
            
            return ContentResponse(
                content_type=content_type.value,
                title=data.title,
                content=data.content,
                updated_at=now
            )
        except Exception as e:
            logger.error(f"Error updating content {content_type}: {e}")
            raise

    @staticmethod
    async def get_all_content(db: AsyncIOMotorDatabase) -> list[ContentResponse]:
        """
        Get all content pages (admin only)
        
        Args:
            db: MongoDB database instance
            
        Returns:
            List of ContentResponse
        """
        try:
            cursor = db.content_pages.find({})
            docs = await cursor.to_list(length=10)
            
            return [
                ContentResponse(
                    content_type=doc["content_type"],
                    title=doc["title"],
                    content=doc["content"],
                    updated_at=doc["updated_at"]
                )
                for doc in docs
            ]
        except Exception as e:
            logger.error(f"Error fetching all content: {e}")
            return []

    @staticmethod
    async def initialize_default_content(db: AsyncIOMotorDatabase):
        """
        Initialize default content if not exists
        
        Args:
            db: MongoDB database instance
        """
        try:
            # Check if content exists
            terms_exists = await db.content_pages.find_one({"content_type": "terms"})
            privacy_exists = await db.content_pages.find_one({"content_type": "privacy_policy"})
            
            now = datetime.utcnow()
            
            if not terms_exists:
                await db.content_pages.insert_one({
                    "content_type": "terms",
                    "title": "Terms & Conditions",
                    "content": """# Terms & Conditions

Welcome to NextDoc. By using our services, you agree to these terms.

## 1. Acceptance of Terms
By accessing and using NextDoc, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Use License
Permission is granted to temporarily use NextDoc for personal, non-commercial use only.

## 3. Disclaimer
The materials on NextDoc are provided on an 'as is' basis. NextDoc makes no warranties, expressed or implied.

## 4. Limitations
In no event shall NextDoc be liable for any damages arising out of the use or inability to use the materials on NextDoc.

## 5. Contact
For any questions regarding these terms, please contact us at support@nextdoc.com.

*Last updated: {date}*
""".format(date=now.strftime("%B %d, %Y")),
                    "created_at": now,
                    "updated_at": now
                })
                logger.info("✅ Initialized default Terms & Conditions")
            
            if not privacy_exists:
                await db.content_pages.insert_one({
                    "content_type": "privacy_policy",
                    "title": "Privacy Policy",
                    "content": """# Privacy Policy

NextDoc is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.

## 1. Information We Collect
We collect information you provide directly to us, including:
- Name and contact information
- Health-related data you choose to share
- Usage data and analytics

## 2. How We Use Your Information
We use the information we collect to:
- Provide and improve our services
- Communicate with you
- Ensure security and prevent fraud

## 3. Data Security
We implement appropriate security measures to protect your personal information.

## 4. Your Rights
You have the right to:
- Access your personal data
- Request correction or deletion
- Opt-out of marketing communications

## 5. Contact Us
If you have questions about this Privacy Policy, please contact us at privacy@nextdoc.com.

*Last updated: {date}*
""".format(date=now.strftime("%B %d, %Y")),
                    "created_at": now,
                    "updated_at": now
                })
                logger.info("✅ Initialized default Privacy Policy")
                
        except Exception as e:
            logger.error(f"Error initializing default content: {e}")
