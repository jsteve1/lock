"""update notes table

Revision ID: update_notes_table
Revises: 002
Create Date: 2024-01-30 20:24:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'update_notes_table'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add new columns first
    op.add_column('notes',
        sa.Column('status', sa.String(), nullable=False, server_default='active')
    )
    op.add_column('notes',
        sa.Column('deleted_at', sa.DateTime(), nullable=True)
    )
    
    # Update existing notes to have status='active' if not archived, 'archived' if archived
    op.execute("""
        UPDATE notes 
        SET status = CASE 
            WHEN is_archived = true THEN 'archived' 
            ELSE 'active' 
        END
    """)
    
    # Drop the old column
    op.drop_column('notes', 'is_archived')

def downgrade() -> None:
    # Add back the old column
    op.add_column('notes',
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false')
    )
    
    # Update is_archived based on status
    op.execute("""
        UPDATE notes 
        SET is_archived = (status = 'archived')
    """)
    
    # Drop the new columns
    op.drop_column('notes', 'status')
    op.drop_column('notes', 'deleted_at') 