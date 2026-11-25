package web

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
	"github.com/rdwh-tech/TelegramUserSupService/internal/companies"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
	"github.com/rdwh-tech/TelegramUserSupService/internal/staff"
	"github.com/rdwh-tech/TelegramUserSupService/internal/transport/httpjson"
)

type Handler struct {
	auth      *auth.Service
	companies *companies.Service
	staff     *staff.Service
}

func NewHandler(a *auth.Service, c *companies.Service, s *staff.Service) *Handler {
	return &Handler{a, c, s}
}

type userResponse struct {
	ID          uuid.UUID       `json:"id"`
	CompanyID   *uuid.UUID      `json:"companyId"`
	CompanyName *string         `json:"companyName,omitempty"`
	Login       string          `json:"login"`
	FullName    string          `json:"fullName"`
	Role        models.UserRole `json:"role"`
	IsBlocked   bool            `json:"isBlocked"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

func userDTO(u auth.User) userResponse {
	return userResponse{u.ID, u.CompanyID, u.CompanyName, u.Login, u.FullName, u.Role, u.IsBlocked, u.CreatedAt, u.UpdatedAt}
}

type authResponse struct {
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	User         userResponse `json:"user"`
}

func (h *Handler) Routes(r chi.Router) {
	r.Post("/api/auth/register", h.register)
	r.Post("/api/auth/login", h.login)
	r.Post("/api/auth/refresh", h.refresh)
	r.Post("/api/auth/logout", h.logout)
	r.Group(func(p chi.Router) {
		p.Use(h.requireAuth)
		p.Get("/api/auth/me", h.me)
		p.Patch("/api/auth/me", h.patchMe)
		p.Post("/api/company", h.createCompany)
		p.Get("/api/operator/connection-code", h.connectionCode)
		p.Post("/api/operator/invitations", h.createInvitation)
		p.Get("/api/operator/invitations/pending", h.pending)
		p.Post("/api/operator/invitations/{invitationId}/accept", h.accept)
		p.Post("/api/operator/invitations/{invitationId}/reject", h.reject)
	})
	r.Get("/internal/auth/v1/session", h.internalSession)
}

type principalKey struct{}

func (h *Handler) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p, err := h.auth.Authenticate(r.Context(), r.Header.Get("Authorization"), true)
		if err != nil {
			writeError(w, r, err)
			return
		}
		wrapped := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(wrapped, r.WithContext(context.WithValue(r.Context(), principalKey{}, p)))
		if wrapped.Status() >= 200 && wrapped.Status() < 300 {
			_ = h.auth.TouchActivity(r.Context(), p)
		}
	})
}
func principal(r *http.Request) auth.Principal {
	v, _ := r.Context().Value(principalKey{}).(auth.Principal)
	return v
}

func decode(r *http.Request, dst any) error {
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return auth.ErrValidation
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return auth.ErrValidation
	}
	return nil
}
func requestID(r *http.Request) string { return httpjson.RequestID(r.Context()) }

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var in struct{ Login, Password, FullName, Role string }
	if err := decode(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	out, err := h.auth.Register(r.Context(), in.Login, in.Password, in.FullName, in.Role)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpjson.Write(w, http.StatusCreated, authResponse{out.AccessToken, out.RefreshToken, userDTO(out.User)})
}
func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Login, Password string }
	if err := decode(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	out, err := h.auth.Login(r.Context(), in.Login, in.Password)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpjson.Write(w, http.StatusOK, authResponse{out.AccessToken, out.RefreshToken, userDTO(out.User)})
}
func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	var in struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := decode(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	token, err := h.auth.Refresh(r.Context(), in.RefreshToken)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpjson.Write(w, http.StatusOK, map[string]string{"accessToken": token})
}
func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	if err := h.auth.LogoutAuthorization(r.Context(), r.Header.Get("Authorization")); err != nil {
		writeError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	u, err := h.auth.Me(r.Context(), principal(r).User.ID)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpjson.Write(w, http.StatusOK, userDTO(u))
}
func (h *Handler) patchMe(w http.ResponseWriter, r *http.Request) {
	var in struct {
		FullName string `json:"fullName"`
	}
	if err := decode(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	u, err := h.auth.UpdateProfile(r.Context(), principal(r), in.FullName)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpjson.Write(w, http.StatusOK, userDTO(u))
}
func (h *Handler) createCompany(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		Timezone    string  `json:"timezone"`
	}
	if err := decode(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	out, err := h.companies.Create(r.Context(), principal(r), in.Name, in.Description, in.Timezone)
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpjson.Write(w, http.StatusCreated, map[string]any{"company": out.Company, "user": userDTO(out.User)})
}
func (h *Handler) connectionCode(w http.ResponseWriter, r *http.Request) {
	v, err := h.staff.ConnectionCode(r.Context(), principal(r))
	if err != nil {
		writeError(w, r, err)
		return
	}
	httpjson.Write(w, http.StatusOK, map[string]any{"id": v.ID, "operatorId": v.OperatorID, "code": v.Code, "expiresAt": v.ExpiresAt, "isUsed": v.IsUsed})
}
func invitationDTO(v staff.Invitation) map[string]any {
	return map[string]any{"id": v.ID, "companyId": v.CompanyID, "companyName": v.CompanyName, "operatorId": v.OperatorID, "roleToAssign": v.RoleToAssign, "status": v.Status, "createdAt": v.CreatedAt}
}
func (h *Handler) createInvitation(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ConnectionCode string                `json:"connectionCode"`
		RoleToAssign   models.InvitationRole `json:"roleToAssign"`
	}
	if err := decode(r, &in); err != nil {
		writeError(w, r, err)
		return
	}
	v, created, err := h.staff.CreateInvitation(r.Context(), principal(r), in.ConnectionCode, in.RoleToAssign)
	if err != nil {
		writeError(w, r, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	httpjson.Write(w, status, invitationDTO(v))
}
func (h *Handler) pending(w http.ResponseWriter, r *http.Request) {
	list, err := h.staff.Pending(r.Context(), principal(r))
	if err != nil {
		writeError(w, r, err)
		return
	}
	out := make([]map[string]any, 0, len(list))
	for _, v := range list {
		out = append(out, invitationDTO(v))
	}
	httpjson.Write(w, http.StatusOK, out)
}
func invitationID(r *http.Request) (uuid.UUID, error) {
	v, e := uuid.Parse(chi.URLParam(r, "invitationId"))
	if e != nil {
		return uuid.Nil, auth.ErrValidation
	}
	return v, nil
}
func (h *Handler) accept(w http.ResponseWriter, r *http.Request) {
	id, e := invitationID(r)
	if e != nil {
		writeError(w, r, e)
		return
	}
	u, e := h.staff.Accept(r.Context(), principal(r), id)
	if e != nil {
		writeError(w, r, e)
		return
	}
	httpjson.Write(w, http.StatusOK, userDTO(u))
}
func (h *Handler) reject(w http.ResponseWriter, r *http.Request) {
	id, e := invitationID(r)
	if e != nil {
		writeError(w, r, e)
		return
	}
	if e = h.staff.Reject(r.Context(), principal(r), id); e != nil {
		writeError(w, r, e)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) internalSession(w http.ResponseWriter, r *http.Request) {
	rawID := r.Header.Get("X-Request-Id")
	parsed, e := uuid.Parse(rawID)
	if !httpjson.OriginalRequestIDValid(r.Context()) || e != nil || parsed.String() != rawID {
		httpjson.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "X-Request-Id must be a canonical UUID", requestID(r), nil)
		return
	}
	p, e := h.auth.Authenticate(r.Context(), r.Header.Get("Authorization"), false)
	if e != nil {
		writeError(w, r, e)
		return
	}
	if p.User.CompanyID == nil {
		writeError(w, r, auth.ErrAccessDenied)
		return
	}
	httpjson.Write(w, http.StatusOK, map[string]any{"user_id": p.User.ID, "company_id": p.User.CompanyID, "role": p.User.Role, "session_expires_at": h.auth.EffectiveExpiry(p)})
}

func writeError(w http.ResponseWriter, r *http.Request, err error) {
	status, code, message := http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Service is temporarily unavailable"
	switch {
	case errors.Is(err, auth.ErrValidation):
		status, code, message = 422, "VALIDATION_ERROR", "Request validation failed"
	case errors.Is(err, auth.ErrLoginExists):
		status, code, message = 409, "LOGIN_ALREADY_EXISTS", "Login is already in use"
	case errors.Is(err, auth.ErrInvalidCredentials):
		status, code, message = 401, "INVALID_CREDENTIALS", "Invalid credentials"
	case errors.Is(err, auth.ErrUnauthorized):
		status, code, message = 401, "UNAUTHORIZED", "Session is not active"
	case errors.Is(err, auth.ErrAccessDenied):
		status, code, message = 403, "ACCESS_DENIED", "Access denied"
	case errors.Is(err, auth.ErrCompanyAlreadyCreated):
		status, code, message = 409, "COMPANY_ALREADY_CREATED", "Company is already created"
	case errors.Is(err, auth.ErrInvalidConnectionCode):
		status, code, message = 400, "INVALID_CONNECTION_CODE", "Connection code is invalid"
	case errors.Is(err, auth.ErrTooManyAttempts):
		status, code, message = 429, "TOO_MANY_ATTEMPTS", "Too many attempts"
	case errors.Is(err, auth.ErrOperatorAlreadyAssigned):
		status, code, message = 409, "OPERATOR_ALREADY_ASSIGNED", "Operator is already assigned"
	case errors.Is(err, auth.ErrInvitationNotFound):
		status, code, message = 404, "INVITATION_NOT_FOUND", "Invitation not found"
	case errors.Is(err, auth.ErrInvitationNotPending):
		status, code, message = 409, "INVITATION_NOT_PENDING", "Invitation is not pending"
	}
	httpjson.Error(w, status, code, message, requestID(r), nil)
}
