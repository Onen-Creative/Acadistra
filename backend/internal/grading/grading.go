package grading

import (
	"crypto/sha256"
	"fmt"
	"sort"
)

const (
	RuleVersionNursery = "NURSERY_V1"
	RuleVersionPrimary = "PRIMARY_V1"
	RuleVersionNCDC    = "NCDC_V1"
	RuleVersionUACE    = "UACE_V1"
)

// GradeResult holds computed grade information
type GradeResult struct {
	FinalGrade        string
	ComputationReason string
	RuleVersionHash   string
	PaperCodes        map[string]int // For UACE
}

// NurseryGrader implements Nursery descriptive grading
type NurseryGrader struct{}

func (g *NurseryGrader) ComputeGrade(caMarks, examMarks, caMax, examMax float64) GradeResult {
	// Both CA and Exams are out of 100, final is average
	final := (caMarks + examMarks) / 2

	grade := ""
	switch {
	case final >= 90:
		grade = "Mastering"
	case final >= 75:
		grade = "Secure"
	case final >= 60:
		grade = "Developing"
	case final >= 40:
		grade = "Emerging"
	default:
		grade = "Not Yet"
	}

	reason := fmt.Sprintf("CA: %.2f/100, Exam: %.2f/100, Average: %.2f → %s",
		caMarks, examMarks, final, grade)

	return GradeResult{
		FinalGrade:        grade,
		ComputationReason: reason,
		RuleVersionHash:   hashRuleVersion(RuleVersionNursery),
	}
}

// PrimaryGrader implements P1-P7 grading with CA (40) and Exam (60)
type PrimaryGrader struct{}

func (g *PrimaryGrader) ComputeGrade(caMarks, examMarks, caMax, examMax float64) GradeResult {
	caPercent := (caMarks / caMax) * 40
	examPercent := (examMarks / examMax) * 60
	total := caPercent + examPercent

	grade, points := "", 0
	switch {
	case total >= 90:
		grade, points = "D1", 1
	case total >= 80:
		grade, points = "D2", 2
	case total >= 70:
		grade, points = "C3", 3
	case total >= 60:
		grade, points = "C4", 4
	case total >= 55:
		grade, points = "C5", 5
	case total >= 50:
		grade, points = "C6", 6
	case total >= 45:
		grade, points = "P7", 7
	case total >= 40:
		grade, points = "P8", 8
	default:
		grade, points = "F9", 9
	}

	reason := fmt.Sprintf("CA: %.2f/%.0f (40%%) = %.2f, Exam: %.2f/%.0f (60%%) = %.2f, Total: %.2f → Grade %s (Points: %d)",
		caMarks, caMax, caPercent, examMarks, examMax, examPercent, total, grade, points)

	return GradeResult{
		FinalGrade:        grade,
		ComputationReason: reason,
		RuleVersionHash:   hashRuleVersion(RuleVersionPrimary),
	}
}

// NCDCGrader implements S1-S4 competency-based grading
type NCDCGrader struct{}

func (g *NCDCGrader) ComputeGrade(schoolBasedMarks, externalMarks, schoolBasedMax, externalMax float64) GradeResult {
	sbPercent := (schoolBasedMarks / schoolBasedMax) * 20
	extPercent := (externalMarks / externalMax) * 80
	total := sbPercent + extPercent

	grade := ""
	switch {
	case total >= 80:
		grade = "A"
	case total >= 65:
		grade = "B"
	case total >= 50:
		grade = "C"
	case total >= 35:
		grade = "D"
	default:
		grade = "E"
	}

	reason := fmt.Sprintf("AOI: %.2f/%.0f (20%%) = %.2f, Exam: %.2f/%.0f (80%%) = %.2f, Total: %.2f → Grade %s",
		schoolBasedMarks, schoolBasedMax, sbPercent, externalMarks, externalMax, extPercent, total, grade)

	return GradeResult{
		FinalGrade:        grade,
		ComputationReason: reason,
		RuleVersionHash:   hashRuleVersion(RuleVersionNCDC),
	}
}

