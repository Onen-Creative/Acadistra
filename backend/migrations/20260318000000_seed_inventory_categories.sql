-- Seed default inventory categories
INSERT INTO inventory_categories (id, name, description, created_at, updated_at) VALUES
(gen_random_uuid(), 'Food & Beverages', 'Food items, drinks, and consumables', NOW(), NOW()),
(gen_random_uuid(), 'Stationery', 'Office supplies, paper, pens, and writing materials', NOW(), NOW()),
(gen_random_uuid(), 'Cleaning Supplies', 'Cleaning materials, detergents, and sanitation items', NOW(), NOW()),
(gen_random_uuid(), 'Furniture', 'Desks, chairs, tables, and other furniture', NOW(), NOW()),
(gen_random_uuid(), 'Electronics', 'Computers, projectors, and electronic equipment', NOW(), NOW()),
(gen_random_uuid(), 'Sports Equipment', 'Sports gear, balls, and athletic equipment', NOW(), NOW()),
(gen_random_uuid(), 'Medical Supplies', 'First aid, medicines, and health supplies', NOW(), NOW()),
(gen_random_uuid(), 'Books & Learning Materials', 'Textbooks, reference books, and educational materials', NOW(), NOW()),
(gen_random_uuid(), 'Kitchen Equipment', 'Cooking utensils, pots, pans, and kitchen tools', NOW(), NOW()),
(gen_random_uuid(), 'Maintenance & Tools', 'Tools, hardware, and maintenance supplies', NOW(), NOW()),
(gen_random_uuid(), 'Uniforms & Clothing', 'School uniforms, sports wear, and clothing items', NOW(), NOW()),
(gen_random_uuid(), 'Laboratory Equipment', 'Science lab equipment and chemicals', NOW(), NOW()),
(gen_random_uuid(), 'Other', 'Miscellaneous items', NOW(), NOW())
ON CONFLICT DO NOTHING;
