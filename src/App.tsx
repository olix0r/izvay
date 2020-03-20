import * as d3 from "d3";
import { group } from "d3-array";
import React, { FunctionComponent, useCallback, useEffect, useState } from "react";
import styled from "@emotion/styled";

import CssBaseline from "@material-ui/core/CssBaseline";
import Container from "@material-ui/core/Container";
import GridList from "@material-ui/core/GridList";
import GridListTile from "@material-ui/core/GridListTile";
import GridListTileBar from "@material-ui/core/GridListTileBar";


import * as Fortio from "./fortio";

enum Protocol {
  Http1 = "http1",
  Grpc = "grpc",
}

enum Direction {
  In = "in",
  Out = "out",
}

interface Report extends Fortio.Report {
  protocol: Protocol;
  rate: number;
  direction: Direction;
  build?: string;
}

interface LabelReport {
  (report: Report): string;
}

type Reports = Array<Report>;

async function getReports(): Promise<Reports> {
  return await (await fetch("/reports.json")).json();
}

const SvgStyled = styled.svg`
  height: 100%;
  width: 100%;
  color: #0f0;
  background-color: #121212;
  padding: 20px;
`;

const rowHeight = 20;

const LatencyHeatmap: FunctionComponent<{ reports: Reports, labeler: LabelReport }> =
  ({ reports, labeler }) => {
    let drawReports = (element: SVGSVGElement) => {
      console.log("Drawing reports", element, reports);
      if (reports.length === 0) {
        return;
      }

      const { width } = element.getBoundingClientRect();
      const height = (rowHeight + 2) * reports.length;

      const maxLatency = d3.max(reports, r =>
        d3.max(r.DurationHistogram.Data, d => d.End)
      );
      const x = d3
        .scaleLinear()
        .domain([0, maxLatency!])
        .rangeRound([200, width]);

      const y = d3
        .scaleBand()
        .domain(reports.map(labeler))
        .rangeRound([rowHeight, height - rowHeight]);

      // reports.forEach(r => {
      //   r.DurationHistogram.Data.forEach(d => {
      //     console.log(r.protocol, r.direction, r.rate, d, x(d.Start), x(d.End));
      //   });
      // });

      const svg = d3
        .select(element)
        //.attr('width', width)
        //.attr('height', margin.top + margin.bottom + reports.length * rowHeight);
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height}`);

      const maxCount = d3.max(reports, r =>
        d3.max(r.DurationHistogram.Data, d => d.Count)
      );
      const boxColor = d3
        .scaleSequential(d3.interpolateCool)
        .domain([0, Math.pow(maxCount!, 0.5)]);
      const barColor = d3
        .scaleOrdinal(d3.schemeYlOrRd[5])
        .domain(["50", "75", "90", "99", "99.9"]);

      svg.append("g").call(g =>
        g
          .attr("transform", `translate(0,0)`)
          .call(
            d3
              .axisTop(x)
              .tickSize(width / 100)
              .tickFormat(n => `${n.valueOf() * 1000}ms`)
          )
          .call(g => g.selectAll(".domain").remove())
      );

      svg.append("g").call(g =>
        g
          .attr("transform", `translate(0,0)`)
          .call(d3.axisLeft(y).tickSizeOuter(0))
          .call(g => g.selectAll(".domain").remove())
      );

      const row = svg
        .append("g")
        .selectAll("g")
        .data(reports)
        .join("g")
        .attr("transform", r => `translate(0,${y(labeler(r))})`);

      row
        .append("g")
        .selectAll("rect")
        .data(report => report.DurationHistogram.Data)
        .join("rect")
        .attr("x", d => x(d.Start) + 1)
        .attr("width", d => x(d.End) - x(d.Start) - 1)
        .attr("height", y.bandwidth() - 1)
        .attr("fill", d => boxColor(Math.pow(d.Count, 0.5)))
        .append("title")
        .text(d => `${d.Count} reqs [${d.Start}ms..${d.End}ms)`);

      row
        .append("g")
        .selectAll("rect")
        .data(r => r.DurationHistogram.Percentiles)
        .join("rect")
        .attr("x", p => x(p.Value))
        .attr("width", 3)
        .attr("height", y.bandwidth() - 1)
        .attr("fill", p => barColor(`${p.Percentile}`))
        .append("title")
        .text(p => `${p.Percentile} percentile ${p.Value}ms`);
    };

    console.log("Returning svg");
    return <SvgStyled ref={useCallback(drawReports, [reports])} />;
  };

const App: FunctionComponent = () => {
  const [reports, setReports] = useState<Reports>([]);

  useEffect(() => {
    console.log("Getting reports");
    getReports().then(rs => {
      console.log("Setting reports", rs);
      setReports(rs);
    });
  }, []);

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth='xl'>
        <GridList cols={2}>
          {Array.from(group(reports, r => r.protocol).values()).flatMap(reports => {
            return Array.from(group(reports, r => r.direction).values()).flatMap(reports => {
              return Array.from(group(reports, r => r.rate).values()).map(reports => {
                return (
                  <GridListTile cols={1} key={`${reports[0].protocol}-${reports[0].direction}-${reports[0].rate}`}>
                    <GridListTileBar title={`${reports[0].protocol} ${reports[0].direction} ${reports[0].rate}rps`} />
                    <LatencyHeatmap
                      reports={reports}
                      labeler={({ build }) => build ? `${build}` : 'latest'}
                    />
                  </GridListTile>
                );
              });
            });
          })}
        </GridList>
      </Container>
    </React.Fragment>
  );
};

export default App;
