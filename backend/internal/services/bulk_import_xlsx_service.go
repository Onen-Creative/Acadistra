package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type BulkImportXLSXService struct {
	db *gorm.DB
}

func NewBulkImportXLSXService(db *gorm.DB) *BulkImportXLSXService {
	return &BulkImportXLSXService{db: db}
}

// GenerateStudentTemplate creates XLSX template for student import
func (s *BulkImportXLSXService) GenerateStudentTemplate(classID uuid.UUID) (*excelize.File, error) {
	// Get class info
	var class models.Class
	if err := s.db.First(&class, classID).Error; err != nil {
		return nil, fmt.Errorf("class not found: %w", err)
	}

	f := excelize.NewFile()
	sheet := "Students"
	f.SetSheetName("Sheet1", sheet)

	// Title with class info
	f.SetCellValue(sheet, "A1", fmt.Sprintf("STUDENT IMPORT TEMPLATE - %s (%s)", class.Name, class.Level))
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14, Color: "#1F4788"},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.MergeCell(sheet, "A1", "AC1")
	f.SetCellStyle(sheet, "A1", "AC1", titleStyle)

	// Comprehensive headers matching all student fields (removed Class Level)
	headers := []string{
		"First Name", "Middle Name", "Last Name", "Date of Birth", "Gender",
		"Nationality", "Religion", "LIN", "Email", "Phone",
		"Address", "District", "Village", "Residence Type",
		"Previous School", "Previous Class", "Special Needs", "Disability Status",
		"Guardian Relationship", "Guardian Name", "Guardian Phone",
		"Guardian Alternative Phone", "Guardian Email", "Guardian Occupation",
		"Guardian Address", "Guardian Workplace", "Guardian Work Address", "Guardian National ID",
	}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue(sheet, cell, h)
	}

	// Style headers
	style, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
		Font: &excelize.Font{Bold: true, Color: "#FFFFFF"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	lastCol, _ := excelize.ColumnNumberToName(len(headers))
	f.SetCellStyle(sheet, "A2", lastCol+"2", style)

	// Add instruction note
	instructionStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#FFF2CC"}, Pattern: 1},
		Font: &excelize.Font{Italic: true, Color: "#7F6000"},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", WrapText: true},
	})
	f.SetCellValue(sheet, "A3", fmt.Sprintf("INSTRUCTIONS: All students will be imported into %s. Required: First Name, Last Name. Gender: 'male'/'female' or 'm'/'f'. Date formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY. Delete sample rows before uploading.", class.Name))
	f.MergeCell(sheet, "A3", lastCol+"3")
	f.SetCellStyle(sheet, "A3", lastCol+"3", instructionStyle)
	f.SetRowHeight(sheet, 3, 40)

	// Sample data with comprehensive examples (removed Class Level column)
	samples := [][]interface{}{
		{"John", "Paul", "Doe", "2010-01-15", "male",
			"Ugandan", "Catholic", "LIN123456", "john.doe@example.com", "+256700123456",
			"Plot 123, Main Street, Kampala", "Kampala", "Nakawa", "Day",
			"ABC Primary School", "Baby Class", "None", "None",
			"Father", "Robert Doe", "+256700000001",
			"+256700000002", "robert.doe@example.com", "Teacher",
			"Plot 456, Garden Street", "Ministry of Education", "Plot 789, Government Road", "CM12345678"},
		{"Mary", "Jane", "Smith", "2011-03-20", "female",
			"Ugandan", "Protestant", "LIN789012", "mary.smith@example.com", "+256700234567",
			"Plot 456, Lake Road, Entebbe", "Wakiso", "Entebbe", "Boarding",
			"XYZ Nursery School", "Top Class", "None", "None",
			"Mother", "Sarah Smith", "+256700000003",
			"+256700000004", "sarah.smith@example.com", "Nurse",
			"Plot 789, Hospital Road", "Mulago Hospital", "Plot 101, Medical Center", "CM87654321"},
		{"David", "", "Okello", "2009-07-10", "male",
			"Ugandan", "Muslim", "", "", "+256700345678",
			"Gulu Town", "Gulu", "Central", "Day",
			"", "", "None", "None",
			"Guardian", "James Okello", "+256700000005",
			"", "", "Farmer",
			"Gulu District", "", "", ""},
	}
	for i, sample := range samples {
		for j, val := range sample {
			cell, _ := excelize.CoordinatesToCellName(j+1, i+4) // Start from row 4
			f.SetCellValue(sheet, cell, val)
		}
	}

	// Set column widths
	for i := 1; i <= len(headers); i++ {
		col, _ := excelize.ColumnNumberToName(i)
		f.SetColWidth(sheet, col, col, 15)
	}

	return f, nil
}

