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

interface Report {
  protocol: Protocol;
  rate: number;
  direction: Direction;
  build: string;
  fortio: Fortio.Report;
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
`;

const rowHeight = 17;

const LatencyHeatmap: FunctionComponent<{ reports: Reports, labeler: LabelReport }> =
  ({ reports, labeler }) => {
    let drawReports = (element: SVGSVGElement) => {
      console.log("Drawing reports", element, reports);
      if (reports.length === 0) {
        return;
      }

      const { width } = element.getBoundingClientRect();
      const height = rowHeight * reports.length;

      const maxLatency = d3.max(reports, ({ fortio }) =>
        d3.max(fortio.DurationHistogram.Data, d => d.End)
      );
      const x = d3
        .scaleLinear()
        .domain([0, maxLatency!])
        .rangeRound([60, width]);

      const y = d3
        .scaleBand()
        .domain(reports.map(labeler))
        .rangeRound([0, height]);

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

      const maxCount = d3.max(reports, ({fortio }) =>
        d3.max(fortio.DurationHistogram.Data, d => d.Count)
      );
      const boxColor = d3
        .scaleSequential(d3.interpolateYlOrRd)
        .domain([0, Math.pow(maxCount!, 0.5)]);
      const barColor = d3
        .scaleOrdinal(d3.schemeYlOrRd[5])
        .domain(["50", "75", "90", "99", "99.9"]);

      svg.append("g").call(g =>
        g
          .attr("transform", `translate(0,${rowHeight})`)
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
          .attr("transform", `translate(60,${rowHeight})`)
          .call(d3.axisLeft(y).tickSizeOuter(0))
        //.call(g => g.selectAll(".domain").remove())
      );

      const row = svg
        .append("g")
        .attr("transform", r => `translate(0,${rowHeight})`)
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
        .text(d => `${d.Count} reqs [${d.Start}ms..${d.End}ms)`);

      row
        .append("g")
        .selectAll("rect")
        .data(({ fortio }) => fortio.DurationHistogram.Percentiles)
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
          {Array.from(group(reports, r => r.build).values()).flatMap(byBuild => {
            const reports = byBuild.sort((a, b) => {
              if (a.direction === b.direction) {
                if (a.protocol === b.protocol) {
                  return a.rate - b.rate;
                }

                if (a.protocol < b.protocol) {
                  return -1;
                }

                return 1;
              }
              
              if (a.direction < b.direction) {
                return -1;
              }
              
              return 1;
            });
            let build = reports[0].build || 'latest';
            return (
              <GridListTile cols={1} key={`${build}`}>
                <GridListTileBar title={`${build}`} />
                <LatencyHeatmap
                  reports={reports}
                  labeler={({ direction, protocol, rate }) => `${direction} ${protocol} ${rate / 1000}K`}
                />
              </GridListTile>
            );
          })}
        </GridList>
      </Container>
    </React.Fragment>
  );
};

export default App;
