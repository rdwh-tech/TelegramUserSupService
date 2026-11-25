package auth

import "errors"

var (
	ErrInvalidCredentials      = errors.New("invalid credentials")
	ErrUnauthorized            = errors.New("unauthorized")
	ErrAccessDenied            = errors.New("access denied")
	ErrValidation              = errors.New("validation error")
	ErrLoginExists             = errors.New("login already exists")
	ErrCompanyAlreadyCreated   = errors.New("company already created")
	ErrInvalidConnectionCode   = errors.New("invalid connection code")
	ErrTooManyAttempts         = errors.New("too many attempts")
	ErrOperatorAlreadyAssigned = errors.New("operator already assigned")
	ErrInvitationNotFound      = errors.New("invitation not found")
	ErrInvitationNotPending    = errors.New("invitation not pending")
)
