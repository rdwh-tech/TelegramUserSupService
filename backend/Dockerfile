FROM golang:1.25.6-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -o /app/migrations ./cmd/migrations

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /app/migrations ./migrations

CMD ["./migrations"]
