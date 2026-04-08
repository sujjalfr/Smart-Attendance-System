// Utilities for consistent time formatting in Nepal Time (NPT / UTC+5:45)

/**
 * Format an ISO 8601 datetime string into Nepal Time (Asia/Kathmandu).
 * Properly handles timezone-aware and UTC strings.
 * @param {string|number|Date} input - ISO string, epoch, or Date object
 * @param {{ showZone?: boolean }} opts
 * @returns {string} formatted like "HH:mm (NPT)" or "HH:mm"
 */
export function formatNPT(input, opts = {}) {
	const { showZone = true } = opts;
	if (!input) return "—";

	try {
		// Parse input into a Date object
		const d = new Date(input);
    
		// Ensure it's a valid date
		if (isNaN(d.getTime())) {
			return "—";
		}

		// Format using Kathmandu timezone
		const hhmm = d.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: "Asia/Kathmandu",
		});
    
		return showZone ? `${hhmm} (NPT)` : hhmm;
	} catch (err) {
		console.error("Error formatting NPT time:", input, err);
		return "—";
	}
}

/** Convenience: returns dash when empty, else formatted NPT **/
// export function formatNPTOrDash(input, opts = {}) {
// 	if (!input) return "—";
// 	return formatNPT(input, opts);
// }

export function formatNPTOrDash(value) {
  if (!value) return "—";
  try {
    if (String(value).includes("T")) {
      const timePart = String(value).split("T")[1] || "";
      return timePart.slice(0, 5);
    }
    const parts = String(value).split(":");
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return value;
  } catch {
    return value;
  }
}

export function formatTimeForDisplay(value) {
  if (!value) return "—";
  // value may be ISO (2026-01-26T09:15:30) or time-only (09:15:30)
  try {
    if (String(value).includes("T")) {
      const timePart = String(value).split("T")[1] || "";
      return timePart.slice(0, 5);
    }
    // maybe "09:15:30" or "09:15"
    const parts = String(value).split(":");
    if (parts.length >= 2)
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    return value;
  } catch {
    return value;
  }
}

export function formatDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("en-GB");
  } catch {
    return date;
  }
}

/**
 * Parse an hour (0-23) from various time representations returned by the API.
 * Accepts: full ISO datetimes, time-only strings like "09:15:30", and
 * strings with timezone offsets. Returns `null` when unable to parse.
 */
export function parseHourFromTimeString(value) {
  if (!value) return null;
  const s = String(value).trim();

  try {
    // If it's an ISO datetime or contains a 'T', try Date parsing first.
    if (s.includes("T")) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getHours();
    }

    // Strip timezone offsets if present (e.g. "09:15:30+05:45" or "09:15:30Z")
    const main = s.split(/[+\-Z]/)[0];
    // If it contains a date+time, take the time part
    const timePart = main.includes("T") ? main.split("T").pop() : main;
    const parts = timePart.split(":");
    if (parts.length >= 1) {
      const h = parseInt(parts[0], 10);
      if (!Number.isNaN(h) && h >= 0 && h <= 23) return h;
    }
  } catch (err) {
    // fallthrough to return null
  }

  return null;
}

