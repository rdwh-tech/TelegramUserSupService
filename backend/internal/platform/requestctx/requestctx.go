package requestctx

import "context"

type requestIDKey struct{}
type originalRequestIDValidKey struct{}

func WithRequestID(ctx context.Context, requestID string, originalValid bool) context.Context {
	ctx = context.WithValue(ctx, requestIDKey{}, requestID)
	return context.WithValue(ctx, originalRequestIDValidKey{}, originalValid)
}

func RequestID(ctx context.Context) string {
	value, _ := ctx.Value(requestIDKey{}).(string)
	return value
}

func OriginalRequestIDValid(ctx context.Context) bool {
	value, _ := ctx.Value(originalRequestIDValidKey{}).(bool)
	return value
}
