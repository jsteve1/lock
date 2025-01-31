"""add status and deleted_at to notes

Revision ID: add_status_and_deleted_at
Revises: 
Create Date: 2024-01-30 20:11:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_status_and_deleted_at'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Drop the is_archived column
    op.drop_column('notes', 'is_archived')
    
    # Add the new columns
    op.add_column('notes',
        sa.Column('status', sa.String(), nullable=False, server_default='active')
    )
    op.add_column('notes',
        sa.Column('deleted_at', sa.DateTime(), nullable=True)
    )

def downgrade() -> None:
    # Remove the new columns
    op.drop_column('notes', 'status')
    op.drop_column('notes', 'deleted_at')
    
    # Add back the is_archived column
    op.add_column('notes',
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false')
    ) 