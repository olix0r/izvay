import * as d3 from "d3";
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
}

interface LabelReport {
  (report: Report): string;
}

type Reports = Array<Report>;

async function getReports(): Promise<Reports> {
  return await (await fetch("/reports.json")).json();
}

const SvgStyled = styled.svg`
  width: 100%;
  color: #0f0;
  background-color: #111;
  padding: 20px;
`;

const rowHeight = 20;
const margin = {
  top: rowHeight,
  bottom: 0,
  left: 100,
  right: 250
};

const LatencyHeatmap: FunctionComponent<{ reports: Reports, labeler: LabelReport }> = ({ reports, labeler }) => {
  let drawReports = (element: SVGSVGElement) => {
    console.log("Drawing reports", element, reports);
    if (reports.length === 0) {
      return;
    }

    const { height, width } = element.getBoundingClientRect();

    const maxLatency = d3.max(reports, r =>
      d3.max(r.DurationHistogram.Data, d => d.End)
    );
    console.log(maxLatency!);
    const x = d3
      .scaleLinear()
      .domain([0, maxLatency!])
      .rangeRound([margin.left, width - margin.left - margin.right]);

    const y = d3
      .scaleBand()
      .domain(reports.map(labeler))
      .rangeRound([margin.top, margin.top + reports.length * rowHeight]);

    reports.forEach(r => {
      r.DurationHistogram.Data.forEach(d => {
        console.log(r.protocol, r.direction, r.rate, d, x(d.Start), x(d.End));
      });
    });

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
        .attr("transform", `translate(0,${margin.top})`)
        .call(
          d3
            .axisTop(x)
            .tickSize((width - margin.left - margin.right) / 100)
            .tickFormat(n => `${n.valueOf() * 1000}ms`)
        )
        .call(g => g.selectAll(".domain").remove())
    );

    svg.append("g").call(g =>
      g
        .attr("transform", `translate(${margin.left},0)`)
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
        <GridList>
            <LatencyHeatmap
              reports={reports}
              labeler={(report) => report.rate.toString()}
            />
        </GridList>
      </Container>
    </React.Fragment>
  );
};

export default App;
