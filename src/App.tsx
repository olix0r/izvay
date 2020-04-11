import * as d3 from "d3";
import { group } from "d3-array"
import React, { FunctionComponent, useEffect, useState } from "react";
import { CssBaseline, Container, Grid, Paper, Typography } from "@material-ui/core";

import * as RequestsByLatency from './RequestsByLatency'
import * as LatencyByRequests from './LatencyByRequests'
import * as Fortio from "./fortio";
import { Kind, Report, Reports } from './Reports'

const getReports = async () => {
  const rsp = await fetch("./reports.json");
  const reports = (await rsp.json()).reduce(
    (accum: Reports, fortio: Fortio.Report) => {
      let { run, kind, name } = JSON.parse(fortio.Labels);
      accum[kind as Kind].push({ kind, name, run, fortio });
      return accum;
    },
    { proxy: [], baseline: [] });
  return reports;
}

const compareReportWithinRun = (a: Report, b: Report) => {
  if (a.kind !== b.kind) {
    if (a.kind === "baseline") {
      return -1;
    }

    // b is baseline
    return 1;
  }

  if (a.name === b.name) {
    return 0;
  }

  if (a.name === 'baseline' || a.name < b.name) {
    return -1;
  }

  // b.name === 'baseline' || a.name > b.name
  return 1;
};

const App: FunctionComponent = () => {
  type State = { maxLatency: number, maxRequests: number, reports: Reports };
  const [state, setState] = useState<State>({ maxLatency: 0, maxRequests: 0, reports: {baseline: [], proxy: []} });

  useEffect(() => {
    getReports().then((reports: Reports) => {
      const maxLatency = d3.max(
        reports.baseline.concat(reports.proxy),
        ({ run, kind, name, fortio }) => {
          return fortio.DurationHistogram.Max;
        }
      )!;
      const maxRequests = d3.max(
        reports.baseline.concat(reports.proxy),
        ({ fortio }) =>  fortio.DurationHistogram.Count,
      )!;

      const s = { maxLatency, maxRequests, reports };
      setState(s);
    });
  }, []);

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth='xl'>
        <Grid container spacing={5}>
          <Grid item sm={12}>{/* Spacer */}</Grid>
          <Grid item sm={12} xl={6} key='requests-by-latency'>
            <Paper elevation={2}>
              <Grid container spacing={3} direction='row'>
                <Grid item sm={12} key={`requests-by-latency-baseline`}>
                  <Container>
                    <Paper elevation={2}>
                      <Grid container direction='column'>
                        <Grid container item sm={12}>
                          <Grid item sm={2}>
                            <Container>
                              <Typography>baseline</Typography>
                            </Container>
                          </Grid>
                          <Grid item sm={10}>
                            <RequestsByLatency.TopAxis
                              maxLatency={state.maxLatency}
                              maxRequests={state.maxRequests}
                              rowHeight={17}
                            />
                          </Grid>
                        </Grid>
                        <Grid container item sm={12} alignItems='flex-start'>
                          {state.reports.baseline.map((report) => {
                            return (
                              <React.Fragment>
                                <Grid item sm={2}>
                                  <Container>
                                    <Typography variant='caption'>{report.name}</Typography>
                                  </Container>
                                </Grid>
                                <Grid item sm={10}>
                                  <RequestsByLatency.HeatMap
                                    report={report}
                                    maxLatency={state.maxLatency}
                                    maxRequests={state.maxRequests}
                                    rowHeight={17}
                                  />
                                </Grid>
                              </React.Fragment>
                            );
                          })}
                        </Grid>
                      </Grid>
                    </Paper>
                  </Container>
                </Grid>
                {Array.from(group(state.reports.proxy, r => r.run).values()).flatMap(byRun => {
                  const reports = byRun.sort(compareReportWithinRun);
                  const run = reports[0].run;
                  return (
                    <Grid item sm={12} key={`requests-by-latency-${run}`}>
                      <Container>
                        <Paper elevation={2}>
                          <Grid container direction='column'>
                            <Grid item sm={12}>
                              <Container>
                                <Typography>{run}</Typography>
                              </Container>
                            </Grid>
                            <Grid container item sm={12} alignItems='flex-start' direction='row'>
                              {reports.map(report => {
                                return (
                                  <React.Fragment>
                                    <Grid item sm={2}>
                                      <Container>
                                        <Typography variant='caption'>{report.name}</Typography>
                                      </Container>
                                    </Grid>
                                    <Grid item sm={10}>
                                      <RequestsByLatency.HeatMap
                                        report={report}
                                        maxLatency={state.maxLatency}
                                        maxRequests={state.maxRequests}
                                        rowHeight={17}
                                      />
                                    </Grid>
                                  </React.Fragment>
                                );
                              })}
                            </Grid>
                          </Grid>
                        </Paper>
                      </Container>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>

          <Grid item sm={12} xl={6} key='latency-by-requests'>
            <Paper elevation={2}>
              <Grid container spacing={3} direction='row'>
                <Grid item sm={12} key={`latency-by-requests-baseline`}>
                  <Container>
                    <Paper elevation={2}>
                      <Grid container direction='column'>
                        <Grid container item sm={12}>
                          <Grid item sm={2}>
                            <Container>
                              <Typography>baseline</Typography>
                            </Container>
                          </Grid>
                          <Grid item sm={10}>
                            <LatencyByRequests.TopAxis
                              maxLatency={state.maxLatency}
                              maxRequests={state.maxRequests}
                              rowHeight={17}
                            />
                          </Grid>
                        </Grid>
                        <Grid container item sm={12} alignItems='flex-start'>
                          {state.reports.baseline.map((report) => {
                            return (
                              <React.Fragment>
                                <Grid item sm={2}>
                                  <Container>
                                    <Typography variant='caption'>{report.name}</Typography>
                                  </Container>
                                </Grid>
                                <Grid item sm={10}>
                                  <LatencyByRequests.HeatMap
                                    report={report}
                                    maxLatency={state.maxLatency}
                                    maxRequests={state.maxRequests}
                                    rowHeight={17}
                                  />
                                </Grid>
                              </React.Fragment>
                            );
                          })}
                        </Grid>
                      </Grid>
                    </Paper>
                  </Container>
                </Grid>
                {Array.from(group(state.reports.proxy, r => r.run).values()).flatMap(byRun => {
                  const reports = byRun.sort(compareReportWithinRun);
                  const run = reports[0].run;
                  return (
                    <Grid item sm={12} key={`latency-by-requests-${run}`}>
                      <Container>
                        <Paper elevation={2}>
                          <Grid container direction='column'>
                            <Grid item sm={12}>
                              <Container>
                                <Typography>{run}</Typography>
                              </Container>
                            </Grid>
                            <Grid container item sm={12} alignItems='flex-start' direction='row'>
                              {reports.map(report => {
                                return (
                                  <React.Fragment>
                                    <Grid item sm={2}>
                                      <Container>
                                        <Typography variant='caption'>{report.name}</Typography>
                                      </Container>
                                    </Grid>
                                    <Grid item sm={10}>
                                      <LatencyByRequests.HeatMap
                                        report={report}
                                        maxLatency={state.maxLatency}
                                        maxRequests={state.maxRequests}
                                        rowHeight={17}
                                      />
                                    </Grid>
                                  </React.Fragment>
                                );
                              })}
                            </Grid>
                          </Grid>
                        </Paper>
                      </Container>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </React.Fragment>
  );
};

export default App;
