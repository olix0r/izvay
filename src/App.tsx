import * as d3 from "d3";
import { group } from "d3-array"
import React, { FunctionComponent, useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { CssBaseline, Container, Grid, Hidden, Paper, Typography } from "@material-ui/core";

import { RequestsByLatencyHeatMap, RequestsByLatencyTopAxis } from './RequestsByLatencyHeatMap'
import * as Fortio from "./fortio";
import { Kind, LabelReport, Report, Reports } from './Reports'

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

const SvgStyled = styled.svg`
  height: 100%;
  width: 100%;
`;

const rowHeight = 17;

type Props = {
  reports: Report[],
  labeler: LabelReport,
  maxLatency: number,
  maxRequests: number,
}
type TopAxis = {
  withTopAxis?: boolean,
};

const LatencyBars: FunctionComponent<Props & TopAxis> =
  ({ reports, labeler, maxLatency, maxRequests, withTopAxis }) => {
    let drawReports = (element: SVGSVGElement) => {
      if (reports.length === 0) {
        return;
      }

      interface Bucket {
        prior: number;
        bucket: Fortio.DurationHistogramBucket;
      }
      function toBuckets({ fortio }: Report): Bucket[] {
        let buckets = [];
        let prior = 0;
        for (let bucket of fortio.DurationHistogram.Data) {
          buckets.push({ prior, bucket });
          prior += bucket.Count;
        }
        return buckets;
      }

      const { width } = element.getBoundingClientRect();
      const height = rowHeight * reports.length;

      const x = d3
        .scaleLinear()
        .domain([0, maxRequests!])
        .rangeRound([60, width - 15]);

      const y = d3
        .scaleBand()
        .domain(reports.map(labeler))
        .rangeRound([0, height]);

      const svg = d3
        .select(element)
        //.attr('width', width)
        //.attr('height', margin.top + margin.bottom + reports.length * rowHeight);
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height + (withTopAxis ? rowHeight : 0)}`);

      const boxColor = d3
        .scaleSequential(d3.interpolateYlGnBu)
        .domain([0, Math.pow(maxLatency!, 0.5)]);

      let offset = 0;
      if (withTopAxis) {
        svg.append("g").call(g =>
          g
            .attr("transform", `translate(0,${rowHeight})`)
            .call(
              d3
                .axisTop(x)
                .tickSize(rowHeight / 3)
                .tickFormat(n => `${n.valueOf() / 1000}K`)
            )
            .call(g => g.selectAll(".domain").remove())
        );
        offset = rowHeight;
      }

      svg.append("g").call(g =>
        g
          .attr("transform", `translate(60,${offset})`)
          .call(d3.axisLeft(y).tickSizeOuter(0))
        .call(g => g.selectAll(".domain").remove())
      );

      const row = svg
        .append("g")
        .attr("transform", r => `translate(0,${offset})`)
        .selectAll("g")
        .data(reports)
        .join("g")
        .attr("transform", r => `translate(0,${y(labeler(r))})`);

      row
        .append("g")
        .selectAll("rect")
        .data(report => toBuckets(report))
        .join("rect")
        .attr("x", ({ prior }) => x(prior) + 1)
        .attr("width", ({ prior, bucket }) => x(prior + bucket.Count) - x(prior))
        .attr("height", y.bandwidth())
        .attr("fill", ({ bucket }) => boxColor(Math.pow(bucket.End, 0.5)))
        .append("title")
        .text(({ prior, bucket }) => `${prior + bucket.Count} reqs <${bucket.End * 1000}ms`);
    };

    return <SvgStyled ref={useCallback(drawReports, [reports])} />;
  };

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
          <Grid item sm={12} xl={6} key='heat'>
            <Paper elevation={2}>
              <Grid container spacing={3} direction='row'>
                <Grid item sm={12} key={`heat-axis`}>
                  <Container>
                    <Paper elevation={2}>
                      <Grid container direction='row'>
                        <Grid container item sm={12} spacing={1}>
                          <Grid item sm={1}></Grid>
                          <Grid container item sm={11}>
                            <Grid container item sm={12} spacing={0} alignItems='flex-start' direction='row'>
                              <Grid item sm={2}></Grid>
                              <Grid item sm={10}>
                                <RequestsByLatencyTopAxis
                                  maxLatency={state.maxLatency}
                                  maxRequests={state.maxRequests}
                                  rowHeight={17}
                                />
                              </Grid>
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid container item sm={12} spacing={1} alignItems='flex-start'>
                          <Grid item sm={1}>
                            <Container>
                              <Typography variant='caption'>baseline</Typography>
                            </Container>
                          </Grid>
                          <Grid container item sm={11}>
                            <Grid container item sm={12} spacing={0} alignItems='flex-start' direction='row'>
                              {state.reports.baseline.map((report) => {
                                return (
                                  <React.Fragment>
                                    <Grid item sm={2}>
                                      <Typography variant='caption'>{report.name}</Typography>
                                    </Grid>
                                    <Grid item sm={10}>
                                      <RequestsByLatencyHeatMap
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
                        </Grid>
                      </Grid>
                    </Paper>
                  </Container>
                </Grid>
                {Array.from(group(state.reports.proxy, r => r.run).values()).flatMap(byRun => {
                  const reports = byRun.sort(compareReportWithinRun);
                  const run = reports[0].run;
                  return (
                    <Grid item sm={12} key={`${run}-heat`}>
                      <Container>
                        <Paper elevation={2}>
                          <Grid
                            container
                            spacing={1}
                            justify='flex-start'
                            alignItems='flex-start'
                          >
                            <Grid item sm={1}>
                              <Container>
                                <Typography variant='caption'>{run}</Typography>
                              </Container>
                            </Grid>
                            <Grid container item sm={11}>
                              <Grid container item sm={12} alignItems='flex-start' direction='row'>
                                {reports.map(report => {
                                  return (
                                    <React.Fragment>
                                      <Grid item sm={2}>
                                        <Typography variant='caption'>{report.name}</Typography>
                                      </Grid>
                                      <Grid item sm={10}>
                                        <RequestsByLatencyHeatMap
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
                          </Grid>
                        </Paper>
                      </Container>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>
          <Grid item sm={12} xl={6} key='bars'>
            <Paper elevation={2}>
              <Grid container spacing={3} direction='row'>
                <Grid item sm={12} key={`bars-axis`}>
                  <Container>
                    <Paper elevation={2}>
                      <Grid container spacing={1} alignItems='flex-start'>
                        <Hidden only='xl'>
                          <Grid item sm={1}>
                            <Container>
                              <Typography variant='caption'>baseline</Typography>
                            </Container>
                          </Grid>
                        </Hidden>
                        <Grid item sm={11} xl={12}>
                          {/* <LatencyBars
                              reports={state.reports.baseline}
                              labeler={({ name }) => `${name}`}
                              maxLatency={state.maxLatency}
                              maxRequests={state.maxRequests}
                              withTopAxis
                            /> */}
                        </Grid>
                      </Grid>
                    </Paper>
                  </Container>
                </Grid>
                {Array.from(group(state.reports.proxy, r => r.run).values()).flatMap(byRun => {
                  const reports = byRun.sort(compareReportWithinRun);
                  const run = reports[0].run;
                  return (
                    <Grid item sm={12} key={`${run}-bars`}>
                      <Container>
                        <Paper elevation={2}>
                          <Grid
                            container
                            key={`${run}-bars`}
                            sm={12}
                            spacing={1}
                            justify='flex-start'
                            alignItems='flex-start'
                          >
                            <Hidden only='xl'>
                              <Grid item sm={1}>
                                <Container>
                                  <Typography variant='caption'>{run}</Typography>
                                </Container>
                              </Grid>
                            </Hidden>
                            <Grid item sm={11} xl={12}>
                              {/* <LatencyBars
                                  reports={reports}
                                  labeler={({ name }) => `${name}`}
                                  maxLatency={state.maxLatency}
                                  maxRequests={state.maxRequests}
                                /> */}
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
