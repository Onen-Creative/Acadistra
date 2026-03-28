# Standard Fee Types System

## Overview

The Standard Fee Types system provides a centralized, standardized approach to managing fee categories across all schools in the Acadistra platform. This system ensures consistency and reduces manual configuration while supporting the diverse fee structures of Ugandan schools.

## New Fee Types Added

The following fee types have been added to the system:

### Academic Fees
- **Field Work** - Educational trips and field work activities
- **Extra Lessons** - Additional coaching and remedial classes  
- **Holiday Lessons** - Holiday coaching programs
- **Mocks** - Mock examination fees

### Administrative Fees
- **Handling Fee** - Document processing and handling charges

### Existing Fee Types (Enhanced)
- **Tuition** - Core academic instruction fees
- **Registration** - Student registration and enrollment fees
- **Examination** - Internal examination fees
- **Development** - School development and infrastructure
- **Medical** - Health services and medical care
- **Boarding** - Boarding and accommodation fees
- **Meals** - Meals and catering services
- **Uniform** - School uniform and clothing
- **Books** - Textbooks and learning materials
- **Stationery** - Exercise books and stationery
- **Transport** - School transport services
- **Sports** - Sports and physical education
- **Co-curricular** - Clubs and co-curricular activities
- **Other** - Other miscellaneous fees

## Database Schema

### StandardFeeType Model
```go
type StandardFeeType struct {
    BaseModel
    Name           string `json:"name"`           // Display name
    Code           string `json:"code"`           // Unique identifier
    Category       string `json:"category"`       // Academic, Administrative, etc.
    Description    string `json:"description"`    // Detailed description
    IsCompulsory   bool   `json:"is_compulsory"`  // Required for all students
    AppliesToLevels JSONB `json:"applies_to_levels"` // ["ECCE", "Primary", "O-Level", "A-Level"]
}
```

### Categories
- **Academic** - Core educational fees
- **Practical** - Hands-on learning activities
- **Administrative** - School administration charges
- **Welfare** - Student health and wellbeing
- **Accommodation** - Boarding and meals
- **Materials** - Books, uniforms, stationery
- **Transport** - School transport services
- **Activities** - Sports and co-curricular
- **Miscellaneous** - Other fees

## API Endpoints

### Public Setup (for initial deployment)
```
GET /setup/seed-fee-types - Seed standard fee types
```

### System Admin Only
```
GET    /api/v1/standard-fee-types           - Get all fee types
GET    /api/v1/standard-fee-types/by-level  - Get fee types by level
GET    /api/v1/standard-fee-types/by-category - Get fee types by category
GET    /api/v1/standard-fee-types/compulsory - Get compulsory fee types
GET    /api/v1/standard-fee-types/categories - Get all categories
POST   /api/v1/seed-fee-types               - Seed fee types
```

### All Authenticated Users
```
GET /api/v1/fee-types                - Get all fee types
GET /api/v1/fee-types/by-level       - Get fee types by level (?level=Primary)
GET /api/v1/fee-types/by-category    - Get fee types by category (?category=Academic)
GET /api/v1/fee-types/compulsory     - Get compulsory fee types (?level=Primary)
GET /api/v1/fee-types/categories     - Get all categories
```

## Usage Examples

### Get Fee Types for Primary Level
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8080/api/v1/fee-types/by-level?level=Primary"
```

### Get Academic Fee Types
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8080/api/v1/fee-types/by-category?category=Academic"
```

### Get Compulsory Fees for O-Level
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8080/api/v1/fee-types/compulsory?level=O-Level"
```

## Migration and Seeding

### Automatic Migration
Run the provided script:
```bash
./migrate-fee-types.sh
```

### Manual Migration
```bash
# 1. Run database migration
cd backend
go run cmd/api/main.go migrate

# 2. Seed standard fee types
go run cmd/api/main.go seed-standard-fee-types
```

### Via API (for deployed systems)
```bash
# 1. Run migration
curl http://your-domain.com/setup/migrate

# 2. Seed fee types
curl http://your-domain.com/setup/seed-fee-types
```

## Frontend Integration

The fee types will be automatically available in the frontend fees management system. The existing hardcoded fee types in the frontend can be replaced with API calls to fetch standardized fee types.

### Example Frontend Usage
```javascript
// Fetch fee types for a specific level
const feeTypes = await api.get('/api/v1/fee-types/by-level', { 
  params: { level: 'Primary' } 
});

// Populate dropdown with fee types
const feeTypeOptions = feeTypes.data.fee_types.map(type => ({
  value: type.code,
  label: type.name,
  description: type.description,
  isCompulsory: type.is_compulsory
}));
```

## Level Mapping

Fee types are mapped to school levels as follows:

- **ECCE** - Early Childhood Care and Education (Nursery)
- **Primary** - P1-P7
- **O-Level** - S1-S4 (Ordinary Level)
- **A-Level** - S5-S6 (Advanced Level)

## Benefits

1. **Consistency** - Standardized fee types across all schools
2. **Flexibility** - Level-specific fee types
3. **Categorization** - Organized fee structure
4. **Compulsory Flags** - Automatic identification of required fees
5. **Extensibility** - Easy to add new fee types
6. **Multi-tenant** - Works across all schools in the platform

## File Structure

```
backend/
├── migrations/
│   └── 20260323000000_create_standard_fee_types.sql
├── internal/
│   ├── models/
│   │   └── models.go (StandardFeeType added)
│   ├── services/
│   │   └── standard_fee_type_service.go
│   └── handlers/
│       └── standard_fee_type_handler.go
├── cmd/api/main.go (routes and seeding added)
└── internal/database/database.go (migration updated)

seed/
└── standard_fee_types.sql

migrate-fee-types.sh (auto migration script)
```

## Testing

After migration and seeding, verify the system:

1. **Check Database**
   ```sql
   SELECT * FROM standard_fee_types ORDER BY category, name;
   ```

2. **Test API Endpoints**
   ```bash
   curl http://localhost:8080/api/v1/fee-types
   ```

3. **Verify Frontend Integration**
   - Check fee type dropdowns in fees management
   - Ensure new fee types appear in options

## Troubleshooting

### Migration Issues
- Ensure database connection is working
- Check for existing table conflicts
- Verify GORM model definitions

### Seeding Issues
- Check for duplicate code constraints
- Verify JSON format in applies_to_levels
- Ensure proper error handling

### API Issues
- Verify authentication middleware
- Check route registration
- Confirm handler initialization

## Future Enhancements

1. **Custom Fee Types** - Allow schools to add custom fee types
2. **Fee Type Templates** - Pre-configured fee structures by school type
3. **Seasonal Fees** - Time-based fee activation
4. **Fee Type Dependencies** - Conditional fee requirements
5. **Localization** - Multi-language fee type names

## Support

For issues or questions regarding the Standard Fee Types system:
- Check the API documentation at `/swagger/index.html`
- Review the migration logs
- Contact the development team

---

**Built for Ugandan Schools** 🇺🇬 | Standardized Fee Management | ECCE → A-Level