import * as d3 from "d3";
import React, { FunctionComponent, useCallback } from "react";
import styled from "@emotion/styled";

import { Report } from './Reports';

export type Dimensions = {
  maxLatency: number,
  maxRequests: number,
  rowHeight: number,
}

const SvgStyled = styled.svg`
  height: 100%;
  width: 100%;
`;

export const RequestsByLatencyTopAxis: FunctionComponent<Dimensions> =
    ({ maxLatency, maxRequests, rowHeight }) => {
        const draw = (element: SVGSVGElement) => {
            if (element === null) {
                return;
            }

            const { width } = element.getBoundingClientRect();
            const svg = d3
                .select(element)
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", `0 0 ${width} ${rowHeight * 1.5}`);

            const x = d3
                .scaleLinear()
                .domain([0, maxLatency!])
                .rangeRound([60, width - 15]);

            svg.append("g").call(g =>
                g
                    .attr("transform", `translate(0,${rowHeight * 1.5})`)
                    .call(
                        d3
                            .axisTop(x)
                            .tickSize(rowHeight / 2)
                            .tickFormat(n => `${n.valueOf() * 1000}ms`)
                    )
                    .call(g => g.selectAll(".domain").remove())
            );
        };

        return <SvgStyled ref={useCallback(draw, [maxLatency, maxRequests, rowHeight])} />;
    };

export const RequestsByLatencyHeatMap: FunctionComponent<{ report: Report } & Dimensions> =
  ({ report, maxLatency, maxRequests, rowHeight }) => {
    const draw = (element: SVGSVGElement) => {
        if (report === null || element === null) {
            return;
        }
      const { width } = element.getBoundingClientRect();

      const x = d3
        .scaleLinear()
        .domain([0, maxLatency!])
        .rangeRound([60, width - 15]);

      const svg = d3
        .select(element)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${rowHeight}`);

      const boxColor = d3
        .scaleSequential(d3.interpolateYlOrRd)
        .domain([0, Math.pow(maxRequests!, 0.5)]);
      const barColor = d3
        .scaleOrdinal(d3.schemeYlOrRd[5])
        .domain(["50", "75", "90", "99", "99.9"]);

      const row = svg
        .append("g")
        .attr("transform", `translate(0,0)`)
        .selectAll("g")
        .data([report])
        .join("g")
        .attr("transform", `translate(0,0)`);


      row
        .append("g")
        .selectAll("rect")
          .data(r => r.fortio.DurationHistogram.Data)
        .join("rect")
        .attr("x", d => x(d.Start) + 1)
        .attr("width", d => x(d.End) - x(d.Start))
        .attr("height", rowHeight)
        .attr("fill", d => boxColor(Math.pow(d.Count, 0.5)))
        .append("title")
        .text(d => `${d.Count} reqs [${d.Start * 1000}ms..${d.End * 1000}ms)`);

      row
        .append("g")
        .selectAll("rect")
          .data(({ fortio }) => fortio.DurationHistogram.Percentiles)
        .join("rect")
        .attr("x", p => x(p.Value))
        .attr("y", rowHeight / 3)
        .attr("width", 2)
        .attr("height", rowHeight / 3)
        .attr("fill", p => barColor(`${p.Percentile}`))
        .append("title")
        .text(p => `${p.Percentile} percentile ${p.Value * 1000}ms`);
    };

    return <SvgStyled ref={useCallback(draw, [report, rowHeight, maxLatency, maxRequests])} />;
  };

export default RequestsByLatencyHeatMap;