// GenerateMarksTemplateByLevel creates XLSX template for marks import with student list by class level
func (s *BulkImportXLSXService) GenerateMarksTemplateByLevel(schoolID uuid.UUID, classLevel string, subjectID uuid.UUID, examType, term string, year int) (*excelize.File, error) {
	// Get subject info
	var subject models.StandardSubject
	if err := s.db.First(&subject, subjectID).Error; err != nil {
		return nil, fmt.Errorf("subject not found: %w", err)
	}

	// Get students in class level with class info
	type StudentWithClass struct {
		models.Student
		ClassName string
	}
	var students []StudentWithClass
	s.db.Table("students").
		Select("students.*, classes.name as class_name").
		Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Joins("JOIN classes ON classes.id = enrollments.class_id").
		Where("students.school_id = ? AND classes.level = ? AND enrollments.year = ? AND enrollments.term = ? AND enrollments.status = 'active'", 
			schoolID, classLevel, year, term).
		Order("students.admission_no").
		Scan(&students)

	f := excelize.NewFile()
	sheet := "Marks"
	f.SetSheetName("Sheet1", sheet)

	// Title (locked)
	f.SetCellValue(sheet, "A1", fmt.Sprintf("MARKS ENTRY TEMPLATE - %s %d", strings.ToUpper(term), year))
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 16},
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Protection: &excelize.Protection{Locked: true},
	})
	f.SetCellStyle(sheet, "A1", "G1", titleStyle)
	f.MergeCell(sheet, "A1", "G1")

	// Info rows
	infoStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 11},
		Protection: &excelize.Protection{Locked: true},
	})
	f.SetCellValue(sheet, "A2", "Academic Level:")
	f.SetCellValue(sheet, "B2", classLevel)
	f.SetCellValue(sheet, "D2", "Subject:")
	f.SetCellValue(sheet, "E2", subject.Name)
	f.SetCellStyle(sheet, "A2", "A2", infoStyle)
	f.SetCellStyle(sheet, "D2", "D2", infoStyle)

	// Headers (locked) - different for S5/S6 vs other levels
	var headers []string
	if classLevel == "S5" || classLevel == "S6" {
		headers = []string{"Admission No", "Full Student Name", "Class", "Subject", "Exam Type", 
			"Paper1 CA (20)", "Paper1 Exam (80)", "Paper2 CA (20)", "Paper2 Exam (80)", 
			"Paper3 CA (20)", "Paper3 Exam (80)", "Paper4 CA (20)", "Paper4 Exam (80)"}
	} else {
		headers = []string{"Admission No", "Full Student Name", "Class", "Subject", "Exam Type", "CA (20)", "Exam (80)"}
	}
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
		Font: &excelize.Font{Bold: true, Color: "#FFFFFF"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Protection: &excelize.Protection{Locked: true},
	})
	
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 4)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	// Student data (pre-filled, only CA and Exam columns editable)
	readOnlyStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#F2F2F2"}, Pattern: 1},
		Protection: &excelize.Protection{Locked: true},
	})
	
	editableStyle, _ := f.NewStyle(&excelize.Style{
		Protection: &excelize.Protection{Locked: false},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})

	for i, student := range students {
		row := i + 5
		// Build full name
		fullName := student.FirstName
		if student.MiddleName != "" {
			fullName += " " + student.MiddleName
		}
		fullName += " " + student.LastName
		
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), student.AdmissionNo)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fullName)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), student.ClassName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), subject.Name)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), examType)
		
		// Lock first 5 columns (Admission No, Name, Class, Subject, Exam Type)
		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("E%d", row), readOnlyStyle)
		
		// Editable columns depend on level
		if classLevel == "S5" || classLevel == "S6" {
			// Paper columns editable (F to M = 8 columns)
			f.SetCellStyle(sheet, fmt.Sprintf("F%d", row), fmt.Sprintf("M%d", row), editableStyle)
		} else {
			// CA and Exam columns editable
			f.SetCellStyle(sheet, fmt.Sprintf("F%d", row), fmt.Sprintf("G%d", row), editableStyle)
		}
	}

	// Set column widths
	f.SetColWidth(sheet, "A", "A", 15)
	f.SetColWidth(sheet, "B", "B", 30)
	f.SetColWidth(sheet, "C", "C", 15)
	f.SetColWidth(sheet, "D", "D", 25)
	f.SetColWidth(sheet, "E", "E", 12)
	if classLevel == "S5" || classLevel == "S6" {
		f.SetColWidth(sheet, "F", "M", 12)
	} else {
		f.SetColWidth(sheet, "F", "G", 12)
	}

	// Protect sheet LAST (allow editing only CA and Exam columns)
	f.ProtectSheet(sheet, &excelize.SheetProtectionOptions{
		Password:            "",
		SelectLockedCells:   true,
		SelectUnlockedCells: true,
		FormatCells:         true,
		EditObjects:         false,
		EditScenarios:       false,
	})

	return f, nil
}

