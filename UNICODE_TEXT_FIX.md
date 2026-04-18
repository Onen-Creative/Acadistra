# Unicode Text Normalization Fix

## Problem
Student names were displaying in different fonts because some names contained Unicode mathematical alphanumeric symbols (U+1D400 to U+1D7FF) instead of regular ASCII characters. 

Examples:
- `𝙺𝚑𝚊𝚗𝚊𝚔𝚠𝚊 𝙹𝚘𝚜𝚎𝚕𝚒𝚗𝚎` (mathematical sans-serif bold)
- `𝙼u𝚠𝚊𝚖𝚋𝚠𝚊 𝙰𝚕𝚎𝚡` (mixed mathematical symbols)

## Root Cause
These Unicode symbols likely came from:
1. **Copy-paste from formatted documents** - Names copied from Word, PDF, or social media with "fancy" text styling
2. **Excel imports** - Students imported from Excel files containing decorative Unicode characters
3. **Mobile keyboard apps** - Fancy keyboard apps (FancyKey, Cool Fonts, etc.) that type with mathematical symbols
4. **Data migration** - Previous system that didn't sanitize these characters

## Solution

### Backend Validation (Prevention)
Created a text normalization utility that:
- Detects Unicode mathematical alphanumeric symbols (U+1D400 to U+1D7FF)
- Maps them to regular ASCII equivalents (A-Z, a-z)
- Removes decorative characters that can't be mapped
- Applies normalization at all data entry points

### Files Modified

#### 1. New Utility: `/backend/internal/utils/text.go`
- `NormalizeText(text string) string` - Main normalization function
- `mapMathAlphanumericToASCII(r rune) rune` - Maps Unicode math symbols to ASCII
- Handles 20+ Unicode mathematical alphanumeric ranges

#### 2. Registration Handler: `/backend/internal/handlers/registration_handler.go`
- Added `utils.NormalizeText()` to first_name, middle_name, last_name fields
- Prevents fancy text from being saved during student registration

#### 3. Student Update Handler: `/backend/internal/handlers/student_handler.go`
- Added `utils.NormalizeText()` to name update operations
- Added utils import

#### 4. Bulk Import Service: `/backend/internal/services/bulk_import_xlsx_service.go`
- Added `utils.NormalizeText()` to Excel import validation
- Normalizes names during bulk student imports
- Added utils import

### Frontend Display (Temporary Fix)
Modified `/frontend/src/app/students/page.tsx`:
- Added `normalizeText()` function for display-time normalization
- Uses `normalize('NFKD')` to convert Unicode symbols
- Applied to student name rendering in the table

## Testing
To verify the fix:

1. **Test Registration**:
   ```bash
   # Try registering a student with fancy text
   curl -X POST /api/v1/students/register \
     -d '{"first_name": "𝙺𝚑𝚊𝚗𝚊", "last_name": "𝙹𝚘𝚜𝚎"}'
   # Should save as: "Khana Jose"
   ```

2. **Test Import**:
   - Create Excel with fancy text names
   - Import via bulk upload
   - Verify names are normalized in database

3. **Test Update**:
   - Try updating student with fancy text
   - Verify normalization occurs

## Database Cleanup (Optional)
To fix existing records with fancy text:

```sql
-- This would need to be done with a migration script
-- Example approach (pseudo-code):
UPDATE students 
SET 
  first_name = normalize_text(first_name),
  middle_name = normalize_text(middle_name),
  last_name = normalize_text(last_name)
WHERE 
  first_name ~ '[𝐀-𝟿]' OR 
  middle_name ~ '[𝐀-𝟿]' OR 
  last_name ~ '[𝐀-𝟿]';
```

## Prevention Best Practices

1. **User Education**:
   - Inform data entry staff to avoid copying from social media
   - Use plain text when filling Excel templates
   - Avoid fancy keyboard apps for official data entry

2. **Template Instructions**:
   - Excel templates already include instructions
   - Consider adding warning about fancy text

3. **Validation Messages**:
   - System now silently normalizes text
   - Could add user-facing warnings if desired

## Technical Details

### Unicode Ranges Handled
- Mathematical Bold: U+1D400 to U+1D433
- Mathematical Italic: U+1D434 to U+1D467
- Mathematical Bold Italic: U+1D468 to U+1D49B
- Mathematical Script: U+1D49C to U+1D4CF
- Mathematical Fraktur: U+1D504 to U+1D537
- Mathematical Double-Struck: U+1D538 to U+1D56B
- Mathematical Sans-Serif: U+1D5A0 to U+1D5D3
- Mathematical Sans-Serif Bold: U+1D5D4 to U+1D607
- Mathematical Monospace: U+1D670 to U+1D6A3
- And more...

### Performance Impact
- Minimal: O(n) where n = string length
- Only processes text during create/update operations
- No impact on read operations

## Future Enhancements

1. **Comprehensive Validation**:
   - Extend to other text fields (addresses, guardian names, etc.)
   - Add validation for other problematic Unicode ranges

2. **User Feedback**:
   - Show warning when fancy text is detected and normalized
   - Log normalization events for audit trail

3. **Database Migration**:
   - Create script to clean existing records
   - Run as one-time migration

## Related Files
- `/backend/internal/utils/text.go` - New normalization utility
- `/backend/internal/handlers/registration_handler.go` - Registration validation
- `/backend/internal/handlers/student_handler.go` - Update validation
- `/backend/internal/services/bulk_import_xlsx_service.go` - Import validation
- `/frontend/src/app/students/page.tsx` - Display normalization
