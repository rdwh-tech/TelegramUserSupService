FROM golang:1.25.6-alpine AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
    && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrations

FROM alpine:3.22 AS runtime
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S support \
    && adduser -S -G support -h /app support \
    && mkdir -p /var/lib/support/attachments \
    && chown -R support:support /var/lib/support
WORKDIR /app
USER support

FROM runtime AS api
COPY --from=builder --chown=support:support /out/api /app/api
ENTRYPOINT ["/app/api"]

FROM runtime AS migrate
COPY --from=builder --chown=support:support /out/migrate /app/migrate
ENTRYPOINT ["/app/migrate"]