// GenerateMarksTemplate creates XLSX template for marks import with student list
func (s *BulkImportXLSXService) GenerateMarksTemplate(classID uuid.UUID, subjectID uuid.UUID, term string, year int) (*excelize.File, error) {
	// Get class and subject info
	var class models.Class
	if err := s.db.First(&class, classID).Error; err != nil {
		return nil, fmt.Errorf("class not found: %w", err)
	}

	var subject models.StandardSubject
	if err := s.db.First(&subject, subjectID).Error; err != nil {
		return nil, fmt.Errorf("subject not found: %w", err)
	}

	// Get students in class
	var students []models.Student
	s.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND enrollments.year = ? AND enrollments.term = ? AND enrollments.status = 'active'", 
			classID, year, term).
		Order("students.admission_no").
		Find(&students)

	f := excelize.NewFile()
	sheet := "Marks"
	f.SetSheetName("Sheet1", sheet)

	// Title
	f.SetCellValue(sheet, "A1", fmt.Sprintf("Marks Entry - %s - %s - %s %d", class.Name, subject.Name, term, year))
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	f.SetCellStyle(sheet, "A1", "E1", titleStyle)
	f.MergeCell(sheet, "A1", "E1")

	// Headers
	headers := []string{"Admission No", "Student Name", "Class", "Subject", "Marks"}
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
		Font: &excelize.Font{Bold: true, Color: "#FFFFFF"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 3)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	// Student data (pre-filled, marks column editable)
	readOnlyStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#F2F2F2"}, Pattern: 1},
		Protection: &excelize.Protection{Locked: true},
	})
	
	editableStyle, _ := f.NewStyle(&excelize.Style{
		Protection: &excelize.Protection{Locked: false},
	})

	for i, student := range students {
		row := i + 4
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), student.AdmissionNo)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), student.FirstName+" "+student.LastName)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), class.Name)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), subject.Name)
		
		// Lock first 4 columns
		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row), readOnlyStyle)
		// Marks column editable
		f.SetCellStyle(sheet, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), editableStyle)
	}

	// Set column widths
	f.SetColWidth(sheet, "A", "A", 15)
	f.SetColWidth(sheet, "B", "B", 25)
	f.SetColWidth(sheet, "C", "D", 20)
	f.SetColWidth(sheet, "E", "E", 10)

	// Protect sheet (allow editing only marks column)
	f.ProtectSheet(sheet, &excelize.SheetProtectionOptions{
		Password:            "",
		SelectLockedCells:   true,
		SelectUnlockedCells: true,
		FormatCells:         true,
		EditObjects:         false,
		EditScenarios:       false,
	})

	return f, nil
}

// ParseStudentXLSX parses student XLSX file
func (s *BulkImportXLSXService) ParseStudentXLSX(file *excelize.File, schoolID uuid.UUID, classID uuid.UUID, uploaderID uuid.UUID) (*models.BulkImport, error) {
	sheet := file.GetSheetName(0)
	rows, err := file.GetRows(sheet)
	if err != nil {
		return nil, err
	}

	if len(rows) < 4 {
		return nil, errors.New("file is empty or missing data")
	}

	// Validate class exists
	var class models.Class
	if err := s.db.First(&class, classID).Error; err != nil {
		return nil, errors.New("class not found")
	}

	// Validate headers (row 2, removed Class Level)
	expectedHeaders := []string{
		"First Name", "Middle Name", "Last Name", "Date of Birth", "Gender",
		"Nationality", "Religion", "LIN", "Email", "Phone",
		"Address", "District", "Village", "Residence Type",
		"Previous School", "Previous Class", "Special Needs", "Disability Status",
		"Guardian Relationship", "Guardian Name", "Guardian Phone",
		"Guardian Alternative Phone", "Guardian Email", "Guardian Occupation",
		"Guardian Address", "Guardian Workplace", "Guardian Work Address", "Guardian National ID",
	}
	if !validateXLSXHeaders(rows[1], expectedHeaders) {
		return nil, fmt.Errorf("invalid headers. Expected: %v", expectedHeaders)
	}

	var validData []map[string]interface{}
	var errorList []string
	validCount := 0
	invalidCount := 0

	// Skip rows 1-3 (title, headers, instructions) and start from row 4
	for i, row := range rows[3:] {
		rowNum := i + 4
		
		// Pad row with empty strings if it has fewer than 28 columns (removed Class Level)
		for len(row) < 28 {
			row = append(row, "")
		}

		data, err := s.validateStudentRow(row, schoolID, classID)
		if err != nil {
			errorList = append(errorList, fmt.Sprintf("Row %d: %v", rowNum, err))
			invalidCount++
			continue
		}

		validData = append(validData, data)
		validCount++
	}

	dataJSON, _ := json.Marshal(validData)
	errorsJSON, _ := json.Marshal(errorList)

	bulkImport := &models.BulkImport{
		SchoolID:    schoolID,
		ImportType:  "students",
		Status:      "pending",
		UploadedBy:  uploaderID,
		TotalRows:   len(rows) - 3, // Exclude title, header, and instruction rows
		ValidRows:   validCount,
		InvalidRows: invalidCount,
		Errors:      string(errorsJSON),
		Data:        string(dataJSON),
	}

	if err := s.db.Create(bulkImport).Error; err != nil {
		return nil, err
	}

	return bulkImport, nil
}

