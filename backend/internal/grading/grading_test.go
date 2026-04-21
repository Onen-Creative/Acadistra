package grading

import (
	"testing"
)

func TestPrimaryGrader(t *testing.T) {
	grader := &PrimaryGrader{}

	tests := []struct {
		name     string
		ca       float64
		exam     float64
		caMax    float64
		examMax  float64
		expected string
	}{
		{"Perfect Score", 40, 60, 40, 60, "D1"},
		{"Grade D1", 36, 54, 40, 60, "D1"},
		{"Grade D2", 32, 48, 40, 60, "D2"},
		{"Grade C3", 28, 42, 40, 60, "C3"},
		{"Grade C4", 24, 36, 40, 60, "C4"},
		{"Grade C5", 22, 33, 40, 60, "C5"},
		{"Grade C6", 20, 30, 40, 60, "C6"},
		{"Grade P7", 18, 27, 40, 60, "P7"},
		{"Grade P8", 16, 24, 40, 60, "P8"},
		{"Grade F9", 12, 18, 40, 60, "F9"},
		{"Zero Score", 0, 0, 40, 60, "F9"},
	};

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := grader.ComputeGrade(tt.ca, tt.exam, tt.caMax, tt.examMax)
			if result.FinalGrade != tt.expected {
				t.Errorf("Expected grade %s, got %s. Reason: %s", tt.expected, result.FinalGrade, result.ComputationReason)
			}
		})
	}
}

func TestNCDCGrader(t *testing.T) {
	grader := &NCDCGrader{}

	tests := []struct {
		name     string
		sb       float64
		ext      float64
		sbMax    float64
		extMax   float64
		expected string
	}{
		{"Perfect Score", 100, 100, 100, 100, "A"},
		{"Grade A", 80, 80, 100, 100, "A"},
		{"Grade B", 60, 70, 100, 100, "B"},
		{"Grade C", 50, 50, 100, 100, "C"},
		{"Grade D", 40, 35, 100, 100, "D"},
		{"Grade E", 20, 20, 100, 100, "E"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := grader.ComputeGrade(tt.sb, tt.ext, tt.sbMax, tt.extMax)
			if result.FinalGrade != tt.expected {
				t.Errorf("Expected grade %s, got %s. Reason: %s", tt.expected, result.FinalGrade, result.ComputationReason)
			}
		})
	}
}

func TestUACEGrader_MapMarkToCode(t *testing.T) {
	grader := &UACEGrader{}

	tests := []struct {
		marks    float64
		expected int
	}{
		{100, 1},
		{85, 1},
		{84, 2},
		{80, 2},
		{79, 3},
		{75, 3},
		{74, 4},
		{70, 4},
		{69, 5},
		{65, 5},
		{64, 6},
		{60, 6},
		{59, 7},
		{50, 7},
		{49, 8},
		{40, 8},
		{39, 9},
		{0, 9},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			code := grader.MapMarkToCode(tt.marks)
			if code != tt.expected {
				t.Errorf("Mark %.0f: expected code %d, got %d", tt.marks, tt.expected, code)
			}
		})
	}
}

func TestUACEGrader_2Papers(t *testing.T) {
	grader := &UACEGrader{}

	tests := []struct {
		name     string
		papers   []float64
		expected string
	}{
		{"Both Distinction", []float64{85, 85}, "A"},
		{"Grade B", []float64{75, 75}, "B"},
		{"Grade C", []float64{70, 70}, "C"},
		{"Grade D", []float64{65, 65}, "D"},
		{"Grade E", []float64{60, 60}, "E"},
		{"Grade O", []float64{50, 50}, "O"},
		{"Grade F", []float64{40, 35}, "F"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := grader.ComputeGradeFromPapers(tt.papers)
			if result.FinalGrade != tt.expected {
				t.Errorf("Expected grade %s, got %s. Reason: %s", tt.expected, result.FinalGrade, result.ComputationReason)
			}
		})
	}
}

func TestUACEGrader_3Papers(t *testing.T) {
	grader := &UACEGrader{}

	tests := []struct {
		name     string
		papers   []float64
		expected string
	}{
		{"All Distinction", []float64{85, 85, 75}, "A"},
		{"Grade B", []float64{70, 70, 70}, "B"},
		{"Grade C", []float64{65, 65, 65}, "C"},
		{"Grade D", []float64{60, 60, 60}, "D"},
		{"Grade E", []float64{60, 60, 50}, "E"},
		{"Grade O", []float64{50, 50, 50}, "O"},
		{"Grade F", []float64{35, 30, 25}, "F"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := grader.ComputeGradeFromPapers(tt.papers)
			if result.FinalGrade != tt.expected {
				t.Errorf("Expected grade %s, got %s. Reason: %s", tt.expected, result.FinalGrade, result.ComputationReason)
			}
		})
	}
}

func TestUACEGrader_4Papers(t *testing.T) {
	grader := &UACEGrader{}

	tests := []struct {
		name     string
		papers   []float64
		expected string
	}{
		{"All Distinction", []float64{85, 85, 85, 75}, "A"},
		{"Grade B", []float64{70, 70, 70, 70}, "B"},
		{"Grade C", []float64{65, 65, 65, 65}, "C"},
		{"Grade D", []float64{60, 60, 60, 60}, "D"},
		{"Grade E", []float64{60, 60, 60, 50}, "E"},
		{"Grade O", []float64{50, 50, 50, 50}, "O"},
		{"Grade F", []float64{35, 30, 25, 20}, "F"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := grader.ComputeGradeFromPapers(tt.papers)
			if result.FinalGrade != tt.expected {
				t.Errorf("Expected grade %s, got %s. Reason: %s", tt.expected, result.FinalGrade, result.ComputationReason)
			}
		})
	}
}

func TestUACEGrader_EdgeCases(t *testing.T) {
	grader := &UACEGrader{}

	t.Run("Invalid paper count", func(t *testing.T) {
		result := grader.ComputeGradeFromPapers([]float64{80})
		if result.FinalGrade != "F" {
			t.Errorf("Expected F for invalid paper count, got %s", result.FinalGrade)
		}
	})

	t.Run("Boundary sum of 6", func(t *testing.T) {
		result := grader.ComputeGradeFromPapers([]float64{85, 85}) // codes 1,1
		if result.FinalGrade != "A" {
			t.Errorf("Expected A, got %s", result.FinalGrade)
		}
	})

	t.Run("Boundary sum of 18", func(t *testing.T) {
		result := grader.ComputeGradeFromPapers([]float64{60, 60}) // codes 6,6 sum=12
		if result.FinalGrade != "E" {
			t.Errorf("Expected E, got %s", result.FinalGrade)
		}
	})
}
