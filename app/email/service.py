"""Email Service - Unified SMTP + Resend API with fallback to console logging"""
import logging
import httpx
import smtplib
from typing import Optional, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service supporting Resend API, SMTP, or console fallback"""
    
    def __init__(self):
        # Resend API configuration
        self.resend_api_key = getattr(settings, 'RESEND_API_KEY', None)
        
        # SMTP configuration
        self.smtp_host = getattr(settings, 'EMAIL_HOST', None)
        self.smtp_port = getattr(settings, 'EMAIL_PORT', 587)
        self.smtp_username = getattr(settings, 'EMAIL_USERNAME', None)
        self.smtp_password = getattr(settings, 'EMAIL_PASSWORD', None)
        self.smtp_use_tls = getattr(settings, 'EMAIL_USE_TLS', True)
        self.smtp_use_ssl = getattr(settings, 'EMAIL_USE_SSL', False)
        
        # Common configuration
        self.from_email = getattr(settings, 'EMAIL_FROM', 'noreply@aidoctor.com')
        self.app_name = "AI Doctor"
        self.frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5000')
        
        # Check available providers
        self.has_resend = bool(self.resend_api_key)
        self.has_smtp = bool(self.smtp_host and self.smtp_username and self.smtp_password)
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email using configured provider (Resend > SMTP > Console)"""
        if self.has_resend:
            return await self._send_via_resend(to_email, subject, html_content)
        elif self.has_smtp:
            return await self._send_via_smtp(to_email, subject, html_content, text_content)
        else:
            # Console fallback for development
            logger.info(f"📧 [DEV MODE] Email to: {to_email}")
            logger.info(f"📧 [DEV MODE] Subject: {subject}")
            logger.info(f"📧 [DEV MODE] Message:\n{html_content}")
            return True
    
    async def _send_via_resend(
        self,
        to_email: str,
        subject: str,
        html_content: str
    ) -> bool:
        """Send email via Resend API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {self.resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": f"{self.app_name} <{self.from_email}>",
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content
                    },
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    logger.info(f"✅ Email sent via Resend to {to_email}")
                    return True
                else:
                    logger.error(f"❌ Resend API error: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Resend email error: {e}")
            return False
    
    async def _send_via_smtp(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email via SMTP (works asynchronously by running in thread pool)"""
        if not self.smtp_host or not self.smtp_username or not self.smtp_password:
            logger.error("SMTP credentials not configured")
            return False
            
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            
            def send_smtp():
                try:
                    # Create message
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = subject
                    msg['From'] = self.from_email
                    msg['To'] = to_email
                    
                    # Attach text and HTML parts
                    if text_content:
                        msg.attach(MIMEText(text_content, 'plain'))
                    msg.attach(MIMEText(html_content, 'html'))
                    
                    # Connect and send - now smtp_host and smtp_port are guaranteed non-None
                    if self.smtp_use_ssl:
                        server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=30)  # type: ignore
                    else:
                        server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30)  # type: ignore
                    
                    try:
                        if self.smtp_use_tls and not self.smtp_use_ssl:
                            server.starttls()
                        
                        if self.smtp_username and self.smtp_password:
                            server.login(self.smtp_username, self.smtp_password)
                        
                        server.send_message(msg)
                        logger.info(f"✅ Email sent via SMTP to {to_email}")
                        return True
                    finally:
                        server.quit()
                
                except Exception as e:
                    logger.error(f"❌ SMTP error: {e}")
                    return False
            
            # Run blocking SMTP call in thread pool
            result = await loop.run_in_executor(None, send_smtp)
            return result
            
        except Exception as e:
            logger.error(f"❌ SMTP async error: {e}")
            return False
    
    async def send_batch_emails(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> dict:
        """Send emails to multiple recipients and return summary"""
        success_count = 0
        failed_count = 0
        failed_emails = []
        
        for email in to_emails:
            try:
                result = await self.send_email(email, subject, html_content, text_content)
                if result:
                    success_count += 1
                else:
                    failed_count += 1
                    failed_emails.append(email)
            except Exception as e:
                logger.error(f"Error sending to {email}: {e}")
                failed_count += 1
                failed_emails.append(email)
        
        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "failed_emails": failed_emails,
            "total": len(to_emails)
        }
    
    # ========== Email Templates ==========
    
    async def send_verification_email(self, to_email: str, token: str, user_name: str = "User") -> bool:
        """Send email verification link"""
        verification_url = f"{self.frontend_url}/verify-email?token={token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to {self.app_name}!</h1>
                </div>
                <div style="padding: 40px 30px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {user_name},</p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Thank you for signing up! Please verify your email address to activate your account and access all features.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_url}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Verify Email Address</a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">If the button doesn't work, copy and paste this link:<br><a href="{verification_url}" style="color: #6366f1; word-break: break-all;">{verification_url}</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"Verify your {self.app_name} account: {verification_url}"
        return await self.send_email(
            to_email=to_email,
            subject=f"Verify your {self.app_name} account",
            html_content=html_content,
            text_content=text_content
        )
    
    async def send_password_reset_email(self, to_email: str, token: str, user_name: str = "User") -> bool:
        """Send password reset link"""
        reset_url = f"{self.frontend_url}/reset-password?token={token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
                </div>
                <div style="padding: 40px 30px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {user_name},</p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;"><strong>This link will expire in 1 hour.</strong></p>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">If the button doesn't work, copy and paste this link:<br><a href="{reset_url}" style="color: #ef4444; word-break: break-all;">{reset_url}</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"Reset your {self.app_name} password: {reset_url}"
        return await self.send_email(
            to_email=to_email,
            subject=f"Reset your {self.app_name} password",
            html_content=html_content,
            text_content=text_content
        )
    
    async def send_welcome_email(self, to_email: str, user_name: str = "User") -> bool:
        """Send welcome email after verification"""
        dashboard_url = f"{self.frontend_url}/dashboard"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">You're All Set!</h1>
                </div>
                <div style="padding: 40px 30px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {user_name},</p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your email has been verified and your {self.app_name} account is now fully activated!</p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Here's what you can do:</p>
                    <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
                        <li>Chat with our AI Doctor for health guidance</li>
                        <li>Check your symptoms with our smart checker</li>
                        <li>Set up medicine reminders</li>
                        <li>Track your health metrics</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{dashboard_url}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"Welcome! Go to your dashboard: {dashboard_url}"
        return await self.send_email(
            to_email=to_email,
            subject=f"Welcome to {self.app_name}!",
            html_content=html_content,
            text_content=text_content
        )
    
    async def send_admin_announcement(
        self,
        to_email: str,
        title: str,
        message: str
    ) -> bool:
        """Send admin announcement/notification email"""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">{title}</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">{message}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">This is a notification from {self.app_name}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            to_email=to_email,
            subject=title,
            html_content=html_content,
            text_content=message
        )


email_service = EmailService()