// ParseMarksXLSXByLevel parses marks XLSX file by class level
func (s *BulkImportXLSXService) ParseMarksXLSXByLevel(file *excelize.File, schoolID uuid.UUID, classLevel string, subjectID uuid.UUID, examType, term string, year int, uploaderID uuid.UUID) (*models.BulkImport, error) {
	sheet := file.GetSheetName(0)
	rows, err := file.GetRows(sheet)
	if err != nil {
		return nil, err
	}

	if len(rows) < 5 {
		return nil, errors.New("file is empty or missing data")
	}

	var validData []map[string]interface{}
	var errorList []string
	validCount := 0
	invalidCount := 0

	for i, row := range rows[4:] { // Skip title, info rows, and headers
		rowNum := i + 5
		if len(row) < 7 {
			errorList = append(errorList, fmt.Sprintf("Row %d: insufficient columns", rowNum))
			invalidCount++
			continue
		}

		data, err := s.validateMarksRowByLevel(row, schoolID, classLevel, subjectID, examType, term, year)
		if err != nil {
			errorList = append(errorList, fmt.Sprintf("Row %d: %v", rowNum, err))
			invalidCount++
			continue
		}

		validData = append(validData, data)
		validCount++
	}

	dataJSON, _ := json.Marshal(validData)
	errorsJSON, _ := json.Marshal(errorList)
	metadata, _ := json.Marshal(map[string]interface{}{
		"class_level": classLevel,
		"subject_id":  subjectID,
		"exam_type":   examType,
		"term":        term,
		"year":        year,
	})

	bulkImport := &models.BulkImport{
		SchoolID:    schoolID,
		ImportType:  "marks",
		Status:      "pending",
		UploadedBy:  uploaderID,
		TotalRows:   len(rows) - 4,
		ValidRows:   validCount,
		InvalidRows: invalidCount,
		Errors:      string(errorsJSON),
		Data:        string(dataJSON),
		Metadata:    string(metadata),
	}

	if err := s.db.Create(bulkImport).Error; err != nil {
		return nil, err
	}

	return bulkImport, nil
}

// ParseMarksXLSX parses marks XLSX file
func (s *BulkImportXLSXService) ParseMarksXLSX(file *excelize.File, schoolID uuid.UUID, classID, subjectID uuid.UUID, examType, term string, year int, uploaderID uuid.UUID) (*models.BulkImport, error) {
	sheet := file.GetSheetName(0)
	rows, err := file.GetRows(sheet)
	if err != nil {
		return nil, err
	}

	if len(rows) < 4 {
		return nil, errors.New("file is empty or missing data")
	}

	var validData []map[string]interface{}
	var errorList []string
	validCount := 0
	invalidCount := 0

	for i, row := range rows[3:] { // Skip title and headers
		rowNum := i + 4
		if len(row) < 5 {
			errorList = append(errorList, fmt.Sprintf("Row %d: insufficient columns", rowNum))
			invalidCount++
			continue
		}

		data, err := s.validateMarksRow(row, schoolID, classID, subjectID, examType, term, year)
		if err != nil {
			errorList = append(errorList, fmt.Sprintf("Row %d: %v", rowNum, err))
			invalidCount++
			continue
		}

		validData = append(validData, data)
		validCount++
	}

	dataJSON, _ := json.Marshal(validData)
	errorsJSON, _ := json.Marshal(errorList)
	metadata, _ := json.Marshal(map[string]interface{}{
		"class_id":   classID,
		"subject_id": subjectID,
		"exam_type":  examType,
		"term":       term,
		"year":       year,
	})

	bulkImport := &models.BulkImport{
		SchoolID:    schoolID,
		ImportType:  "marks",
		Status:      "pending",
		UploadedBy:  uploaderID,
		TotalRows:   len(rows) - 3,
		ValidRows:   validCount,
		InvalidRows: invalidCount,
		Errors:      string(errorsJSON),
		Data:        string(dataJSON),
		Metadata:    string(metadata),
	}

	if err := s.db.Create(bulkImport).Error; err != nil {
		return nil, err
	}

	return bulkImport, nil
}

