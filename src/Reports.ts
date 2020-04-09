import * as Fortio from "./fortio";

export type Kind = "baseline" | "proxy";

export interface Report {
  run: string;
  kind: Kind;
  name: string;
  fortio: Fortio.Report;
}

export type LabelReport = (r: Report) => string;

export interface Reports {
  baseline: Report[];
  proxy: Report[];
};