// UACEGrader implements S5-S6 UACE/UNEB paper-based grading
type UACEGrader struct{}

// MapMarkToCode converts 0-100 marks to UNEB code 1-9
func (g *UACEGrader) MapMarkToCode(marks float64) int {
	switch {
	case marks >= 85:
		return 1 // D1
	case marks >= 80:
		return 2 // D2
	case marks >= 75:
		return 3 // C3
	case marks >= 70:
		return 4 // C4
	case marks >= 65:
		return 5 // C5
	case marks >= 60:
		return 6 // C6
	case marks >= 50:
		return 7 // P7
	case marks >= 40:
		return 8 // P8
	default:
		return 9 // F9
	}
}

// ComputeGradeFromPapers computes final grade from paper marks
func (g *UACEGrader) ComputeGradeFromPapers(paperMarks []float64) GradeResult {
	numPapers := len(paperMarks)
	if numPapers < 2 || numPapers > 4 {
		return GradeResult{
			FinalGrade:        "F",
			ComputationReason: fmt.Sprintf("Invalid number of papers: %d", numPapers),
			RuleVersionHash:   hashRuleVersion(RuleVersionUACE),
		}
	}

	// Convert marks to codes
	codes := make([]int, numPapers)
	paperCodes := make(map[string]int)
	for i, mark := range paperMarks {
		codes[i] = g.MapMarkToCode(mark)
		paperCodes[fmt.Sprintf("Paper%d", i+1)] = codes[i]
	}

	// Sort codes ascending for processing
	sortedCodes := make([]int, len(codes))
	copy(sortedCodes, codes)
	sort.Ints(sortedCodes)

	var finalGrade string
	var reason string

	switch numPapers {
	case 2:
		finalGrade, reason = g.compute2Papers(sortedCodes)
	case 3:
		finalGrade, reason = g.compute3Papers(sortedCodes)
	case 4:
		finalGrade, reason = g.compute4Papers(sortedCodes)
	}

	return GradeResult{
		FinalGrade:        finalGrade,
		ComputationReason: fmt.Sprintf("Papers: %v → Codes: %v → %s", paperMarks, codes, reason),
		RuleVersionHash:   hashRuleVersion(RuleVersionUACE),
		PaperCodes:        paperCodes,
	}
}

func (g *UACEGrader) compute2Papers(codes []int) (string, string) {
	sum := codes[0] + codes[1]
	
	// Grade A: Both papers ≤2 (Distinctions)
	if codes[0] <= 2 && codes[1] <= 2 {
		return "A", fmt.Sprintf("Both papers ≤2 (Distinctions): (%d,%d)", codes[0], codes[1])
	}
	
	// Grade B: One paper =3, other ≤3
	if (codes[0] == 3 || codes[1] == 3) && codes[0] <= 3 && codes[1] <= 3 {
		return "B", fmt.Sprintf("One paper =3, other ≤3: (%d,%d)", codes[0], codes[1])
	}
	
	// Grade C: One paper =4, other ≤4
	if (codes[0] == 4 || codes[1] == 4) && codes[0] <= 4 && codes[1] <= 4 {
		return "C", fmt.Sprintf("One paper =4, other ≤4: (%d,%d)", codes[0], codes[1])
	}
	
	// Grade D: One paper =5, other ≤5
	if (codes[0] == 5 || codes[1] == 5) && codes[0] <= 5 && codes[1] <= 5 {
		return "D", fmt.Sprintf("One paper =5, other ≤5: (%d,%d)", codes[0], codes[1])
	}
	
	// Grade E: One paper =6 or sum ≤12
	if codes[0] == 6 || codes[1] == 6 || sum <= 12 {
		return "E", fmt.Sprintf("One paper =6 or sum ≤12: (%d,%d) sum=%d", codes[0], codes[1], sum)
	}
	
	// Grade O: Sum ≤16, or one ≤6 and other =9
	if sum <= 16 || (codes[0] <= 6 && codes[1] == 9) || (codes[0] == 9 && codes[1] <= 6) {
		return "O", fmt.Sprintf("Sum ≤16 or one ≤6 and other =9: (%d,%d) sum=%d", codes[0], codes[1], sum)
	}
	
	// Grade F: (8,9) or (9,9)
	return "F", fmt.Sprintf("(8,9) or (9,9): (%d,%d)", codes[0], codes[1])
}

