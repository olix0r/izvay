import * as d3 from "d3";
import React from "react";
import { CssBaseline, Container, Grid, Paper } from "@material-ui/core";

import * as Fortio from "./fortio";
import { Kind, Report, Reports } from './Reports'
import ReportGrid from './ReportGrid'
import RequestsByLatency from './RequestsByLatency'
import LatencyByRequests from './LatencyByRequests'

// Fetches a list of test results from the server, separating baseline tests from proxy tests.
const getReports = async () => {
  const rsp = await fetch("./reports.json").then(rsp => rsp.json());
  const reports = rsp.reduce(
    (accum: Reports, fortio: Fortio.Report) => {
      let { run, kind, name } = JSON.parse(fortio.Labels);
      accum[kind as Kind].push({ kind, name, run, fortio });
      return accum;
    },
    { proxy: [], baseline: [] });
  return reports;
}

const App: React.FunctionComponent = () => {
  interface State { maxLatency: number, maxRequests: number, reports: Reports };
  const [state, setState] = React.useState<State>({
    maxLatency: 0,
    maxRequests: 0,
    reports: {
      baseline: [],
      proxy: []
    }
  });

  React.useEffect(() => {
    getReports().then((reports: Reports) => {
      const maxLatency = d3.max(
        reports.baseline.concat(reports.proxy),
        ({ run, kind, name, fortio }) => {
          return fortio.DurationHistogram.Max;
        }
      )!;
      const maxRequests = d3.max(
        reports.baseline.concat(reports.proxy),
        ({ fortio }) => fortio.DurationHistogram.Count,
      )!;

      setState({
        maxLatency,
        maxRequests,
        reports
      });
    });
  }, []);

  const rowHeight = 20;

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth='xl'>
        <Grid container spacing={5}>
          <Grid item sm={12}>{/* Spacer */}</Grid>
          <Grid item sm={12} xl={6} key='requests-by-latency'>
            <Paper elevation={2}>
              <ReportGrid
                reports={state.reports}
                view={RequestsByLatency}
                dimensions={{
                  maxLatency: state.maxLatency,
                  maxRequests: state.maxRequests,
                  rowHeight: rowHeight,
                }}
              />
            </Paper>
          </Grid>
          <Grid item sm={12} xl={6} key='latency-by-requests'>
            <Paper elevation={2}>
              <ReportGrid
                reports={state.reports}
                view={LatencyByRequests}
                dimensions={{
                  maxLatency: state.maxLatency,
                  maxRequests: state.maxRequests,
                  rowHeight: rowHeight,
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </React.Fragment>
  );
};

export default App;
