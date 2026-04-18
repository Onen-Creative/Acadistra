package utils

import (
	"strings"
	"unicode"
)

// NormalizeText removes Unicode mathematical alphanumeric symbols and other decorative characters
// that can cause font inconsistencies. This prevents "fancy" text from social media/keyboards
// from being stored in the database.
func NormalizeText(text string) string {
	if text == "" {
		return text
	}

	var result strings.Builder
	result.Grow(len(text))

	for _, r := range text {
		// Remove Mathematical Alphanumeric Symbols (U+1D400 to U+1D7FF)
		// These are used for "fancy" text styling
		if r >= 0x1D400 && r <= 0x1D7FF {
			// Try to map to regular ASCII equivalent
			mapped := mapMathAlphanumericToASCII(r)
			if mapped != 0 {
				result.WriteRune(mapped)
			}
			continue
		}

		// Remove other decorative Unicode ranges
		// Enclosed Alphanumerics (U+2460 to U+24FF)
		if r >= 0x2460 && r <= 0x24FF {
			continue
		}

		// Keep only printable characters and common punctuation
		if unicode.IsPrint(r) {
			result.WriteRune(r)
		}
	}

	return strings.TrimSpace(result.String())
}

// mapMathAlphanumericToASCII maps mathematical alphanumeric symbols to regular ASCII
func mapMathAlphanumericToASCII(r rune) rune {
	// Mathematical Bold Capital Letters (U+1D400 to U+1D419) -> A-Z
	if r >= 0x1D400 && r <= 0x1D419 {
		return 'A' + (r - 0x1D400)
	}
	// Mathematical Bold Small Letters (U+1D41A to U+1D433) -> a-z
	if r >= 0x1D41A && r <= 0x1D433 {
		return 'a' + (r - 0x1D41A)
	}
	// Mathematical Italic Capital Letters (U+1D434 to U+1D44D) -> A-Z
	if r >= 0x1D434 && r <= 0x1D44D {
		return 'A' + (r - 0x1D434)
	}
	// Mathematical Italic Small Letters (U+1D44E to U+1D467) -> a-z
	if r >= 0x1D44E && r <= 0x1D467 {
		return 'a' + (r - 0x1D44E)
	}
	// Mathematical Bold Italic Capital Letters (U+1D468 to U+1D481) -> A-Z
	if r >= 0x1D468 && r <= 0x1D481 {
		return 'A' + (r - 0x1D468)
	}
	// Mathematical Bold Italic Small Letters (U+1D482 to U+1D49B) -> a-z
	if r >= 0x1D482 && r <= 0x1D49B {
		return 'a' + (r - 0x1D482)
	}
	// Mathematical Script Capital Letters (U+1D49C to U+1D4B5) -> A-Z
	if r >= 0x1D49C && r <= 0x1D4B5 {
		return 'A' + (r - 0x1D49C)
	}
	// Mathematical Script Small Letters (U+1D4B6 to U+1D4CF) -> a-z
	if r >= 0x1D4B6 && r <= 0x1D4CF {
		return 'a' + (r - 0x1D4B6)
	}
	// Mathematical Bold Script Capital Letters (U+1D4D0 to U+1D4E9) -> A-Z
	if r >= 0x1D4D0 && r <= 0x1D4E9 {
		return 'A' + (r - 0x1D4D0)
	}
	// Mathematical Bold Script Small Letters (U+1D4EA to U+1D503) -> a-z
	if r >= 0x1D4EA && r <= 0x1D503 {
		return 'a' + (r - 0x1D4EA)
	}
	// Mathematical Fraktur Capital Letters (U+1D504 to U+1D51C) -> A-Z
	if r >= 0x1D504 && r <= 0x1D51C {
		return 'A' + (r - 0x1D504)
	}
	// Mathematical Fraktur Small Letters (U+1D51E to U+1D537) -> a-z
	if r >= 0x1D51E && r <= 0x1D537 {
		return 'a' + (r - 0x1D51E)
	}
	// Mathematical Double-Struck Capital Letters (U+1D538 to U+1D550) -> A-Z
	if r >= 0x1D538 && r <= 0x1D550 {
		return 'A' + (r - 0x1D538)
	}
	// Mathematical Double-Struck Small Letters (U+1D552 to U+1D56B) -> a-z
	if r >= 0x1D552 && r <= 0x1D56B {
		return 'a' + (r - 0x1D552)
	}
	// Mathematical Bold Fraktur Capital Letters (U+1D56C to U+1D585) -> A-Z
	if r >= 0x1D56C && r <= 0x1D585 {
		return 'A' + (r - 0x1D56C)
	}
	// Mathematical Bold Fraktur Small Letters (U+1D586 to U+1D59F) -> a-z
	if r >= 0x1D586 && r <= 0x1D59F {
		return 'a' + (r - 0x1D586)
	}
	// Mathematical Sans-Serif Capital Letters (U+1D5A0 to U+1D5B9) -> A-Z
	if r >= 0x1D5A0 && r <= 0x1D5B9 {
		return 'A' + (r - 0x1D5A0)
	}
	// Mathematical Sans-Serif Small Letters (U+1D5BA to U+1D5D3) -> a-z
	if r >= 0x1D5BA && r <= 0x1D5D3 {
		return 'a' + (r - 0x1D5BA)
	}
	// Mathematical Sans-Serif Bold Capital Letters (U+1D5D4 to U+1D5ED) -> A-Z
	if r >= 0x1D5D4 && r <= 0x1D5ED {
		return 'A' + (r - 0x1D5D4)
	}
	// Mathematical Sans-Serif Bold Small Letters (U+1D5EE to U+1D607) -> a-z
	if r >= 0x1D5EE && r <= 0x1D607 {
		return 'a' + (r - 0x1D5EE)
	}
	// Mathematical Sans-Serif Italic Capital Letters (U+1D608 to U+1D621) -> A-Z
	if r >= 0x1D608 && r <= 0x1D621 {
		return 'A' + (r - 0x1D608)
	}
	// Mathematical Sans-Serif Italic Small Letters (U+1D622 to U+1D63B) -> a-z
	if r >= 0x1D622 && r <= 0x1D63B {
		return 'a' + (r - 0x1D622)
	}
	// Mathematical Sans-Serif Bold Italic Capital Letters (U+1D63C to U+1D655) -> A-Z
	if r >= 0x1D63C && r <= 0x1D655 {
		return 'A' + (r - 0x1D63C)
	}
	// Mathematical Sans-Serif Bold Italic Small Letters (U+1D656 to U+1D66F) -> a-z
	if r >= 0x1D656 && r <= 0x1D66F {
		return 'a' + (r - 0x1D656)
	}
	// Mathematical Monospace Capital Letters (U+1D670 to U+1D689) -> A-Z
	if r >= 0x1D670 && r <= 0x1D689 {
		return 'A' + (r - 0x1D670)
	}
	// Mathematical Monospace Small Letters (U+1D68A to U+1D6A3) -> a-z
	if r >= 0x1D68A && r <= 0x1D6A3 {
		return 'a' + (r - 0x1D68A)
	}

	// If no mapping found, return 0 to skip the character
	return 0
}