func (g *UACEGrader) compute3Papers(codes []int) (string, string) {
	// Science exception: (9,9,7) → Fail
	if codes[0] == 7 && codes[1] == 9 && codes[2] == 9 {
		return "F", fmt.Sprintf("Science exception (9,9,7): %v", codes)
	}
	
	// Grade A: One paper =3, others ≤2
	if codes[2] == 3 && codes[0] <= 2 && codes[1] <= 2 {
		return "A", fmt.Sprintf("One =3, others ≤2: %v", codes)
	}
	
	// Grade B: One paper =4, others ≤4
	if (codes[2] == 4 || codes[1] == 4 || codes[0] == 4) && codes[0] <= 4 && codes[1] <= 4 && codes[2] <= 4 {
		return "B", fmt.Sprintf("One =4, others ≤4: %v", codes)
	}
	
	// Grade C: One paper =5, others ≤5
	if (codes[2] == 5 || codes[1] == 5 || codes[0] == 5) && codes[0] <= 5 && codes[1] <= 5 && codes[2] <= 5 {
		return "C", fmt.Sprintf("One =5, others ≤5: %v", codes)
	}
	
	// Grade D: One paper =6, others ≤6
	if (codes[2] == 6 || codes[1] == 6 || codes[0] == 6) && codes[0] <= 6 && codes[1] <= 6 && codes[2] <= 6 {
		return "D", fmt.Sprintf("One =6, others ≤6: %v", codes)
	}
	
	// Grade E: One =7 and others ≤6, OR one =8 and ≤1 of others =6
	if (codes[2] == 7 && codes[0] <= 6 && codes[1] <= 6) {
		return "E", fmt.Sprintf("One =7, others ≤6: %v", codes)
	}
	if codes[2] == 8 {
		sixCount := 0
		if codes[0] == 6 { sixCount++ }
		if codes[1] == 6 { sixCount++ }
		if sixCount <= 1 && codes[0] <= 6 && codes[1] <= 6 {
			return "E", fmt.Sprintf("One =8 and ≤1 of others =6: %v", codes)
		}
	}
	
	// Grade O: (7,7,7), (8,8,8), one F9 with others ≤8, or two F9 with one ≤7
	if codes[0] == 7 && codes[1] == 7 && codes[2] == 7 {
		return "O", fmt.Sprintf("(7,7,7): %v", codes)
	}
	if codes[0] == 8 && codes[1] == 8 && codes[2] == 8 {
		return "O", fmt.Sprintf("(8,8,8): %v", codes)
	}
	// One F9 with others ≤8
	if codes[2] == 9 && codes[0] <= 8 && codes[1] <= 8 {
		return "O", fmt.Sprintf("One F9 with others ≤8: %v", codes)
	}
	// Two F9 with one ≤7
	if codes[1] == 9 && codes[2] == 9 && codes[0] <= 7 {
		return "O", fmt.Sprintf("Two F9 with one ≤7: %v", codes)
	}
	
	// Grade F: (9,9,8) or (9,9,9)
	return "F", fmt.Sprintf("(9,9,8) or (9,9,9): %v", codes)
}

