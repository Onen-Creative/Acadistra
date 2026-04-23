# Edit Student Form - Complete Update

## Changes Made

Updated the edit student form to include **all student fields** and **parent/guardian details**.

### File Modified
- `frontend/src/app/students/[id]/edit/page.tsx`

## New Features Added

### 1. Guardian Data Fetching
- Added query to fetch existing guardian information
- Supports up to 2 guardians per student
- Auto-populates guardian fields if data exists

### 2. Primary Guardian Section
Fields added:
- Full Name
- Phone Number
- Email
- Relationship (Father, Mother, Guardian, Uncle, Aunt, Grandparent, Sibling, Other)
- Occupation
- National ID (NIN)
- Address

### 3. Secondary Guardian Section (Optional)
Same fields as primary guardian:
- Full Name
- Phone Number
- Email
- Relationship
- Occupation
- National ID (NIN)
- Address

### 4. Guardian Update Logic
- Updates existing guardians if they exist
- Creates new guardian records if they don't exist
- Handles both guardians independently
- Graceful error handling for guardian updates

## Form Structure

The complete edit form now includes:

1. **Personal Information**
   - Photo upload
   - First Name, Middle Name, Last Name
   - Date of Birth
   - Gender
   - Nationality
   - Religion
   - LIN (Learner ID Number)
   - Status

2. **Contact Information**
   - Email
   - Phone Number
   - District
   - Village
   - Residence Type (Day/Boarding)
   - Full Address

3. **Previous Education**
   - Previous School
   - Previous Class

4. **Health & Special Needs**
   - Special Needs
   - Disability Status

5. **Primary Guardian / Parent** ✨ NEW
   - Full Name
   - Phone Number
   - Email
   - Relationship
   - Occupation
   - National ID (NIN)
   - Address

6. **Secondary Guardian / Parent (Optional)** ✨ NEW
   - Full Name
   - Phone Number
   - Email
   - Relationship
   - Occupation
   - National ID (NIN)
   - Address

## Technical Implementation

### Data Flow
```
1. Load student data → GET /students/:id
2. Load guardians data → GET /guardians?student_id=:id
3. Populate form with both student and guardian data
4. On submit:
   - Update student → PUT /students/:id
   - Update/Create guardian 1 → PUT/POST /guardians/:id
   - Update/Create guardian 2 → PUT/POST /guardians/:id
```

### Form Values
```typescript
{
  // Student fields
  first_name, middle_name, last_name,
  date_of_birth, gender, nationality, religion, lin,
  email, phone, address, district, village,
  residence_type, previous_school, previous_class,
  special_needs, disability_status, status,
  
  // Guardian 1 fields
  guardian_full_name, guardian_phone, guardian_email,
  guardian_relationship, guardian_occupation,
  guardian_address, guardian_nin,
  
  // Guardian 2 fields
  guardian2_full_name, guardian2_phone, guardian2_email,
  guardian2_relationship, guardian2_occupation,
  guardian2_address, guardian2_nin
}
```

## Benefits

1. **Complete Student Profile** - All information in one place
2. **Parent Contact Updates** - Easy to update guardian details
3. **Data Consistency** - Ensures guardian info stays current
4. **Better Communication** - Up-to-date parent contact information
5. **Comprehensive Records** - Full student and family information

## Usage

1. Navigate to Students page
2. Click "Edit" on any student
3. Update student information
4. Update/Add guardian information
5. Click "Update Student"
6. All changes are saved (student + guardians)

## Validation

- Student first name and last name are required
- Gender is required
- Guardian fields are optional but recommended
- Email fields validate email format
- Phone numbers accept international format

## Error Handling

- Photo upload failures don't block student update
- Guardian update failures don't block student update
- Individual error messages for each operation
- Success notification on completion
