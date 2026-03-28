# Report Card Font Size Update

## Summary
Report card templates for **Ordinary Level (S1-S4)** and **Advanced Level (S5-S6)** have been updated with larger, more readable font sizes while maintaining the standard A4 paper size (210mm x 297mm).

**Note:** Nursery and Primary report cards retain their original font sizes as requested.

## Changes Made

### Paper Size
✅ **Maintained**: A4 size (210mm x 297mm) with 10mm padding for all levels

### Font Size Updates

#### Updated Templates (Larger Fonts)

**1. AdvancedLevelReportCard.tsx (S5-S6 UACE)**
- Headers: 16px → 20px
- Body Text: 8-9px → 10-13px
- Table Content: 9px → 11-12px
- Statistics: 20px → 24px
- Minimum font: 8px
- Maximum font: 24px
- Average increase: ~25%

**2. OrdinaryLevelReportCard.tsx (S1-S4 UCE)**
- Headers: 16px → 18-20px
- Body Text: 8-9px → 10-11px
- Table Content: 9px → 11px
- Statistics: 20px → 24px
- Minimum font: 8px
- Maximum font: 24px
- Average increase: ~25%

**3. ReportCardTemplate.tsx (Generic)**
- Updated with larger fonts for consistency
- Minimum font: 9px
- Maximum font: 24px

#### Unchanged Templates (Original Fonts)

**4. PrimaryReportCard.tsx (P1-P7)**
- Minimum font: 7px
- Maximum font: 22px
- Status: ✅ Original sizes maintained

**5. NurseryReportCard.tsx (ECCE)**
- Minimum font: 7px
- Maximum font: 20px
- Status: ✅ Original sizes maintained

## Rationale

### Why Larger Fonts for O-Level and A-Level?
- **National Exams**: These levels have UNEB examinations, requiring clear, professional documentation
- **Official Records**: Report cards serve as official academic records
- **Parent Readability**: Parents need to clearly see their children's performance
- **Print Quality**: Larger fonts ensure better print quality on various printers

### Why Original Fonts for Nursery and Primary?
- **More Subjects**: These levels typically have more subjects to display
- **Detailed Assessments**: Multiple assessment criteria per subject
- **Space Optimization**: Original fonts allow all information to fit on one page
- **Age-Appropriate**: Simpler, more compact format suitable for younger learners

## Files Modified

### Updated (Larger Fonts)
1. ✅ **AdvancedLevelReportCard.tsx** (S5-S6 UACE) - ~25% increase
2. ✅ **OrdinaryLevelReportCard.tsx** (S1-S4 UCE) - ~25% increase
3. ✅ **ReportCardTemplate.tsx** (Generic) - ~25% increase

### Unchanged (Original Fonts)
4. ✅ **PrimaryReportCard.tsx** (P1-P7) - Original sizes maintained
5. ✅ **NurseryReportCard.tsx** (ECCE) - Original sizes maintained

## Benefits

### For O-Level and A-Level
✅ **Better Readability**: All text clearly visible when printed
✅ **Professional Appearance**: Suitable for official documentation
✅ **Print-Friendly**: Optimized for A4 paper printing
✅ **Accessibility**: Easier to read for parents and administrators

### For Nursery and Primary
✅ **Space Efficient**: All subjects fit on one page
✅ **Comprehensive**: Room for detailed assessments
✅ **Balanced Layout**: Optimal information density

## Testing Recommendations

### Visual Check
1. Generate report cards for:
   - Nursery (original fonts)
   - Primary (original fonts)
   - O-Level (larger fonts)
   - A-Level (larger fonts)
2. Preview in browser
3. Print to PDF
4. Verify readability and layout

### Print Test
1. Print sample report cards on A4 paper
2. Check that:
   - O-Level and A-Level text is clearly legible
   - Nursery and Primary fit all content on one page
   - Nothing is cut off
   - Spacing looks balanced

## Deployment

Simply rebuild the frontend:
```bash
cd frontend
npm run build
```

Or with Docker:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Summary

- **O-Level & A-Level**: Larger fonts for better readability ✅
- **Nursery & Primary**: Original fonts maintained ✅
- **A4 Paper Size**: Maintained for all levels ✅
- **Professional Quality**: Enhanced for national exam levels ✅
