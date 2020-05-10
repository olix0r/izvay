import * as d3 from "d3";
import React from "react";
import styled from "@emotion/styled";

import { Report } from './fortio';
import * as ReportGrid from './ReportGrid';

const SvgStyled = styled.svg`
  height: 100%;
  width: 100%;
  //background-color: #666;
`;

export const TopAxis: ReportGrid.TopAxis = ({ maxRequests, rowHeight }) => {
    const draw = (element: SVGSVGElement) => {
        if (element === null || !maxRequests) {
            return;
        }

        const { width } = element.getBoundingClientRect();
        const svg = d3
            .select(element)
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${width} ${rowHeight * 1.5}`);

        const x = d3
            .scaleLinear()
            .domain([0, maxRequests!])
            .rangeRound([15, width - 15]);

        svg.append("g").call(g =>
            g
                .attr("transform", `translate(0,${rowHeight * 1.5})`)
                .call(
                    d3
                        .axisTop(x)
                        .tickSize(rowHeight / 2)
                        .tickFormat(n => `${n.valueOf() / 1000}K`)
                )
        );
    };

    return <SvgStyled ref={React.useCallback(draw, [maxRequests, rowHeight])} />;
};

export const HeatMap: ReportGrid.Viz = ({ report, dimensions }) => {
    const draw = (element: SVGSVGElement) => {
        if (report === undefined || element === null) {
            return;
        }

        const { width } = element.getBoundingClientRect();

        const x = d3
            .scaleLinear()
            .domain([0, dimensions.maxRequests!])
            .rangeRound([15, width - 15]);

        const svg = d3
            .select(element)
            //.attr("preserveAspectRatio", "xMinYMin meet")
            .attr("preserveAspectRatio", "none")
            .attr("viewBox", `0 0 ${width} ${dimensions.rowHeight}`);

        const scale = (latency: number) => Math.pow(latency, 1 / 2);
        const boxColor = d3
            .scaleSequential(d3.interpolateBlues)
            .domain([0, scale(dimensions.maxLatency!)]);

        const row = svg
            .append("g")
            .selectAll("g")
            .data([report])
            .join("g");

        row
            .append("g")
            .selectAll("rect")
            .data(toBuckets)
            .join("rect")
            .attr("x", ({ prior }) => x(prior) + 1)
            .attr("width", ({ prior, bucket }) => x(prior + bucket.Count) - x(prior))
            .attr("height", dimensions.rowHeight)
            .attr("fill", ({ bucket }) => boxColor(scale(bucket.End)))
            .append("title")
            .text(({ prior, bucket }) => `${prior + bucket.Count} reqs <${bucket.End * 1000} ms`);
    };

    return <SvgStyled ref={React.useCallback(draw, [report, dimensions])} />;
};

const toBuckets = (report: Report) => {
    let buckets = [];
    let prior = 0;
    for (let bucket of report.DurationHistogram.Data) {
        buckets.push({ prior, bucket });
        prior += bucket.Count;
    }
    return buckets;
};

export const View = <R extends Report>() => {
    return {
        TopAxis,
        Viz: HeatMap,
    };
};

export default View;
