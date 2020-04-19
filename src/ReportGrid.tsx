import { group } from "d3-array"
import React from "react";
import { Container, Grid, Paper, Typography } from "@material-ui/core";

import { Report, Reports } from './Reports';

export type Dimensions = {
  maxLatency: number,
  maxRequests: number,
  rowHeight: number,
};

export type TopAxis = React.FC<Dimensions>;
export type Viz = React.FC<{ report: Report, dimensions: Dimensions }>;
export type View = { topAxis: TopAxis, viz: Viz };

export type Props = {
  dimensions: Dimensions,
  reports: Reports,
  view: View,
};

const ReportGrid: React.FC<Props> = ({ reports, dimensions, view }) => {
  return (
    <Grid item sm={12}>
      <Paper elevation={2}>
        <Grid container spacing={3} direction='row'>
          <Grid item sm={12} key='baseline'>
            <Container>
              <Paper elevation={2}>
                <Grid container direction='column'>
                  <Grid container item sm={12}>
                    <Grid item sm={2} key='run'>
                      <Container>
                        <Typography>baseline</Typography>
                      </Container>
                    </Grid>
                    <Grid item sm={10} key='top-axis'>
                      <view.topAxis
                        maxLatency={dimensions.maxLatency}
                        maxRequests={dimensions.maxRequests}
                        rowHeight={dimensions.rowHeight}
                      />
                    </Grid>
                  </Grid>
                  <Grid container item sm={12} alignItems='flex-start'>
                    {reports.baseline.map((report) => {
                      return (
                        <React.Fragment key={report.name}>
                          <Grid item container sm={2} key='run' direction='row'>
                            <Grid item sm={1}></Grid>
                            <Grid item sm={11}>
                              <Container>
                                <Typography variant='caption'>{report.name}</Typography>
                              </Container>
                            </Grid>
                          </Grid>
                          <Grid item sm={10}>
                            <view.viz report={report} dimensions={dimensions} />
                          </Grid>
                        </React.Fragment>
                      );
                    })}
                  </Grid>
                </Grid>
              </Paper>
            </Container>
          </Grid>
          {Array.from(group(reports.proxy, r => r.run).values()).flatMap(byRun => {
            const reports = byRun.sort(compareReportWithinRun);
            const run = reports[0].run;
            return (
              <Grid item sm={12} key={`${run} `}>
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
                            <React.Fragment key={report.name}>
                              <Grid item container sm={2} direction='row'>
                                <Grid item sm={1}></Grid>
                                <Grid item sm={11}>
                                  <Container>
                                    <Typography variant='caption'>{report.name}</Typography>
                                  </Container>
                                </Grid>
                              </Grid>
                              <Grid item sm={10}>
                                <view.viz report={report} dimensions={dimensions} />
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
  );
};

export default ReportGrid;

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

  if (a.name < b.name) {
    return -1;
  }

  // b.kind === 'baseline' || a.name > b.name
  return 1;
};

