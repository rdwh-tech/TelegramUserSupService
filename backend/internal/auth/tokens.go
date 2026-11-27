package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Claims struct {
	Subject   string `json:"sub"`
	SessionID string `json:"sid"`
	JWTID     string `json:"jti"`
	Issuer    string `json:"iss"`
	Audience  string `json:"aud"`
	IssuedAt  int64  `json:"iat"`
	NotBefore int64  `json:"nbf"`
	ExpiresAt int64  `json:"exp"`
}

type TokenManager struct {
	secret           []byte
	issuer, audience string
	accessTTL        time.Duration
}

func NewTokenManager(secret []byte, issuer, audience string, accessTTL time.Duration) (*TokenManager, error) {
	if len(secret) == 0 || strings.TrimSpace(issuer) == "" || strings.TrimSpace(audience) == "" || accessTTL <= 0 {
		return nil, ErrValidation
	}
	return &TokenManager{append([]byte(nil), secret...), issuer, audience, accessTTL}, nil
}

func (m *TokenManager) Sign(userID, sessionID uuid.UUID, now, sessionExpiry time.Time) (string, error) {
	exp := now.Add(m.accessTTL)
	if sessionExpiry.Before(exp) {
		exp = sessionExpiry
	}
	claims := Claims{userID.String(), sessionID.String(), uuid.NewString(), m.issuer, m.audience, now.Unix(), now.Unix(), exp.Unix()}
	header, _ := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	payload, _ := json.Marshal(claims)
	unsigned := base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, m.secret)
	_, _ = mac.Write([]byte(unsigned))
	return unsigned + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), nil
}

func (m *TokenManager) Validate(token string, now time.Time) (Claims, error) {
	var claims Claims
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return claims, ErrUnauthorized
	}
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return claims, ErrUnauthorized
	}
	var header struct {
		Alg string `json:"alg"`
		Typ string `json:"typ"`
	}
	if json.Unmarshal(headerBytes, &header) != nil || header.Alg != "HS256" {
		return claims, ErrUnauthorized
	}
	provided, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return claims, ErrUnauthorized
	}
	mac := hmac.New(sha256.New, m.secret)
	_, _ = mac.Write([]byte(parts[0] + "." + parts[1]))
	if !hmac.Equal(provided, mac.Sum(nil)) {
		return claims, ErrUnauthorized
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || json.Unmarshal(payload, &claims) != nil {
		return claims, ErrUnauthorized
	}
	if claims.Subject == "" || claims.SessionID == "" || claims.JWTID == "" || claims.Issuer != m.issuer || claims.Audience != m.audience || claims.IssuedAt == 0 || claims.NotBefore == 0 || claims.ExpiresAt == 0 {
		return claims, ErrUnauthorized
	}
	if now.Unix() < claims.NotBefore || now.Unix() >= claims.ExpiresAt || claims.IssuedAt > now.Unix()+60 {
		return claims, ErrUnauthorized
	}
	if _, err = uuid.Parse(claims.Subject); err != nil {
		return claims, ErrUnauthorized
	}
	if _, err = uuid.Parse(claims.SessionID); err != nil {
		return claims, ErrUnauthorized
	}
	return claims, nil
}

func NewRefreshToken() (string, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	return token, HashRefreshToken(token), nil
}

func HashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func bearer(value string) (string, error) {
	parts := strings.Fields(value)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
		return "", errors.New("invalid bearer")
	}
	return parts[1], nil
}
