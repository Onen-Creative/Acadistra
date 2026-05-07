#!/bin/bash

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Run the migration
mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"${DB_PASSWORD}" "${DB_NAME:-school_system}" < migrations/add_sms_tables.sql

if [ $? -eq 0 ]; then
    echo "SMS tables migration completed successfully!"
else
    echo "Migration failed!"
    exit 1
fi
