import * as d3 from "d3";
import { group } from "d3-array"
import React, { FunctionComponent, useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { Box, CssBaseline, Container, Grid, Paper, Typography } from "@material-ui/core";

import * as Fortio from "./fortio";

type Kind = "baseline" | "proxy";

interface Report {
  run: string;
  kind: Kind;
  test: string;
  fortio: Fortio.Report;
}

type LabelReport = (r: Report) => string;

type Reports = Array<Report>;

const getReports = async () => {
  const rsp = await fetch("/reports.json");
  const reports = await rsp.json();
  return reports.map((fortio: Fortio.Report) => {
    console.log(fortio.Labels);
    let labels = JSON.parse(fortio.Labels);
    let run = labels["run"];

    if (labels["baseline"]) {
      return { kind: "baseline", test: labels["baseline"], run, fortio };
    }

    return { kind: "proxy", test: labels["proxy"], run, fortio };
  });
}

const SvgStyled = styled.svg`
  height: 100%;
  width: 100%;
`;

const rowHeight = 17;

type Props = {
  reports: Reports,
  labeler: LabelReport,
  maxLatency: number,
  maxRequests: number,
};

const LatencyHeatmap: FunctionComponent<Props> = ({ reports, labeler, maxLatency, maxRequests }) => {
    let drawReports = (element: SVGSVGElement) => {
      if (reports.length === 0) {
        return;
      }

      const { width } = element.getBoundingClientRect();
      const height = rowHeight * reports.length;

      const x = d3
        .scaleLinear()
        .domain([0, maxLatency!])
        .rangeRound([60, width]);

      const y = d3
        .scaleBand()
        .domain(reports.map(labeler))
        .rangeRound([0, height]);

      const svg = d3
        .select(element)
        //.attr('width', width)
        //.attr('height', margin.top + margin.bottom + reports.length * rowHeight);
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height}`);

      const boxColor = d3
        .scaleSequential(d3.interpolateYlOrRd)
        .domain([0, Math.pow(maxRequests!, 0.5)]);
      const barColor = d3
        .scaleOrdinal(d3.schemeYlOrRd[5])
        .domain(["50", "75", "90", "99", "99.9"]);

      // svg.append("g").call(g =>
      //   g
      //     .attr("transform", `translate(0,${rowHeight})`)
      //     .call(
      //       d3
      //         .axisTop(x)
      //         .tickSize(width / 1000)
      //         .tickFormat(n => `${n.valueOf() * 1000}ms`)
      //     )
      //     .call(g => g.selectAll(".domain").remove())
      // );

      svg.append("g").call(g =>
        g
          .attr("transform", `translate(60,0)`)
          .call(d3.axisLeft(y).tickSizeOuter(0))
          .call(g => g.selectAll(".domain").remove())
      );

      const row = svg
        .append("g")
        .attr("transform", r => `translate(0)`)
        .selectAll("g")
        .data(reports)
        .join("g")
        .attr("transform", r => `translate(0,${y(labeler(r))})`);

      row
        .append("g")
        .selectAll("rect")
        .data(({ fortio }) => fortio.DurationHistogram.Data)
        .join("rect")
        .attr("x", d => x(d.Start) + 1)
        .attr("width", d => x(d.End) - x(d.Start) - 1)
        .attr("height", y.bandwidth() - 1)
        .attr("fill", d => boxColor(Math.pow(d.Count, 0.5)))
        .append("title")
        .text(d => `${d.Count} reqs [${d.Start * 1000}ms..${d.End * 1000}ms)`);

      row
        .append("g")
        .selectAll("rect")
        .data(({ fortio }) => fortio.DurationHistogram.Percentiles)
        .join("rect")
        .attr("x", p => x(p.Value))
        .attr("y", y.bandwidth() / 3)
        .attr("width", 3)
        .attr("height", y.bandwidth() / 3)
        .attr("fill", p => barColor(`${p.Percentile}`))
        .append("title")
        .text(p => `${p.Percentile} percentile ${p.Value * 1000}ms`);
    };

    return <SvgStyled ref={useCallback(drawReports, [reports])} />;
  };


const LatencyBars: FunctionComponent<Props> = ({ reports, labeler, maxLatency, maxRequests }) => {
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
        .rangeRound([60, width]);

      const y = d3
        .scaleBand()
        .domain(reports.map(labeler))
        .rangeRound([0, height]);

      const svg = d3
        .select(element)
        //.attr('width', width)
        //.attr('height', margin.top + margin.bottom + reports.length * rowHeight);
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height}`);

      const boxColor = d3
        .scaleSequential(d3.interpolateYlGnBu)
        .domain([0, Math.pow(maxLatency!, 0.5)]);

      // svg.append("g").call(g =>
      //   g
      //     .attr("transform", `translate(0,${rowHeight})`)
      //     .call(
      //       d3
      //         .axisTop(x)
      //         .tickSize(width / 1000)
      //         .tickFormat(n => `${n.valueOf()/ 1000}K`)
      //     )
      //     .call(g => g.selectAll(".domain").remove())
      // );

      svg.append("g").call(g =>
        g
          .attr("transform", `translate(60,0)`)
          .call(d3.axisLeft(y).tickSizeOuter(0))
        //.call(g => g.selectAll(".domain").remove())
      );

      const row = svg
        .append("g")
        .attr("transform", r => `translate(0,0)`)
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
        .attr("width", ({ prior, bucket }) => Math.max(3, x(prior + bucket.Count) - x(prior) - 2))
        .attr("height", y.bandwidth() - 1)
        .attr("fill", ({ bucket }) => boxColor(Math.pow(bucket.End, 0.5)))
        .append("title")
        .text(({ bucket }) => `${bucket.Count} reqs [${bucket.Start * 1000}ms..${bucket.End * 1000}ms)`);
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

  if (a.test === b.test) {
    return 0;
  }

  if (a.test === 'baseline' || a.test < b.test) {
    return -1;
  }

  // b.test === 'baseline' || a.test > b.test
  return 1;
};

