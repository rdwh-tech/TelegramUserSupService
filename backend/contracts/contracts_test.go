package contracts_test

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
)

var specifications = []string{
	"bot.openapi.yaml",
	"session.openapi.yaml",
	"web.openapi.yaml",
	"events.openapi.yaml",
}

func loadSpec(t *testing.T, name string) *openapi3.T {
	t.Helper()
	doc, err := openapi3.NewLoader().LoadFromFile(name)
	if err != nil {
		t.Fatalf("load %s: %v", name, err)
	}
	if err := doc.Validate(context.Background()); err != nil {
		t.Fatalf("validate %s: %v", name, err)
	}
	return doc
}

func TestSpecificationsValid(t *testing.T) {
	for _, name := range specifications {
		t.Run(name, func(t *testing.T) { loadSpec(t, name) })
	}
}

func TestBotOperations(t *testing.T) {
	doc := loadSpec(t, "bot.openapi.yaml")
	want := map[string]bool{
		"GET /internal/bot/v1/config":                              true,
		"GET /internal/bot/v1/faq":                                 true,
		"PUT /internal/bot/v1/clients/{telegram_user_id}":          true,
		"GET /internal/bot/v1/clients/{telegram_user_id}/context":  true,
		"POST /internal/bot/v1/tickets":                            true,
		"POST /internal/bot/v1/tickets/{ticket_id}/messages":       true,
		"POST /internal/bot/v1/tickets/{ticket_id}/rating":         true,
		"POST /internal/bot/v1/tickets/{ticket_id}/reopen":         true,
		"POST /internal/bot/v1/messages/{message_id}/delivery":     true,
		"GET /internal/bot/v1/broadcasts/{campaign_id}/recipients": true,
		"POST /internal/bot/v1/broadcasts/{campaign_id}/progress":  true,
		"GET /internal/bot/v1/attachments/{attachment_id}/file":    true,
	}

	botOperations := map[string]bool{}
	for path, item := range doc.Paths.Map() {
		for method := range item.Operations() {
			botOperations[method+" "+path] = true
		}
	}
	if len(botOperations) != 12 {
		t.Fatalf("got %d bot operations", len(botOperations))
	}
	for operation := range want {
		if !botOperations[operation] {
			t.Errorf("missing operation %s", operation)
		}
	}
	for path, item := range doc.Paths.Map() {
		for method, operation := range item.Operations() {
			if item.Parameters.GetByInAndName("header", "X-Request-Id") == nil && operation.Parameters.GetByInAndName("header", "X-Request-Id") == nil {
				t.Errorf("%s %s does not document X-Request-Id", method, path)
			}
			for _, status := range []string{"401", "429", "503"} {
				if operation.Responses.Value(status) == nil {
					t.Errorf("%s %s does not document common %s response", method, path, status)
				}
			}
		}
	}

	create := doc.Paths.Find("/internal/bot/v1/tickets").Post
	if create.Parameters.GetByInAndName("header", "Idempotency-Key") == nil {
		t.Fatal("ticket creation does not require Idempotency-Key")
	}
	message := doc.Paths.Find("/internal/bot/v1/tickets/{ticket_id}/messages").Post
	if message.Responses.Value("200") == nil || message.Responses.Value("201") == nil {
		t.Fatal("message operation must document duplicate 200 and created 201")
	}
	delivery := doc.Paths.Find("/internal/bot/v1/messages/{message_id}/delivery").Post
	if delivery.Responses.Value("204") == nil {
		t.Fatal("delivery callback must return 204")
	}

	rating := doc.Paths.Find("/internal/bot/v1/tickets/{ticket_id}/rating").Post
	schema := rating.RequestBody.Value.Content.Get("application/json").Schema.Value
	acceptsRating := func(score any) bool {
		return schema.VisitJSON(map[string]any{"score": score}) == nil
	}
	if acceptsRating(0) || acceptsRating(6) || acceptsRating(3.5) {
		t.Fatal("invalid score accepted")
	}
	if !acceptsRating(1) || !acceptsRating(5) {
		t.Fatal("rating boundary rejected")
	}

	messageSchema := message.RequestBody.Value.Content.Get("application/json").Schema.Value
	attachment := map[string]any{
		"file_type": "document", "telegram_file_id": "telegram-file", "file_name": "error.pdf",
		"mime_type": "application/pdf", "file_size_bytes": float64(482133),
	}
	textMessage := map[string]any{"type": "text", "content": "help", "telegram_message_id": float64(5521), "attachments": []any{}}
	if err := messageSchema.VisitJSON(textMessage); err != nil {
		t.Fatalf("source text message rejected: %v", err)
	}
	textMessage["attachments"] = []any{attachment}
	if err := messageSchema.VisitJSON(textMessage); err == nil {
		t.Fatal("text message with attachment accepted")
	}
	documentMessage := map[string]any{"type": "document", "content": nil, "telegram_message_id": float64(5522), "attachments": []any{}}
	if err := messageSchema.VisitJSON(documentMessage); err == nil {
		t.Fatal("document message without attachment accepted")
	}
	documentMessage["attachments"] = []any{attachment}
	if err := messageSchema.VisitJSON(documentMessage); err != nil {
		t.Fatalf("source document message rejected: %v", err)
	}
	messageResult := map[string]any{"message_id": "0b798ac5-f55e-4d16-b485-893da020a8d4", "ticket_id": "7d1c4b1e-8a0b-4d77-9c0a-2f6e4a8b3c10", "ticket_status": "in_progress", "duplicate": true, "created_at": "2026-11-19T10:01:40Z"}
	duplicateResult := message.Responses.Value("200").Value.Content.Get("application/json").Schema.Value
	createdMessageResult := message.Responses.Value("201").Value.Content.Get("application/json").Schema.Value
	if err := duplicateResult.VisitJSON(messageResult); err != nil {
		t.Fatalf("duplicate message result rejected: %v", err)
	}
	if err := createdMessageResult.VisitJSON(messageResult); err == nil {
		t.Fatal("201 response accepts duplicate=true")
	}
	messageResult["duplicate"] = false
	if err := createdMessageResult.VisitJSON(messageResult); err != nil {
		t.Fatalf("created message result rejected: %v", err)
	}
	if err := duplicateResult.VisitJSON(messageResult); err == nil {
		t.Fatal("200 response accepts duplicate=false")
	}

	createResult := create.Responses.Value("201").Value.Content.Get("application/json").Schema.Value
	result := map[string]any{"ticket_id": "7d1c4b1e-8a0b-4d77-9c0a-2f6e4a8b3c10", "ticket_number": float64(1042), "status": "new", "escalation_level": "l1"}
	if err := createResult.VisitJSON(result); err == nil {
		t.Fatal("ticket creation result accepted without created_at")
	}
	reopenResult := doc.Paths.Find("/internal/bot/v1/tickets/{ticket_id}/reopen").Post.Responses.Value("200").Value.Content.Get("application/json").Schema.Value
	if err := reopenResult.VisitJSON(result); err != nil {
		t.Fatalf("source reopen result rejected: %v", err)
	}

	activeConflict := map[string]any{"error": map[string]any{
		"code": "CLIENT_ACTIVE_TICKET_EXISTS", "message": "active", "request_id": "5979691d-f67a-4c85-92de-203fcb4a94bc",
		"details": map[string]any{"ticket_id": "7d1c4b1e-8a0b-4d77-9c0a-2f6e4a8b3c10", "ticket_number": float64(1042), "status": "in_progress"},
	}}
	conflictSchema := create.Responses.Value("409").Value.Content.Get("application/json").Schema.Value
	if err := conflictSchema.VisitJSON(activeConflict); err != nil {
		t.Fatalf("active-ticket conflict rejected: %v", err)
	}
	delete(activeConflict["error"].(map[string]any)["details"].(map[string]any), "ticket_id")
	if err := conflictSchema.VisitJSON(activeConflict); err == nil {
		t.Fatal("active-ticket conflict accepted without resumption details")
	}

	download := doc.Paths.Find("/internal/bot/v1/attachments/{attachment_id}/file").Get
	if download.Responses.Value("200").Value.Content.Get("*/*") == nil {
		t.Fatal("attachment stream is restricted to application/octet-stream")
	}

	for _, schemaName := range []string{"BotConfig", "FAQ", "ClientUpsert", "ClientUpsertResult", "ClientContext", "CreateTicket", "CreateTicketResult", "TextMessage", "DocumentMessage", "MessageResult", "DuplicateMessageResult", "CreatedMessageResult", "CreateRating", "RatingResult", "DeliveryResult", "RecipientPage", "BroadcastProgress"} {
		schema := doc.Components.Schemas[schemaName]
		if schema == nil || schema.Value.Example == nil {
			t.Errorf("source example missing from schema %s", schemaName)
			continue
		}
		if err := schema.Value.VisitJSON(schema.Value.Example); err != nil {
			t.Errorf("source example for %s is invalid: %v", schemaName, err)
		}
	}

	standardError := func(code string) map[string]any {
		return map[string]any{"error": map[string]any{"code": code, "message": "contract error", "details": nil, "request_id": "5979691d-f67a-4c85-92de-203fcb4a94bc"}}
	}
	assertCodes := func(operation *openapi3.Operation, status string, allowed ...string) {
		t.Helper()
		response := operation.Responses.Value(status)
		if response == nil {
			t.Fatalf("missing response %s", status)
		}
		schema := response.Value.Content.Get("application/json").Schema.Value
		for _, code := range allowed {
			if err := schema.VisitJSON(standardError(code)); err != nil {
				t.Errorf("response %s rejects %s: %v", status, code, err)
			}
		}
		if err := schema.VisitJSON(standardError("WRONG_CODE")); err == nil {
			t.Errorf("response %s accepts an unspecified code", status)
		}
	}
	assertCodes(create, "403", "ACCESS_DENIED", "COMPANY_INACTIVE")
	assertCodes(create, "422", "VALIDATION_ERROR")
	assertCodes(create, "500", "TICKET_NOT_CREATED")
	assertCodes(message, "404", "TICKET_NOT_FOUND")
	assertCodes(message, "409", "TICKET_CLOSED")
	assertCodes(message, "422", "ATTACHMENT_TOO_LARGE", "ATTACHMENT_TYPE_NOT_ALLOWED", "VALIDATION_ERROR")
	assertCodes(rating, "409", "RATING_ALREADY_EXISTS", "TICKET_NOT_CLOSED")
	assertCodes(rating, "422", "VALIDATION_ERROR")
	assertCodes(doc.Paths.Find("/internal/bot/v1/tickets/{ticket_id}/reopen").Post, "409", "REOPEN_NOT_ALLOWED")
	assertCodes(download, "404", "ATTACHMENT_NOT_FOUND")
	assertCodes(doc.Paths.Find("/internal/bot/v1/config").Get, "401", "INVALID_SERVICE_TOKEN")
	assertCodes(doc.Paths.Find("/internal/bot/v1/config").Get, "403", "ACCESS_DENIED", "COMPANY_INACTIVE")
	assertCodes(doc.Paths.Find("/internal/bot/v1/config").Get, "429", "RATE_LIMITED")
	assertCodes(doc.Paths.Find("/internal/bot/v1/config").Get, "503", "SERVICE_UNAVAILABLE")
	assertCodes(doc.Paths.Find("/internal/bot/v1/broadcasts/{campaign_id}/recipients").Get, "404", "CAMPAIGN_NOT_FOUND")
	assertCodes(doc.Paths.Find("/internal/bot/v1/broadcasts/{campaign_id}/progress").Post, "404", "CAMPAIGN_NOT_FOUND")
}

