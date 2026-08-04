import { HomeIcon, CalendarIcon, UsersIcon, TagIcon, ScissorsIcon, WalletIcon, BuildingIcon, BellIcon, GearIcon } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n";

export type NavKey = keyof Dictionary["nav"];

export type NavItem = { key: NavKey; href: string; icon: React.ComponentType<{ className?: string }> };

/** Lista completa, usada na barra lateral (computador e iPad horizontal). */
export const NAV_ITEMS: NavItem[] = [
  { key: "inicio", href: "/", icon: HomeIcon },
  { key: "agenda", href: "/agenda", icon: CalendarIcon },
  { key: "clientes", href: "/clientes", icon: UsersIcon },
  { key: "servicos", href: "/servicos", icon: TagIcon },
  { key: "atendimentos", href: "/atendimentos", icon: ScissorsIcon },
  { key: "financeiro", href: "/financeiro", icon: WalletIcon },
  { key: "despesas", href: "/despesas", icon: BuildingIcon },
  { key: "lembretes", href: "/lembretes", icon: BellIcon },
  { key: "configuracoes", href: "/configuracoes", icon: GearIcon },
];

/** Itens visíveis diretamente na barra inferior (iPhone e telas estreitas). */
export const BOTTOM_NAV_PRIMARY_KEYS: NavKey[] = ["inicio", "agenda", "clientes", "financeiro"];

/** Itens agrupados dentro de "Mais" na barra inferior. */
export const BOTTOM_NAV_MORE_KEYS: NavKey[] = ["servicos", "atendimentos", "despesas", "lembretes", "configuracoes"];
