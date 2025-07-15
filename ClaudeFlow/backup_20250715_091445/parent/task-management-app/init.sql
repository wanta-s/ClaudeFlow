-- Shadow database for Prisma migrations
CREATE DATABASE taskmanagement_shadow;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE taskmanagement TO postgres;
GRANT ALL PRIVILEGES ON DATABASE taskmanagement_shadow TO postgres;