const App: FunctionComponent = () => {
  type State = { maxLatency: number, maxRequests: number, reports: Reports };
  const [state, setState] = useState<State>({ maxLatency: 0, maxRequests: 0, reports: [] });

  useEffect(() => {
    getReports().then((reports: Reports) => {
      const maxLatency = d3.max(reports, ({ fortio }) =>
        d3.max(fortio.DurationHistogram.Data, d => d.End)
      )!;
      const maxRequests = d3.max(reports, ({ fortio }) =>
        d3.max(fortio.DurationHistogram.Data, d => d.Count)
      )!;

      setState({ maxLatency, maxRequests, reports });
    });
  }, []);


  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth='xl'>
        <Grid container>
          <Grid item container spacing={5}>
            <Grid item container sm={12} lg={6} spacing={2} key='heat'>
              {Array.from(group(state.reports, r => r.run).values()).flatMap(byRun => {
                const reports = byRun.sort(compareReportWithinRun);
                const run = reports[0].run;
                return (
                  <Grid item sm={12} key={`${run}-heat`}>
                    <Paper>
                      <Grid
                        container
                        item
                        sm={12}
                        spacing={3}
                        justify='flex-start'
                        alignItems='center'
                      >
                        <Grid item sm={1}>
                          <Container>
                            <Typography variant='caption'>{run}</Typography>
                          </Container>
                        </Grid>
                        <Grid item sm={11}>
                          <Paper elevation={2}>
                            <Box height={`${rowHeight * (reports.length + 2)}px`} p='10px'>
                              <LatencyHeatmap
                                  reports={reports}
                                  labeler={({ kind, test }) => `${kind} ${test}`}
                                  maxLatency={state.maxLatency}
                                  maxRequests={state.maxRequests}
                                />
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
            <Grid item container sm={12} lg={6} spacing={2} key='bars'>
              {Array.from(group(state.reports, r => r.run).values()).flatMap(byRun => {
                const reports = byRun.sort(compareReportWithinRun);
                const run = reports[0].run;
                return (
                  <Grid item sm={12} key={`${run}-bars`}>
                    <Paper>
                      <Grid
                        container
                        item
                        sm={12}
                        spacing={3}
                        justify='flex-start'
                        alignItems='center'
                      >
                        <Grid item sm={1}>
                          <Container>
                            <Typography variant='caption'>{run}</Typography>
                          </Container>
                        </Grid>
                        <Grid item sm={11}>
                          <Paper>
                            <Box height={`${rowHeight * (reports.length + 2)}px`} p='10px'>
                              <LatencyBars
                                  reports={reports}
                                  labeler={({ kind, test }) => `${kind} ${test}`}
                                  maxLatency={state.maxLatency}
                                  maxRequests={state.maxRequests}
                                />
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </React.Fragment>
  );
};

export default App;