func (s *BulkImportXLSXService) validateStudentRow(row []string, schoolID uuid.UUID, classID uuid.UUID) (map[string]interface{}, error) {
	firstName := strings.TrimSpace(row[0])
	middleName := strings.TrimSpace(row[1])
	lastName := strings.TrimSpace(row[2])
	dobStr := strings.TrimSpace(row[3])
	gender := strings.ToLower(strings.TrimSpace(row[4]))
	nationality := strings.TrimSpace(row[5])
	religion := strings.TrimSpace(row[6])
	lin := strings.TrimSpace(row[7])
	email := strings.TrimSpace(row[8])
	phone := strings.TrimSpace(row[9])
	address := strings.TrimSpace(row[10])
	district := strings.TrimSpace(row[11])
	village := strings.TrimSpace(row[12])
	residenceType := strings.TrimSpace(row[13])
	previousSchool := strings.TrimSpace(row[14])
	previousClass := strings.TrimSpace(row[15])
	specialNeeds := strings.TrimSpace(row[16])
	disabilityStatus := strings.TrimSpace(row[17])
	guardianRelationship := strings.TrimSpace(row[18])
	guardianName := strings.TrimSpace(row[19])
	guardianPhone := strings.TrimSpace(row[20])
	guardianAltPhone := strings.TrimSpace(row[21])
	guardianEmail := strings.TrimSpace(row[22])
	guardianOccupation := strings.TrimSpace(row[23])
	guardianAddress := strings.TrimSpace(row[24])
	guardianWorkplace := strings.TrimSpace(row[25])
	guardianWorkAddress := strings.TrimSpace(row[26])
	guardianNationalID := strings.TrimSpace(row[27])

	// Validate required fields
	if firstName == "" || lastName == "" {
		return nil, errors.New("missing required fields: first name and last name")
	}

	// Parse date - support multiple formats
	var dob time.Time
	var err error
	if dobStr != "" {
		// Try multiple date formats
		dateFormats := []string{
			"2006-01-02",    // YYYY-MM-DD
			"02/01/2006",    // DD/MM/YYYY
			"01/02/2006",    // MM/DD/YYYY
			"2006/01/02",    // YYYY/MM/DD
			"02-01-2006",    // DD-MM-YYYY
			"01-02-2006",    // MM-DD-YYYY
			"2 Jan 2006",    // D Mon YYYY
			"02 January 2006", // DD Month YYYY
		}
		
		for _, format := range dateFormats {
			dob, err = time.Parse(format, dobStr)
			if err == nil {
				break
			}
		}
		
		if err != nil {
			return nil, fmt.Errorf("invalid date format: %v (supported: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, etc.)", err)
		}
	}

	// Validate gender (accept male/female, m/f, Male/Female, M/F)
	if gender != "" && gender != "male" && gender != "female" && gender != "m" && gender != "f" {
		return nil, errors.New("gender must be 'male', 'female', 'm', or 'f'")
	}

	// Normalize gender to Male/Female
	if gender == "m" || gender == "male" {
		gender = "Male"
	} else if gender == "f" || gender == "female" {
		gender = "Female"
	}

	data := map[string]interface{}{
		"first_name":   firstName,
		"middle_name":  middleName,
		"last_name":    lastName,
		"gender":       gender,
		"nationality":  nationality,
		"religion":     religion,
		"lin":          lin,
		"email":        email,
		"phone":        phone,
		"address":      address,
		"district":     district,
		"village":      village,
		"residence_type": residenceType,
		"previous_school": previousSchool,
		"previous_class": previousClass,
		"special_needs": specialNeeds,
		"disability_status": disabilityStatus,
		"guardian_relationship": guardianRelationship,
		"guardian_name": guardianName,
		"guardian_phone": guardianPhone,
		"guardian_alt_phone": guardianAltPhone,
		"guardian_email": guardianEmail,
		"guardian_occupation": guardianOccupation,
		"guardian_address": guardianAddress,
		"guardian_workplace": guardianWorkplace,
		"guardian_work_address": guardianWorkAddress,
		"guardian_national_id": guardianNationalID,
		"class_id": classID.String(), // Always use the provided class ID
	}

	if dobStr != "" {
		data["date_of_birth"] = dob.Format("2006-01-02")
	}

	return data, nil
}

