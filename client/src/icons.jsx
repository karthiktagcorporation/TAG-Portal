import {
  LayoutGrid, ClipboardCheck, ShieldCheck, Users, Bot, Wallet, Boxes, BarChart3,
  Factory, Cog, FileText, Database, Globe, Cpu, Truck, Calculator, CalendarDays,
  MessageSquare, Wrench, Package, FlaskConical, Building2, Banknote, LineChart,
} from 'lucide-react';

export const APP_ICONS = {
  LayoutGrid, ClipboardCheck, ShieldCheck, Users, Bot, Wallet, Boxes, BarChart3,
  Factory, Cog, FileText, Database, Globe, Cpu, Truck, Calculator, CalendarDays,
  MessageSquare, Wrench, Package, FlaskConical, Building2, Banknote, LineChart,
};

export const ICON_NAMES = Object.keys(APP_ICONS);

export function AppIcon({ name, ...props }) {
  const Icon = APP_ICONS[name] || LayoutGrid;
  return <Icon {...props} />;
}
