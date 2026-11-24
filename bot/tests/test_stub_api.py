import unittest
import uuid

from bot import texts
from bot.services.api_client import ApiError, StubApiClient, TicketClosedError


class StubApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.api = StubApiClient("c1")

    async def _create(self, user=1):
        return await self.api.create_ticket(user, user, "@u", "User")

    async def test_context_and_idempotency(self):
        self.assertIsNone((await self.api.get_client_context(11))["active_ticket"])
        ticket = await self.api.create_ticket(11, 11, None, "User", "key-11")
        self.assertEqual(await self.api.create_ticket(11, 11, None, "User", "key-11"), ticket)
        self.assertEqual(self.api._counter, 1)
        self.assertEqual((await self.api.get_client_context(11))["active_ticket"]["ticket_id"], ticket["ticket_id"])
        await self.api.close_ticket(ticket["ticket_id"])
        self.assertEqual((await self.api.get_client_context(11))["pending_rating"]["ticket_id"], ticket["ticket_id"])

    async def test_defaults(self):
        self.assertEqual(await self.api.get_welcome_message(), texts.WELCOME_DEFAULT)
        faq = await self.api.get_faq()
        self.assertTrue(faq and {"id", "question", "answer"} <= faq[0].keys())

    async def test_ticket_lifecycle(self):
        self.assertIsNone(await self.api.get_active_ticket(1))
        t = await self._create()
        self.assertEqual(uuid.UUID(t["ticket_id"]).version, 4)
        self.assertEqual(t["ticket_number"], 1)
        self.assertEqual((await self.api.get_active_ticket(1))["ticket_id"], t["ticket_id"])
        await self.api.send_message(t["ticket_id"], "text", content="hi", telegram_message_id=5)
        self.assertEqual(self.api.sent_messages[0]["content"], "hi")
        await self.api.close_ticket(t["ticket_id"])
        self.assertIsNone(await self.api.get_active_ticket(1))
        with self.assertRaises(TicketClosedError):
            await self.api.send_message(t["ticket_id"], "text", content="late")

    async def test_only_one_active_ticket_per_user(self):
        await self._create()
        with self.assertRaises(ApiError):
            await self._create()
        t2 = await self._create(user=2)  # другой пользователь — можно
        self.assertEqual(uuid.UUID(t2["ticket_id"]).version, 4)
        self.assertNotEqual(t2["ticket_id"], (await self.api.get_active_ticket(1))["ticket_id"])

    async def test_new_ticket_after_close(self):
        t = await self._create()
        await self.api.close_ticket(t["ticket_id"])
        t2 = await self._create()
        self.assertNotEqual(t["ticket_id"], t2["ticket_id"])

    async def test_rating_only_for_closed_ticket_and_only_once(self):
        t = await self._create()
        with self.assertRaises(ApiError):                       # FR-API-7: тикет ещё не закрыт
            await self.api.submit_rating(t["ticket_id"], 5)
        await self.api.close_ticket(t["ticket_id"])
        self.assertTrue(await self.api.submit_rating(t["ticket_id"], 5))
        self.assertFalse(await self.api.submit_rating(t["ticket_id"], 4))  # одна оценка на тикет

    async def test_send_to_unknown_ticket(self):
        with self.assertRaises(ApiError) as cm:
            await self.api.send_message("nope", "text", content="x")
        self.assertNotIsInstance(cm.exception, TicketClosedError)

    async def test_delivery_report_recorded(self):
        await self.api.report_delivery("m1", True, telegram_message_id=12)
        self.assertEqual(self.api.delivery_reports, [{"message_id": "m1", "delivered": True,
                                                     "telegram_message_id": 12, "error_code": None, "error": None}])

    # --- reopen ---
    async def test_reopen_closed_ticket_by_id(self):
        t = await self._create()
        self.assertFalse(await self.api.reopen_ticket(t["ticket_id"]))   # активный тикет открывать нельзя
        await self.api.close_ticket(t["ticket_id"])
        self.assertTrue(await self.api.reopen_ticket(t["ticket_id"]))
        self.assertEqual((await self.api.get_active_ticket(1))["ticket_id"], t["ticket_id"])
        await self.api.send_message(t["ticket_id"], "text", content="ещё вопрос")  # снова можно писать

    async def test_reopen_rejected_when_user_has_another_active_ticket(self):
        t1 = await self._create()
        await self.api.close_ticket(t1["ticket_id"])
        await self._create()                                             # новый активный тикет
        self.assertFalse(await self.api.reopen_ticket(t1["ticket_id"]))

    async def test_reopen_unknown_ticket(self):
        self.assertFalse(await self.api.reopen_ticket("nope"))

    async def test_rating_not_repeated_after_reopen(self):
        t = await self._create()
        await self.api.close_ticket(t["ticket_id"])
        self.assertTrue(await self.api.submit_rating(t["ticket_id"], 4))
        await self.api.reopen_ticket(t["ticket_id"])
        await self.api.close_ticket(t["ticket_id"])
        self.assertFalse(await self.api.submit_rating(t["ticket_id"], 5))  # FR-API-7: оценка одна на тикет

    async def test_last_closed_ticket_id(self):
        self.assertIsNone(self.api.last_closed_ticket_id(1))
        t1 = await self._create()
        await self.api.close_ticket(t1["ticket_id"])
        t2 = await self._create()
        await self.api.close_ticket(t2["ticket_id"])
        self.assertEqual(self.api.last_closed_ticket_id(1), t2["ticket_id"])
        self.assertIsNone(self.api.last_closed_ticket_id(2))

    async def test_contract_shapes_and_message_idempotency(self):
        client = await self.api.register_client(23, 23, None, "Client")
        self.assertEqual(uuid.UUID(client["client_id"]).version, 4)
        ticket = await self.api.create_ticket(23, 23, None, "Client", idempotency_key="request-23")
        self.assertEqual(uuid.UUID(ticket["ticket_id"]).version, 4)
        self.assertEqual(ticket["status"], "new")
        self.assertIn("created_at", ticket)
        first = await self.api.send_message(ticket["ticket_id"], "text", content="hello", telegram_message_id=25)
        second = await self.api.send_message(ticket["ticket_id"], "text", content="hello", telegram_message_id=25)
        self.assertFalse(first["duplicate"])
        self.assertTrue(second["duplicate"])
        self.assertEqual(first["message_id"], second["message_id"])
        self.assertEqual(len(self.api.sent_messages), 1)

    async def test_idempotent_reports(self):
        await self.api.report_delivery("m1", True, telegram_message_id=100)
        await self.api.report_delivery("m1", True, telegram_message_id=100)
        self.assertEqual(len(self.api.delivery_reports), 1)
        await self.api.report_broadcast_progress("campaign", 2, 1, False)
        await self.api.report_broadcast_progress("campaign", 2, 1, False)
        self.assertEqual(len(self.api.broadcast_progress), 1)


if __name__ == "__main__":
    unittest.main()
