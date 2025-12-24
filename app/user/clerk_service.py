"""Clerk API service for fetching user details"""

import httpx
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class ClerkAPIService:
    """Service for interacting with Clerk's REST API"""
    
    BASE_URL = "https://api.clerk.dev/v1"
    
    def __init__(self):
        self.secret_key = settings.CLERK_SECRET_KEY
        
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch full user details from Clerk API.
        
        Args:
            user_id: Clerk user ID (from JWT 'sub' claim)
            
        Returns:
            User details dictionary or None if not found
        """
        url = f"{self.BASE_URL}/users/{user_id}"
        headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)
                
                if response.status_code == 200:
                    user_data = response.json()
                    logger.info(f"Successfully fetched user details for {user_id}")
                    return user_data
                    
                elif response.status_code == 404:
                    logger.warning(f"User not found in Clerk: {user_id}")
                    return None
                    
                else:
                    logger.error(
                        f"Clerk API error: {response.status_code} - {response.text}"
                    )
                    return None
                    
        except httpx.TimeoutException:
            logger.error(f"Timeout fetching user {user_id} from Clerk API")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching user from Clerk API: {e}")
            return None
    
    @staticmethod
    def extract_user_profile(clerk_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant user profile fields from Clerk API response.
        
        Args:
            clerk_data: Raw Clerk API response
            
        Returns:
            Cleaned user profile dictionary
        """
        # Get primary email address
        email = None
        if clerk_data.get("email_addresses"):
            primary_email = next(
                (e for e in clerk_data["email_addresses"] if e.get("id") == clerk_data.get("primary_email_address_id")),
                clerk_data["email_addresses"][0] if clerk_data["email_addresses"] else None
            )
            if primary_email:
                email = primary_email.get("email_address")
        
        # Extract profile data
        profile = {
            "clerk_user_id": clerk_data.get("id"),
            "email": email,
            "first_name": clerk_data.get("first_name"),
            "last_name": clerk_data.get("last_name"),
            "created_at": clerk_data.get("created_at"),
            "updated_at": clerk_data.get("updated_at"),
            "profile_image_url": clerk_data.get("profile_image_url"),
            "username": clerk_data.get("username"),
        }
        
        return profile
