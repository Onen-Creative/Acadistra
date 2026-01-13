-- Add initial_quantity column to medicines table
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS initial_quantity INT NOT NULL DEFAULT 0;

-- Add initial_quantity column to clinic_consumables table
ALTER TABLE clinic_consumables ADD COLUMN IF NOT EXISTS initial_quantity INT NOT NULL DEFAULT 0;

-- Update existing records to set initial_quantity equal to current quantity
UPDATE medicines SET initial_quantity = quantity WHERE initial_quantity = 0;
UPDATE clinic_consumables SET initial_quantity = quantity WHERE initial_quantity = 0;
