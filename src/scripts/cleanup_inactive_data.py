from datetime import datetime, timedelta
from sqlalchemy import select, delete
from src.database import get_db
from src.models import User, Note, Attachment
from src.config import settings

async def cleanup_inactive_data():
    """Clean up inactive accounts and their data."""
    cleanup_days = int(settings.CLEANUP_DAYS)
    cutoff_date = datetime.utcnow() - timedelta(days=cleanup_days)
    
    async with get_db() as db:
        # Find inactive users (haven't logged in for X days)
        inactive_users = await db.execute(
            select(User).where(
                User.last_login < cutoff_date,
                User.email != settings.ADMIN_EMAIL  # Don't delete admin
            )
        )
        inactive_user_ids = [user.id for user in inactive_users.scalars()]
        
        if not inactive_user_ids:
            print("No inactive users found")
            return
        
        # Delete attachments for inactive users' notes
        await db.execute(
            delete(Attachment).where(
                Attachment.note.has(Note.user_id.in_(inactive_user_ids))
            )
        )
        
        # Delete notes for inactive users
        await db.execute(
            delete(Note).where(Note.user_id.in_(inactive_user_ids))
        )
        
        # Delete inactive users
        await db.execute(
            delete(User).where(User.id.in_(inactive_user_ids))
        )
        
        await db.commit()
        
        print(f"Cleaned up data for {len(inactive_user_ids)} inactive users")

if __name__ == "__main__":
    import asyncio
    asyncio.run(cleanup_inactive_data()) 