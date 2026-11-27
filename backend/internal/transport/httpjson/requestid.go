package httpjson

import (
	"context"

	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/requestctx"
)

func WithRequestID(ctx context.Context, requestID string, originalValid bool) context.Context {
	return requestctx.WithRequestID(ctx, requestID, originalValid)
}

func RequestID(ctx context.Context) string            { return requestctx.RequestID(ctx) }
func OriginalRequestIDValid(ctx context.Context) bool { return requestctx.OriginalRequestIDValid(ctx) }
