import unittest
from types import SimpleNamespace as NS

from bot import texts
from bot.services.message_utils import (
    MAX_FILE_SIZE_BYTES,
    extract_payload,
    split_text,
    truncate,
    validate_attachment,
)

def msg(**kw):
    base = dict(text=None, caption=None, photo=None, document=None, sticker=None, animation=None,
                voice=None, video_note=None, video=None, audio=None)
    base.update(kw)
    return NS(**base)

def doc(name, size=1000):
    return NS(file_id="F1", file_name=name, file_size=size)

class ValidateAttachmentTests(unittest.TestCase):
    def test_plain_text_ok(self):
        self.assertEqual(validate_attachment(msg(text="hi")), (True, ""))

    def test_sticker_and_animation_rejected(self):
        self.assertEqual(validate_attachment(msg(sticker=NS())), (False, texts.ERR_STICKER))
        self.assertEqual(validate_attachment(msg(animation=NS(), document=doc("a.gif"))), (False, texts.ERR_STICKER))

    def test_voice_video_audio_rejected(self):
        for attr in ("voice", "video_note", "video", "audio"):
            self.assertEqual(validate_attachment(msg(**{attr: NS()})), (False, texts.ERR_UNSUPPORTED_CONTENT))

    def test_allowed_document_extensions_case_insensitive(self):
        for name in ("a.pdf", "b.DOCX", "c.txt", "d.Zip"):
            self.assertTrue(validate_attachment(msg(document=doc(name)))[0], name)

    def test_forbidden_document_extensions(self):
        for name in ("a.exe", "b.png", "c", None, "archive.tar.gz"):
            self.assertEqual(validate_attachment(msg(document=doc(name))), (False, texts.ERR_FILE_FORMAT), name)

    def test_document_size_boundary(self):
        self.assertTrue(validate_attachment(msg(document=doc("a.pdf", MAX_FILE_SIZE_BYTES)))[0])
        self.assertEqual(validate_attachment(msg(document=doc("a.pdf", MAX_FILE_SIZE_BYTES + 1))), (False, texts.ERR_FILE_SIZE))

    def test_document_without_size_is_ok(self):
        self.assertTrue(validate_attachment(msg(document=doc("a.pdf", None)))[0])

    def test_photo_uses_largest_size(self):
        small, big = NS(file_id="s", file_size=10), NS(file_id="b", file_size=MAX_FILE_SIZE_BYTES + 1)
        self.assertEqual(validate_attachment(msg(photo=[small, big])), (False, texts.ERR_FILE_SIZE))
        self.assertTrue(validate_attachment(msg(photo=[small, NS(file_id="b", file_size=None)]))[0])

    def test_other_content_rejected(self):
        self.assertEqual(validate_attachment(msg()), (False, texts.ERR_UNSUPPORTED_CONTENT))

class ExtractPayloadTests(unittest.TestCase):
    def test_text(self):
        self.assertEqual(extract_payload(msg(text="hello")), {"message_type": "text", "content": "hello"})

    def test_photo_takes_largest_and_caption(self):
        p = extract_payload(msg(photo=[NS(file_id="s"), NS(file_id="b")], caption="cap"))
        self.assertEqual(p, {"message_type": "photo", "file_id": "b", "caption": "cap"})

    def test_document(self):
        p = extract_payload(msg(document=doc("a.pdf"), caption=None))
        self.assertEqual(p, {"message_type": "document", "file_id": "F1", "file_name": "a.pdf", "caption": None})

class TextHelpersTests(unittest.TestCase):
    def test_split_short_text_unchanged(self):
        self.assertEqual(split_text("abc"), ["abc"])

    def test_split_respects_limit_and_keeps_content(self):
        text = " ".join(["слово"] * 3000)
        parts = split_text(text, 100)
        self.assertTrue(all(0 < len(p) <= 100 for p in parts))
        self.assertEqual(" ".join(parts).split(), text.split())

    def test_split_without_spaces(self):
        parts = split_text("x" * 250, 100)
        self.assertEqual([len(p) for p in parts], [100, 100, 50])

    def test_truncate(self):
        self.assertEqual(truncate("abc", 10), "abc")
        self.assertEqual(len(truncate("a" * 50, 10)), 10)

if __name__ == "__main__":
    unittest.main()
