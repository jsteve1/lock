"""Add encryption columns

Revision ID: 002
Revises: 001
Create Date: 2024-01-29 12:46:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add encryption columns if they don't exist
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='users' AND column_name='encryption_key') THEN
                ALTER TABLE users ADD COLUMN encryption_key VARCHAR;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='users' AND column_name='encryption_salt') THEN
                ALTER TABLE users ADD COLUMN encryption_salt BYTEA;
            END IF;
        END $$;
    """)


def downgrade():
    # Remove encryption columns if they exist
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='encryption_key') THEN
                ALTER TABLE users DROP COLUMN encryption_key;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='encryption_salt') THEN
                ALTER TABLE users DROP COLUMN encryption_salt;
            END IF;
        END $$;
    """) 