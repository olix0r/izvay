import * as d3 from "d3";
import { group } from "d3-array"
import React, { FunctionComponent, useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { CssBaseline, Container, Grid, Paper, Typography } from "@material-ui/core";

import * as Fortio from "./fortio";

type Kind = "baseline" | "proxy";

interface Report {
  run: string;
  kind: Kind;
  name: string;
  fortio: Fortio.Report;
}

type LabelReport = (r: Report) => string;

interface Reports {
  baseline: Report[];
  proxy: Report[];
}

const getReports = async () => {
  const rsp = await fetch("/reports.json");
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
  withTopAxis?: boolean,
};

const LatencyHeatmap: FunctionComponent<Props> = ({ reports, labeler, maxLatency, maxRequests, withTopAxis }) => {
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
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height + (withTopAxis ? rowHeight : 0)}`);

      const boxColor = d3
        .scaleSequential(d3.interpolateYlOrRd)
        .domain([0, Math.pow(maxRequests!, 0.5)]);
      const barColor = d3
        .scaleOrdinal(d3.schemeYlOrRd[5])
        .domain(["50", "75", "90", "99", "99.9"]);

      let offset = 0;
      if (withTopAxis) {
        svg.append("g").call(g =>
          g
            .attr("transform", `translate(0,${rowHeight})`)
            .call(
              d3
                .axisTop(x)
                .tickSize(rowHeight / 3)
                .tickFormat(n => `${n.valueOf() * 1000}ms`)
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


const LatencyBars: FunctionComponent<Props> = ({ reports, labeler, maxLatency, maxRequests, withTopAxis }) => {
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
            <Grid item sm={12} lg={6} key='heat'>
              <Container>
                <Paper elevation={2}>
                  <Grid container spacing={3} direction='row'>
                    <Grid container item sm={12} key={`heat-axis`} spacing={1} alignItems='flex-start'>
                      <Grid item sm={1}>
                        <Container>
                          <Typography>Latency</Typography>
                        </Container>
                      </Grid>
                      <Grid item sm={1}>
                        <Container>
                          <Typography variant='caption'>baseline</Typography>
                        </Container>
                      </Grid>
                      <Grid item sm={10}>
                        <LatencyHeatmap
                            reports={state.reports.baseline}
                            labeler={({ name }) => `${name}`}
                            maxLatency={state.maxLatency}
                            maxRequests={state.maxRequests}
                            withTopAxis
                          />
                      </Grid>
                    </Grid>
                    {Array.from(group(state.reports.proxy, r => r.run).values()).flatMap(byRun => {
                      const reports = byRun.sort(compareReportWithinRun);
                      const run = reports[0].run;
                      return (
                        <Grid
                          container
                          item
                          key={`${run}-heat`}
                          sm={12}
                          spacing={1}
                          justify='flex-start'
                          alignItems='flex-start'
                        >
                          <Grid item sm={1}>
                          </Grid>
                          <Grid item sm={1}>
                            <Container>
                              <Typography variant='caption'>{run}</Typography>
                            </Container>
                          </Grid>
                          <Grid item sm={10}>
                            <LatencyHeatmap
                                reports={reports}
                                labeler={({ name }) => `${name}`}
                                maxLatency={state.maxLatency}
                                maxRequests={state.maxRequests}
                              />
                          </Grid>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              </Container>
            </Grid>
            <Grid item sm={12} lg={6} key='bars'>
              <Container>
                <Paper elevation={2}>
                  <Grid container spacing={3} direction='row'>
                    <Grid container item sm={12} key={`bars-axis`} spacing={1} alignItems='flex-start'>
                      <Grid item sm={1}>
                        <Container>
                          <Typography>Latency</Typography>
                        </Container>
                      </Grid>
                      <Grid item sm={1}>
                        <Container>
                          <Typography variant='caption'>baseline</Typography>
                        </Container>
                      </Grid>
                      <Grid item sm={10}>
                        <LatencyBars
                            reports={state.reports.baseline}
                            labeler={({ name }) => `${name}`}
                            maxLatency={state.maxLatency}
                            maxRequests={state.maxRequests}
                            withTopAxis
                          />
                      </Grid>
                    </Grid>
                    {Array.from(group(state.reports.proxy, r => r.run).values()).flatMap(byRun => {
                      const reports = byRun.sort(compareReportWithinRun);
                      const run = reports[0].run;
                      return (
                        <Grid
                          container
                          item
                          key={`${run}-bars`}
                          sm={12}
                          spacing={1}
                          justify='flex-start'
                          alignItems='flex-start'
                        >
                          <Grid item sm={1}></Grid>
                          <Grid item sm={1}>
                            <Container>
                              <Typography variant='caption'>{run}</Typography>
                            </Container>
                          </Grid>
                          <Grid item sm={10}>
                            <LatencyBars
                                reports={reports}
                                labeler={({ name }) => `${name}`}
                                maxLatency={state.maxLatency}
                                maxRequests={state.maxRequests}
                              />
                          </Grid>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              </Container>
            </Grid>
          </Grid>
      </Container>
    </React.Fragment>
  );
};

export default App;
