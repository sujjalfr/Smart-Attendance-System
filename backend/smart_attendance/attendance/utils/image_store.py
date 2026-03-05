import os
import shutil
from django.utils import timezone
from django.conf import settings

WEEKDAY_FOLDERS = {
    "Sunday": "1sunday",
    "Monday": "2monday",
    "Tuesday": "3tuesday",
    "Wednesday": "4wednesday",
    "Thursday": "5thursday",
    "Friday": "6friday",
    "Saturday": "7saturday",
}

RETENTION_DAYS = 7

def _ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    return path

def get_weekday_folder_for_date(dt=None):
    """
    Return folder under MEDIA_ROOT/temp/<weekday_folder>
    e.g. .../media/temp/5thursday
    """
    dt = dt or timezone.localdate()
    weekday_name = dt.strftime("%A")
    folder_name = WEEKDAY_FOLDERS.get(weekday_name, weekday_name.lower())
    return os.path.join(settings.MEDIA_ROOT, 'temp', folder_name)

def _find_temp_image_for_roll(roll_no):
    """Search MEDIA_ROOT/temp and its subfolders for a file named <roll_no>.jpg.
    Return the path to the newest matching file if found, otherwise None.
    """
    temp_root = os.path.join(settings.MEDIA_ROOT, 'temp')
    candidates = []
    # direct file in temp
    direct = os.path.join(temp_root, f"{roll_no}.jpg")
    if os.path.isfile(direct):
        candidates.append(direct)

    # search subdirectories (e.g. media/temp/5thrusday)
    if os.path.isdir(temp_root):
        for entry in os.listdir(temp_root):
            sub = os.path.join(temp_root, entry)
            if os.path.isdir(sub):
                p = os.path.join(sub, f"{roll_no}.jpg")
                if os.path.isfile(p):
                    candidates.append(p)

    if not candidates:
        return None

    # return the newest by modification time
    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return candidates[0]


def save_attendance_image_from_path(src_path, roll_no, move_src=False):
    """
    Save a single canonical image at MEDIA_ROOT/temp/<weekday_folder>/<roll_no>.jpg.
    - If src_path missing, searches MEDIA_ROOT/temp and subfolders for <roll_no>.jpg.
    - If src_path already equals destination, does nothing.
    - By default copies; set move_src=True to move the file (removes temp).
    - Removes other temp duplicates for the same roll after saving.
    """
    if not src_path or not os.path.isfile(src_path):
        found = _find_temp_image_for_roll(roll_no)
        if found:
            src_path = found
        else:
            raise FileNotFoundError(f"No temp image found for roll {roll_no}")

    dst_dir = _ensure_dir(get_weekday_folder_for_date())
    main_dst = os.path.join(dst_dir, f"{roll_no}.jpg")

    # If already at destination, return immediately
    if os.path.abspath(src_path) == os.path.abspath(main_dst):
        return main_dst

    # Copy or move single canonical file (no dated archive)
    if move_src:
        shutil.move(src_path, main_dst)
    else:
        shutil.copy2(src_path, main_dst)

    # Remove other temp duplicates (keep only the saved canonical file)
    temp_root = os.path.join(settings.MEDIA_ROOT, 'temp')
    if os.path.isdir(temp_root):
        for root, _, files in os.walk(temp_root):
            for fn in files:
                if fn.lower() == f"{roll_no}.jpg":
                    fp = os.path.abspath(os.path.join(root, fn))
                    try:
                        if fp != os.path.abspath(main_dst):
                            os.remove(fp)
                    except Exception:
                        pass

    return main_dst