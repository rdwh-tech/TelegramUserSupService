import unittest

from bot.keyboards import callbacks as cb


class CallbackDataTests(unittest.TestCase):
    def test_csat_roundtrip(self):
        for score in range(1, 6):
            self.assertEqual(cb.parse_csat_data(cb.build_csat_data("abc-123", score)), ("abc-123", score))

    def test_csat_ticket_id_with_colon(self):
        self.assertEqual(cb.parse_csat_data(cb.build_csat_data("a:b", 3)), ("a:b", 3))

    def test_csat_invalid(self):
        for data in (None, "", "csat:", "csat:5", "csat:t:0", "csat:t:6", "csat:t:x", "csat::3", "faq:1"):
            self.assertIsNone(cb.parse_csat_data(data), data)
        with self.assertRaises(ValueError):
            cb.build_csat_data("t", 9)

    def test_uuid_ticket_fits_into_64_bytes(self):
        cb.build_csat_data("123e4567-e89b-12d3-a456-426614174000", 5)

    def test_too_long_data_rejected(self):
        with self.assertRaises(ValueError):
            cb.build_csat_data("x" * 80, 5)
        with self.assertRaises(ValueError):
            cb.build_faq_data("я" * 40) # 2 байта на один символ

    def test_faq_roundtrip(self):
        self.assertEqual(cb.parse_faq_data(cb.build_faq_data("12")), "12")
        self.assertIsNone(cb.parse_faq_data("faq:"))
        self.assertIsNone(cb.parse_faq_data("open_faq"))


if __name__ == "__main__":
    unittest.main()