func (s *BulkImportXLSXService) validateMarksRowByLevel(row []string, schoolID uuid.UUID, classLevel string, subjectID uuid.UUID, examType, term string, year int) (map[string]interface{}, error) {
	admissionNo := strings.TrimSpace(row[0])
	
	// S5/S6 uses paper-based structure
	if classLevel == "S5" || classLevel == "S6" {
		if len(row) < 13 {
			return nil, errors.New("insufficient columns for S5/S6 paper-based marks")
		}
		
		paperData := make(map[string]interface{})
		hasAnyMarks := false
		
		// Parse up to 4 papers
		for i := 1; i <= 4; i++ {
			caIdx := 4 + (i-1)*2 // F=5, H=7, J=9, L=11
			examIdx := caIdx + 1
			
			caStr := strings.TrimSpace(row[caIdx])
			examStr := strings.TrimSpace(row[examIdx])
			
			if caStr != "" || examStr != "" {
				hasAnyMarks = true
				ca := 0.0
				exam := 0.0
				
				if caStr != "" {
					var err error
					ca, err = strconv.ParseFloat(caStr, 64)
					if err != nil {
						return nil, fmt.Errorf("invalid Paper%d CA value: %v", i, err)
					}
					if ca < 0 || ca > 20 {
						return nil, fmt.Errorf("Paper%d CA must be between 0 and 20", i)
					}
				}
				
				if examStr != "" {
					var err error
					exam, err = strconv.ParseFloat(examStr, 64)
					if err != nil {
						return nil, fmt.Errorf("invalid Paper%d Exam value: %v", i, err)
					}
					if exam < 0 || exam > 80 {
						return nil, fmt.Errorf("Paper%d Exam must be between 0 and 80", i)
					}
				}
				
				paperData[fmt.Sprintf("paper%d", i)] = map[string]interface{}{
					"ca":   ca,
					"exam": exam,
				}
			}
		}
		
		if !hasAnyMarks {
			return nil, errors.New("all paper fields are empty")
		}
		
		// Find student
		var student models.Student
		if err := s.db.Where("school_id = ? AND admission_no = ?", schoolID, admissionNo).First(&student).Error; err != nil {
			return nil, fmt.Errorf("student not found: %s", admissionNo)
		}
		
		// Get student's class ID
		var enrollment models.Enrollment
		if err := s.db.Joins("JOIN classes ON classes.id = enrollments.class_id").
			Where("enrollments.student_id = ? AND classes.level = ? AND enrollments.year = ? AND enrollments.term = ?",
				student.ID, classLevel, year, term).First(&enrollment).Error; err != nil {
			return nil, fmt.Errorf("student not enrolled in %s for %s %d", classLevel, term, year)
		}
		
		return map[string]interface{}{
			"student_id": student.ID.String(),
			"class_id":   enrollment.ClassID.String(),
			"subject_id": subjectID.String(),
			"exam_type":  examType,
			"term":       term,
			"year":       year,
			"paper_data": paperData,
		}, nil
	}
	
	// Other levels use simple CA/Exam structure
	caStr := strings.TrimSpace(row[5])  // Column F (CA)
	examStr := strings.TrimSpace(row[6]) // Column G (Exam)

	if caStr == "" && examStr == "" {
		return nil, errors.New("both CA and Exam fields are empty")
	}

	ca := 0.0
	exam := 0.0
	var err error

	if caStr != "" {
		ca, err = strconv.ParseFloat(caStr, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid CA value: %v", err)
		}
		if ca < 0 || ca > 20 {
			return nil, errors.New("CA must be between 0 and 20")
		}
	}

	if examStr != "" {
		exam, err = strconv.ParseFloat(examStr, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid Exam value: %v", err)
		}
		if exam < 0 || exam > 80 {
			return nil, errors.New("Exam must be between 0 and 80")
		}
	}

	// Find student
	var student models.Student
	if err := s.db.Where("school_id = ? AND admission_no = ?", schoolID, admissionNo).First(&student).Error; err != nil {
		return nil, fmt.Errorf("student not found: %s", admissionNo)
	}

	// Get student's class ID
	var enrollment models.Enrollment
	if err := s.db.Joins("JOIN classes ON classes.id = enrollments.class_id").
		Where("enrollments.student_id = ? AND classes.level = ? AND enrollments.year = ? AND enrollments.term = ?",
			student.ID, classLevel, year, term).First(&enrollment).Error; err != nil {
		return nil, fmt.Errorf("student not enrolled in %s for %s %d", classLevel, term, year)
	}

	return map[string]interface{}{
		"student_id": student.ID.String(),
		"class_id":   enrollment.ClassID.String(),
		"subject_id": subjectID.String(),
		"exam_type":  examType,
		"term":       term,
		"year":       year,
		"ca":         ca,
		"exam":       exam,
	}, nil
}