func TestSessionResponses(t *testing.T) {
	doc := loadSpec(t, "session.openapi.yaml")
	op := doc.Paths.Find("/internal/auth/v1/session").Get
	if op == nil {
		t.Fatal("missing session operation")
	}
	scheme := doc.Components.SecuritySchemes["userBearer"]
	if scheme == nil || scheme.Value.Type != "http" || scheme.Value.Scheme != "bearer" || op.Security == nil {
		t.Fatal("session JWT bearer security is not documented")
	}
	if op.Parameters.GetByInAndName("header", "Authorization") != nil || op.Parameters.GetByInAndName("header", "X-Request-Id") == nil {
		t.Fatal("session uses an ignored Authorization parameter or misses request ID")
	}
	sessionResponses := map[int]string{}
	for _, status := range []int{200, 401, 403, 503} {
		response := op.Responses.Value(fmt.Sprint(status))
		if response == nil {
			t.Fatalf("missing session response %d", status)
		}
		example := response.Value.Content.Get("application/json").Example
		if status == 200 {
			body, ok := example.(map[string]any)
			if !ok {
				t.Fatalf("invalid success example %#v", example)
			}
			for _, field := range []string{"user_id", "company_id", "role", "session_expires_at"} {
				if body[field] == nil || body[field] == "" {
					t.Errorf("session success missing %s", field)
				}
			}
			continue
		}
		body, ok := example.(map[string]any)
		if !ok {
			t.Fatalf("invalid error example %#v", example)
		}
		errorBody, ok := body["error"].(map[string]any)
		if !ok {
			t.Fatalf("invalid error envelope %#v", body)
		}
		sessionResponses[status], _ = errorBody["code"].(string)
		schema := response.Value.Content.Get("application/json").Schema.Value
		if err := schema.VisitJSON(body); err != nil {
			t.Fatalf("response %d example rejected: %v", status, err)
		}
		mutated := clone(body)
		mutated["error"].(map[string]any)["code"] = "WRONG_CODE"
		if err := schema.VisitJSON(mutated); err == nil {
			t.Fatalf("response %d accepted wrong error code", status)
		}
	}
	if sessionResponses[403] != "ACCESS_DENIED" {
		t.Fatal("missing no-company response")
	}
}

