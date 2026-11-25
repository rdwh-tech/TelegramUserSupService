// Package amqp publishes durable outbox messages to RabbitMQ.
package amqp

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	rabbit "github.com/rabbitmq/amqp091-go"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/outbox"
)

type Publisher struct {
	mu       sync.Mutex
	url      string
	exchange string
	timeout  time.Duration
	conn     *rabbit.Connection
	channel  *rabbit.Channel
	confirms chan rabbit.Confirmation
	returns  chan rabbit.Return
}

func NewPublisher(url, exchange string, connectTimeout time.Duration) (*Publisher, error) {
	if url == "" || exchange == "" || connectTimeout <= 0 {
		return nil, errors.New("amqp: invalid publisher configuration")
	}
	return &Publisher{url: url, exchange: exchange, timeout: connectTimeout}, nil
}

func (p *Publisher) Publish(ctx context.Context, message outbox.Message) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if err := p.ensureChannel(); err != nil {
		return err
	}
	drainConfirmations(p.confirms)
	drainReturns(p.returns)
	if err := p.channel.PublishWithContext(ctx, p.exchange, message.RoutingKey, true, false, rabbit.Publishing{
		ContentType:   "application/json",
		DeliveryMode:  rabbit.Persistent,
		MessageId:     message.EventID.String(),
		Type:          message.EventType,
		CorrelationId: message.CorrelationID.String(),
		Timestamp:     message.OccurredAt,
		Body:          message.Body,
	}); err != nil {
		p.invalidate()
		return errors.New("amqp: publish failed")
	}

	var returned *rabbit.Return
	for {
		select {
		case result, ok := <-p.confirms:
			if !ok || !result.Ack {
				p.invalidate()
				return errors.New("amqp: broker did not confirm message")
			}
			// RabbitMQ sends basic.return before basic.ack on the same channel. The
			// reader has therefore queued the return before the confirmation.
			if returned == nil {
				select {
				case result := <-p.returns:
					returned = &result
				default:
				}
			}
			if returned != nil {
				return fmt.Errorf("amqp: message was unroutable: reply code %d", returned.ReplyCode)
			}
			return nil
		case result, ok := <-p.returns:
			if !ok {
				p.invalidate()
				return errors.New("amqp: return channel closed")
			}
			returned = &result
		case <-ctx.Done():
			p.invalidate()
			return ctx.Err()
		}
	}
}

func (p *Publisher) ensureChannel() error {
	if p.conn != nil && !p.conn.IsClosed() && p.channel != nil && !p.channel.IsClosed() {
		return nil
	}
	p.invalidate()
	conn, err := rabbit.DialConfig(p.url, rabbit.Config{
		Heartbeat: 10 * time.Second,
		Dial:      rabbit.DefaultDial(p.timeout),
	})
	if err != nil {
		return errors.New("amqp: connection failed")
	}
	channel, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return errors.New("amqp: channel failed")
	}
	if err := channel.ExchangeDeclare(p.exchange, "topic", true, false, false, false, nil); err != nil {
		_ = channel.Close()
		_ = conn.Close()
		return errors.New("amqp: exchange declaration failed")
	}
	if err := channel.Confirm(false); err != nil {
		_ = channel.Close()
		_ = conn.Close()
		return errors.New("amqp: publisher confirms unavailable")
	}
	p.conn = conn
	p.channel = channel
	p.confirms = channel.NotifyPublish(make(chan rabbit.Confirmation, 1))
	p.returns = channel.NotifyReturn(make(chan rabbit.Return, 1))
	return nil
}

func (p *Publisher) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.invalidate()
	return nil
}

func (p *Publisher) invalidate() {
	if p.channel != nil {
		_ = p.channel.Close()
	}
	if p.conn != nil {
		_ = p.conn.Close()
	}
	p.channel = nil
	p.conn = nil
	p.confirms = nil
	p.returns = nil
}

func drainConfirmations(channel chan rabbit.Confirmation) {
	for {
		select {
		case <-channel:
		default:
			return
		}
	}
}

func drainReturns(channel chan rabbit.Return) {
	for {
		select {
		case <-channel:
		default:
			return
		}
	}
}