func (s *BulkImportXLSXService) validateMarksRow(row []string, schoolID, classID, subjectID uuid.UUID, examType, term string, year int) (map[string]interface{}, error) {
	admissionNo := strings.TrimSpace(row[0])
	marksStr := strings.TrimSpace(row[4])

	if marksStr == "" {
		return nil, errors.New("marks field is empty")
	}

	marks, err := strconv.ParseFloat(marksStr, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid marks value: %v", err)
	}

	if marks < 0 || marks > 100 {
		return nil, errors.New("marks must be between 0 and 100")
	}

	// Find student
	var student models.Student
	if err := s.db.Where("school_id = ? AND admission_no = ?", schoolID, admissionNo).First(&student).Error; err != nil {
		return nil, fmt.Errorf("student not found: %s", admissionNo)
	}

	return map[string]interface{}{
		"student_id": student.ID.String(),
		"class_id":   classID.String(),
		"subject_id": subjectID.String(),
		"exam_type":  examType,
		"term":       term,
		"year":       year,
		"marks":      marks,
	}, nil
}

// ApproveImport approves and executes the import
func (s *BulkImportXLSXService) ApproveImport(importID, approverID uuid.UUID) error {
	var bulkImport models.BulkImport
	if err := s.db.First(&bulkImport, importID).Error; err != nil {
		return err
	}

	if bulkImport.Status != "pending" {
		return errors.New("import already processed")
	}

	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var data []map[string]interface{}
	json.Unmarshal([]byte(bulkImport.Data), &data)

	switch bulkImport.ImportType {
	case "students":
		for _, item := range data {
			if err := s.createStudent(tx, item, bulkImport.SchoolID); err != nil {
				tx.Rollback()
				return err
			}
		}
	case "marks":
		for _, item := range data {
			if err := s.createOrUpdateResult(tx, item, bulkImport.SchoolID); err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	now := time.Now()
	bulkImport.Status = "approved"
	bulkImport.ApprovedBy = &approverID
	bulkImport.ApprovedAt = &now

	if err := tx.Save(&bulkImport).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

func (s *BulkImportXLSXService) createStudent(tx *gorm.DB, data map[string]interface{}, schoolID uuid.UUID) error {
	now := time.Now()

	// Get school and class info
	var school models.School
	if err := tx.First(&school, schoolID).Error; err != nil {
		return fmt.Errorf("school not found: %w", err)
	}

	classID, _ := uuid.Parse(data["class_id"].(string))
	var class models.Class
	if err := tx.First(&class, classID).Error; err != nil {
		return fmt.Errorf("class not found: %w", err)
	}

	// Generate admission number using school initials
	var schoolInitials string
	for _, word := range strings.Fields(school.Name) {
		if len(word) > 0 {
			schoolInitials += strings.ToUpper(string(word[0]))
		}
	}

	// Find last admission number
	var lastStudent models.Student
	var sequence int = 0
	pattern := fmt.Sprintf("%s/%s/%d/%%", schoolInitials, class.Name, class.Year)
	if err := tx.Where("school_id = ? AND admission_no LIKE ?", schoolID, pattern).
		Order("admission_no DESC").First(&lastStudent).Error; err == nil {
		parts := strings.Split(lastStudent.AdmissionNo, "/")
		if len(parts) == 4 {
			if num, err := strconv.Atoi(parts[3]); err == nil {
				sequence = num
			}
		}
	}
	sequence++
	admissionNo := fmt.Sprintf("%s/%s/%d/%03d", schoolInitials, class.Name, class.Year, sequence)

	student := models.Student{
		SchoolID:      schoolID,
		AdmissionNo:   admissionNo,
		FirstName:     strings.Title(strings.ToLower(data["first_name"].(string))),
		LastName:      strings.Title(strings.ToLower(data["last_name"].(string))),
		Status:        "active",
		AdmissionDate: &now,
	}

	if middleName, ok := data["middle_name"].(string); ok && middleName != "" {
		student.MiddleName = strings.Title(strings.ToLower(middleName))
	}
	if dobStr, ok := data["date_of_birth"].(string); ok && dobStr != "" {
		dob, _ := time.Parse("2006-01-02", dobStr)
		student.DateOfBirth = &dob
	}
	if gender, ok := data["gender"].(string); ok && gender != "" {
		student.Gender = gender
	}
	if nationality, ok := data["nationality"].(string); ok && nationality != "" {
		student.Nationality = nationality
	}
	if religion, ok := data["religion"].(string); ok && religion != "" {
		student.Religion = religion
	}
	if lin, ok := data["lin"].(string); ok && lin != "" {
		student.LIN = lin
	}
	if email, ok := data["email"].(string); ok && email != "" {
		student.Email = email
	}
	if phone, ok := data["phone"].(string); ok && phone != "" {
		student.Phone = phone
	}
	if address, ok := data["address"].(string); ok && address != "" {
		student.Address = address
	}
	if district, ok := data["district"].(string); ok && district != "" {
		student.District = district
	}
	if village, ok := data["village"].(string); ok && village != "" {
		student.Village = village
	}

	if err := tx.Create(&student).Error; err != nil {
		return err
	}

	if classIDStr, ok := data["class_id"].(string); ok && classIDStr != "" {
		classID, _ := uuid.Parse(classIDStr)
		var class models.Class
		tx.First(&class, classID)

		enrollment := models.Enrollment{
			StudentID:  student.ID,
			ClassID:    classID,
			Year:       class.Year,
			Term:       class.Term,
			Status:     "active",
			EnrolledOn: time.Now(),
		}
		if err := tx.Create(&enrollment).Error; err != nil {
			return err
		}
	}

	if guardianName, ok := data["guardian_name"].(string); ok && guardianName != "" {
		guardian := models.Guardian{
			StudentID:        student.ID,
			SchoolID:         schoolID,
			FullName:         guardianName,
			IsPrimaryContact: true,
		}
		if rel, ok := data["guardian_relationship"].(string); ok && rel != "" {
			guardian.Relationship = rel
		}
		if phone, ok := data["guardian_phone"].(string); ok && phone != "" {
			guardian.Phone = phone
		}
		if email, ok := data["guardian_email"].(string); ok && email != "" {
			guardian.Email = email
		}
		if occupation, ok := data["guardian_occupation"].(string); ok && occupation != "" {
			guardian.Occupation = occupation
		}
		if address, ok := data["guardian_address"].(string); ok && address != "" {
			guardian.Address = address
		}
		if err := tx.Create(&guardian).Error; err != nil {
			return err
		}
	}

	return nil
}

func (s *BulkImportXLSXService) createOrUpdateResult(tx *gorm.DB, data map[string]interface{}, schoolID uuid.UUID) error {
	studentID, _ := uuid.Parse(data["student_id"].(string))
	classID, _ := uuid.Parse(data["class_id"].(string))
	subjectID, _ := uuid.Parse(data["subject_id"].(string))

	var existing models.SubjectResult
	err := tx.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?",
		studentID, subjectID, data["term"], data["year"]).First(&existing).Error

	examType := data["exam_type"].(string)
	
	// Check if this is S5/S6 paper-based data
	var examTypeData map[string]interface{}
	if paperData, hasPaperData := data["paper_data"].(map[string]interface{}); hasPaperData {
		// S5/S6 paper-based structure
		examTypeData = paperData
	} else {
		// Other levels: simple CA/Exam structure
		ca := data["ca"].(float64)
		exam := data["exam"].(float64)
		examTypeData = map[string]interface{}{
			"ca":   ca,
			"exam": exam,
		}
	}

	if err == nil {
		// Update existing - merge exam type marks without overwriting
		rawMarks := make(map[string]interface{})
		if existing.RawMarks != nil {
			rawMarks = existing.RawMarks
		}
		// Only update if exam type doesn't exist or is empty
		if _, exists := rawMarks[examType]; exists {
			return fmt.Errorf("marks already exist for exam type %s", examType)
		}
		rawMarks[examType] = examTypeData
		existing.RawMarks = rawMarks
		return tx.Save(&existing).Error
	}

	// Create new
	rawMarks := make(map[string]interface{})
	rawMarks[examType] = examTypeData
	
	result := models.SubjectResult{
		StudentID: studentID,
		SubjectID: subjectID,
		ClassID:   classID,
		SchoolID:  schoolID,
		Term:      data["term"].(string),
		Year:      int(data["year"].(float64)),
		RawMarks:  rawMarks,
	}
	return tx.Create(&result).Error
}

// RejectImport rejects the import
func (s *BulkImportXLSXService) RejectImport(importID uuid.UUID) error {
	return s.db.Model(&models.BulkImport{}).Where("id = ?", importID).Update("status", "rejected").Error
}

func validateXLSXHeaders(actual, expected []string) bool {
	if len(actual) < len(expected) {
		return false
	}
	for i, exp := range expected {
		if strings.TrimSpace(actual[i]) != exp {
			return false
		}
	}
	return true
}