func (g *UACEGrader) compute4Papers(codes []int) (string, string) {
	// Grade A: One =3, others ≤2
	if codes[3] == 3 && codes[0] <= 2 && codes[1] <= 2 && codes[2] <= 2 {
		return "A", fmt.Sprintf("One =3, others ≤2: %v", codes)
	}
	
	// Grade B: One =4, others ≤4
	if (codes[3] == 4 || codes[2] == 4 || codes[1] == 4 || codes[0] == 4) && codes[0] <= 4 && codes[1] <= 4 && codes[2] <= 4 && codes[3] <= 4 {
		return "B", fmt.Sprintf("One =4, others ≤4: %v", codes)
	}
	
	// Grade C: One =5, others ≤5
	if (codes[3] == 5 || codes[2] == 5 || codes[1] == 5 || codes[0] == 5) && codes[0] <= 5 && codes[1] <= 5 && codes[2] <= 5 && codes[3] <= 5 {
		return "C", fmt.Sprintf("One =5, others ≤5: %v", codes)
	}
	
	// Grade D: One =6, others ≤6
	if (codes[3] == 6 || codes[2] == 6 || codes[1] == 6 || codes[0] == 6) && codes[0] <= 6 && codes[1] <= 6 && codes[2] <= 6 && codes[3] <= 6 {
		return "D", fmt.Sprintf("One =6, others ≤6: %v", codes)
	}
	
	// Grade E: One =7 and others ≤6, or one =8 and ≤2 of others =6
	if codes[3] == 7 && codes[0] <= 6 && codes[1] <= 6 && codes[2] <= 6 {
		return "E", fmt.Sprintf("One =7, others ≤6: %v", codes)
	}
	if codes[3] == 8 {
		sixCount := 0
		if codes[0] == 6 { sixCount++ }
		if codes[1] == 6 { sixCount++ }
		if codes[2] == 6 { sixCount++ }
		if sixCount <= 2 && codes[0] <= 6 && codes[1] <= 6 && codes[2] <= 6 {
			return "E", fmt.Sprintf("One =8 and ≤2 of others =6: %v", codes)
		}
	}
	
	// Grade O: (7,7,7,7), (8,8,8,8), one/two F9 with others ≤8
	if codes[0] == 7 && codes[1] == 7 && codes[2] == 7 && codes[3] == 7 {
		return "O", fmt.Sprintf("(7,7,7,7): %v", codes)
	}
	if codes[0] == 8 && codes[1] == 8 && codes[2] == 8 && codes[3] == 8 {
		return "O", fmt.Sprintf("(8,8,8,8): %v", codes)
	}
	// One or two F9 with others ≤8
	nineCount := 0
	if codes[0] == 9 { nineCount++ }
	if codes[1] == 9 { nineCount++ }
	if codes[2] == 9 { nineCount++ }
	if codes[3] == 9 { nineCount++ }
	if (nineCount == 1 || nineCount == 2) && codes[0] <= 8 && codes[1] <= 8 && codes[2] <= 8 && codes[3] <= 8 {
		return "O", fmt.Sprintf("One/two F9 with others ≤8: %v", codes)
	}
	
	// Grade F: (9,9,8,8) or (9,9,9,9)
	return "F", fmt.Sprintf("(9,9,8,8) or (9,9,9,9): %v", codes)
}

func hashRuleVersion(version string) string {
	hash := sha256.Sum256([]byte(version))
	return fmt.Sprintf("%x", hash[:8])
}

// GetGrader returns appropriate grader for level
func GetGrader(level string) interface{} {
	switch level {
	case "Baby Class", "Middle Class", "Top Class", "Baby", "Middle", "Top", "Nursery":
		return &NurseryGrader{}
	case "P1", "P2", "P3", "P4", "P5", "P6", "P7":
		return &PrimaryGrader{}
	case "S1", "S2", "S3", "S4":
		return &NCDCGrader{}
	case "S5", "S6":
		return &UACEGrader{}
	default:
		return nil
	}
}
