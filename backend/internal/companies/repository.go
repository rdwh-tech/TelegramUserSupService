package companies

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
)

type ScheduleDay struct {
	Day        int16
	Working    bool
	Start, End *string
	Timezone   string
}
type SLAPolicy struct{ FRTL1, TTRL1, ARTL1, FRTL2, TTRL2, ARTL2 int }
type Repository interface {
	WithinTransaction(context.Context, func(Repository) error) error
	LockUser(context.Context, uuid.UUID) (auth.User, error)
	CreateCompany(context.Context, Company) error
	AttachAdmin(context.Context, uuid.UUID, uuid.UUID, time.Time) error
	CreateSchedule(context.Context, uuid.UUID, []ScheduleDay) error
	CreateSLAPolicy(context.Context, uuid.UUID, SLAPolicy) error
	CreateCompanyAudit(context.Context, uuid.UUID, uuid.UUID, time.Time) error
}
type UserReader interface {
	Me(context.Context, uuid.UUID) (auth.User, error)
}
