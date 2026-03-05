"""
Deprecated: QR scanner removed.

This file previously provided a camera-based QR scanning utility. QR-based
attendance has been removed in favor of face-only recognition. The runtime
and frontend should no longer call this module.

Left as an empty placeholder to avoid import errors.
"""
def scan_qr_from_camera(*args, **kwargs):
    raise RuntimeError("QR scanning removed. Use face-only attendance API.")