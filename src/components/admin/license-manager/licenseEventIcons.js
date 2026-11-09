// Lucide icon per tracking event type (same mapping as the license
// tracking timeline). Labels and colours live in licenseHelpers
// (EVENT_TYPES / eventToneClass).
import {
  Activity,
  Sparkles,
  PencilLine,
  Power,
  PowerOff,
  CalendarPlus,
  BadgeCheck,
  Unplug,
  Trash2,
  MonitorCheck,
  RefreshCw,
  RotateCcw,
  LogOut,
  ShieldX,
  CircleSlash,
  CalendarX2,
} from "lucide-vue-next";

export const EVENT_ICONS = {
  created: Sparkles,
  updated: PencilLine,
  activated_by_admin: Power,
  deactivated_by_admin: PowerOff,
  extended: CalendarPlus,
  plan_changed: BadgeCheck,
  device_released_by_admin: Unplug,
  deleted: Trash2,
  device_activated: MonitorCheck,
  device_reactivated: RotateCcw,
  refreshed: RefreshCw,
  device_released: LogOut,
  denied_device_limit: ShieldX,
  denied_inactive: CircleSlash,
  denied_expired: CalendarX2,
};

export const eventIcon = (event) => EVENT_ICONS[event?.event] || Activity;
