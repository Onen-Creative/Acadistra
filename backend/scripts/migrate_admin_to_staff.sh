#!/bin/bash

# Script to create staff records for existing school admins
# Run this on your VPS server

echo "=========================================="
echo "Create Staff Records for School Admins"
echo "=========================================="
echo ""

docker exec -i acadistra_backend psql -h postgres -U acadistra -d acadistra <<'EOF'
DO $$
DECLARE
    admin_record RECORD;
    school_record RECORD;
    school_initials TEXT;
    employee_id TEXT;
    current_year INT;
    sequence_num INT;
    first_name TEXT;
    middle_name TEXT;
    last_name TEXT;
    name_parts TEXT[];
    created_count INT := 0;
    skipped_count INT := 0;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Loop through all school admins
    FOR admin_record IN 
        SELECT id, school_id, email, full_name, is_active
        FROM users
        WHERE role = 'school_admin'
    LOOP
        -- Check if staff record already exists
        IF EXISTS (SELECT 1 FROM staff WHERE user_id = admin_record.id) THEN
            RAISE NOTICE 'Staff record already exists for: %', admin_record.email;
            skipped_count := skipped_count + 1;
            CONTINUE;
        END IF;
        
        -- Skip if no school assigned
        IF admin_record.school_id IS NULL THEN
            RAISE NOTICE 'Skipping % - no school assigned', admin_record.email;
            skipped_count := skipped_count + 1;
            CONTINUE;
        END IF;
        
        -- Get school details
        SELECT name INTO school_record FROM schools WHERE id = admin_record.school_id;
        
        IF NOT FOUND THEN
            RAISE NOTICE 'School not found for: %', admin_record.email;
            skipped_count := skipped_count + 1;
            CONTINUE;
        END IF;
        
        -- Generate school initials from school name
        school_initials := '';
        FOR i IN 1..array_length(string_to_array(school_record.name, ' '), 1) LOOP
            school_initials := school_initials || UPPER(SUBSTRING(split_part(school_record.name, ' ', i), 1, 1));
        END LOOP;
        
        IF school_initials = '' THEN
            school_initials := 'SCH';
        END IF;
        
        -- Find the next sequence number for this school
        SELECT COALESCE(MAX(CAST(split_part(employee_id, '/', 4) AS INTEGER)), 0)
        INTO sequence_num
        FROM staff
        WHERE school_id = admin_record.school_id
        AND employee_id LIKE school_initials || '/STF/' || current_year || '/%';
        
        sequence_num := sequence_num + 1;
        employee_id := school_initials || '/STF/' || current_year || '/' || LPAD(sequence_num::TEXT, 3, '0');
        
        -- Parse full name into parts
        name_parts := string_to_array(admin_record.full_name, ' ');
        first_name := name_parts[1];
        middle_name := '';
        last_name := '';
        
        IF array_length(name_parts, 1) > 2 THEN
            middle_name := name_parts[2];
            last_name := array_to_string(name_parts[3:array_length(name_parts, 1)], ' ');
        ELSIF array_length(name_parts, 1) > 1 THEN
            last_name := array_to_string(name_parts[2:array_length(name_parts, 1)], ' ');
        END IF;
        
        -- Create staff record
        INSERT INTO staff (
            id,
            school_id,
            user_id,
            employee_id,
            first_name,
            middle_name,
            last_name,
            email,
            role,
            status,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            admin_record.school_id,
            admin_record.id,
            employee_id,
            first_name,
            middle_name,
            last_name,
            admin_record.email,
            'School Admin',
            CASE WHEN admin_record.is_active THEN 'active' ELSE 'inactive' END,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created staff record for % - Employee ID: %', admin_record.email, employee_id;
        created_count := created_count + 1;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Summary ===';
    RAISE NOTICE 'Staff records created: %', created_count;
    RAISE NOTICE 'Skipped (already exists or no school): %', skipped_count;
END $$;
EOF

echo ""
echo "Migration completed!"
