package app

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"testing"
	"time"
)

func localListener(t *testing.T) net.Listener {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	return listener
}

func waitServe(t *testing.T, result <-chan error) error {
	t.Helper()
	select {
	case err := <-result:
		return err
	case <-time.After(2 * time.Second):
		t.Fatal("server did not stop")
		return nil
	}
}

func TestServeCancellation(t *testing.T) {
	listener := localListener(t)
	address := listener.Addr().String()
	ctx, cancel := context.WithCancel(context.Background())
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })}
	result := make(chan error, 1)
	go func() { result <- serve(ctx, server, listener, 200*time.Millisecond) }()
	cancel()
	if err := waitServe(t, result); err != nil {
		t.Fatal(err)
	}
	replacement, err := net.Listen("tcp", address)
	if err != nil {
		t.Fatalf("listener was not released: %v", err)
	}
	_ = replacement.Close()
}

func TestServeCancelledBeforeStart(t *testing.T) {
	listener := localListener(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })}
	if err := serve(ctx, server, listener, 200*time.Millisecond); err != nil {
		t.Fatal(err)
	}
}

func TestServeDrainsRequest(t *testing.T) {
	listener := localListener(t)
	entered := make(chan struct{})
	release := make(chan struct{})
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		close(entered)
		<-release
		_, _ = io.WriteString(w, "drained")
	})}
	ctx, cancel := context.WithCancel(context.Background())
	result := make(chan error, 1)
	go func() { result <- serve(ctx, server, listener, time.Second) }()

	responseResult := make(chan *http.Response, 1)
	responseError := make(chan error, 1)
	go func() {
		response, err := http.Get("http://" + listener.Addr().String())
		if err != nil {
			responseError <- err
			return
		}
		responseResult <- response
	}()
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("request did not enter handler")
	}
	cancel()
	select {
	case err := <-result:
		t.Fatalf("server stopped before request drained: %v", err)
	case <-time.After(30 * time.Millisecond):
	}
	close(release)
	select {
	case err := <-responseError:
		t.Fatal(err)
	case response := <-responseResult:
		defer response.Body.Close()
		body, err := io.ReadAll(response.Body)
		if err != nil {
			t.Fatal(err)
		}
		if response.StatusCode != http.StatusOK || string(body) != "drained" {
			t.Fatalf("status=%d body=%q", response.StatusCode, body)
		}
	case <-time.After(time.Second):
		t.Fatal("request did not complete")
	}
	if err := waitServe(t, result); err != nil {
		t.Fatal(err)
	}
}

func TestServeShutdownDeadline(t *testing.T) {
	listener := localListener(t)
	entered := make(chan struct{})
	exited := make(chan struct{})
	server := &http.Server{Handler: http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		close(entered)
		<-r.Context().Done()
		close(exited)
	})}
	ctx, cancel := context.WithCancel(context.Background())
	result := make(chan error, 1)
	go func() { result <- serve(ctx, server, listener, 30*time.Millisecond) }()
	requestResult := make(chan error, 1)
	go func() {
		response, err := http.Get("http://" + listener.Addr().String())
		if response != nil {
			_ = response.Body.Close()
		}
		requestResult <- err
	}()
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("request did not enter handler")
	}
	cancel()
	err := waitServe(t, result)
	if err == nil || !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected shutdown deadline, got %v", err)
	}
	select {
	case <-exited:
	case <-time.After(time.Second):
		t.Fatal("forced close did not cancel handler")
	}
	select {
	case <-requestResult:
	case <-time.After(time.Second):
		t.Fatal("client remained blocked")
	}
}
