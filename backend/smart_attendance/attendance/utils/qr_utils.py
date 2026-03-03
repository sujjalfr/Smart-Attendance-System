import qrcode
from io import BytesIO
from django.core.files import File

def generate_qr_code(roll_no):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(roll_no)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return File(buffer, name=f"{roll_no}_qr.png")
