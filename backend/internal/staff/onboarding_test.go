package staff

import (
	"regexp"
	"testing"
	"time"
)

func TestConnectionCodeAlphabetAndLength(t *testing.T) {
	for i := 0; i < 100; i++ {
		code, err := randomCode()
		if err != nil {
			t.Fatal(err)
		}
		if !regexp.MustCompile(`^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$`).MatchString(code) {
			t.Fatalf("unsafe code %q", code)
		}
	}
}
func TestCodeExpiresAtNextMoscowMidnight(t *testing.T) {
	loc, _ := time.LoadLocation("Europe/Moscow")
	tests := []time.Time{time.Date(2026, 11, 25, 20, 59, 59, 0, time.UTC), time.Date(2026, 11, 25, 21, 0, 0, 0, time.UTC)}
	for _, now := range tests {
		got := codeExpiry(now)
		localNow := now.In(loc)
		want := time.Date(localNow.Year(), localNow.Month(), localNow.Day()+1, 0, 0, 0, 0, loc).UTC()
		if !got.Equal(want) {
			t.Fatalf("now=%s got=%s want=%s", now, got, want)
		}
	}
}
