import * as Fortio from "./fortio";

export type Kind = "baseline" | "proxy";

export type Report = {
  run: string;
  kind: Kind;
  name: string;
  fortio: Fortio.Report;
}

export type LabelReport = (r: Report) => string;

export type Reports = {
  baseline: Report[];
  proxy: Report[];
};
