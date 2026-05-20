from . import bho, en, hi, mai

SUPPORTED_LANGUAGES = {"en", "hi", "bho", "mai"}


def get_strings(lang: str):
    if lang == "hi":
        return hi
    if lang == "bho":
        return bho
    if lang == "mai":
        return mai
    return en
