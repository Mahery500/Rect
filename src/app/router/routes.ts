/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppView =
  "admin" | "accueil" | "doctor" | "stock" | "analysis" | "infirmerie" | "api_config" | "ticketing";

export interface RouteItem {
  view: AppView;
  subTab?: string;
  label: string;
  iconName: string;
  requiredRoleCode?: string[];
}

export interface RouteCategory {
  title: string;
  requiredPanel: AppView;
  items: RouteItem[];
}
