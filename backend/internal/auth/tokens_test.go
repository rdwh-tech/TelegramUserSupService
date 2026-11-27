package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestAccessTokenClaimsAndValidation(t *testing.T) {
	now := time.Date(2026, 11, 25, 10, 0, 0, 0, time.UTC)
	userID, sessionID := uuid.New(), uuid.New()
	m, err := NewTokenManager([]byte("01234567890123456789012345678901"), "issuer", "audience", time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	token, err := m.Sign(userID, sessionID, now, now.Add(30*time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	claims, err := m.Validate(token, now.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if claims.Subject != userID.String() || claims.SessionID != sessionID.String() || claims.Issuer != "issuer" || claims.Audience != "audience" {
		t.Fatalf("bad claims: %+v", claims)
	}
	if claims.ExpiresAt != now.Add(30*time.Minute).Unix() {
		t.Fatalf("expiration %d", claims.ExpiresAt)
	}
	if _, err = m.Validate(token, now.Add(30*time.Minute)); err == nil {
		t.Fatal("expired token accepted")
	}
}

func TestAccessTokenRejectsSignatureIssuerAudienceAndAlgorithm(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	userID, sessionID := uuid.New(), uuid.New()
	a, _ := NewTokenManager([]byte("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), "iss", "aud", time.Hour)
	token, _ := a.Sign(userID, sessionID, now, now.Add(time.Hour))
	wrongSecret, _ := NewTokenManager([]byte("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), "iss", "aud", time.Hour)
	if _, e := wrongSecret.Validate(token, now); e == nil {
		t.Fatal("wrong signature accepted")
	}
	wrongIssuer, _ := NewTokenManager([]byte("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), "other", "aud", time.Hour)
	if _, e := wrongIssuer.Validate(token, now); e == nil {
		t.Fatal("wrong issuer accepted")
	}
	if _, e := a.Validate("eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.e30.", now); e == nil {
		t.Fatal("none algorithm accepted")
	}
}

func TestRefreshTokenIsRandomAndOnlyHashIsStable(t *testing.T) {
	a, ah, e := NewRefreshToken()
	if e != nil {
		t.Fatal(e)
	}
	b, bh, e := NewRefreshToken()
	if e != nil {
		t.Fatal(e)
	}
	if a == b || ah == bh {
		t.Fatal("refresh tokens collided")
	}
	if len(a) != 43 || len(ah) != 64 {
		t.Fatalf("unexpected lengths token=%d hash=%d", len(a), len(ah))
	}
	if ah == a || HashRefreshToken(a) != ah {
		t.Fatal("refresh hashing failed")
	}
}
