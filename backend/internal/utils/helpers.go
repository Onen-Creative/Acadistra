package utils

import (
	"fmt"
	"strings"
)

func Atoi(s string) int {
	var i int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			i = i*10 + int(c-'0')
		}
	}
	return i
}

func Contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

func GenerateID(prefix string, number int) string {
	return fmt.Sprintf("%s%04d", prefix, number)
}
