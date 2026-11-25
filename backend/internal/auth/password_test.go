package auth

import (
	"strings"
	"testing"
)

func TestPasswordHashAndVerify(t *testing.T) {
	password := "  пароль-with-spaces  "
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	if hash == password || !strings.HasPrefix(hash, "$argon2id$v=19$m=65536,t=3,p=2$") {
		t.Fatalf("unexpected password representation %q", hash)
	}
	if !VerifyPassword(hash, password) {
		t.Fatal("correct password was rejected")
	}
	if VerifyPassword(hash, strings.TrimSpace(password)) || VerifyPassword(hash, "wrong-password") {
		t.Fatal("incorrect password was accepted")
	}
	if VerifyPassword("not-a-phc-value", password) {
		t.Fatal("malformed hash was accepted")
	}
}

func TestPasswordLengthUsesUnicodeCharactersAndDoesNotTrim(t *testing.T) {
	if err := ValidatePassword("пароль12"); err != nil {
		t.Fatal(err)
	}
	if err := ValidatePassword("1234567"); err == nil {
		t.Fatal("short password accepted")
	}
	if err := ValidatePassword(strings.Repeat("я", 129)); err == nil {
		t.Fatal("long password accepted")
	}
	if err := ValidatePassword("        "); err != nil {
		t.Fatal("spaces are valid password characters")
	}
}