func TestWebContractMatchesClientTypes(t *testing.T) {
	doc := loadSpec(t, "web.openapi.yaml")
	active := doc.Paths.Find("/tickets/my-active").Get.Responses.Value("200").Value.Content.Get("application/json").Schema.Value
	if len(active.AllOf) != 0 || len(active.OneOf) == 0 || active.VisitJSON(nil) != nil {
		t.Fatal("active ticket null response is not portable OpenAPI 3.0")
	}

	schedule := doc.Paths.Find("/company/schedule").Put.RequestBody.Value.Content.Get("application/json").Schema.Value
	payload := []any{map[string]any{"dayOfWeek": float64(1), "isWorkingDay": true, "startTime": "09:00", "endTime": "18:00"}}
	if err := schedule.VisitJSON(payload); err != nil {
		t.Fatalf("frontend schedule update rejected: %v", err)
	}

	ticket := doc.Components.Schemas["Ticket"].Value
	for _, required := range []string{"assignedOperatorId", "slaPolicyId", "firstMessagePreview", "escalationReason", "escalatedByUserId", "escalatedAt", "firstResponseAt", "closedAt"} {
		if !contains(ticket.Required, required) {
			t.Errorf("Ticket does not require frontend field %s", required)
		}
	}
	if ticket.Properties["sla"] == nil {
		t.Fatal("Ticket omits typed SLA timers")
	}
	if !contains(doc.Components.Schemas["Client"].Value.Required, "username") || !contains(doc.Components.Schemas["BotConfig"].Value.Required, "botToken") {
		t.Fatal("public contract makes required client DTO fields optional")
	}

	createFAQ := doc.Paths.Find("/company/faqs").Post.RequestBody.Value.Content.Get("application/json").Schema.Value
	if createFAQ.VisitJSON(map[string]any{}) == nil {
		t.Fatal("FAQ creation accepts omitted question and answer")
	}
	updateFAQ := doc.Paths.Find("/company/faqs/{faqId}").Put.RequestBody.Value.Content.Get("application/json").Schema.Value
	if err := updateFAQ.VisitJSON(map[string]any{}); err != nil {
		t.Fatalf("partial FAQ update rejected: %v", err)
	}
}

