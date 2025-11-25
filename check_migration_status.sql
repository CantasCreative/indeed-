-- Check if banner_image_key column exists in banner_knowledge table
-- Run this in D1 Console to verify migration 0003 has been applied

-- Check table schema
PRAGMA table_info(banner_knowledge);

-- If banner_image_key column exists in the output, migration 0003 has NOT been applied yet
-- If banner_image_key column does NOT exist, migration 0003 has been applied successfully