func TestEventFixtures(t *testing.T) {
	doc := loadSpec(t, "events.openapi.yaml")
	fixtures := map[string]string{
		"bot_ticket_taken.json":                     "BotTicketTaken",
		"bot_message_operator.json":                 "BotMessageOperator",
		"bot_ticket_escalated.json":                 "BotTicketEscalated",
		"bot_ticket_closed.json":                    "BotTicketClosed",
		"bot_ticket_status_changed.json":            "BotTicketStatusChanged",
		"bot_broadcast_requested.json":              "BotBroadcastRequested",
		"bot_company_config_updated.json":           "BotCompanyConfigUpdated",
		"bot_company_bot_replaced.json":             "BotCompanyBotReplaced",
		"analytics_ticket_created.json":             "AnalyticsTicketCreated",
		"analytics_ticket_status_changed.json":      "AnalyticsTicketStatusChanged",
		"analytics_ticket_assigned.json":            "AnalyticsTicketAssigned",
		"analytics_ticket_escalated.json":           "AnalyticsTicketEscalated",
		"analytics_message_created.json":            "AnalyticsMessageCreated",
		"analytics_ticket_rated.json":               "AnalyticsTicketRated",
		"analytics_company_sla_policy_updated.json": "AnalyticsCompanySLAPolicyUpdated",
		"analytics_company_schedule_updated.json":   "AnalyticsCompanyScheduleUpdated",
		"api_sla_metrics_updated.json":              "APISLAMetricsUpdated",
		"api_sla_breached.json":                     "APISLABreached",
	}

	decoded := map[string]map[string]any{}
	for name, schemaName := range fixtures {
		name, schemaName := name, schemaName
		t.Run(name, func(t *testing.T) {
			data, err := os.ReadFile(filepath.Join("testdata", name))
			if err != nil {
				t.Fatal(err)
			}
			var value map[string]any
			if err := json.Unmarshal(data, &value); err != nil {
				t.Fatal(err)
			}
			decoded[name] = value
			schema := doc.Components.Schemas[schemaName]
			if schema == nil {
				t.Fatalf("missing schema %s", schemaName)
			}
			if err := schema.Value.VisitJSON(value); err != nil {
				t.Fatalf("fixture does not match %s: %v", schemaName, err)
			}
		})
	}

	assertInvalid := func(t *testing.T, schemaName string, value map[string]any) {
		t.Helper()
		if err := doc.Components.Schemas[schemaName].Value.VisitJSON(value); err == nil {
			t.Fatalf("invalid value accepted by %s: %#v", schemaName, value)
		}
	}

	missingID := clone(decoded["bot_ticket_taken.json"])
	delete(missingID, "event_id")
	assertInvalid(t, "BotTicketTaken", missingID)

	wrongVersion := clone(decoded["analytics_ticket_created.json"])
	wrongVersion["schema_version"] = float64(2)
	assertInvalid(t, "AnalyticsTicketCreated", wrongVersion)

	unknownStatus := clone(decoded["analytics_ticket_status_changed.json"])
	unknownStatus["payload"].(map[string]any)["new_status"] = "lost"
	assertInvalid(t, "AnalyticsTicketStatusChanged", unknownStatus)

	missingFileMetadata := clone(decoded["bot_message_operator.json"])
	attachment := missingFileMetadata["payload"].(map[string]any)["attachments"].([]any)[0].(map[string]any)
	delete(attachment, "file_size_bytes")
	assertInvalid(t, "BotMessageOperator", missingFileMetadata)

	withOptional := clone(decoded["api_sla_breached.json"])
	withOptional["future_optional_field"] = "accepted"
	if err := doc.Components.Schemas["APISLABreached"].Value.VisitJSON(withOptional); err != nil {
		t.Fatalf("new optional envelope field rejected: %v", err)
	}
	botPrivate := clone(decoded["bot_ticket_escalated.json"])
	botPrivate["payload"].(map[string]any)["reason"] = "private operator note"
	assertInvalid(t, "BotTicketEscalated", botPrivate)
	analyticsPrivate := clone(decoded["analytics_message_created.json"])
	analyticsPrivate["payload"].(map[string]any)["content"] = "private message content"
	assertInvalid(t, "AnalyticsMessageCreated", analyticsPrivate)

	operatorFixture, err := os.ReadFile(filepath.Join("testdata", "bot_message_operator.json"))
	if err != nil {
		t.Fatal(err)
	}
	lower := strings.ToLower(string(operatorFixture))
	for _, forbidden := range []string{"token", "storage_url", "http://", "https://"} {
		if strings.Contains(lower, forbidden) {
			t.Errorf("operator fixture leaks %q", forbidden)
		}
	}
}

func contains(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}

func clone(source map[string]any) map[string]any {
	data, _ := json.Marshal(source)
	var result map[string]any
	_ = json.Unmarshal(data, &result)
	return result
}
